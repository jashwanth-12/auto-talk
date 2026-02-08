import { Chat, Contact, WAMessage } from 'baileys';
import * as fs from 'fs';
import { eventBus, OrchestratorEvents } from './message-history-analyzer';
import { PATHS, PROCESSOR_CONFIG } from '../config/config';
import * as repository from '../repository/message-history-repository';
import { ChatMessage } from '../repository/message-history-repository';

// ============ CONFIGURATION ============
export interface ProcessorConfig {
    maxMessagesPerChat: number;
    daysToKeep: number;
}

// ============ OUTPUT TYPES ============
export interface ProcessedChatsResult {
    processedAt: string;
    config: ProcessorConfig;
    stats: {
        originalMessageCount: number;
        filteredMessageCount: number;
        chatCount: number;
        batchesReceived: number;
    };
    chats: Record<string, ChatMessage[]>;
}

// ============ INTERNAL STATE ============
const allMessages: WAMessage[] = [];
const contactMap: Record<string, string> = {};  // id -> name
const lidToIdMap: Record<string, string> = {};  // accountLid -> id
let batchCount = 0;

// ============ DEBOUNCE FOR EVENT ============
let debounceTimer: NodeJS.Timeout | null = null;

function scheduleEventEmit(): void {
    // Cancel existing timer
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    // Start new timer - fires after debounce period of no new batches
    debounceTimer = setTimeout(() => {
        console.log('[Processor] Debounce complete, emitting InitialHistoryReceived event');
        eventBus.emit(OrchestratorEvents.INITIAL_HISTORY_RECEIVED);
        debounceTimer = null;
    }, PROCESSOR_CONFIG.eventDebounceMs);
}

// ============ HELPERS ============

function getMessageText(msg: WAMessage): string | null {
    return msg.message?.conversation || msg.message?.extendedTextMessage?.text || null;
}

function getChatName(chatId: string): string {
    return contactMap[chatId] || chatId;
}

function resolveName(idOrLid: string): string {
    // If it's a lid, resolve to id first
    if (idOrLid.endsWith('@lid')) {
        const id = lidToIdMap[idOrLid];
        if (id) {
            return contactMap[id] || id;
        }
        return idOrLid;
    }
    // Otherwise look up directly in contactMap
    return contactMap[idOrLid] || idOrLid;
}

function replaceMentions(text: string, msg: WAMessage): string {
    const mentionedJids = (msg.message?.extendedTextMessage as any)?.contextInfo?.mentionedJid as string[] | undefined;

    if (!mentionedJids || mentionedJids.length === 0) {
        return text;
    }

    let result = text;
    for (const lid of mentionedJids) {
        // lid is like "102323317669906@lid"
        const lidNumber = lid.replace('@lid', '');
        const name = resolveName(lid);

        // Replace @102323317669906 with @name
        result = result.replace(`@${lidNumber}`, `@${name}`);
    }

    return result;
}

// ============ BATCH PROCESSOR ============
export function processMessageBatch(messages: WAMessage[], contacts: Contact[], incomingChats: Chat[]): void {
    batchCount++;

    // Add new messages to internal store
    allMessages.push(...messages);

    // Build lidToIdMap from chats (accountLid -> id)
    for (const chat of incomingChats) {
        if (chat.accountLid && chat.id) {
            lidToIdMap[chat.accountLid] = chat.id;
        }
    }

    // Update contact map with new contacts
    for (const contact of contacts) {
        if (contact.id && contact.notify && contact.notify !== '') {
            contactMap[contact.id] = contact.notify;
        } else if (contact.id && contact.name && contact.name !== '') {
            contactMap[contact.id] = contact.name;
        }
    }

    console.log(`[Processor] Batch #${batchCount}: ${messages.length} messages, ${contacts.length} contacts, ${incomingChats.length} chats`);
    console.log(`[Processor] Total accumulated: ${allMessages.length} messages`);

    // Process all accumulated messages
    const now = Date.now();
    const cutoffTime = now - (PROCESSOR_CONFIG.daysToKeep * 24 * 60 * 60 * 1000);

    // Filter messages: last N days, has text content
    const recentMessages = allMessages.filter(msg => {
        const timestamp = Number(msg.messageTimestamp) * 1000;
        const hasText = getMessageText(msg) !== null;
        return timestamp >= cutoffTime && hasText;
    });

    // Group messages by chat (remoteJid)
    const messagesByChat: Record<string, WAMessage[]> = {};
    for (const msg of recentMessages) {
        const chatId = msg.key?.remoteJid || 'unknown';
        if (!messagesByChat[chatId]) {
            messagesByChat[chatId] = [];
        }
        messagesByChat[chatId].push(msg);
    }

    // Process each chat: limit messages and transform to output format
    const outputChats: Record<string, ChatMessage[]> = {};
    let totalFilteredCount = 0;

    for (const chatId of Object.keys(messagesByChat)) {
        const chatMessages = messagesByChat[chatId]
            .sort((a, b) => Number(a.messageTimestamp) - Number(b.messageTimestamp))
            .slice(-PROCESSOR_CONFIG.maxMessagesPerChat);

        const chatName = getChatName(chatId);

        outputChats[chatName] = chatMessages.map(msg => {
            let senderName: string;

            if (msg.key?.fromMe) {
                senderName = '__me__';
            } else {
                const senderId = msg.key?.participant || msg.key?.remoteJid || 'unknown';
                senderName = resolveName(senderId);
            }

            const rawText = getMessageText(msg) || '';
            const messageText = replaceMentions(rawText, msg);

            return {
                timestamp: Number(msg.messageTimestamp),
                sender: senderName,
                message: messageText
            };
        });

        totalFilteredCount += outputChats[chatName].length;
    }

    const result: ProcessedChatsResult = {
        processedAt: new Date().toISOString(),
        config: {
            maxMessagesPerChat: PROCESSOR_CONFIG.maxMessagesPerChat,
            daysToKeep: PROCESSOR_CONFIG.daysToKeep
        },
        stats: {
            originalMessageCount: allMessages.length,
            filteredMessageCount: totalFilteredCount,
            chatCount: Object.keys(outputChats).length,
            batchesReceived: batchCount
        },
        chats: outputChats
    };

    fs.writeFileSync(PATHS.PROCESSED_MESSAGES_FILE, JSON.stringify(result, null, 2));

    console.log(`[Processor] Processed and saved to ${PATHS.PROCESSED_MESSAGES_FILE}`);
    console.log(`[Processor] Output: ${totalFilteredCount} messages across ${Object.keys(outputChats).length} chats`);

    // Store processed chats in repository and schedule debounced event emit
    repository.setChats(outputChats);
    scheduleEventEmit();
}
