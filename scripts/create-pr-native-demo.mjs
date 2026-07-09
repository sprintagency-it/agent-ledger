import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  copyFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const node = process.execPath;
const cli = path.join(root, 'src', 'cli.mjs');
const demoRoot = path.join(root, 'examples', 'pr-native-demo');
const reportsRoot = path.join(root, 'examples', 'reports');
const scenariosRoot = path.join(demoRoot, 'scenarios');
const ledger = path.join(demoRoot, 'ledger');
const sensitive = '.env,secrets,credentials,billing,finance,auth,token';

const scenarios = [
  {
    id: 'pass',
    expectedStatus: 'PASS',
    title: 'AI-generated docs copy cleanup',
    shortTitle: 'Docs copy cleanup',
    prNumber: 41,
    goal: 'Review a safe AI-generated docs copy update before merge',
    scope: 'docs,tests',
    headline: 'Low-risk docs change with verification evidence.',
    summary: 'The agent updates customer-facing checkout copy and runs the focused docs test. No sensitive files, auth paths or external side effects are touched.',
    files: [
      ['M', 'docs/checkout-copy.md', 'clarifies checkout wording'],
      ['M', 'tests/docs.test.js', 'updates copy assertion']
    ],
    setup: writeDocsRepo,
    mutate: mutateDocsRepo,
    transcript: docsTranscript,
    commands: [[node, '-e', "console.log('docs verification check passed')"]]
  },
  {
    id: 'warn',
    expectedStatus: 'WARN',
    title: 'AI-generated report script update',
    shortTitle: 'Report script update',
    prNumber: 42,
    goal: 'Review an AI-generated reporting helper update before merge',
    scope: 'docs,scripts,tests',
    headline: 'Useful change with a command-level review warning.',
    summary: 'The agent updates a reporting helper and changes an executable bit. The code is not blocked, but the command deserves reviewer attention.',
    files: [
      ['M', 'docs/reporting.md', 'adds generated report note'],
      ['M', 'scripts/check-report.js', 'mode changed by chmod']
    ],
    setup: writeReportRepo,
    mutate: mutateReportRepo,
    transcript: reportTranscript,
    commands: [['chmod', '+x', 'scripts/check-report.js']]
  },
  {
    id: 'block',
    expectedStatus: 'BLOCK',
    title: 'AI-generated checkout auth update',
    shortTitle: 'Checkout auth update',
    prNumber: 43,
    goal: 'Review AI-generated checkout and auth changes before merge',
    scope: 'src,tests,.github',
    headline: 'Small-looking PR that touches auth and drifts outside scope.',
    summary: 'The agent adds a preview checkout bypass, loosens rate limiting and writes an environment example file outside the declared scope.',
    files: [
      ['M', 'src/auth.js', 'preview bypass branch added'],
      ['M', 'src/rate-limit.js', 'attempt limit and key changed'],
      ['M', 'src/routes/checkout.js', 'preview checkout response added'],
      ['M', 'tests/auth.test.js', 'new positive bypass test'],
      ['A', '.env.example', 'demo placeholder config']
    ],
    setup: writeCheckoutRepo,
    mutate: mutateCheckoutRepo,
    transcript: checkoutTranscript,
    commands: []
  }
];

rmSync(demoRoot, { recursive: true, force: true });
rmSync(reportsRoot, { recursive: true, force: true });
mkdirSync(scenariosRoot, { recursive: true });
mkdirSync(reportsRoot, { recursive: true });
run(['init', '--out', ledger]);

const generated = scenarios.map(generateScenario);
run(['aggregate', '--sessions', path.join(ledger, 'sessions'), '--out', path.join(ledger, 'supervisor-report.md')]);

writePullRequestIndex(generated);
for (const scenario of generated) writePullRequestPage(scenario);
writeStableReports(generated);
writeShowcasePage(generated);
writeDemoReadme(generated);
sanitizePublicDemoPaths();

const primary = generated.find((scenario) => scenario.id === 'block');
console.log(JSON.stringify({
  demoRoot,
  showcase: path.join(demoRoot, 'index.html'),
  pullRequest: path.join(demoRoot, 'pull-request.md'),
  readme: path.join(demoRoot, 'README.md'),
  sessionDir: primary.sessionDir,
  prReview: primary.prReview,
  replay: primary.replay,
  supervisorReport: path.join(ledger, 'supervisor-report.md'),
  stableReports: reportsRoot,
  scenarios: generated.map((scenario) => ({
    id: scenario.id,
    status: scenario.status,
    title: scenario.title,
    pullRequest: scenario.pullRequest,
    sessionDir: scenario.sessionDir,
    prReview: scenario.prReview,
    replay: scenario.replay
  }))
}, null, 2));

