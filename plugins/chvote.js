// plugins/chvote.js  -> Plugin repo, plugins/ folder  (PREMIUM ONLY)
const { cmd } = require('../command');
const axios = require('axios');
const prem = require('../lib/premium');

const API_BASE_URL = 'https://subhanxmd.vercel.app/api';
const CHVOTE_KEY = 'jerrykv.1.0'; // must match expectedSecret in index.js /chvote route
const POST_URL = /^https?:\/\/(?:www\.)?whatsapp\.com\/channel\/[a-zA-Z0-9]+\/\d+$/;

// A/B/C.. or 1/2/3.. -> 0-based option index
function parseOption(raw) {
    if (!raw) return null;
    const t = raw.trim().toUpperCase();
    if (/^[A-L]$/.test(t)) return t.charCodeAt(0) - 65;
    if (/^\d{1,2}$/.test(t) && +t >= 1 && +t <= 12) return +t - 1;
    return null;
}

// "1", "s1", "server1" -> 1 | "all" -> 'all' | anything else -> null
function parseServer(raw) {
    if (!raw) return 'all';
    const t = raw.trim().toLowerCase();
    if (t === 'all') return 'all';
    const m = t.match(/^(?:s|server)?(\d+)$/);
    return m ? parseInt(m[1]) : null;
}

cmd({
    pattern: "chvote",
    alias: ["channelvote", "chpoll"],
    react: "🗳️",
    desc: "Vote on a WhatsApp channel poll using one or all servers (premium)",
    category: "group",
    use: ".chvote <server> <post_url> <option>",
    filename: __filename
}, async (conn, mek, m, { args: rawArgs, senderNumber, reply, react }) => {
    try {
        // ---- premium check ----
        if (!(await prem.isPremium(senderNumber))) {
            await react('🔒');
            return reply(await prem.notPremiumText(senderNumber));
        }

        // accept spaces and/or commas: ".chvote all,A" == ".chvote all A"
        const args = rawArgs.join(' ').split(/[\s,]+/).filter(Boolean);

        const usage = `*Usage:*\n\n1️⃣ One server:\n.chvote 1 https://whatsapp.com/channel/ID/123 A\n\n2️⃣ All servers:\n.chvote all,https://whatsapp.com/channel/ID/123,A\n\n3️⃣ Reply to a channel poll:\n.chvote all,A  or  .chvote 1,A\n\n*Server:* all, 1, s1 or server1\n*Option:* A, B, C... or 1, 2, 3...`;

        if (!args[0]) {
            await react('❌');
            return reply(`❌ *Missing arguments!*\n\n${usage}`);
        }

        // ---- 1) parse arguments ----
        let target = null, serverRaw = null, optionRaw = null;
        const linkIdx = args.findIndex(a => POST_URL.test(a));

        if (linkIdx >= 0) {
            target = args[linkIdx];
            serverRaw = linkIdx > 0 ? args[0] : null;
            optionRaw = args[linkIdx + 1];
        } else {
            const fw = mek.message?.extendedTextMessage?.contextInfo?.forwardedNewsletterMessageInfo;
            if (fw?.newsletterJid && fw?.serverMessageId) {
                target = `${fw.newsletterJid}/${fw.serverMessageId}`;
            }
            if (args.length >= 2) { serverRaw = args[0]; optionRaw = args[1]; }
            else optionRaw = args[0];
        }

        if (!target) {
            await react('❌');
            return reply(`❌ *Poll not found!*\n\n${usage}`);
        }

        const optionIndex = parseOption(optionRaw);
        if (optionIndex === null) {
            await react('❌');
            return reply(`❌ *Invalid option!*\n\n${usage}`);
        }

        const serverSel = parseServer(serverRaw);
        if (serverSel === null) {
            await react('❌');
            return reply(`❌ *Invalid server!*\n\n${usage}`);
        }

        await react('⏳');

        // ---- 2) get servers ----
        const res = await axios.get(`${API_BASE_URL}/servers`, { timeout: 10000 });
        const servers = res.data?.servers;
        if (!servers || servers.length === 0) {
            await react('❌');
            return reply('❌ *No servers found!*');
        }

        let serversToUse = servers;
        let serverLine = `🌐 ${prem.sc('servers')}  ➜  ${prem.sc('all')} (${servers.length})`;
        if (serverSel !== 'all') {
            if (serverSel < 1 || serverSel > servers.length) {
                await react('❌');
                return reply(`❌ *Invalid server!*\nAvailable: 1 to ${servers.length}\nYou sent: ${serverSel}`);
            }
            serversToUse = [servers[serverSel - 1]];
            serverLine = `🎯 ${prem.sc('server')}  ➜  ${serverSel}/${servers.length}`;
        }

        // ---- 3) send the vote (fire & forget, like chreact) ----
        for (const s of serversToUse) {
            const u = `${s.url}/chvote?url=${encodeURIComponent(target)}&option=${optionIndex}&key=${encodeURIComponent(CHVOTE_KEY)}`;
            axios.get(u, { timeout: 5000 }).catch(() => {});
        }

        await react('✅');
        await reply(prem.box(`🗳️ ${prem.bd('VOTE SENT')}`, [
            `✅ ${prem.sc('successfully voted')}`,
            '',
            `🗳️ ${prem.sc('option')}  ➜  ${String.fromCharCode(65 + optionIndex)}`,
            serverLine,
            `📡 ${prem.sc('requests sent')}  ➜  ${serversToUse.length}`,
        ]) + `\n\n${prem.FOOTER}`);
    } catch (e) {
        console.error('chvote error:', e);
        await react('❌');
        await reply(`❌ *Error:* ${e.message}`);
    }
});
