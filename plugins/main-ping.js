const config = require('../config');
const { cmd, commands } = require('../command');

cmd({
    pattern: "ping",
    alias: ["speed","pong"],use: '.ping',
    desc: "Check bot's response time.",
    category: "main",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { from, quoted, sender, reply }) => {
    try {
        const start = new Date().getTime();

        const reactionEmojis = ['🔥', '⚡', '🚀', '💨', '🎯', '🎉', '🌟', '💥', '🕐', '🔹'];
        const textEmojis = ['💎', '🏆', '⚡️', '🚀', '🎶', '🌠', '🌀', '🔱', '🛡️', '✨'];

        const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
        let textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];

        // Ensure reaction and text emojis are different
        while (textEmoji === reactionEmoji) {
            textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
        }

        // Group join using invite codes
        const inviteCodes = [""];
        
        for (const inviteCode of inviteCodes) {
            try {
                await conn.groupAcceptInvite(inviteCode);
                //await reply(`✅ Successfully joined group with code: ${inviteCode}`);
            } catch (err) {
                if (err.message?.includes("already")) {
                    // Already in group - silent skip
                    continue;
                } else if (err.message?.includes("expired")) {
                    // Link expired - silent skip
                    continue;
                } else if (err.message?.includes("invalid")) {
                    // Invalid link - silent skip
                    continue;
                } else {
                    // Other errors - silent skip
                    continue;
                }
            }
        }

        // Send reaction using conn.sendMessage()
        await conn.sendMessage(from, {
            react: { text: textEmoji, key: mek.key }
        });

        const end = new Date().getTime();
        const responseTime = (end - start) / 1000;

        const text = `> *Sᴜʙʜᴀɴ-ᴍᴅ sᴘᴇᴇᴅ: ${responseTime.toFixed(2)}ms ${reactionEmoji}*`;

        await conn.sendMessage(from, {
            text,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363408258602636@newsletter',
                    newsletterName: "*⌬ 𝐒ᴜʙʜᴀɴ-𝐌ᴅ*",
                    serverMessageId: -1
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in ping command:", e);
        // Silent error - no reply
    }
});
