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
    label TEXT NOT NULL
  )
`);

const insertStmt = db.prepare('INSERT INTO feedback (content, label) VALUES (?,?)');

export function insertFeedback(content: string, label: string): RunResult {
  return insertStmt.run(content, label);
}
