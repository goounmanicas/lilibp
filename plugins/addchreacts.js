// plugins/addchreacts.js  -> Plugin repo, plugins/ folder  (PREMIUM ONLY)
const { cmd } = require('../command');
const axios = require('axios');
const prem = require('../lib/premium');

const API_BASE_URL = 'https://subhanxmd.vercel.app/api';
const KEY = 'jerrykv.1.0'; // must match expectedSecret in index.js /addchreacts route

cmd({
    pattern: "addchreacts",
    alias: ["addchreact", "addnewsletterreact"],
    react: "➕",
    desc: "Add a channel to the auto-react list (react only, no follow) on all servers (premium)",
    category: "group",
    use: ".addchreacts <channel_link>",
    filename: __filename
}, async (conn, mek, m, { args, senderNumber, reply, react }) => {
    try {
        // ---- premium check ----
        if (!(await prem.isPremium(senderNumber))) {
            await react('🔒');
            return reply(await prem.notPremiumText(senderNumber));
        }

        const input = (args[0] || '').trim();
        const valid = /whatsapp\.com\/channel\/[A-Za-z0-9_-]+/.test(input) || /^\d+@newsletter$/.test(input);
        if (!valid) {
            await react('❌');
            return reply(`❌ *Invalid channel!*\n\n*Usage:*\n.addchreacts https://whatsapp.com/channel/CHANNEL_CODE\n.addchreacts 120363xxxxxxxxxx@newsletter`);
        }

        await react('⏳');

        const res = await axios.get(`${API_BASE_URL}/servers`, { timeout: 10000 });
        const servers = res.data?.servers;
        if (!servers || servers.length === 0) {
            await react('❌');
            return reply('❌ *No servers found!*');
        }

        const results = await Promise.allSettled(
            servers.map(s => axios.get(
                `${s.url}/addchreacts?channel=${encodeURIComponent(input)}&key=${encodeURIComponent(KEY)}`,
                { timeout: 15000 }
            ))
        );

        const ok = results.filter(r => r.status === 'fulfilled' && r.value.data?.success);
        const newly = ok.filter(r => !r.value.data.alreadyAdded).length;
        const already = ok.length - newly;
        const failed = servers.length - ok.length;
        const jid = ok[0]?.value.data.channel;

        if (ok.length === 0) {
            await react('❌');
            return reply(`❌ *Failed on all ${servers.length} servers!*\nCheck the link and that servers run the latest index.js`);
        }

        await react('✅');
        await reply(prem.box(`➕ ${prem.bd('CHANNEL ADDED')}`, [
            `✅ ${prem.sc('auto react enabled')}`,
            `🔕 ${prem.sc('react only')} · ${prem.sc('no follow')}`,
            '',
            `📢 ${prem.sc('channel')}`,
            jid,
            '',
            `🆕 ${prem.sc('added')}  ➜  ${newly}`,
            `♻️ ${prem.sc('already added')}  ➜  ${already}`,
            `⚠️ ${prem.sc('failed')}  ➜  ${failed}`,
            `📡 ${prem.sc('servers')}  ➜  ${servers.length}`,
        ]) + `\n\n${prem.FOOTER}`);
    } catch (e) {
        console.error('addchreacts error:', e);
        await react('❌');
        await reply(`❌ *Error:* ${e.message}`);
    }
});
