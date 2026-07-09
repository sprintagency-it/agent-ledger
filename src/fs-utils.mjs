import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, lstatSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

export function readJson(filePath, fallback = null) {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function readText(filePath, fallback = '') {
  if (!existsSync(filePath)) return fallback;
  return readFileSync(filePath, 'utf8');
}

export function writeText(filePath, value) {
  ensureDir(path.dirname(filePath));
  writeFileSync(filePath, value);
}

export function appendJsonl(filePath, events) {
  ensureDir(path.dirname(filePath));
  const lines = Array.isArray(events) ? events : [events];
  appendFileSync(filePath, lines.map((event) => JSON.stringify(event)).join('\n') + '\n');
}

export function readJsonl(filePath) {
  const raw = readText(filePath).trim();
  if (!raw) return [];
  return raw.split(/\n+/).map((line) => JSON.parse(line));
}

export function slugify(input) {
  return String(input || 'session')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'session';
}

export function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-').replace('T', '-').replace('Z', '');
}

export function sha256Text(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

export function hashFile(filePath) {
  return sha256Text(readFileSync(filePath));
}

export function listFiles(root, options = {}) {
  const ignored = new Set(options.ignoredNames || ['.git', '.agent-ledger', 'node_modules', '.pnpm-store', '.DS_Store']);
  const maxBytes = options.maxBytes ?? 1024 * 1024;
  const out = [];

  function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (ignored.has(name)) continue;
      const full = path.join(dir, name);
      const rel = path.relative(root, full);
      const stat = lstatSync(full);
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) {
        walk(full);
      } else if (stat.isFile()) {
        out.push({
          path: rel,
          size: stat.size,
          mtime: stat.mtime.toISOString(),
          hash: stat.size <= maxBytes ? hashFile(full) : null,
          skipped_hash: stat.size > maxBytes
        });
      }
    }
  }

  if (existsSync(root)) walk(root);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

export function newId() {
  return randomUUID();
}

export function resolvePathMaybe(base, value) {
  if (!value) return value;
  return path.isAbsolute(value) ? value : path.resolve(base, value);
}
