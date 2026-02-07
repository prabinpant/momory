-- Long-Term Memory table
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('fact', 'decision', 'preference', 'observation')),
  content TEXT NOT NULL,
  embedding BLOB NOT NULL,  -- Stored as JSON array serialized to blob
  created_at INTEGER NOT NULL,
  last_accessed INTEGER NOT NULL,
  access_count INTEGER NOT NULL DEFAULT 0,
  relevance_score REAL NOT NULL DEFAULT 1.0 CHECK(relevance_score >= 0 AND relevance_score <= 1),
  tags TEXT NOT NULL,  -- Stored as JSON array
  source TEXT NOT NULL
);

-- Summary Memory table (metadata only)
CREATE TABLE IF NOT EXISTS summaries (
  id TEXT PRIMARY KEY,
  time_window TEXT NOT NULL CHECK(time_window IN ('daily', 'weekly', 'monthly')),
  start_date INTEGER NOT NULL,
  end_date INTEGER NOT NULL,
  memory_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- Summary Chunks table (chunked content with embeddings)
CREATE TABLE IF NOT EXISTS summary_chunks (
  id TEXT PRIMARY KEY,
  summary_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  char_start INTEGER NOT NULL,
  char_end INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
CREATE INDEX IF NOT EXISTS idx_memories_relevance ON memories(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_time_window ON summaries(time_window);
CREATE INDEX IF NOT EXISTS idx_summaries_dates ON summaries(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_summary_chunks_summary_id ON summary_chunks(summary_id);
CREATE INDEX IF NOT EXISTS idx_summary_chunks_created_at ON summary_chunks(created_at);
