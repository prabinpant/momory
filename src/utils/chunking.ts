/**
 * Text chunk with metadata
 */
export interface TextChunk {
  text: string;
  startLine: number;
  endLine: number;
  charStart: number;
  charEnd: number;
}

/**
 * Chunking options
 */
export interface ChunkOptions {
  maxChars: number; // ~400 tokens = 1600 chars
  overlapChars: number; // ~80 tokens = 320 chars (20% overlap)
}

/**
 * Default chunking options (inspired by Clawdbot)
 */
export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = {
  maxChars: 1600, // ~400 tokens
  overlapChars: 320, // ~80 tokens (20% overlap)
};

/**
 * Chunk text into overlapping segments
 *
 * @param text - Text to chunk
 * @param options - Chunking options
 * @returns Array of text chunks with metadata
 *
 * @example
 * const chunks = chunkText(summary, {
 *   maxChars: 1600,
 *   overlapChars: 320
 * });
 * // Returns chunks with 20% overlap for context continuity
 */
export function chunkText(
  text: string,
  options: ChunkOptions = DEFAULT_CHUNK_OPTIONS
): TextChunk[] {
  const lines = text.split('\n');
  const chunks: TextChunk[] = [];

  let currentLines: string[] = [];
  let currentSize = 0;
  let startLine = 0;
  let charStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    currentLines.push(line);
    currentSize += line.length + 1; // +1 for newline

    // Check if chunk is full
    if (currentSize >= options.maxChars) {
      const chunkText = currentLines.join('\n');
      chunks.push({
        text: chunkText,
        startLine,
        endLine: i,
        charStart,
        charEnd: charStart + chunkText.length,
      });

      // Calculate overlap: keep last N lines for next chunk
      const overlapLineCount = Math.ceil(
        (options.overlapChars / currentSize) * currentLines.length
      );

      // Keep last lines for overlap
      const overlapLines = currentLines.slice(-overlapLineCount);
      const overlapText = overlapLines.join('\n');

      // Update for next chunk
      currentLines = overlapLines;
      startLine = i - overlapLineCount + 1;
      charStart = charStart + chunkText.length - overlapText.length;
      currentSize = overlapText.length;
    }
  }

  // Add remaining text as final chunk
  if (currentLines.length > 0) {
    const chunkText = currentLines.join('\n');
    chunks.push({
      text: chunkText,
      startLine,
      endLine: lines.length - 1,
      charStart,
      charEnd: charStart + chunkText.length,
    });
  }

  return chunks;
}

/**
 * Estimate token count from character count
 * Rule of thumb: 1 token ≈ 4 characters for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Get optimal chunk size in characters for target token count
 */
export function getChunkSizeForTokens(targetTokens: number): number {
  return targetTokens * 4;
}
