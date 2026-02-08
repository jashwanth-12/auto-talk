// ============ TYPES ============
export interface ChatMessage {
    timestamp: number;
    sender: string;
    message: string;
}

export interface ChatRelation {
    relation: string;
    description: string;
}

// ============ IN-MEMORY STORAGE ============
let processedChats: Record<string, ChatMessage[]> = {};
let relations: Record<string, ChatRelation> = {};

// ============ REPOSITORY METHODS ============
export function setChats(chats: Record<string, ChatMessage[]>): void {
    processedChats = chats;
}

export function getChats(): Record<string, ChatMessage[]> {
    return processedChats;
}

export function setRelations(newRelations: Record<string, ChatRelation>): void {
    relations = newRelations;
}

export function getRelations(): Record<string, ChatRelation> {
    return relations;
}