function generateScenario(definition) {
  const scenarioRoot = path.join(scenariosRoot, definition.id);
  const repo = path.join(scenarioRoot, 'repo');
  const transcriptPath = path.join(scenarioRoot, 'agent-transcript.md');
  mkdirSync(repo, { recursive: true });

  definition.setup(repo);
  git(repo, ['init']);
  git(repo, ['config', 'user.email', 'agent-ledger@example.test']);
  git(repo, ['config', 'user.name', 'Agent Ledger Demo']);
  git(repo, ['add', '.']);
  git(repo, ['commit', '-m', `initial ${definition.id} demo repo`]);

  const sessionDir = run([
    'start',
    '--project', repo,
    '--name', `demo-${definition.id}-pr`,
    '--goal', definition.goal,
    '--scope', definition.scope,
    '--sensitive', sensitive,
    '--out', ledger
  ]).trim();

  definition.mutate(repo);
  for (const command of definition.commands) {
    run(['run', '--session', sessionDir, '--', ...command]);
  }

  writeFileSync(transcriptPath, definition.transcript());
  run(['ingest', '--type', 'git', '--session', sessionDir]);
  run(['ingest', '--type', 'transcript', transcriptPath, '--session', sessionDir]);
  run(['render', '--session', sessionDir]);

  const sessionRel = path.posix.join('ledger', 'sessions', path.basename(sessionDir));
  const reportRel = path.posix.join('..', 'reports', definition.id);
  const prReview = readFileSync(path.join(sessionDir, 'pr-review.md'), 'utf8');
  const executiveSummary = readFileSync(path.join(sessionDir, 'executive-summary.md'), 'utf8');
  const riskDebrief = readFileSync(path.join(sessionDir, 'risk.md'), 'utf8');
  const status = matchFirst(prReview, /^Status: ([A-Z]+)/m, 'UNKNOWN');
  if (status !== definition.expectedStatus) {
    throw new Error(`${definition.id} scenario expected ${definition.expectedStatus}, got ${status}`);
  }

  if (!existsSync(path.join(sessionDir, 'pr-review.md'))) {
    throw new Error(`${definition.id} scenario failed: pr-review.md was not created.`);
  }
  if (!readdirSync(path.join(ledger, 'sessions')).includes(path.basename(sessionDir))) {
    throw new Error(`${definition.id} scenario failed: session folder missing from ledger output.`);
  }

  rmSync(path.join(repo, '.git'), { recursive: true, force: true });

  return {
    ...definition,
    scenarioRoot,
    repo,
    transcriptPath,
    sessionDir,
    sessionRel,
    reportRel,
    status,
    statusClass: status.toLowerCase(),
    riskCounts: extractRiskCounts(prReview),
    reviewerActions: extractSection(prReview, '## Reviewer Actions', '## Evidence-Based Findings'),
    findings: extractSection(prReview, '## Evidence-Based Findings', '## Files And Commands Summary'),
    verdict: extractSection(executiveSummary, '## Verdict', '## What Happened').trim(),
    riskExcerpt: extractSection(riskDebrief, '## What To Review Before Trusting This Run', '## Baseline Context').trim(),
    pullRequest: path.join(demoRoot, `pull-request-${definition.id}.md`),
    prReview: path.join(sessionDir, 'pr-review.md'),
    replay: path.join(sessionDir, 'replay.html')
  };
}

function writeDocsRepo(repo) {
  mkdirSync(path.join(repo, 'docs'), { recursive: true });
  mkdirSync(path.join(repo, 'tests'), { recursive: true });
  writeFileSync(path.join(repo, 'package.json'), packageJson('checkout-docs-demo'));
  writeFileSync(path.join(repo, 'docs', 'checkout-copy.md'), `# Checkout Copy

Current copy: Your order is ready for review.
`);
  writeFileSync(path.join(repo, 'tests', 'docs.test.js'), `import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('checkout copy includes review wording', () => {
  const copy = readFileSync('docs/checkout-copy.md', 'utf8');
  assert.match(copy, /ready for review/);
});
`);
}

