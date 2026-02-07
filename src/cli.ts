/**
 * Interactive CLI for Momory agent
 */

import * as readline from 'readline';
import { processInput, AgentSession } from './core/agent.js';
import { countMemories, getAllSummaryChunks } from './core/memory.js';
import { initializeStorage } from './services/storage.js';
import { getLogger } from './utils/logger.js';

const logger = getLogger();

/**
 * CLI commands
 */
const COMMANDS = {
  '/help': 'Show available commands',
  '/stats': 'Show memory statistics',
  '/clear': 'Clear conversation history',
  '/exit': 'Exit Momory',
  '/quit': 'Exit Momory',
};

/**
 * Display welcome message
 */
function showWelcome(): void {
  console.log(
    '\n╔═══════════════════════════════════════════════════════════╗'
  );
  console.log('║                    🧠 MOMORY v1.0.0                       ║');
  console.log('║          AI Agent with Persistent Memory                  ║');
  console.log(
    '╚═══════════════════════════════════════════════════════════╝\n'
  );
  console.log('Type your message or use commands:');
  Object.entries(COMMANDS).forEach(([cmd, desc]) => {
    console.log(`  ${cmd.padEnd(10)} - ${desc}`);
  });
  console.log();
}

/**
 * Display memory statistics
 */
async function showStats(): Promise<void> {
  const memoryCount = await countMemories();
  const chunksResult = await getAllSummaryChunks();

  console.log('\n📊 Memory Statistics:');
  console.log(
    `  Total memories: ${memoryCount.ok ? memoryCount.value : 'error'}`
  );
  console.log(
    `  Summary chunks: ${chunksResult.ok ? chunksResult.value.length : 'error'}`
  );
  console.log();
}

/**
 * Format response with metadata
 */
function formatResponse(
  message: string,
  stats: {
    memoriesExtracted: number;
    memoriesFound: number;
    summaryChunksFound: number;
    promptTokens: number;
  }
): void {
  console.log('\n🤖 Momory:');
  console.log(message);
  console.log(
    `\n💾 ${stats.memoriesFound} memories | 📝 ${stats.summaryChunksFound} chunks | ✨ ${stats.memoriesExtracted} extracted | 🎯 ${stats.promptTokens} tokens\n`
  );
}

/**
 * Main CLI loop
 */
async function runCLI(): Promise<void> {
  try {
    // Initialize storage
    initializeStorage();
    logger.info('Momory CLI started');

    // Create session
    const session = new AgentSession();

    // Show welcome
    showWelcome();

    // Create readline interface
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '👤 You: ',
    });

    rl.prompt();

    rl.on('line', async (input: string) => {
      const trimmed = input.trim();

      // Handle empty input
      if (!trimmed) {
        rl.prompt();
        return;
      }

      // Handle commands
      if (trimmed.startsWith('/')) {
        switch (trimmed.toLowerCase()) {
          case '/help':
            console.log('\nAvailable commands:');
            Object.entries(COMMANDS).forEach(([cmd, desc]) => {
              console.log(`  ${cmd.padEnd(10)} - ${desc}`);
            });
            console.log();
            break;

          case '/stats':
            await showStats();
            break;

          case '/clear':
            session.clear();
            console.log('\n✅ Conversation history cleared\n');
            break;

          case '/exit':
          case '/quit':
            console.log('\n👋 Goodbye!\n');
            rl.close();
            process.exit(0);
            break;

          default:
            console.log(`\n❌ Unknown command: ${trimmed}`);
            console.log('Type /help for available commands\n');
        }
        rl.prompt();
        return;
      }

      // Process user input
      try {
        const result = await processInput(trimmed, session);

        if (result.ok) {
          formatResponse(result.value.message, {
            memoriesExtracted: result.value.memoriesExtracted,
            memoriesFound: result.value.retrievalStats.memoriesFound,
            summaryChunksFound: result.value.retrievalStats.summaryChunksFound,
            promptTokens: result.value.promptTokens,
          });
        } else {
          console.log(`\n❌ Error: ${result.error.message}\n`);
        }
      } catch (error) {
        console.log(
          `\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`
        );
      }

      rl.prompt();
    });

    rl.on('close', () => {
      console.log('\n👋 Goodbye!\n');
      process.exit(0);
    });

    // Handle Ctrl+C
    rl.on('SIGINT', () => {
      console.log('\n👋 Goodbye!\n');
      process.exit(0);
    });
  } catch (error) {
    logger.error('CLI error', {
      error: error instanceof Error ? error.message : String(error),
    });
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

/**
 * Entry point
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  runCLI();
}

export { runCLI };
