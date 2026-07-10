import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { appendJsonl, readJson, readJsonl, writeJson, writeText } from './fs-utils.mjs';
import { createEvent } from './events.mjs';
import { sessionFile, writeSnapshot } from './session.mjs';

export function git(projectPath, args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: projectPath,
    encoding: 'utf8',
    maxBuffer: options.maxBuffer || 20 * 1024 * 1024
  });
  if (result.status !== 0 && options.allowFailure !== true) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result;
}

export function isGitRepo(projectPath) {
  const result = git(projectPath, ['rev-parse', '--is-inside-work-tree'], { allowFailure: true });
  return result.status === 0 && result.stdout.trim() === 'true';
}

export function captureGitBaseline(session) {
  if (!isGitRepo(session.meta.project_path)) return null;

  const repoRoot = gitRoot(session.meta.project_path);
  const statusRaw = git(session.meta.project_path, ['status', '--porcelain=v1', '-uall', '--', '.'], { allowFailure: true }).stdout || '';
  const statusRows = normalizeStatusRowsToProject(parseStatus(statusRaw), repoRoot, session.meta.project_path);
  const baseline = {
    captured_at: new Date().toISOString(),
    project_path: session.meta.project_path,
    rows: statusRows
  };

  writeJson(sessionFile(session.dir, 'git-status-before.json'), baseline);
  writeText(sessionFile(session.dir, 'git-status-before.csv'), statusCsv(statusRows));
  appendJsonl(sessionFile(session.dir, 'session.jsonl'), createEvent({
    session_id: session.meta.session_id,
    actor: 'system',
    source: 'git',
    event_type: 'artifact',
    target: 'git-status-before.csv',
    summary: `Git dirty baseline captured (${statusRows.length} pre-existing dirty paths).`,
    meta: { preexisting_dirty_count: statusRows.length }
  }));

  return baseline;
}

export function ingestGit(session) {
  if (!isGitRepo(session.meta.project_path)) {
    throw new Error(`Project is not a git repository: ${session.meta.project_path}`);
  }

  removePreviousGitIngestEvents(session);

  const beforeSnapshot = readJson(sessionFile(session.dir, 'workspace-before.json'), { files: [] });
  const afterSnapshot = writeSnapshot(session, 'after');
  const repoRoot = gitRoot(session.meta.project_path);

  const patch = git(session.meta.project_path, ['diff', '--no-ext-diff', '--patch', '--binary', 'HEAD', '--', '.'], { allowFailure: true }).stdout || '';
  const statusRaw = git(session.meta.project_path, ['status', '--porcelain=v1', '-uall', '--', '.']).stdout || '';
  const currentRows = normalizeStatusRowsToProject(parseStatus(statusRaw), repoRoot, session.meta.project_path);
  const baseline = readJson(sessionFile(session.dir, 'git-status-before.json'), { rows: [] });
  const { runRows, preexistingRows } = filterPreexistingDirtyRows(currentRows, baseline.rows || [], beforeSnapshot.files || [], afterSnapshot.files || []);

  writeText(sessionFile(session.dir, 'diff.patch'), patch || '# No tracked git diff against HEAD.\n');
  writeText(sessionFile(session.dir, 'files-touched.csv'), statusCsv(runRows));
  writeText(sessionFile(session.dir, 'preexisting-dirty.csv'), statusCsv(preexistingRows));

  const events = [
    createEvent({
      session_id: session.meta.session_id,
      actor: 'system',
      source: 'git',
      event_type: 'diff',
      target: 'diff.patch',
      summary: patch ? `Git diff captured (${patch.length} chars).` : 'Git diff captured: no tracked changes against HEAD.',
      meta: { bytes: patch.length }
    }),
    createEvent({
      session_id: session.meta.session_id,
      actor: 'system',
      source: 'git',
      event_type: 'artifact',
      target: 'files-touched.csv',
      summary: `Git status captured (${runRows.length} run-touched paths; ${preexistingRows.length} pre-existing unchanged dirty paths ignored).`,
      meta: { touched_count: runRows.length, preexisting_ignored_count: preexistingRows.length }
    }),
    createEvent({
      session_id: session.meta.session_id,
      actor: 'system',
      source: 'git',
      event_type: 'artifact',
      target: 'preexisting-dirty.csv',
      summary: `Pre-existing unchanged dirty paths ignored (${preexistingRows.length}).`,
      meta: { ignored_dirty_artifact: true }
    }),
    ...runRows.map((row) => createEvent({
      session_id: session.meta.session_id,
      actor: 'agent',
      source: 'git',
      event_type: statusToEventType(row.status),
      target: row.path,
      summary: `Git status ${row.status.trim() || 'changed'} for ${row.path}`,
      meta: { git_status: row.status, baseline_status: row.baseline_status || null }
    }))
  ];

  appendJsonl(sessionFile(session.dir, 'session.jsonl'), events);
  return { patch, statusRows: runRows, preexistingRows, events };
}

