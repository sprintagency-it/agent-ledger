import { cpSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const statuses = ['pass', 'warn', 'block'];

for (const status of statuses) {
  const source = path.join(root, 'examples', 'reports', status, 'replay.html');
  const targetDir = path.join(root, 'site', 'reports', status);
  mkdirSync(targetDir, { recursive: true });
  cpSync(source, path.join(targetDir, 'index.html'), { force: true });
}

console.log(JSON.stringify({
  site: path.join(root, 'site'),
  reports: statuses.map((status) => `site/reports/${status}/index.html`)
}, null, 2));
