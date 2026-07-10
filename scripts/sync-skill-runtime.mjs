import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'src');
const target = path.join(root, '.agents', 'skills', 'agent-ledger', 'runtime', 'src');
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  const differences = compareTrees(source, target);
  if (differences.length > 0) {
    console.error(`Bundled skill runtime is out of sync:\n- ${differences.join('\n- ')}`);
    process.exitCode = 1;
  } else {
    console.log('Bundled skill runtime matches src/.');
  }
} else {
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true, force: true });
  console.log(`Synced ${source} to ${target}`);
}

function compareTrees(leftRoot, rightRoot) {
  if (!existsSync(rightRoot)) return ['runtime directory is missing'];

  const leftFiles = listFiles(leftRoot);
  const rightFiles = listFiles(rightRoot);
  const differences = [];

  for (const file of leftFiles) {
    if (!rightFiles.includes(file)) {
      differences.push(`${file} is missing from the bundled runtime`);
      continue;
    }
    const left = readFileSync(path.join(leftRoot, file));
    const right = readFileSync(path.join(rightRoot, file));
    if (!left.equals(right)) differences.push(`${file} differs from src/`);
  }

  for (const file of rightFiles) {
    if (!leftFiles.includes(file)) differences.push(`${file} exists only in the bundled runtime`);
  }

  return differences;
}

function listFiles(directory, prefix = '') {
  const files = [];
  for (const entry of readdirSync(directory).sort()) {
    const absolute = path.join(directory, entry);
    const relative = path.join(prefix, entry);
    if (statSync(absolute).isDirectory()) files.push(...listFiles(absolute, relative));
    else files.push(relative);
  }
  return files;
}
