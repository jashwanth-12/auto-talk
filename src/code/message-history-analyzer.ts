import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { LLM_CONFIG } from '../config/config';
import { log } from '../logs/logger';
import * as repository from '../repository/message-history-repository';
import { ChatMessage } from '../repository/message-history-repository';

// ============ EVENT TYPES ============
export const OrchestratorEvents = {
    INITIAL_HISTORY_RECEIVED: 'InitialHistoryReceived'
} as const;

// ============ EVENT BUS ============
export const eventBus = new EventEmitter();

// ============ LLM HELPERS ============
async function isOllamaServerRunning(): Promise<boolean> {
    try {
        const response = await fetch(`${LLM_CONFIG.ollamaHost}/api/tags`);
        return response.ok;
    } catch {
        return false;
    }
}

async function waitForServer(): Promise<boolean> {
    log('[LLM] Waiting for Ollama server to be ready...');

    for (let attempt = 0; attempt < LLM_CONFIG.serverCheckMaxAttempts; attempt++) {
        if (await isOllamaServerRunning()) {
            log('[LLM] Ollama server is ready');
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, LLM_CONFIG.serverCheckIntervalMs));
    }

    log('[LLM] Ollama server did not start in time');
    return false;
}

export async function startLlmServerIfNeeded(): Promise<boolean> {
    log('[LLM] Checking if Ollama server is running...');

    if (await isOllamaServerRunning()) {
        log('[LLM] Ollama server is already running');
        return true;
    }

    log('[LLM] Starting Ollama server...');

    // Start ollama serve in background
    const ollamaProcess = spawn('ollama', ['serve'], {
        detached: true,
        stdio: 'ignore'
    });

    ollamaProcess.unref();

    // Wait for server to be ready
    const serverReady = await waitForServer();

    if (!serverReady) {
        return false;
    }

    // Pull/start the model
    log(`[LLM] Ensuring model ${LLM_CONFIG.ollamaModel} is available...`);

    return new Promise((resolve) => {
        const pullProcess = spawn('ollama', ['pull', LLM_CONFIG.ollamaModel], {
            stdio: 'inherit'
        });

        pullProcess.on('close', (code) => {
            if (code === 0) {
                log(`[LLM] Model ${LLM_CONFIG.ollamaModel} is ready`);
                resolve(true);
            } else {
                log(`[LLM] Failed to pull model ${LLM_CONFIG.ollamaModel}`);
                resolve(false);
            }
        });

        pullProcess.on('error', (err) => {
            log('[LLM] Error pulling model: ' + err.message);
            resolve(false);
        });
    });
}

export async function promptLlm(input: string): Promise<string> {
    // Ensure server is running
    const serverReady = await startLlmServerIfNeeded();

    if (!serverReady) {
        throw new Error('Ollama server is not available');
    }

    log('[LLM] Sending prompt to LLM...');

    try {
        const response = await fetch(`${LLM_CONFIG.ollamaHost}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: LLM_CONFIG.ollamaModel,
                prompt: input,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as { response: string };

        log('[LLM] Response received:');
        log(data.response);

        return data.response;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log('[LLM] Error prompting LLM: ' + errorMessage);
        throw error;
    }
}

// ============ ANALYSIS TYPES ============
export interface ChatAnalysis {
    relation: string;
    description: string;
}

export type AnalysisResult = Record<string, ChatAnalysis>;

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
    return `You are analyzing WhatsApp message history to help understand relationships and conversation topics.

Here is the message history:
${messagesText}

Instructions:
- Messages from "__me__" are from the user who owns this WhatsApp
- Analyze each chat/person and determine their likely relationship to the user
- Summarize what they typically discuss in 1-2 sentences
- Return ONLY valid JSON, no other text before or after

Return a JSON object where each key is the chat name, and the value is an object with:
- "relation": the likely relationship (e.g., "friend", "family", "colleague", "group of friends", etc.)
- "description": 1-2 sentences about what they discuss

Example format:
{
  "John": {"relation": "close friend", "description": "Discusses weekend plans and shares memes."},
  "Work Group": {"relation": "work colleagues", "description": "Coordinates meetings and project updates."}
}

Now analyze the messages and return the JSON:`;
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

        await promptLlm(prompt);

        log('[Analyzer] Analysis complete');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log('[Analyzer] Error during analysis: ' + errorMessage);
    }
}
