import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import type { RunResult } from 'better-sqlite3';
import { fileURLToPath } from 'url';
import config from "../../config.json" with { type: "json" }

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'feedback.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
sqliteVec.load(db);

db.exec(`
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    sentiment TEXT NOT NULL,
    process_id TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    summary TEXT NOT NULL,
    weight INTEGER NOT NULL,
    emotion TEXT NOT NULL
  )
`);

db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS feedback_vec USING vec0(
    process_id TEXT PRIMARY KEY,
    embedding float[${config.embeddingDimensions}] distance_metric=cosine
  )
`);

const insertStmt = db.prepare('INSERT INTO feedback (content, sentiment, process_id, category, summary, weight, emotion) VALUES (?,?,?,?,?,?,?)');
const queryStmt = db.prepare('SELECT process_id, sentiment, content, category, summary, weight, emotion, created_at FROM feedback ORDER BY created_at DESC');
const embedStmt = db.prepare('INSERT INTO feedback_vec (process_id, embedding) VALUES (?,?)');

export type FeedbackItem = {
  processId: string;
  content: string;
  sentiment: string;
  category: string;
  summary: string;
  weight: number;
  emotion: string;
};

export type FeedbackQueryResultItem = FeedbackItem & {
  createdAt: string;
};

export type FeedbackEmbedding = {
  processId: string;
  embedding: number[];
};

export type FeedbackEmbeddingQueryResultItem = {
  processId: string;
  content: string;
  summary: string;
  distance: number;
};

export type FeedbackEmbeddingQuery = {
  embedding: number[];
  sentiment?: string;
  category?: string;
  emotion?: string;
};

export function insertFeedback(feedback: FeedbackItem): RunResult {
  return insertStmt.run(feedback.content, feedback.sentiment, feedback.processId, feedback.category, feedback.summary, feedback.weight, feedback.emotion);
}

export function queryFeedback(): FeedbackQueryResultItem[] {
  return queryStmt.all().map((row: any) => ({
    processId: row.process_id,
    content: row.content,
    sentiment: row.sentiment,
    category: row.category,
    summary: row.summary,
    weight: row.weight,
    emotion: row.emotion,
    createdAt: row.created_at
  }));
}

export function insertFeedbackEmbedding(feedbackEmbedding: FeedbackEmbedding): RunResult {
  return embedStmt.run(feedbackEmbedding.processId, new Float32Array(feedbackEmbedding.embedding));
}

export function queryFeedbackEmbedding(feedbackEmbeddingQuery: FeedbackEmbeddingQuery): FeedbackEmbeddingQueryResultItem[] {
  const hardFilters = ["category", "sentiment", "emotion"] as const;
  const activeHardFilters = hardFilters.filter(hardFilter => feedbackEmbeddingQuery[hardFilter]);
  const conditions = activeHardFilters.map(column => `',' || f.${column} || ',' LIKE '%,' || @${column} || ',%'`);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const embedQueryStmt = db.prepare(`SELECT f.process_id, f.content, f.summary, vec_distance_cosine(v.embedding, @embedding) AS distance FROM feedback f JOIN feedback_vec v ON f.process_id = v.process_id ${where} ORDER BY distance LIMIT @limit`);
  const params: Record<string, unknown> = { embedding: new Float32Array(feedbackEmbeddingQuery.embedding), limit: config.embeddingQueryLimit };
  for (const filter of activeHardFilters) {
    params[filter] = feedbackEmbeddingQuery[filter];
  }
  return embedQueryStmt.all(params).map((row: any) => ({
    processId: row.process_id,
    content: row.content,
    summary: row.summary,
    distance: row.distance
  }));
}
