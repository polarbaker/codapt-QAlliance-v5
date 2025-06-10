/**
 * Helper function to safely parse base64 content from a string
 * that could be a data URL (data:image/jpeg;base64,ABC123) or a raw base64 string
 */
export function safeParseBase64(content: string): string {
  if (!content) {
    throw new Error('Empty content provided');
  }
  
  if (content.includes('base64,')) {
    const parts = content.split('base64,');
    if (parts.length <= 1) {
      return content; // Fallback to original if split failed
    }
    // Ensure we never return undefined
    return parts[1] || content;
  }
  
  return content;
}
