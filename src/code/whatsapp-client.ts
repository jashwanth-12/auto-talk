import { makeWASocket, useMultiFileAuthState, DisconnectReason, WASocket } from 'baileys';
import qrcode from 'qrcode-terminal';
import { processMessageBatch } from './message-history-processor';
import { initOrchestrator } from './message-history-analyzer';
import { PATHS } from '../config/config';

export async function connectToWhatsApp(): Promise<WASocket> {
    // Load saved credentials or create new ones
    const { state, saveCreds } = await useMultiFileAuthState(PATHS.AUTH_FOLDER);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
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
            const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
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

    sock.ev.on('messaging-history.set', ({ messages, contacts, chats }) => {
        processMessageBatch(messages, contacts, chats);
    });

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

    // Initialize orchestrator before returning
    initOrchestrator();

    return sock;
}