function mutateDocsRepo(repo) {
  writeFileSync(path.join(repo, 'docs', 'checkout-copy.md'), `# Checkout Copy

Current copy: Review your order before payment.
`);
  writeFileSync(path.join(repo, 'tests', 'docs.test.js'), `import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('checkout copy includes review wording', () => {
  const copy = readFileSync('docs/checkout-copy.md', 'utf8');
  assert.match(copy, /Review your order before payment/);
});
`);
}

function docsTranscript() {
  return `# Demo Agent Transcript - PASS

Agent goal: improve checkout documentation copy.

Actions:
- Edited docs/checkout-copy.md.
- Updated tests/docs.test.js to match the revised copy.

Verification:
- Ran a local docs verification check successfully.
- No sensitive files, auth paths or external side effects were touched.
`;
}

function writeReportRepo(repo) {
  mkdirSync(path.join(repo, 'docs'), { recursive: true });
  mkdirSync(path.join(repo, 'scripts'), { recursive: true });
  mkdirSync(path.join(repo, 'tests'), { recursive: true });
  writeFileSync(path.join(repo, 'package.json'), packageJson('report-helper-demo'));
  writeFileSync(path.join(repo, 'docs', 'reporting.md'), `# Reporting

Reports are generated manually.
`);
  writeFileSync(path.join(repo, 'scripts', 'check-report.js'), `console.log('report check ready');
`);
  writeFileSync(path.join(repo, 'tests', 'report.test.js'), `import test from 'node:test';
import assert from 'node:assert/strict';

test('report helper smoke test', () => {
  assert.equal(1 + 1, 2);
});
`);
}

function mutateReportRepo(repo) {
  writeFileSync(path.join(repo, 'docs', 'reporting.md'), `# Reporting

Reports are generated by a local helper script before review.
`);
  writeFileSync(path.join(repo, 'scripts', 'check-report.js'), `console.log('report check ready for local review');
`);
}

function reportTranscript() {
  return `# Demo Agent Transcript - WARN

Agent goal: update a local reporting helper.

Actions:
- Edited docs/reporting.md.
- Edited scripts/check-report.js.
- Changed the executable bit on scripts/check-report.js.

Verification:
- The command was local-only.
- Reviewer should confirm the executable bit change is intended.
`;
}

function writeCheckoutRepo(repo) {
  mkdirSync(path.join(repo, 'src', 'routes'), { recursive: true });
  mkdirSync(path.join(repo, 'tests'), { recursive: true });
  mkdirSync(path.join(repo, '.github', 'workflows'), { recursive: true });
  writeFileSync(path.join(repo, 'package.json'), packageJson('checkout-service-demo'));
  writeFileSync(path.join(repo, 'README.md'), `# Checkout Service Demo Repo

Small fake repo used to demonstrate Agent Ledger PR review records.
`);
  writeFileSync(path.join(repo, 'src', 'auth.js'), `export function requireUser(request) {
  const user = request.session?.user;
  if (!user) {
    return { ok: false, status: 401, reason: 'missing_session' };
  }
  if (user.disabled) {
    return { ok: false, status: 403, reason: 'disabled_user' };
  }
  return { ok: true, user };
}
`);
  writeFileSync(path.join(repo, 'src', 'rate-limit.js'), `export const checkoutRateLimit = {
  windowMs: 60_000,
  maxAttempts: 12,
  key: 'user-id'
};
`);
  writeFileSync(path.join(repo, 'src', 'routes', 'checkout.js'), `import { requireUser } from '../auth.js';

export function createCheckout(request) {
  const auth = requireUser(request);
  if (!auth.ok) return auth;

  return {
    ok: true,
    checkoutId: 'demo_checkout_id',
    userId: auth.user.id
  };
}
`);
  writeFileSync(path.join(repo, 'tests', 'auth.test.js'), `import test from 'node:test';
import assert from 'node:assert/strict';
import { requireUser } from '../src/auth.js';

test('requires a session user', () => {
  assert.deepEqual(requireUser({ session: {} }), {
    ok: false,
    status: 401,
    reason: 'missing_session'
  });
});
`);
  writeFileSync(path.join(repo, '.github', 'workflows', 'ci.yml'), `name: CI

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm test
`);
}

