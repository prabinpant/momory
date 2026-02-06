import { getConfig, getLogger } from './utils/index.js';
import { initializeStorage } from './services/index.js';

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

    logger.info('MOMO ready');
  } catch (error) {
    logger.error('Failed to start MOMO', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

main();
