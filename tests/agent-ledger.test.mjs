import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { classifyEvent } from '../src/risk.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CLI = path.join(ROOT, 'src', 'cli.mjs');
const NODE = process.execPath;

test('Agent Ledger V0 creates a reviewable local ledger from git and transcript inputs', () => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'agent-ledger-v0-'));
  const workspace = path.join(tmp, 'workspace');
  const out = path.join(tmp, 'ledger');
  mkdirSync(path.join(workspace, 'src'), { recursive: true });
  writeFileSync(path.join(workspace, 'src', 'checkout.md'), '# Checkout\n\nInitial notes.\n');
  writeFileSync(path.join(workspace, 'README.md'), '# Demo Repo\n');
  symlinkSync(path.join(workspace, 'missing-local-cache'), path.join(workspace, 'broken-cache-link'));

  git(workspace, ['init']);
  git(workspace, ['config', 'user.email', 'agent-ledger@example.test']);
  git(workspace, ['config', 'user.name', 'Agent Ledger Test']);
  git(workspace, ['add', '.']);
  git(workspace, ['commit', '-m', 'initial']);

  const sessionDir = run(['start',
    '--project', workspace,
    '--name', 'checkout-ledger-test',
    '--goal', 'Update checkout notes safely',
    '--scope', 'src',
    '--sensitive', '.env,billing,finance',
    '--out', out
  ]).trim();

  assert.ok(existsSync(path.join(sessionDir, 'workspace-before.json')));

  writeFileSync(path.join(workspace, 'src', 'checkout.md'), '# Checkout\n\nUpdated by the agent.\n');
  writeFileSync(path.join(workspace, 'src', 'generated-report.md'), '# Generated Report\n\nNo production deploy was performed.\n');
  writeFileSync(path.join(workspace, '.env'), 'API_TOKEN=DEMO_TOKEN_VALUE_1234567890\n');

  run(['ingest', '--type', 'git', '--out', out]);
  run(['ingest', '--type', 'transcript', path.join(ROOT, 'test-fixtures', 'transcript.md'), '--out', out]);
  run(['render', '--out', out]);
  const supervisorOut = path.join(tmp, 'supervisor-report.md');
  run(['aggregate', '--out', supervisorOut, sessionDir]);

  const expectedFiles = [
    'session.jsonl',
    'session.redacted.jsonl',
    'session.meta.json',
    'workspace-before.json',
    'workspace-after.json',
    'git-status-before.csv',
    'git-status-before.json',
    'diff.patch',
    'files-touched.csv',
    'preexisting-dirty.csv',
    'risk.md',
    'executive-summary.md',
    'pr-review.md',
    'redactions.json',
    'policy-suggestions.yaml',
    'replay.html'
  ];
  for (const file of expectedFiles) {
    assert.ok(existsSync(path.join(sessionDir, file)), `${file} should exist`);
  }

  const events = readFileSync(path.join(sessionDir, 'session.redacted.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.ok(events.length >= 10, `expected at least 10 events, got ${events.length}`);
  assert.ok(events.some((event) => event.event_type === 'execute'));
  assert.ok(events.some((event) => event.event_type === 'tool_call'));
  assert.ok(events.some((event) => event.event_type === 'write' && String(event.target).includes('checkout')));

  const riskMd = readFileSync(path.join(sessionDir, 'risk.md'), 'utf8');
  assert.match(riskMd, /Critical: [1-9]/);
  assert.match(riskMd, /What To Review Before Trusting This Run/);
  assert.match(riskMd, /outside the declared scope/i);

  const executiveSummary = readFileSync(path.join(sessionDir, 'executive-summary.md'), 'utf8');
  assert.match(executiveSummary, /Agent Ledger Executive Summary/);
  assert.match(executiveSummary, /Supervisor-Agent Input/);
  assert.match(executiveSummary, /Human review required|Review high-risk/);

  const prReview = readFileSync(path.join(sessionDir, 'pr-review.md'), 'utf8');
  assert.match(prReview, /Agent Ledger PR Review Record/);
  assert.match(prReview, /Status: BLOCK/);
  assert.match(prReview, /Reviewer Actions/);
  assert.match(prReview, /Evidence-Based Findings/);
  assert.match(prReview, /Local Artifacts/);

  const replay = readFileSync(path.join(sessionDir, 'replay.html'), 'utf8');
  assert.match(replay, /Agent Ledger/);
  assert.match(replay, /What To Review Before Trusting This Run/);
  assert.match(replay, /Human Brief/);
  assert.doesNotMatch(replay, /DEMO_TOKEN_VALUE_1234567890/);
  assert.doesNotMatch(replay, /person@example\.com/);

  const policies = readFileSync(path.join(sessionDir, 'policy-suggestions.yaml'), 'utf8');
  assert.match(policies, /action: block|action: ask|action: redact/);

  const supervisor = readFileSync(supervisorOut, 'utf8');
  assert.match(supervisor, /Agent Ledger Supervisor Report/);
  assert.match(supervisor, /CEO\/Supervisor Agent/);
  assert.match(supervisor, /Sessions reviewed: 1/);
});