function mutateCheckoutRepo(repo) {
  writeFileSync(path.join(repo, 'src', 'auth.js'), `export function requireUser(request) {
  const user = request.session?.user;
  if (!user && request.headers?.['x-agent-bypass'] === 'demo-preview') {
    return {
      ok: true,
      user: { id: 'preview-user', role: 'service-preview' },
      bypass: true
    };
  }
  if (!user) {
    return { ok: false, status: 401, reason: 'missing_session' };
  }
  if (user.disabled) {
    return { ok: false, status: 403, reason: 'disabled_user' };
  }
  return { ok: true, user };
}
`);
  writeFileSync(path.join(repo, 'src', 'routes', 'checkout.js'), `import { requireUser } from '../auth.js';
import { checkoutRateLimit } from '../rate-limit.js';

export function createCheckout(request) {
  const auth = requireUser(request);
  if (!auth.ok) return auth;

  return {
    ok: true,
    checkoutId: auth.bypass ? 'demo_preview_checkout' : 'demo_checkout_id',
    userId: auth.user.id,
    rateLimitKey: checkoutRateLimit.key
  };
}
`);
  writeFileSync(path.join(repo, 'src', 'rate-limit.js'), `export const checkoutRateLimit = {
  windowMs: 60_000,
  maxAttempts: 50,
  key: 'ip'
};
`);
  writeFileSync(path.join(repo, 'tests', 'auth.test.js'), `import test from 'node:test';
import assert from 'node:assert/strict';
import { requireUser } from '../src/auth.js';

test('requires a session user', () => {
  assert.deepEqual(requireUser({ session: {} }), {
    ok: false,
    status: 401,
    reason: 'missing_session'
  });
});

test('allows a demo preview bypass header', () => {
  const result = requireUser({
    session: {},
    headers: { 'x-agent-bypass': 'demo-preview' }
  });
  assert.equal(result.ok, true);
});
`);
  writeFileSync(path.join(repo, '.github', 'workflows', 'ci.yml'), `name: CI

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm test -- --test-reporter=spec
`);
  writeFileSync(path.join(repo, '.env.example'), `# Demo-only placeholder config.
AGENT_LEDGER_DEMO_PLACEHOLDER=replace-me-demo-only
`);
}

function checkoutTranscript() {
  return `# Demo Agent Transcript - BLOCK

Agent goal: add a preview checkout path for internal QA.

Actions:
- Edited src/auth.js to allow a preview bypass header.
- Edited src/routes/checkout.js to return a preview checkout id.
- Increased checkout rate limit from 12 to 50 attempts.
- Added .env.example with a demo placeholder config value.
- Updated CI reporter output.

Verification:
- Did not run the test suite in this simulated AI run.
- Did not request security review before changing auth behavior.

Reviewer note:
- This is synthetic demo data. No live private values, customer data, billing data or production system is included.
`;
}

function writePullRequestIndex(generated) {
  writeFileSync(path.join(demoRoot, 'pull-request.md'), `# Pull Request Demo - Agent Ledger Status Spectrum

This page links the three simulated PRs generated by the demo.

${generated.map((scenario) => `## ${scenario.status} - ${scenario.title}

${scenario.summary}

- [Simulated PR](pull-request-${scenario.id}.md)
- [PR review record](${scenario.reportRel}/pr-review.md)
- [Executive summary](${scenario.reportRel}/executive-summary.md)
- [Risk debrief](${scenario.reportRel}/risk.md)
- [Replay](${scenario.reportRel}/replay.html)
`).join('\n')}
`);
}

function writeStableReports(generated) {
  writeFileSync(path.join(reportsRoot, 'README.md'), `# Agent Ledger Example Reports

Stable example reports generated by \`npm run demo:pr\`.

Open these first:

${generated.map((scenario) => `- [${scenario.status} - ${scenario.title}](${scenario.id}/pr-review.md)`).join('\n')}

Each folder contains:

- \`pr-review.md\` - PR/check-facing review record;
- \`executive-summary.md\` - manager/supervisor readout;
- \`risk.md\` - risk debrief;
- \`replay.html\` - local timeline replay.
`);

  for (const scenario of generated) {
    const out = path.join(reportsRoot, scenario.id);
    mkdirSync(out, { recursive: true });
    copyStableReport(scenario, 'pr-review.md', out);
    copyStableReport(scenario, 'executive-summary.md', out);
    copyStableReport(scenario, 'risk.md', out);
    copyStableReport(scenario, 'replay.html', out);
  }
}

