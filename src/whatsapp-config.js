const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

// Auth folder to store session credentials
const AUTH_FOLDER = path.join(__dirname, '..', 'auth_info');
const HISTORY_FILE = path.join(__dirname, '..', 'messaging_history.json');

async function connectToWhatsApp() {
    // Load saved credentials or create new ones
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Display QR code in terminal for authentication
    });

    // Save credentials whenever they update
    sock.ev.on('creds.update', saveCreds);

    // Handle connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('Scan the QR code below with your WhatsApp app:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to:', lastDisconnect?.error?.message);

            if (shouldReconnect) {
                console.log('Reconnecting...');
                connectToWhatsApp();
            } else {
                console.log('Logged out. Please delete auth_info folder and restart to re-authenticate.');
            }
        } else if (connection === 'open') {
            console.log('Connected to WhatsApp!');
        }
    });

    sock.ev.on('messaging-history.set', ({
        chats: newChats,
        contacts: newContacts,
        messages: newMessages,
        syncType
    }) => {
        const historyData = {
            syncType,
            syncedAt: new Date().toISOString(),
            chats: newChats,
            contacts: newContacts,
            messages: newMessages
        };

        fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyData, null, 2));
        console.log(`Messaging history saved to ${HISTORY_FILE}`);
        console.log(`  - Chats: ${newChats.length}`);
        console.log(`  - Contacts: ${newContacts.length}`);
        console.log(`  - Messages: ${newMessages.length}`);
    })

    // Handle incoming messages
    sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0];

        if (!message.key.fromMe && m.type === 'notify') {
            const sender = message.key.remoteJid;
            const messageContent = message.message?.conversation ||
                                   message.message?.extendedTextMessage?.text ||
                                   '[Media/Other content]';

            console.log(`New message from ${sender}: ${messageContent}`);
        }
    });

    return sock;
}

module.exports = { connectToWhatsApp };

// Run directly if this file is executed
if (require.main === module) {
    connectToWhatsApp().catch(console.error);
}