test('git ingest is scoped to the declared project path', () => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'agent-ledger-v0-scope-'));
  const workspace = path.join(tmp, 'workspace');
  const project = path.join(workspace, 'target-project');
  const out = path.join(tmp, 'ledger');
  mkdirSync(project, { recursive: true });
  writeFileSync(path.join(project, 'inside.md'), '# Inside\n');
  writeFileSync(path.join(workspace, 'outside.md'), '# Outside\n');

  git(workspace, ['init']);
  git(workspace, ['config', 'user.email', 'agent-ledger@example.test']);
  git(workspace, ['config', 'user.name', 'Agent Ledger Test']);
  git(workspace, ['add', '.']);
  git(workspace, ['commit', '-m', 'initial']);

  const sessionDir = run(['start',
    '--project', project,
    '--name', 'scoped-git-ingest-test',
    '--goal', 'Capture only the target project',
    '--scope', '.',
    '--sensitive', '.env,billing,finance',
    '--out', out
  ]).trim();

  writeFileSync(path.join(project, 'inside.md'), '# Inside\n\nChanged.\n');
  writeFileSync(path.join(workspace, 'outside.md'), '# Outside\n\nShould not be captured.\n');

  run(['ingest', '--type', 'git', '--session', sessionDir]);
  run(['render', '--session', sessionDir]);

  const filesTouched = readFileSync(path.join(sessionDir, 'files-touched.csv'), 'utf8');
  assert.match(filesTouched, /inside\.md/);
  assert.doesNotMatch(filesTouched, /target-project\/inside\.md/);
  assert.doesNotMatch(filesTouched, /outside\.md/);

  const patch = readFileSync(path.join(sessionDir, 'diff.patch'), 'utf8');
  assert.match(patch, /inside\.md/);
  assert.doesNotMatch(patch, /outside\.md/);

  const risk = readFileSync(path.join(sessionDir, 'risk.md'), 'utf8');
  assert.doesNotMatch(risk, /outside the declared scope/i);
});

test('git ingest ignores dirty files that predate the run', () => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'agent-ledger-v0-baseline-'));
  const workspace = path.join(tmp, 'workspace');
  const out = path.join(tmp, 'ledger');
  mkdirSync(path.join(workspace, 'target-project'), { recursive: true });
  writeFileSync(path.join(workspace, 'target-project', 'inside.md'), '# Inside\n');
  writeFileSync(path.join(workspace, 'unrelated.md'), '# Unrelated\n');

  git(workspace, ['init']);
  git(workspace, ['config', 'user.email', 'agent-ledger@example.test']);
  git(workspace, ['config', 'user.name', 'Agent Ledger Test']);
  git(workspace, ['add', '.']);
  git(workspace, ['commit', '-m', 'initial']);

  writeFileSync(path.join(workspace, 'unrelated.md'), '# Unrelated\n\nDirty before run.\n');

  const sessionDir = run(['start',
    '--project', workspace,
    '--name', 'dirty-baseline-test',
    '--goal', 'Capture only changes made after start',
    '--scope', 'target-project',
    '--sensitive', '.env,billing,finance',
    '--out', out
  ]).trim();

  writeFileSync(path.join(workspace, 'target-project', 'inside.md'), '# Inside\n\nChanged during run.\n');

  run(['ingest', '--type', 'git', '--session', sessionDir]);
  run(['render', '--session', sessionDir]);

  const filesTouched = readFileSync(path.join(sessionDir, 'files-touched.csv'), 'utf8');
  assert.match(filesTouched, /target-project\/inside\.md/);
  assert.doesNotMatch(filesTouched, /unrelated\.md/);

  const preexisting = readFileSync(path.join(sessionDir, 'preexisting-dirty.csv'), 'utf8');
  assert.match(preexisting, /unrelated\.md/);

  const executiveSummary = readFileSync(path.join(sessionDir, 'executive-summary.md'), 'utf8');
  assert.match(executiveSummary, /Pre-existing dirty paths ignored: 1/);
});

test('safe keychain presence checks are not classified as critical secret exposure', () => {
  const projectPath = '/Users/example/Documents/Investor OS/60_Active_Projects/40_broker-research';
  const event = classifyEvent({
    event_type: 'execute',
    target: '/bin/zsh -lc security find-generic-password -a alpaca-api-key-id -s investor-os.alpaca.paper -w >/dev/null 2>&1 && echo key_id_present || echo key_id_missing; security find-generic-password -a alpaca-api-secret-key -s investor-os.alpaca.paper -w >/dev/null 2>&1 && echo secret_present || echo secret_missing',
    summary: 'Command started'
  }, {
    project_path: projectPath,
    sensitive_paths: ['broker', 'api-key', 'secret', 'credentials']
  });

  assert.equal(event.risk, 'medium');
  assert.ok(event.risk_tags.includes('secret_presence_check'));
  assert.ok(!event.risk_tags.includes('secret_possible'));
  assert.ok(!event.risk_tags.includes('sensitive_scope'));
});

