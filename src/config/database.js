const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

let db;
function initDatabase() {
  const dbPath = process.env.DB_PATH || './data/anonchan.db';
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(path.join(__dirname, '..', 'models', 'schema.sql'), 'utf8');
  db.exec(schema);
  return db;
}
function getDb() {
  if (!db) initDatabase();
  return db;
}
module.exports = { initDatabase, getDb };
