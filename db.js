const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'linkpage.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT DEFAULT '',
    image TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

function getAllLinks() {
  return db.prepare('SELECT * FROM links ORDER BY sort_order ASC, id ASC').all();
}

function getLink(id) {
  return db.prepare('SELECT * FROM links WHERE id = ?').get(id);
}

function createLink({ title, url, icon, image, sort_order }) {
  const stmt = db.prepare(
    'INSERT INTO links (title, url, icon, image, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  const result = stmt.run(title, url, icon || '', image || '', sort_order || 0);
  return result.lastInsertRowid;
}

function updateLink(id, { title, url, icon, image, sort_order }) {
  const existing = getLink(id);
  if (!existing) return false;
  const stmt = db.prepare(
    'UPDATE links SET title = ?, url = ?, icon = ?, image = ?, sort_order = ? WHERE id = ?'
  );
  stmt.run(
    title ?? existing.title,
    url ?? existing.url,
    icon ?? existing.icon,
    image ?? existing.image,
    sort_order ?? existing.sort_order,
    id
  );
  return true;
}

function deleteLink(id) {
  return db.prepare('DELETE FROM links WHERE id = ?').run(id).changes > 0;
}

// --- Pathologist links ---
db.exec(`
  CREATE TABLE IF NOT EXISTS path_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    section TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

function getAllPathLinks() {
  return db.prepare('SELECT * FROM path_links ORDER BY sort_order ASC, id ASC').all();
}

function getPathLink(id) {
  return db.prepare('SELECT * FROM path_links WHERE id = ?').get(id);
}

function createPathLink({ title, url, section, sort_order }) {
  const result = db.prepare(
    'INSERT INTO path_links (title, url, section, sort_order) VALUES (?, ?, ?, ?)'
  ).run(title, url, section, sort_order || 0);
  return result.lastInsertRowid;
}

function updatePathLink(id, { title, url, section, sort_order }) {
  const existing = getPathLink(id);
  if (!existing) return false;
  db.prepare(
    'UPDATE path_links SET title = ?, url = ?, section = ?, sort_order = ? WHERE id = ?'
  ).run(title ?? existing.title, url ?? existing.url, section ?? existing.section, sort_order ?? existing.sort_order, id);
  return true;
}

function deletePathLink(id) {
  return db.prepare('DELETE FROM path_links WHERE id = ?').run(id).changes > 0;
}

// --- Pathologist sections ---
db.exec(`
  CREATE TABLE IF NOT EXISTS path_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    icon TEXT DEFAULT '',
    has_icd_search INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0
  )
`);

function getAllPathSections() {
  return db.prepare('SELECT * FROM path_sections ORDER BY sort_order ASC, id ASC').all();
}

function getPathSection(id) {
  return db.prepare('SELECT * FROM path_sections WHERE id = ?').get(id);
}

function createPathSection({ key, label, icon, has_icd_search, sort_order }) {
  const result = db.prepare(
    'INSERT INTO path_sections (key, label, icon, has_icd_search, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).run(key, label, icon || '', has_icd_search ? 1 : 0, sort_order || 0);
  return result.lastInsertRowid;
}

function updatePathSection(id, { key, label, icon, has_icd_search, sort_order }) {
  const existing = getPathSection(id);
  if (!existing) return false;
  db.prepare(
    'UPDATE path_sections SET key = ?, label = ?, icon = ?, has_icd_search = ?, sort_order = ? WHERE id = ?'
  ).run(key ?? existing.key, label ?? existing.label, icon ?? existing.icon, has_icd_search !== undefined ? (has_icd_search ? 1 : 0) : existing.has_icd_search, sort_order ?? existing.sort_order, id);
  return true;
}

function deletePathSection(id) {
  return db.prepare('DELETE FROM path_sections WHERE id = ?').run(id).changes > 0;
}

module.exports = { db, getAllLinks, getLink, createLink, updateLink, deleteLink, getAllPathLinks, getPathLink, createPathLink, updatePathLink, deletePathLink, getAllPathSections, getPathSection, createPathSection, updatePathSection, deletePathSection };