test('project path domain words do not create sensitive-scope false positives', () => {
  const projectPath = '/Users/example/Documents/Investor OS/60_Active_Projects/40_broker-research';
  const event = classifyEvent({
    event_type: 'execute',
    target: '/Users/example/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /Users/example/Documents/Investor OS/60_Active_Projects/40_broker-research/10_workbench/alpaca-bars.mjs --symbol FIX --feed iex',
    summary: 'Command started'
  }, {
    project_path: projectPath,
    sensitive_paths: ['broker']
  });

  assert.equal(event.risk, 'low');
  assert.ok(!event.risk_tags.includes('sensitive_scope'));
  assert.ok(!event.risk_tags.includes('boundary'));
});

test('GitHub Action publishes the PR review artifact and can enforce status', () => {
  const action = readFileSync(path.join(ROOT, 'action.yml'), 'utf8');
  assert.match(action, /Agent Ledger PR Review/);
  assert.match(action, /start/);
  assert.match(action, /ingest --type git/);
  assert.match(action, /render --session/);
  assert.match(action, /pr-review\.md/);
  assert.match(action, /GITHUB_STEP_SUMMARY/);
  assert.match(action, /Status: BLOCK/);
  assert.doesNotMatch(action, /pr-comment|pr-review-comment/);
});

test('PR-native demo package is generated as a showable product artifact', () => {
  const result = JSON.parse(execFileSync(NODE, [
    path.join(ROOT, 'scripts', 'create-pr-native-demo.mjs')
  ], { cwd: ROOT, encoding: 'utf8' }));

  assert.ok(existsSync(result.showcase), 'index.html should exist');
  assert.ok(existsSync(result.pullRequest), 'pull-request.md should exist');
  assert.ok(existsSync(result.readme), 'demo README should exist');
  assert.ok(existsSync(result.stableReports), 'stable reports root should exist');
  assert.ok(existsSync(result.prReview), 'generated pr-review.md should exist');
  assert.ok(existsSync(result.replay), 'generated replay.html should exist');
  assert.ok(existsSync(result.supervisorReport), 'generated supervisor-report.md should exist');
  assert.equal(result.scenarios.length, 3);
  assert.deepEqual(result.scenarios.map((scenario) => scenario.status).sort(), ['BLOCK', 'PASS', 'WARN']);

  const showcase = readFileSync(result.showcase, 'utf8');
  assert.match(showcase, /Review AI-generated code changes before they merge/);
  assert.match(showcase, /Agent Ledger/);
  assert.match(showcase, /Open PR Status Spectrum/);
  assert.match(showcase, /PASS/);
  assert.match(showcase, /WARN/);
  assert.match(showcase, /BLOCK/);
  assert.match(showcase, /AI-generated checkout auth update/);

  const pullRequest = readFileSync(result.pullRequest, 'utf8');
  assert.match(pullRequest, /Pull Request Demo - Agent Ledger Status Spectrum/);
  assert.match(pullRequest, /PASS - AI-generated docs copy cleanup/);
  assert.match(pullRequest, /WARN - AI-generated report script update/);
  assert.match(pullRequest, /BLOCK - AI-generated checkout auth update/);
  assert.match(pullRequest, /pr-review\.md/);

  for (const scenario of result.scenarios) {
    assert.ok(existsSync(scenario.pullRequest), `${scenario.id} pull request should exist`);
    assert.ok(existsSync(scenario.prReview), `${scenario.id} PR review should exist`);
    assert.ok(existsSync(scenario.replay), `${scenario.id} replay should exist`);
    assert.ok(existsSync(path.join(result.stableReports, scenario.id, 'pr-review.md')), `${scenario.id} stable PR review should exist`);
    assert.ok(!existsSync(path.join(result.demoRoot, 'scenarios', scenario.id, 'repo', '.git')), `${scenario.id} repo .git should be removed`);

    const prReview = readFileSync(scenario.prReview, 'utf8');
    assert.match(prReview, /Agent Ledger PR Review Record/);
    assert.match(prReview, new RegExp(`Status: ${scenario.status}`));
    assert.match(prReview, /Reviewer Actions/);
    assert.match(prReview, /Evidence-Based Findings/);

    const stableReplay = readFileSync(path.join(result.stableReports, scenario.id, 'replay.html'), 'utf8');
    assert.match(stableReplay, /--accent: #d97757/);
    assert.match(stableReplay, /&gt;_/);
    assert.doesNotMatch(stableReplay, /home_path: [2-9]\d* \(low\)/);
  }

  const demoReadme = readFileSync(result.readme, 'utf8');
  assert.match(demoReadme, /complete local sales\/demo package/);
  assert.match(demoReadme, /PASS/);
  assert.match(demoReadme, /WARN/);
  assert.match(demoReadme, /BLOCK/);
  assert.match(demoReadme, /npm run demo:pr/);
});

function run(args) {
  return execFileSync(NODE, [CLI, ...args], { cwd: ROOT, encoding: 'utf8' });
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}
