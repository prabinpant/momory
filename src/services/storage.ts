import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getConfig, getLogger } from '../utils/index.js';
import { Result, success, failure } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = getLogger();

// Singleton database instance
let db: Database.Database | null = null;

/**
 * Initialize database schema
 */
function initializeSchema(database: Database.Database): void {
  const schemaPath = join(__dirname, '../../db/schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  database.exec(schema);
  logger.debug('Database schema initialized');
}

/**
 * Initialize database connection
 */
function initializeDatabase(dbPath: string): Database.Database {
  try {
    const database = new Database(dbPath);
    database.pragma('journal_mode = WAL');
    database.pragma('foreign_keys = ON');
    initializeSchema(database);
    logger.info('Database initialized', { path: dbPath });
    return database;
  } catch (error) {
    logger.error('Failed to initialize database', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get the database instance
 */
function getDatabase(): Database.Database {
  if (!db) {
    const config = getConfig();
    db = initializeDatabase(config.memory.dbPath);
  }
  return db;
}

/**
 * Execute a query with error handling
 */
export function query<T>(
  sql: string,
  params: unknown[] = []
): Result<T[], Error> {
  try {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    const result = stmt.all(...params) as T[];
    return success(result);
  } catch (error) {
    logger.error('Query failed', {
      sql,
      error: error instanceof Error ? error.message : String(error),
    });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Execute an insert/update/delete with error handling
 */
export function execute(
  sql: string,
  params: unknown[] = []
): Result<void, Error> {
  try {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    stmt.run(...params);
    return success(undefined);
  } catch (error) {
    logger.error('Execute failed', {
      sql,
      error: error instanceof Error ? error.message : String(error),
    });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get a single row
 */
export function queryOne<T>(
  sql: string,
  params: unknown[] = []
): Result<T | null, Error> {
  try {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    const result = stmt.get(...params) as T | undefined;
    return success(result || null);
  } catch (error) {
    logger.error('QueryOne failed', {
      sql,
      error: error instanceof Error ? error.message : String(error),
    });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Execute a transaction
 */
export function transaction<T>(fn: () => T): Result<T, Error> {
  try {
    const database = getDatabase();
    const result = database.transaction(fn)();
    return success(result);
  } catch (error) {
    logger.error('Transaction failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

/**
 * Initialize storage (for explicit initialization if needed)
 */
export function initializeStorage(): void {
  getDatabase();
}
