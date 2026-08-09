import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db;

export function initDb() {
  if (db) return db;

  const dbPath = path.join(__dirname, 'haven.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT DEFAULT '',
      created_date TEXT DEFAULT (datetime('now')),
      updated_date TEXT DEFAULT (datetime('now'))
    )
  `);

  // Generic entity store — each entity is a JSON document
  db.exec(`
    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      user_id TEXT NOT NULL,
      data TEXT NOT NULL DEFAULT '{}',
      created_date TEXT DEFAULT (datetime('now')),
      updated_date TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_entities_type_user ON entities(entity_type, user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_entities_user ON entities(user_id)`);

  // OTP codes table (for registration flow)
  db.exec(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT DEFAULT (datetime('now', '+10 minutes'))
    )
  `);

  // Create default user if none exists (for dev convenience)
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (count.c === 0) {
    const id = crypto.randomUUID();
    const hash = hashPassword('demo123');
    db.prepare('INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)').run(
      id, 'demo@haven.app', hash, 'Demo User'
    );
    console.log('[db] Created default user: demo@haven.app / demo123');
  }

  return db;
}

export function getDb() {
  if (!db) return initDb();
  return db;
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verify;
}
