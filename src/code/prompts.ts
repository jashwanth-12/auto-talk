export const MESSAGE_HISTORY_PROMPT = `You are analyzing WhatsApp message history to help understand relationships and conversation topics.

Here is the message history:
{messagesText}

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