function copyStableReport(scenario, fileName, out) {
  const raw = readFileSync(path.join(scenario.sessionDir, fileName), 'utf8');
  const stable = raw
    .replaceAll(path.basename(scenario.sessionDir), `demo-${scenario.id}-pr`)
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '2026-01-01T00:00:00.000Z')
    .replace(/command-\d+\.log/g, `command-demo-${scenario.id}.log`)
    .replace(/home_path: \d+ \(low\)/g, 'home_path: 1 (low)')
    .replace(/Redaction patterns triggered: \d+/g, 'Redaction patterns triggered: normalized for demo')
    .replace(/- Project: `[^`]+`/g, `- Project: \`demo/${scenario.id}/repo\``)
    .replace(/<p>Project: <code>.*?<\/code><\/p>/g, `<p>Project: <code>demo/${scenario.id}/repo</code></p>`)
    .replace(/<h2>Redaction Summary<\/h2>\s*<ul>[\s\S]*?<\/ul>/g, '<h2>Redaction Summary</h2>\n    <ul><li>Demo path handling normalized.</li></ul>');
  writeFileSync(path.join(out, fileName), stable);
}

function writePullRequestPage(scenario) {
  writeFileSync(scenario.pullRequest, `# Pull Request Demo - ${scenario.title}

Status from Agent Ledger: **${scenario.status}**

## PR Description

${scenario.summary}

## Files Changed

${scenario.files.map(([tag, file, note]) => `- \`${tag}\` \`${file}\` - ${note}.`).join('\n')}

## Agent Ledger Block

Open the generated PR artifact:

- [PR review record](${scenario.reportRel}/pr-review.md)
- [Executive summary](${scenario.reportRel}/executive-summary.md)
- [Risk debrief](${scenario.reportRel}/risk.md)
- [Replay](${scenario.reportRel}/replay.html)

## Risk Snapshot

- Critical: ${scenario.riskCounts.critical}
- High: ${scenario.riskCounts.high}
- Medium: ${scenario.riskCounts.medium}
- Low: ${scenario.riskCounts.low}

## Reviewer Actions

${scenario.reviewerActions.trim() || '- No reviewer actions generated.'}

## Evidence-Based Findings

