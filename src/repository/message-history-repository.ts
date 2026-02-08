// ============ TYPES ============
export interface ChatMessage {
    timestamp: number;
    sender: string;
    message: string;
}

// ============ IN-MEMORY STORAGE ============
// TODO: Replace with persistent storage (database, file, etc.)
let processedChats: Record<string, ChatMessage[]> = {};

// ============ REPOSITORY METHODS ============
export function setChats(chats: Record<string, ChatMessage[]>): void {
    processedChats = chats;
}

export function getChats(): Record<string, ChatMessage[]> {
    return processedChats;
}
