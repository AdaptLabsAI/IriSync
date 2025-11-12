/**
 * Estimate token usage for a text string
 * This is a crude approximation based on the GPT tokenizer
 * For accurate counts, you would use a real tokenizer like tiktoken
 * 
 * @param text Text to count tokens for
 * @returns Estimated token count
 */
export function estimateTokenUsage(text: string): number {
  if (!text) return 0;
  
  // Crude approximation: most tokenizers average 4 characters per token
  // This accounts for whitespace, punctuation, and common words
  const estimate = Math.ceil(text.length / 4);
  
  // Add a small buffer
  return Math.max(1, estimate);
}

/**
 * Estimate token usage for a chat message array
 * This is a crude approximation based on the GPT tokenizer
 * 
 * @param messages Array of chat messages
 * @returns Estimated token count
 */
export function estimateChatTokenUsage(messages: any[]): number {
  if (!messages || !messages.length) return 0;
  
  let totalTokens = 0;
  
  // Each message has a few tokens of overhead
  const messageOverhead = 4;
  
  // Process each message
  for (const message of messages) {
    // Add overhead for each message
    totalTokens += messageOverhead;
    
    // Add tokens for content
    if (message.content) {
      totalTokens += estimateTokenUsage(message.content);
    }
    
    // Add tokens for role (system, user, assistant)
    if (message.role) {
      totalTokens += 1;
    }
    
    // Add tokens for name if present
    if (message.name) {
      totalTokens += estimateTokenUsage(message.name);
    }
  }
  
  return totalTokens;
}

/**
 * Limit a prompt to a maximum token count by truncating
 * 
 * @param text Text to limit
 * @param maxTokens Maximum token count
 * @returns Truncated text
 */
export function limitPromptTokens(text: string, maxTokens: number): string {
  if (!text) return '';
  
  const estimatedTokens = estimateTokenUsage(text);
  
  if (estimatedTokens <= maxTokens) {
    return text;
  }
  
  // Approximate characters to keep
  const charLimit = Math.floor(maxTokens * 4);
  
  // Truncate to approximate character count
  return text.substring(0, charLimit) + '...';
}