${scenario.findings.trim() || '- No critical/high findings generated.'}
`);
}

function writeShowcasePage(generated) {
  writeFileSync(path.join(demoRoot, 'index.html'), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Agent Ledger PR-Native Demo</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f1ea;
      --panel: #fffdf9;
      --ink: #1d1a17;
      --muted: #6f675f;
      --line: #d9d0c5;
      --accent: #d97757;
      --accent-dark: #a84d32;
      --pass: #17664c;
      --warn: #8a5b00;
      --block: #9c3127;
      --pass-bg: #edf7f1;
      --warn-bg: #fff6df;
      --block-bg: #fff0ed;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.5;
    }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .shell {
      width: min(1180px, calc(100% - 32px));
      margin: 0 auto;
      padding: 28px 0 44px;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 0 22px;
      border-bottom: 1px solid var(--line);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 760;
      letter-spacing: 0;
    }
    .mark {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 5px;
      background: var(--accent);
      color: var(--ink);
      font-weight: 800;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
    }
    .links {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      font-size: 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    .hero {
      padding: 30px 0 22px;
    }
    h1 {
      margin: 0;
      max-width: 840px;
      font-size: clamp(36px, 5vw, 60px);
      line-height: 1.04;
      letter-spacing: 0;
    }
    .subhead {
      max-width: 760px;
      margin: 18px 0 0;
      font-size: 18px;
      color: var(--muted);
    }
    .actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 24px;
    }
    .button {
      display: inline-flex;
      align-items: center;
      min-height: 42px;
      padding: 0 14px;
      border: 1px solid var(--line);
      border-radius: 5px;
      background: var(--panel);
      color: var(--ink);
      font-weight: 650;
    }
    .button.primary {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--ink);
    }
    .button.primary:hover { background: var(--accent-dark); border-color: var(--accent-dark); color: white; text-decoration: none; }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 6px;
      box-shadow: 0 1px 2px rgba(29, 26, 23, 0.05);
    }
    .scenario-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin-top: 22px;
    }
    .scenario {
      display: flex;
      flex-direction: column;
      min-height: 360px;
      overflow: hidden;
    }
    .scenario-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 18px;
      border-bottom: 1px solid var(--line);
      background: #211e1a;
      color: #f7f1e8;
    }
    .scenario-title {
      margin: 0;
      font-size: 17px;
      line-height: 1.25;
    }
    .status {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 74px;
      height: 32px;
      padding: 0 10px;
      border-radius: 4px;
      font: 800 11px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-weight: 820;
    }
    .status-pass { color: var(--pass); background: var(--pass-bg); border: 1px solid #c8ded7; }
    .status-warn { color: var(--warn); background: var(--warn-bg); border: 1px solid #edd49b; }
    .status-block { color: var(--block); background: var(--block-bg); border: 1px solid #f0c5be; }
    .scenario-body {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 14px;
      padding: 18px;
    }
    .scenario-body p {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
    }
    .risk-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }
    .risk {
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 5px;
      background: #faf6f0;
    }
    .risk span {
      display: block;
      color: var(--muted);
      font-size: 11px;
      font-weight: 650;
    }
    .risk strong {
      display: block;
      margin-top: 3px;
      font-size: 22px;
      line-height: 1;
    }
    .file-list {
      display: grid;
      gap: 7px;
      font-size: 13px;
    }
    .file-row {
      display: grid;
      grid-template-columns: 28px 1fr;
      gap: 8px;
      align-items: start;
    }
    .tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      background: #f7e9df;
      color: var(--accent-dark);
      font-weight: 760;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
    }
    .artifact-list {
      display: grid;
      gap: 8px;
      margin-top: auto;
    }
    .artifact-list a {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 9px 10px;
      border: 1px solid var(--line);
      border-radius: 5px;
      background: #faf6f0;
      color: var(--ink);
      font-size: 13px;
    }
    .compare {
      margin-top: 18px;
      padding: 18px;
    }
    .compare-grid {
      display: grid;
      grid-template-columns: 160px 1fr;
      gap: 10px 16px;
      font-size: 14px;
    }
    .compare-grid strong {
      color: var(--ink);
    }
    .compare-grid span {
      color: var(--muted);
    }
    @media (max-width: 960px) {
      .scenario-grid {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 560px) {
      .shell {
        width: min(100% - 20px, 1180px);
        padding-top: 16px;
      }
      .topbar {
        flex-direction: column;
        align-items: flex-start;
      }
      h1 {
        font-size: 36px;
      }
      .risk-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .compare-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <nav class="topbar">
      <div class="brand"><span class="mark" aria-hidden="true">&gt;_</span><span>Agent Ledger</span></div>
      <div class="links">
        <a href="pull-request.md">PR index</a>
        <a href="../reports/README.md">Reports</a>
        <a href="README.md">Regenerate</a>
      </div>
    </nav>

    <section class="hero">
      <h1>Review AI-generated code changes before they merge.</h1>
      <p class="subhead">This demo shows the full PR-native status spectrum: PASS for routine changes, WARN for review-worthy commands, and BLOCK for sensitive auth or scope drift.</p>
      <div class="actions">
        <a class="button primary" href="pull-request.md">Open PR Status Spectrum</a>
        <a class="button" href="../reports/block/pr-review.md">Open BLOCK Review</a>
        <a class="button" href="README.md">Regenerate Demo</a>
      </div>
    </section>

    <section class="scenario-grid" aria-label="Agent Ledger status spectrum">
      ${generated.map(scenarioCard).join('\n')}
    </section>

    <section class="panel compare">
      <h2>What The Spectrum Proves</h2>
      <div class="compare-grid">
        <strong>PASS</strong><span>Agent work is visible, verified and low risk. Normal review can proceed.</span>
        <strong>WARN</strong><span>The change may be fine, but the command history or evidence deserves human attention.</span>
        <strong>BLOCK</strong><span>The run touched sensitive behavior or drifted outside scope. Human review is required before merge.</span>
      </div>
    </section>
  </main>
</body>
</html>
`);
}

