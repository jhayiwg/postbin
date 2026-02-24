"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRequestById = exports.clearRequestsByApp = exports.getRequestsByApp = exports.insertRequest = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Ensure the data directory exists
const dataDir = path_1.default.join(__dirname, "..", "data");
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path_1.default.join(dataDir, "postbin.db");
const db = new better_sqlite3_1.default(dbPath);
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
exports.insertRequest = db.prepare(`
  INSERT INTO requests (id, app_slug, method, url, headers, query_params, body, ip)
  VALUES (@id, @app_slug, @method, @url, @headers, @query_params, @body, @ip)
`);
exports.getRequestsByApp = db.prepare(`
  SELECT * FROM requests 
  WHERE app_slug = ? 
  ORDER BY created_at DESC
  LIMIT 100
`);
exports.clearRequestsByApp = db.prepare(`
  DELETE FROM requests WHERE app_slug = ?
`);
exports.deleteRequestById = db.prepare(`
  DELETE FROM requests WHERE id = ? AND app_slug = ?
`);
exports.default = db;
//# sourceMappingURL=db.js.map