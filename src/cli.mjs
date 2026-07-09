#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { appendJsonl, ensureDir, resolvePathMaybe, writeText } from './fs-utils.mjs';
import { createEvent } from './events.mjs';
import { createSession, resolveSession, sessionFile, writeSnapshot } from './session.mjs';
import { captureGitBaseline, ingestGit } from './git.mjs';
import { ingestTranscript } from './ingest-transcript.mjs';
import { renderSession } from './render-html.mjs';
import { aggregateSessions } from './aggregate.mjs';
import { setupCodexProject } from './setup.mjs';

async function main() {
  const argv = process.argv.slice(2);
  const command = argv.shift();

  try {
    if (!command || command === 'help' || command === '--help') return help();
    if (command === 'setup') return setup(parseOptions(argv));
    if (command === 'init') return init(parseOptions(argv));
    if (command === 'start') return start(parseOptions(argv));
    if (command === 'snapshot') return snapshot(parseOptions(argv));
    if (command === 'ingest') return ingest(parseOptions(argv));
    if (command === 'render') return render(parseOptions(argv));
    if (command === 'aggregate') return aggregate(parseOptions(argv));
    if (command === 'run') return runCommand(argv);
    if (command === 'demo') return demo(parseOptions(argv));
    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    console.error(`agent-ledger: ${error.message}`);
    process.exitCode = 1;
  }
}

function help() {
  console.log(`Agent Ledger V0

Commands:
  setup [--project ./repo] [--gitignore false]
  init --out .agent-ledger
  start --project ./repo --name "run-name" --goal "..." --scope "..." --out .agent-ledger
  snapshot [--stage before|after] [--out .agent-ledger] [--session path]
  ingest --type git [--out .agent-ledger] [--session path]
  ingest --type transcript transcript.md [--out .agent-ledger] [--session path]
  render [--out .agent-ledger] [--session path]
  aggregate [--out supervisor-report.md] [--sessions .agent-ledger/sessions] [session-dir ...]
  run -- command args...
  demo [--out tmp/demo-ledger]
`);
}

function setup(options) {
  if (String(options.gitignore).toLowerCase() === 'false') options.gitignore = false;
  const result = setupCodexProject(options);
  console.log(`Agent Ledger ${result.version} is ready in ${result.project}`);
  console.log(`Skill: ${result.skill}`);
  console.log(`Runtime: ${result.runtime}`);
  console.log('Next: restart Codex if needed, then invoke $agent-ledger with a concrete task.');
}

function init(options) {
  const out = path.resolve(options.out || '.agent-ledger');
  ensureDir(path.join(out, 'sessions'));
  writeText(path.join(out, 'README.md'), `# Agent Ledger Output

This directory stores local Agent Ledger sessions.

Do not commit private session data unless it has been reviewed and redacted.
`);
  console.log(`Initialized ${out}`);
}

function start(options) {
  const session = createSession({
    ...options,
    project: resolvePathMaybe(process.cwd(), options.project || process.cwd())
  });
  writeSnapshot(session, 'before');
  captureGitBaseline(session);
  console.log(session.dir);
}

function snapshot(options) {
  const session = resolveSession(options);
  const snap = writeSnapshot(session, options.stage || 'after');
  console.log(`Snapshot ${snap.stage}: ${snap.files.length} files`);
}

function ingest(options) {
  const session = resolveSession(options);
  if (options.type === 'git') {
    const result = ingestGit(session);
    console.log(`Git ingest: ${result.statusRows.length} touched paths, ${result.events.length} events`);
    return;
  }
  if (options.type === 'transcript') {
    const file = options._[0];
    if (!file) throw new Error('Missing transcript path.');
    const result = ingestTranscript(session, file);
    console.log(`Transcript ingest: ${result.events.length} events`);
    return;
  }
  throw new Error('Unsupported ingest type. Use --type git or --type transcript.');
}

function render(options) {
  const session = resolveSession(options);
  const result = renderSession(session);
  console.log(`Rendered ${sessionFile(session.dir, 'replay.html')} (${result.events.length} events, status ${result.status.kind})`);
}

function aggregate(options) {
  const result = aggregateSessions(options);
  console.log(`Aggregated ${result.sessionCount} session(s) into ${result.outPath}`);
}

function runCommand(argv) {
  const split = argv.indexOf('--');
  const optionArgs = split >= 0 ? argv.slice(0, split) : [];
  const commandArgs = split >= 0 ? argv.slice(split + 1) : argv;
  if (!commandArgs.length) throw new Error('Missing command after --');

  const options = parseOptions(optionArgs);
  const session = resolveSession(options);
  const command = commandArgs[0];
  const args = commandArgs.slice(1);
  const started = new Date().toISOString();

  appendJsonl(sessionFile(session.dir, 'session.jsonl'), createEvent({
    session_id: session.meta.session_id,
    actor: 'agent',
    source: 'wrapper',
    event_type: 'execute',
    target: commandArgs.join(' '),
    summary: `Command started: ${commandArgs.join(' ')}`,
    meta: { started_at: started }
  }));

  const result = spawnSync(command, args, {
    cwd: session.meta.project_path,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 10 * 1024 * 1024
  });
  const commandStatus = Number.isInteger(result.status) ? result.status : 1;
  const spawnError = result.error?.message || '';

  const artifact = `artifacts/command-${Date.now()}.log`;
  writeText(sessionFile(session.dir, artifact), [
    `$ ${commandArgs.join(' ')}`,
    '',
    `exit_code=${commandStatus}`,
    spawnError ? `spawn_error=${spawnError}` : '',
    '',
    '--- stdout ---',
    result.stdout || '',
    '--- stderr ---',
    result.stderr || ''
  ].join('\n'));

  appendJsonl(sessionFile(session.dir, 'session.jsonl'), createEvent({
    session_id: session.meta.session_id,
    actor: 'system',
    source: 'wrapper',
    event_type: 'artifact',
    target: artifact,
    summary: `Command finished with exit code ${commandStatus}: ${commandArgs.join(' ')}`,
    raw_ref: artifact,
    meta: { exit_code: commandStatus, spawn_error: spawnError || null }
  }));

  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (spawnError) process.stderr.write(`agent-ledger: command failed to start: ${spawnError}\n`);
  process.exitCode = commandStatus;
}

function demo(options) {
  const out = path.resolve(options.out || 'tmp/demo-ledger');
  const project = path.resolve(options.project || 'test-fixtures/demo-workspace');
  console.log(`Demo expects a git workspace at ${project}`);
  console.log(`Run tests for an end-to-end generated demo: npm test`);
  console.log(`Suggested output: ${out}`);
}

function parseOptions(args) {
  const options = { _: [] };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [rawKey, inline] = arg.slice(2).split('=');
      const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      if (inline != null) {
        options[key] = inline;
      } else if (args[i + 1] && !args[i + 1].startsWith('--')) {
        options[key] = args[i + 1];
        i += 1;
      } else {
        options[key] = true;
      }
    } else {
      options._.push(arg);
    }
  }
  return options;
}

main();
