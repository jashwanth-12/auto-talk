import { EventEmitter } from 'events';
import { log } from '../logs/logger';
import { promptLlm } from './llm';
import { MESSAGE_HISTORY_PROMPT } from './prompts';
import * as repository from '../repository/message-history-repository';
import { ChatMessage, ChatRelation } from '../repository/message-history-repository';

// ============ EVENT TYPES ============
export const OrchestratorEvents = {
    INITIAL_HISTORY_RECEIVED: 'InitialHistoryReceived'
} as const;

// ============ EVENT BUS ============
export const eventBus = new EventEmitter();

// ============ ORCHESTRATOR ============
export function initOrchestrator(): void {
    log('Orchestrator initialized');

    // Subscribe to InitialHistoryReceived event
    eventBus.on(OrchestratorEvents.INITIAL_HISTORY_RECEIVED, () => {
        handleInitialHistoryReceived();
    });
}

function formatMessagesForPrompt(chats: Record<string, ChatMessage[]>): string {
    const lines: string[] = [];

    for (const [chatName, messages] of Object.entries(chats)) {
        lines.push(`\n=== Chat: ${chatName} ===`);
        for (const msg of messages) {
            lines.push(`[${msg.sender}]: ${msg.message}`);
        }
    }

    return lines.join('\n');
}

function buildAnalysisPrompt(messagesText: string): string {
    return MESSAGE_HISTORY_PROMPT.replace('{messagesText}', messagesText);
}

function parseRelationsFromResponse(response: string): Record<string, ChatRelation> | null {
    try {
        // Try to extract JSON from the response (LLM might include extra text)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            log('[Analyzer] No JSON found in response');
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]) as Record<string, ChatRelation>;
        return parsed;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log('[Analyzer] Failed to parse LLM response: ' + errorMessage);
        return null;
    }
}

async function handleInitialHistoryReceived(): Promise<void> {
    const chats = repository.getChats();
    const chatCount = Object.keys(chats).length;

    if (chatCount === 0) {
        log('[Analyzer] No chats available');
        return;
    }

    const messageCount = Object.values(chats).reduce((sum, msgs) => sum + msgs.length, 0);

    log(`[Analyzer] Received InitialHistoryReceived event`);
    log(`  - Chats: ${chatCount}`);
    log(`  - Messages: ${messageCount}`);

    try {
        log('[Analyzer] Analyzing message history with LLM...');

        const messagesText = formatMessagesForPrompt(chats);
        const prompt = buildAnalysisPrompt(messagesText);

        const response = await promptLlm(prompt);

        const relations = parseRelationsFromResponse(response);
        if (relations) {
            repository.setRelations(relations);
            log(`[Analyzer] Stored ${Object.keys(relations).length} relations`);
        }

        log('[Analyzer] Analysis complete');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log('[Analyzer] Error during analysis: ' + errorMessage);
    }
}
