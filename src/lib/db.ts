import fs from 'fs';
import path from 'path';
import Database, { RunResult } from 'better-sqlite3';

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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const insertStmt = db.prepare('INSERT INTO feedback (content) VALUES (?)');

export function insertFeedback(content: string): RunResult {
  return insertStmt.run(content);
}
