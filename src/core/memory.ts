import { randomUUID } from 'crypto';
import { query, execute, queryOne } from '../services/storage.js';
import { generateEmbedding } from '../services/gemini.js';
import { getLogger, chunkText, DEFAULT_CHUNK_OPTIONS } from '../utils/index.js';
import {
  Memory,
  MemoryCandidate,
  MemoryType,
  SummaryMemory,
  SummaryChunk,
  Result,
  success,
  failure,
} from '../types/index.js';

const logger = getLogger();

/**
 * Save a new memory to the database
 */
export async function saveMemory(
  candidate: MemoryCandidate,
  source: string = 'conversation'
): Promise<Result<Memory, Error>> {
  try {
    // Generate embedding for the memory content
    const embeddingResult = await generateEmbedding(candidate.content);
    if (!embeddingResult.ok) {
      return failure(embeddingResult.error);
    }

    const now = Date.now();
    const memory: Memory = {
      id: randomUUID(),
      type: candidate.type,
      content: candidate.content,
      embedding: embeddingResult.value,
      metadata: {
        createdAt: now,
        lastAccessed: now,
        accessCount: 0,
        relevanceScore: candidate.confidence,
        tags: candidate.tags,
        source,
      },
    };

    // Serialize embedding and tags as JSON
    const embeddingJson = JSON.stringify(memory.embedding);
    const tagsJson = JSON.stringify(memory.metadata.tags);

    const result = execute(
      `INSERT INTO memories (
        id, type, content, embedding,
        created_at, last_accessed, access_count,
        relevance_score, tags, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        memory.id,
        memory.type,
        memory.content,
        embeddingJson,
        memory.metadata.createdAt,
        memory.metadata.lastAccessed,
        memory.metadata.accessCount,
        memory.metadata.relevanceScore,
        tagsJson,
        memory.metadata.source,
      ]
    );

    if (!result.ok) {
      return failure(result.error);
    }

    logger.info('Memory saved', {
      id: memory.id,
      type: memory.type,
      contentLength: memory.content.length,
    });

    return success(memory);
  } catch (error) {
    logger.error('Failed to save memory', {
      error: error instanceof Error ? error.message : String(error),
    });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get all memories from the database
 */
export async function getAllMemories(): Promise<Result<Memory[], Error>> {
  try {
    const result = query<{
      id: string;
      type: MemoryType;
      content: string;
      embedding: string;
      created_at: number;
      last_accessed: number;
      access_count: number;
      relevance_score: number;
      tags: string;
      source: string;
    }>('SELECT * FROM memories ORDER BY created_at DESC');

    if (!result.ok) {
      return failure(result.error);
    }

    const memories: Memory[] = result.value.map((row) => ({
      id: row.id,
      type: row.type,
      content: row.content,
      embedding: JSON.parse(row.embedding),
      metadata: {
        createdAt: row.created_at,
        lastAccessed: row.last_accessed,
        accessCount: row.access_count,
        relevanceScore: row.relevance_score,
        tags: JSON.parse(row.tags),
        source: row.source,
      },
    }));

    logger.debug('Loaded memories', { count: memories.length });

    return success(memories);
  } catch (error) {
    logger.error('Failed to get memories', {
      error: error instanceof Error ? error.message : String(error),
    });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get memory by ID
 */
export async function getMemoryById(
  id: string
): Promise<Result<Memory | null, Error>> {
  try {
    const result = queryOne<{
      id: string;
      type: MemoryType;
      content: string;
      embedding: string;
      created_at: number;
      last_accessed: number;
      access_count: number;
      relevance_score: number;
      tags: string;
      source: string;
    }>('SELECT * FROM memories WHERE id = ?', [id]);

    if (!result.ok) {
      return failure(result.error);
    }

    if (!result.value) {
      return success(null);
    }

    const row = result.value;
    const memory: Memory = {
      id: row.id,
      type: row.type,
      content: row.content,
      embedding: JSON.parse(row.embedding),
      metadata: {
        createdAt: row.created_at,
        lastAccessed: row.last_accessed,
        accessCount: row.access_count,
        relevanceScore: row.relevance_score,
        tags: JSON.parse(row.tags),
        source: row.source,
      },
    };

    return success(memory);
  } catch (error) {
    logger.error('Failed to get memory by ID', {
      error: error instanceof Error ? error.message : String(error),
    });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Update memory access metadata (for tracking usage)
 */
export async function updateMemoryAccess(
  id: string
): Promise<Result<void, Error>> {
  try {
    const result = execute(
      `UPDATE memories 
       SET last_accessed = ?, access_count = access_count + 1 
       WHERE id = ?`,
      [Date.now(), id]
    );

    if (!result.ok) {
      return failure(result.error);
    }

    return success(undefined);
  } catch (error) {
    logger.error('Failed to update memory access', {
      error: error instanceof Error ? error.message : String(error),
    });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Count total memories
 */
export async function countMemories(): Promise<Result<number, Error>> {
  try {
    const result = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM memories'
    );

    if (!result.ok) {
      return failure(result.error);
    }

    return success(result.value?.count || 0);
  } catch (error) {
    logger.error('Failed to count memories', {
      error: error instanceof Error ? error.message : String(error),
    });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get memories older than a specific timestamp
 */
export async function getOldMemories(
  olderThan: number
): Promise<Result<Memory[], Error>> {
  try {
    const result = query<{
      id: string;
      type: MemoryType;
      content: string;
      embedding: string;
      created_at: number;
      last_accessed: number;
      access_count: number;
      relevance_score: number;
      tags: string;
      source: string;
    }>('SELECT * FROM memories WHERE created_at < ? ORDER BY created_at ASC', [
      olderThan,
    ]);

    if (!result.ok) {
      return failure(result.error);
    }

    const memories: Memory[] = result.value.map((row) => ({
      id: row.id,
      type: row.type,
      content: row.content,
      embedding: JSON.parse(row.embedding),
      metadata: {
        createdAt: row.created_at,
        lastAccessed: row.last_accessed,
        accessCount: row.access_count,
        relevanceScore: row.relevance_score,
        tags: JSON.parse(row.tags),
        source: row.source,
      },
    }));

    return success(memories);
  } catch (error) {
    logger.error('Failed to get old memories', {
      error: error instanceof Error ? error.message : String(error),
    });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Save a summary with chunked content
 */
export async function saveSummary(
  summary: Omit<SummaryMemory, 'id'> & { id?: string },
  content: string
): Promise<Result<SummaryMemory, Error>> {
  try {
    const summaryWithId: SummaryMemory = {
      ...summary,
      id: summary.id || randomUUID(),
    };

    // Save summary metadata (no content)
    const metadataResult = execute(
      `INSERT INTO summaries (
        id, time_window, start_date, end_date,
        memory_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        summaryWithId.id,
        summaryWithId.timeWindow,
        summaryWithId.startDate,
        summaryWithId.endDate,
        summaryWithId.memoryCount,
        summaryWithId.createdAt,
      ]
    );

    if (!metadataResult.ok) {
      return failure(metadataResult.error);
    }

    // Chunk the content
    const chunks = chunkText(content, DEFAULT_CHUNK_OPTIONS);

    logger.info('Summary chunked', {
      summaryId: summaryWithId.id,
      totalChunks: chunks.length,
      avgChunkSize: Math.round(content.length / chunks.length),
    });

    // Embed and save each chunk
    for (const chunk of chunks) {
      const embeddingResult = await generateEmbedding(chunk.text);
      if (!embeddingResult.ok) {
        return failure(embeddingResult.error);
      }

      const chunkResult = execute(
        `INSERT INTO summary_chunks (
          id, summary_id, content, embedding,
          start_line, end_line, char_start, char_end, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          summaryWithId.id,
          chunk.text,
          JSON.stringify(embeddingResult.value),
          chunk.startLine,
          chunk.endLine,
          chunk.charStart,
          chunk.charEnd,
          Date.now(),
        ]
      );

      if (!chunkResult.ok) {
        return failure(chunkResult.error);
      }
    }

    logger.info('Summary saved with chunks', {
      id: summaryWithId.id,
      timeWindow: summaryWithId.timeWindow,
      memoryCount: summaryWithId.memoryCount,
      chunks: chunks.length,
    });

    return success(summaryWithId);
  } catch (error) {
    logger.error('Failed to save summary', {
      error: error instanceof Error ? error.message : String(error),
    });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get all summary chunks
 */
export async function getAllSummaryChunks(): Promise<
  Result<SummaryChunk[], Error>
> {
  try {
    const result = query<{
      id: string;
      summary_id: string;
      content: string;
      embedding: string;
      start_line: number;
      end_line: number;
      char_start: number;
      char_end: number;
      created_at: number;
    }>('SELECT * FROM summary_chunks ORDER BY created_at DESC');

    if (!result.ok) {
      return failure(result.error);
    }

    const chunks: SummaryChunk[] = result.value.map((row) => ({
      id: row.id,
      summaryId: row.summary_id,
      content: row.content,
      embedding: JSON.parse(row.embedding),
      startLine: row.start_line,
      endLine: row.end_line,
      charStart: row.char_start,
      charEnd: row.char_end,
      createdAt: row.created_at,
    }));

    return success(chunks);
  } catch (error) {
    logger.error('Failed to get summary chunks', {
      error: error instanceof Error ? error.message : String(error),
    });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get summary chunks by summary ID
 */
export async function getSummaryChunks(
  summaryId: string
): Promise<Result<SummaryChunk[], Error>> {
  try {
    const result = query<{
      id: string;
      summary_id: string;
      content: string;
      embedding: string;
      start_line: number;
      end_line: number;
      char_start: number;
      char_end: number;
      created_at: number;
    }>(
      'SELECT * FROM summary_chunks WHERE summary_id = ? ORDER BY start_line ASC',
      [summaryId]
    );

    if (!result.ok) {
      return failure(result.error);
    }

    const chunks: SummaryChunk[] = result.value.map((row) => ({
      id: row.id,
      summaryId: row.summary_id,
      content: row.content,
      embedding: JSON.parse(row.embedding),
      startLine: row.start_line,
      endLine: row.end_line,
      charStart: row.char_start,
      charEnd: row.char_end,
      createdAt: row.created_at,
    }));

    return success(chunks);
  } catch (error) {
    logger.error('Failed to get summary chunks', {
      error: error instanceof Error ? error.message : String(error),
    });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get the latest summary (metadata only)
 */
export async function getLatestSummary(): Promise<
  Result<SummaryMemory | null, Error>
> {
  try {
    const result = queryOne<{
      id: string;
      time_window: 'daily' | 'weekly' | 'monthly';
      start_date: number;
      end_date: number;
      memory_count: number;
      created_at: number;
    }>('SELECT * FROM summaries ORDER BY created_at DESC LIMIT 1');

    if (!result.ok) {
      return failure(result.error);
    }

    if (!result.value) {
      return success(null);
    }

    const row = result.value;
    const summary: SummaryMemory = {
      id: row.id,
      timeWindow: row.time_window,
      startDate: row.start_date,
      endDate: row.end_date,
      memoryCount: row.memory_count,
      createdAt: row.created_at,
    };

    return success(summary);
  } catch (error) {
    logger.error('Failed to get latest summary', {
      error: error instanceof Error ? error.message : String(error),
    });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}
