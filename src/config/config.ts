import * as path from 'path';

// ============ BASE PATHS ============
const ROOT_DIR = path.join(__dirname, '..', '..');

export const PATHS = {
    ROOT_DIR,
    AUTH_FOLDER: path.join(ROOT_DIR, 'auth_info'),
    PID_FILE: path.join(ROOT_DIR, '.auto-talk.pid'),
    PROCESSED_MESSAGES_FILE: path.join(ROOT_DIR, 'processed_messages.json'),
    ANALYSIS_OUTPUT_FILE: 'whatsapp-msgs-analysis.json'
};

// ============ MESSAGE PROCESSOR CONFIG ============
export const PROCESSOR_CONFIG = {
    maxMessagesPerChat: 500,
    daysToKeep: 7,
    eventDebounceMs: 3000
};

// ============ LLM CONFIG ============
export const LLM_CONFIG = {
    ollamaHost: 'http://localhost:11434',
    ollamaModel: 'llama3.1:70b',
    serverCheckIntervalMs: 2000,
    serverCheckMaxAttempts: 30  // 60 seconds max wait
};

// ============ DEBUG MODE ============
export function isDebugMode(): boolean {
    return process.env.AUTO_TALK_DEBUG === 'true';
}
