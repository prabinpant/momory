import { getConfig, getLogger } from './utils/index.js';
import {
  initializeStorage,
  generateText,
  generateEmbedding,
} from './services/index.js';

async function main(): Promise<void> {
  const logger = getLogger();
  logger.info('MOMO starting...');

  try {
    const config = getConfig();
    logger.info('Configuration loaded', {
      model: config.gemini.model,
      dbPath: config.memory.dbPath,
    });

    initializeStorage();
    logger.info('Storage initialized');

    // Test Gemini connection
    logger.info('Testing Gemini API...');
    const testResult = await generateText('Say "Hello" in one word');
    if (!testResult.ok) {
      throw new Error(`Gemini test failed: ${testResult.error.message}`);
    }
    logger.info('Gemini API working', { response: testResult.value });

    // Test embedding generation
    const embeddingResult = await generateEmbedding('test text');
    if (!embeddingResult.ok) {
      throw new Error(
        `Embedding test failed: ${embeddingResult.error.message}`
      );
    }
    logger.info('Embedding generation working', {
      dimensions: embeddingResult.value.length,
    });

    logger.info('MOMO ready');
  } catch (error) {
    logger.error('Failed to start MOMO', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

main();