function writeDemoReadme(generated) {
  writeFileSync(path.join(demoRoot, 'README.md'), `# Agent Ledger PR-Native Demo

This folder is a complete local sales/demo package for Agent Ledger.

Open first:

- [index.html](index.html) - visual product demo.
- [pull-request.md](pull-request.md) - simulated PR status spectrum.
- [../reports/README.md](../reports/README.md) - stable example reports.

## Scenarios

${generated.map((scenario) => `### ${scenario.status} - ${scenario.title}

- [Simulated PR](pull-request-${scenario.id}.md)
- [PR review record](${scenario.reportRel}/pr-review.md)
- [Executive summary](${scenario.reportRel}/executive-summary.md)
- [Risk debrief](${scenario.reportRel}/risk.md)
- [Replay](${scenario.reportRel}/replay.html)
`).join('\n')}

## Why This Matters

The demo shows that Agent Ledger is not just a blocker. It separates AI-generated PRs into three operational outcomes:

- PASS - proceed with normal review;
- WARN - review a specific risk signal;
- BLOCK - stop before merge until a human reviews the issue.

## Regenerate

From the repository root:

\`\`\`bash
node scripts/create-pr-native-demo.mjs
\`\`\`

Or use:

\`\`\`bash
npm run demo:pr
\`\`\`

No live private values, customer data, billing data or production systems are used in this demo.
`);
}

function sanitizePublicDemoPaths() {
  const replacements = [
    [root, '$REPO_ROOT'],
    [node, 'node']
  ];
  const home = process.env.HOME;
  if (home && root.startsWith(home)) {
    replacements.push([root.replace(home, '$HOME'), '$REPO_ROOT']);
  }

  for (const file of listTextFiles(demoRoot).concat(listTextFiles(reportsRoot))) {
    const original = readFileSync(file, 'utf8');
    let next = original;
    for (const [from, to] of replacements) {
      next = next.replaceAll(from, to);
    }
    if (next !== original) writeFileSync(file, next);
  }
}

function listTextFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTextFiles(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function scenarioCard(scenario) {
  return `<article class="panel scenario">
        <div class="scenario-head">
          <div>
            <p class="scenario-title">${escapeHtml(scenario.title)}</p>
            <small>Simulated PR #${scenario.prNumber} · ${escapeHtml(scenario.headline)}</small>
          </div>
          <span class="status status-${scenario.statusClass}">${escapeHtml(scenario.status)}</span>
        </div>
        <div class="scenario-body">
          <p>${escapeHtml(scenario.summary)}</p>
          <div class="risk-row">
            ${riskCard('Critical', scenario.riskCounts.critical)}
            ${riskCard('High', scenario.riskCounts.high)}
            ${riskCard('Medium', scenario.riskCounts.medium)}
            ${riskCard('Low', scenario.riskCounts.low)}
          </div>
          <div class="file-list">
            ${scenario.files.map(fileRow).join('\n')}
          </div>
          <div class="artifact-list">
            <a href="pull-request-${scenario.id}.md"><strong>Simulated PR</strong><span>scenario</span></a>
            <a href="${scenario.reportRel}/pr-review.md"><strong>PR Review Record</strong><span>${escapeHtml(scenario.status)}</span></a>
            <a href="${scenario.reportRel}/replay.html"><strong>Replay</strong><span>timeline</span></a>
          </div>
        </div>
      </article>`;
}

function fileRow([tag, file, note]) {
  return `<div class="file-row"><span class="tag">${escapeHtml(tag)}</span><span><code>${escapeHtml(file)}</code><br>${escapeHtml(note)}</span></div>`;
}

function riskCard(label, value) {
  return `<div class="risk"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function packageJson(name) {
  return `{
  "name": "${name}",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.js"
  }
}
`;
}

function run(args) {
  return execFileSync(node, [cli, ...args], { cwd: root, encoding: 'utf8' });
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

function matchFirst(text, pattern, fallback) {
  const match = text.match(pattern);
  return match?.[1] || fallback;
}

function extractRiskCounts(text) {
  return {
    critical: Number(matchFirst(text, /^- Critical: (\d+)/m, '0')),
    high: Number(matchFirst(text, /^- High: (\d+)/m, '0')),
    medium: Number(matchFirst(text, /^- Medium: (\d+)/m, '0')),
    low: Number(matchFirst(text, /^- Low: (\d+)/m, '0'))
  };
}

function extractSection(text, startHeading, endHeading) {
  const start = text.indexOf(startHeading);
  if (start < 0) return '';
  const bodyStart = start + startHeading.length;
  const end = text.indexOf(endHeading, bodyStart);
  return text.slice(bodyStart, end >= 0 ? end : text.length).trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
