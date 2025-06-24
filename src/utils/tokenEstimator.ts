/**
 * Simple token estimation utility for optimizing context usage.
 * Uses approximation methods since we don't have access to actual tokenizers.
 */

/**
 * Estimates token count using character-based approximation.
 * Rule of thumb: ~4 characters per token for English text.
 * @param text The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  // Average of 4 characters per token (conservative estimate)
  const charCount = text.length;
  const estimatedTokens = Math.ceil(charCount / 4);
  
  return estimatedTokens;
}

/**
 * Checks if the estimated token count exceeds the given limit.
 * @param text The text to check
 * @param maxTokens Maximum allowed tokens
 * @returns True if over limit, false otherwise
 */
export function isOverTokenLimit(text: string, maxTokens: number): boolean {
  return estimateTokens(text) > maxTokens;
}

/**
 * Truncates text to approximately fit within token limit.
 * Tries to preserve complete sentences when possible.
 * @param text The text to truncate
 * @param maxTokens Maximum tokens allowed
 * @returns Truncated text
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  if (!text || maxTokens <= 0) return '';
  
  const estimatedCurrentTokens = estimateTokens(text);
  if (estimatedCurrentTokens <= maxTokens) {
    return text;
  }
  
  // Calculate approximate character limit (conservative)
  const maxChars = Math.floor(maxTokens * 3.5); // Slightly less than 4 chars/token for safety
  
  if (text.length <= maxChars) {
    return text;
  }
  
  // Try to find a good truncation point (sentence boundary)
  const truncatedText = text.substring(0, maxChars);
  const lastPeriod = truncatedText.lastIndexOf('.');
  const lastNewline = truncatedText.lastIndexOf('\n');
  
  // Use sentence boundary if available and reasonable
  const cutPoint = Math.max(lastPeriod, lastNewline);
  if (cutPoint > maxChars * 0.7) { // Only if we're not cutting too much
    return text.substring(0, cutPoint + 1) + '\n\n[Content truncated to fit token limit]';
  }
  
  // Otherwise cut at character limit
  return truncatedText + '\n\n[Content truncated to fit token limit]';
}

/**
 * Truncates an array of items to fit within a token budget.
 * Useful for limiting comment history or file lists.
 * @param items Array of strings to potentially truncate
 * @param maxTokens Maximum tokens allowed for all items combined
 * @param maxItems Maximum number of items to include (optional)
 * @returns Truncated array of items
 */
export function truncateArrayToTokenLimit<T extends string>(
  items: T[], 
  maxTokens: number, 
  maxItems?: number
): T[] {
  if (!items.length || maxTokens <= 0) return [];
  
  let totalTokens = 0;
  const result: T[] = [];
  const limit = maxItems ? Math.min(items.length, maxItems) : items.length;
  
  for (let i = 0; i < limit; i++) {
    const itemTokens = estimateTokens(items[i]);
    
    if (totalTokens + itemTokens > maxTokens) {
      break;
    }
    
    result.push(items[i]);
    totalTokens += itemTokens;
  }
  
  return result;
}