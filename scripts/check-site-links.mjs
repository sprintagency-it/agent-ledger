import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const site = path.join(root, 'site');
const htmlFiles = listHtml(site);
const failures = [];

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const attributes = html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi);
  for (const match of attributes) {
    const reference = match[1];
    if (isExternal(reference) || reference.startsWith('#')) continue;

    const pathname = decodeURIComponent(reference.split('#')[0].split('?')[0]);
    if (!pathname) continue;
    const candidate = pathname.startsWith('/')
      ? path.join(site, pathname)
      : path.resolve(path.dirname(file), pathname);
    if (!resolveLocalTarget(candidate)) {
      failures.push(`${path.relative(site, file)} -> ${reference}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Broken local site references:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`Checked ${htmlFiles.length} HTML files: no broken local references.`);
}

function isExternal(reference) {
  return /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(reference);
}

function resolveLocalTarget(candidate) {
  if (existsSync(candidate)) return true;
  if (!path.extname(candidate) && existsSync(`${candidate}.html`)) return true;
  return existsSync(path.join(candidate, 'index.html'));
}

function listHtml(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const absolute = path.join(directory, entry);
    if (statSync(absolute).isDirectory()) files.push(...listHtml(absolute));
    else if (entry.endsWith('.html')) files.push(absolute);
  }
  return files;
}