function removePreviousGitIngestEvents(session) {
  const eventFile = sessionFile(session.dir, 'session.jsonl');
  const events = readJsonl(eventFile);
  const retained = events.filter((event) => {
    if (event.source !== 'git') return true;
    return Object.hasOwn(event.meta || {}, 'preexisting_dirty_count');
  });
  writeText(eventFile, retained.map((event) => JSON.stringify(event)).join('\n') + (retained.length ? '\n' : ''));
}

export function parseStatus(raw) {
  return raw.split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const status = line.slice(0, 2);
      let filePath = line.slice(3);
      if (filePath.includes(' -> ')) filePath = filePath.split(' -> ').pop();
      return { status, path: filePath };
    });
}

function gitRoot(projectPath) {
  const result = git(projectPath, ['rev-parse', '--show-toplevel'], { allowFailure: true });
  return result.status === 0 ? result.stdout.trim() : projectPath;
}

function normalizeStatusRowsToProject(rows, repoRoot, projectPath) {
  const normalizedRepoRoot = safeRealpath(repoRoot);
  const normalizedProjectPath = safeRealpath(projectPath);
  return rows.map((row) => {
    const absolutePath = path.resolve(normalizedRepoRoot, row.path);
    const relativeToProject = path.relative(normalizedProjectPath, absolutePath);
    const normalizedPath = relativeToProject && !relativeToProject.startsWith('..') && !path.isAbsolute(relativeToProject)
      ? relativeToProject
      : row.path;
    return { ...row, path: normalizedPath };
  });
}

function safeRealpath(value) {
  try {
    return realpathSync(value);
  } catch {
    return path.resolve(value);
  }
}

function filterPreexistingDirtyRows(currentRows, baselineRows, beforeFiles, afterFiles) {
  const baselineByPath = new Map(baselineRows.map((row) => [row.path, row]));
  const beforeByPath = new Map(beforeFiles.map((file) => [file.path, file]));
  const afterByPath = new Map(afterFiles.map((file) => [file.path, file]));
  const runRows = [];
  const preexistingRows = [];

  for (const row of currentRows) {
    const baseline = baselineByPath.get(row.path);
    const before = beforeByPath.get(row.path);
    const after = afterByPath.get(row.path);
    const unchangedSinceStart = baseline
      && baseline.status === row.status
      && fileFingerprint(before) === fileFingerprint(after);

    if (unchangedSinceStart) {
      preexistingRows.push({ ...row, baseline_status: baseline.status });
    } else {
      runRows.push({ ...row, baseline_status: baseline?.status || '' });
    }
  }

  return { runRows, preexistingRows };
}

function fileFingerprint(file) {
  if (!file) return '<missing>';
  return `${file.hash || ''}:${file.size}:${file.mtime || ''}`;
}

function statusCsv(statusRows) {
  return ['status,path,event_type,risk_hint,baseline_status'].concat(statusRows.map((row) => {
    return [row.status, row.path, statusToEventType(row.status), riskHint(row.path, row.status), row.baseline_status || '']
      .map(csvEscape)
      .join(',');
  })).join('\n') + '\n';
}

function statusToEventType(status) {
  if (status.includes('D')) return 'delete';
  if (status.includes('A') || status.includes('?')) return 'write';
  if (status.includes('M') || status.includes('R') || status.includes('C')) return 'write';
  return 'note';
}

function riskHint(filePath, status) {
  const normalized = filePath.toLowerCase();
  if (status.includes('D')) return 'delete';
  if (/(\.env|secret|token|credential|cookie|auth|billing|finance)/.test(normalized)) return 'sensitive_path';
  if (path.extname(filePath) === '.sh') return 'executable_or_script';
  return '';
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
