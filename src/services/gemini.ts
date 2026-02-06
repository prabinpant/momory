import { GoogleGenerativeAI } from '@google/generative-ai';
import { getConfig, getLogger } from '../utils/index.js';
import { Result, success, failure } from '../types/index.js';

const logger = getLogger();

// Singleton Gemini client
let genAI: GoogleGenerativeAI | null = null;

// Embedding cache (LRU-style, simple implementation)
const embeddingCache = new Map<string, number[]>();
let cacheKeys: string[] = [];

/**
 * Initialize Gemini client
 */
function initializeGemini(): GoogleGenerativeAI {
  if (!genAI) {
    const config = getConfig();
    genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    logger.info('Gemini client initialized', { model: config.gemini.model });
  }
  return genAI;
}

/**
 * Get the Gemini client
 */
function getClient(): GoogleGenerativeAI {
  return initializeGemini();
}

/**
 * Generate text using Gemini
 */
export async function generateText(
  prompt: string
): Promise<Result<string, Error>> {
  try {
    const config = getConfig();
    const client = getClient();
    const model = client.getGenerativeModel({ model: config.gemini.model });

    logger.debug('Generating text', { promptLength: prompt.length });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    logger.debug('Text generated', { responseLength: text.length });

    return success(text);
  } catch (error) {
    logger.error('Text generation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Generate embedding for text with caching
 */
export async function generateEmbedding(
  text: string
): Promise<Result<number[], Error>> {
  try {
    // Check cache first
    if (embeddingCache.has(text)) {
      logger.debug('Embedding cache hit', { textLength: text.length });
      return success(embeddingCache.get(text)!);
    }

    const client = getClient();
    const model = client.getGenerativeModel({ model: 'gemini-embedding-001' });

    logger.debug('Generating embedding', { textLength: text.length });

    const result = await model.embedContent(text);
    const embedding = result.embedding.values;

    // Cache the embedding
    addToCache(text, embedding);

    logger.debug('Embedding generated', { dimensions: embedding.length });

    return success(embedding);
  } catch (error) {
    logger.error('Embedding generation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<Result<number[][], Error>> {
  try {
    const embeddings: number[][] = [];

    // Process in batches to avoid rate limits
    const config = getConfig();
    const batchSize = config.performance.vectorSearchBatchSize;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map((text) => generateEmbedding(text))
      );

      for (const result of batchResults) {
        if (!result.ok) {
          return failure(result.error);
        }
        embeddings.push(result.value);
      }
    }

    logger.debug('Batch embeddings generated', { count: texts.length });

    return success(embeddings);
  } catch (error) {
    logger.error('Batch embedding generation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Add embedding to cache with LRU eviction
 */
function addToCache(text: string, embedding: number[]): void {
  const config = getConfig();
  const maxSize = config.performance.embeddingCacheSize;

  // If cache is full, remove oldest entry (LRU)
  if (embeddingCache.size >= maxSize) {
    const oldestKey = cacheKeys.shift();
    if (oldestKey) {
      embeddingCache.delete(oldestKey);
    }
  }

  embeddingCache.set(text, embedding);
  cacheKeys.push(text);
}

/**
 * Clear the embedding cache
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
  cacheKeys = [];
  logger.debug('Embedding cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  maxSize: number;
  hitRate: number;
} {
  const config = getConfig();
  return {
    size: embeddingCache.size,
    maxSize: config.performance.embeddingCacheSize,
    hitRate: 0, // TODO: Implement hit rate tracking
  };
}
