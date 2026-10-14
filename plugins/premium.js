// plugins/premium.js  -> Plugin repo, plugins/ folder
const { cmd } = require('../command');
const prem = require('../lib/premium');

// target from: .addprem 923001234567  |  reply to user  |  @mention
function resolveTarget(mek, args) {
    const ctx = mek.message?.extendedTextMessage?.contextInfo;
    const argNum = (args[0] || '').replace(/\D/g, '');
    const raw = argNum.length >= 8 ? argNum : (ctx?.mentionedJid?.[0] || ctx?.participant || '');
    return String(raw).split('@')[0].replace(/\D/g, '');
}

// ---------------- .mylink ----------------
cmd({
    pattern: "mylink",
    alias: ["reflink", "referral", "mylinks"],
    react: "🔗",
    desc: "Get your personal referral link",
    category: "main",
    use: ".mylink",
    filename: __filename
}, async (conn, mek, m, { senderNumber, reply }) => {
    try {
        const st = await prem.getStatus(senderNumber);
        await reply(prem.buildMyLinkText(st));
    } catch (e) {
        console.error('mylink error:', e);
        await reply(`❌ *Error:* ${e.message}`);
    }
});

// ---------------- .addprem ----------------
cmd({
    pattern: "addprem",
    alias: ["addpremium"],
    react: "💎",
    desc: "Owner: give premium to a user",
    category: "owner",
    use: ".addprem <number> [days]",
    filename: __filename
}, async (conn, mek, m, { args, senderNumber, reply }) => {
    try {
        if (!prem.isOwner(senderNumber)) return reply('🔐 *Only the owner can use this command!*');
        const target = resolveTarget(mek, args);
        if (target.length < 8) {
            return reply('❌ *Usage:*\n.addprem 923001234567\n.addprem 923001234567 7  (custom days)\nor reply to / mention the user');
        }
        const days = parseInt(args.find(a => /^\d{1,3}$/.test(a)) || prem.PREMIUM_DAYS);
        const expiresAt = await prem.addPremium(target, days, 'owner');
        await reply(prem.box(`💎 ${prem.bd('PREMIUM ADDED')}`, [
            `👤 ${prem.sc('user')}  ➜  ${target}`,
            `⏳ ${prem.sc('days added')}  ➜  ${days}`,
            `📅 ${prem.sc('valid until')}  ➜  ${prem.fmtDate(expiresAt)}`,
        ]) + `\n\n${prem.FOOTER}`);
    } catch (e) {
        console.error('addprem error:', e);
        await reply(`❌ *Error:* ${e.message}`);
    }
});

// ---------------- .delprem ----------------
cmd({
    pattern: "delprem",
    alias: ["delpremium", "removeprem"],
    react: "🗑️",
    desc: "Owner: remove premium from a user",
    category: "owner",
    use: ".delprem <number>",
    filename: __filename
}, async (conn, mek, m, { args, senderNumber, reply }) => {
    try {
        if (!prem.isOwner(senderNumber)) return reply('🔐 *Only the owner can use this command!*');
        const target = resolveTarget(mek, args);
        if (target.length < 8) {
            return reply('❌ *Usage:*\n.delprem 923001234567\nor reply to / mention the user');
        }
        const removed = await prem.delPremium(target);
        await reply(prem.box(`🗑️ ${prem.bd('PREMIUM REMOVED')}`, [
            `👤 ${prem.sc('user')}  ➜  ${target}`,
            removed ? `✅ ${prem.sc('premium removed')}` : `ℹ️ ${prem.sc('user was not premium')}`,
        ]) + `\n\n${prem.FOOTER}`);
    } catch (e) {
        console.error('delprem error:', e);
        await reply(`❌ *Error:* ${e.message}`);
    }
});
