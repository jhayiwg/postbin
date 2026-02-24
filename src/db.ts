import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Ensure the data directory exists
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "postbin.db");
import type * as BetterSqlite3 from "better-sqlite3";
const db: BetterSqlite3.Database = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    app_slug TEXT NOT NULL,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    headers TEXT NOT NULL,
    query_params TEXT NOT NULL,
    body TEXT,
    ip TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_app_slug ON requests(app_slug);
  CREATE INDEX IF NOT EXISTS idx_created_at ON requests(created_at DESC);
`);

export interface RequestRecord {
  id: string;
  app_slug: string;
  method: string;
  url: string;
  headers: string;
  query_params: string;
  body: string | null;
  ip: string | null;
  created_at?: string;
}

export const insertRequest: BetterSqlite3.Statement = db.prepare(`
  INSERT INTO requests (id, app_slug, method, url, headers, query_params, body, ip)
  VALUES (@id, @app_slug, @method, @url, @headers, @query_params, @body, @ip)
`);

export const getRequestsByApp: BetterSqlite3.Statement = db.prepare(`
  SELECT * FROM requests 
  WHERE app_slug = ? 
  ORDER BY created_at DESC
  LIMIT 100
`);

export const clearRequestsByApp: BetterSqlite3.Statement = db.prepare(`
  DELETE FROM requests WHERE app_slug = ?
`);

export const deleteRequestById: BetterSqlite3.Statement = db.prepare(`
  DELETE FROM requests WHERE id = ? AND app_slug = ?
`);

export default db;
