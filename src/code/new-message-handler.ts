import { WAMessage } from 'baileys';
import { log } from '../logs/logger';

export function handleNewMessage(message: WAMessage, type: string): void {
    if (message.key?.fromMe || type !== 'notify') {
        return;
    }

    const sender = message.key?.remoteJid;
    const messageContent = message.message?.conversation ||
                           message.message?.extendedTextMessage?.text ||
                           null;

    if (!messageContent) {
        return;
    }

    log(`[NewMessage] From ${sender}: ${messageContent}`);

    // TODO: Process the message
    // - Look up sender in relations repository
    // - Generate appropriate response based on relationship
    // - Send response via WhatsApp client
}
