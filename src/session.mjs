import path from 'node:path';
import { existsSync } from 'node:fs';
import { appendJsonl, ensureDir, listFiles, newId, readJson, slugify, timestampSlug, writeJson } from './fs-utils.mjs';
import { createEvent } from './events.mjs';

export function outputRoot(options = {}) {
  return path.resolve(options.out || '.agent-ledger');
}

export function currentPointerPath(outRoot) {
  return path.join(outRoot, 'current-session.json');
}

export function sessionsRoot(outRoot) {
  return path.join(outRoot, 'sessions');
}

export function sessionDir(outRoot, sessionName) {
  return path.join(sessionsRoot(outRoot), sessionName);
}

export function sessionFile(dir, name) {
  return path.join(dir, name);
}

export function createSession(options) {
  const outRoot = outputRoot(options);
  const projectPath = path.resolve(options.project || process.cwd());
  const name = `${timestampSlug()}-${slugify(options.name || 'agent-run')}`;
  const dir = sessionDir(outRoot, name);
  ensureDir(dir);

  const meta = {
    schema_version: '0.1',
    session_id: newId(),
    name,
    goal: options.goal || '',
    scope: options.scope || '',
    sensitive_paths: splitCsv(options.sensitive || ''),
    created_at: new Date().toISOString(),
    project_path: projectPath,
    output_root: outRoot,
    session_dir: dir,
    capture_limitations: [
      'V0 captures git state, transcript input, wrapper commands and manual events.',
      'It does not claim complete capture of every agent action.',
      'Codex and Claude Code use repository skills; capture still begins when this runtime starts.'
    ]
  };

  writeJson(sessionFile(dir, 'session.meta.json'), meta);
  writeJson(currentPointerPath(outRoot), { session_dir: dir, session_id: meta.session_id });
  appendJsonl(sessionFile(dir, 'session.jsonl'), createEvent({
    session_id: meta.session_id,
    actor: 'human',
    source: 'cli',
    event_type: 'note',
    target: '.',
    summary: `Session started: ${options.name || 'agent-run'}`,
    meta: { goal: meta.goal, scope: meta.scope, project_path: projectPath, sensitive_paths: meta.sensitive_paths }
  }));

  return { meta, dir };
}

export function resolveSession(options = {}) {
  if (options.session) {
    const dir = path.resolve(options.session);
    const meta = readJson(sessionFile(dir, 'session.meta.json'));
    if (!meta) throw new Error(`No session.meta.json found in ${dir}`);
    return { dir, meta };
  }
  const outRoot = outputRoot(options);
  const pointer = readJson(currentPointerPath(outRoot));
  if (!pointer?.session_dir) {
    throw new Error(`No current session found in ${outRoot}. Run agent-ledger start first or pass --session.`);
  }
  const dir = pointer.session_dir;
  const meta = readJson(sessionFile(dir, 'session.meta.json'));
  if (!meta) throw new Error(`No session.meta.json found in ${dir}`);
  return { dir, meta };
}

export function writeSnapshot(session, stage = 'after') {
  if (!existsSync(session.meta.project_path)) {
    throw new Error(`Project path does not exist: ${session.meta.project_path}`);
  }
  const snapshot = {
    stage,
    created_at: new Date().toISOString(),
    project_path: session.meta.project_path,
    files: listFiles(session.meta.project_path)
  };
  writeJson(sessionFile(session.dir, `workspace-${stage}.json`), snapshot);
  appendJsonl(sessionFile(session.dir, 'session.jsonl'), createEvent({
    session_id: session.meta.session_id,
    actor: 'system',
    source: 'snapshot',
    event_type: 'artifact',
    target: `workspace-${stage}.json`,
    summary: `Workspace ${stage} snapshot captured (${snapshot.files.length} files).`,
    meta: { file_count: snapshot.files.length }
  }));
  return snapshot;
}

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
