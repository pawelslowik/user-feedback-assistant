import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import type { RunResult } from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'feedback.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    sentiment TEXT NOT NULL,
    process_id TEXT NOT NULL,
    category TEXT NOT NULL,
    summary TEXT NOT NULL,
    weight INTEGER NOT NULL
  )
`);

const insertStmt = db.prepare('INSERT INTO feedback (content, sentiment, process_id, category, summary, weight) VALUES (?,?,?,?,?,?)');
const queryStmt = db.prepare('SELECT process_id, sentiment, content, category, summary, weight FROM feedback ORDER BY created_at');

export type FeedbackItem = {
  processId: string;
  content: string;
  sentiment: string;
  category: string;
  summary: string;
  weight: number;
};

export function insertFeedback(feedback: FeedbackItem): RunResult {
  return insertStmt.run(feedback.content, feedback.sentiment, feedback.processId, feedback.category, feedback.summary, feedback.weight);
}

export function queryFeedback(): FeedbackItem[] {
  return queryStmt.all().map((row: any) => ({
    processId: row.process_id,
    content: row.content,
    sentiment: row.sentiment,
    category: row.category,
    summary: row.summary,
    weight: row.weight,
  }));
}
