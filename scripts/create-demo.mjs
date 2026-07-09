import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const node = process.execPath;
const cli = path.join(root, 'src', 'cli.mjs');
const workspace = path.join(root, 'examples', 'demo-workspace');
const out = path.join(root, 'examples', 'demo-ledger');

rmSync(workspace, { recursive: true, force: true });
rmSync(out, { recursive: true, force: true });
mkdirSync(path.join(workspace, 'src'), { recursive: true });
mkdirSync(path.join(workspace, 'billing'), { recursive: true });

writeFileSync(path.join(workspace, 'README.md'), '# Demo Workspace\n\nSafe demo repo for Agent Ledger.\n');
writeFileSync(path.join(workspace, 'src', 'checkout.md'), '# Checkout\n\nInitial checkout notes.\n');
writeFileSync(path.join(workspace, 'billing', 'do-not-touch.md'), '# Billing Notes\n\nSensitive area for demo scope drift.\n');

git(['init']);
git(['config', 'user.email', 'agent-ledger@example.test']);
git(['config', 'user.name', 'Agent Ledger Demo']);
git(['add', '.']);
git(['commit', '-m', 'initial demo workspace']);

const sessionDir = run(['start',
  '--project', workspace,
  '--name', 'demo-agent-run',
  '--goal', 'Update checkout notes without touching billing or secrets',
  '--scope', 'src',
  '--sensitive', 'billing,.env,credentials',
  '--out', out
]).trim();

writeFileSync(path.join(workspace, 'src', 'checkout.md'), '# Checkout\n\nUpdated copy from the agent.\n\nVerification: not completed yet.\n');
writeFileSync(path.join(workspace, 'src', 'agent-notes.md'), '# Agent Notes\n\nCreated during demo run.\n');
writeFileSync(path.join(workspace, 'billing', 'do-not-touch.md'), '# Billing Notes\n\nAgent touched this by mistake during demo.\n');
writeFileSync(path.join(workspace, '.env'), 'API_TOKEN=DEMO_TOKEN_VALUE_1234567890\n');

run(['ingest', '--type', 'git', '--out', out]);
run(['ingest', '--type', 'transcript', path.join(root, 'test-fixtures', 'transcript.md'), '--out', out]);
run(['render', '--out', out]);
run(['aggregate', '--out', path.join(out, 'supervisor-report.md'), sessionDir]);
rmSync(path.join(workspace, '.env'), { force: true });
rmSync(path.join(workspace, '.git'), { recursive: true, force: true });

console.log(JSON.stringify({
  sessionDir,
  executiveSummary: path.join(sessionDir, 'executive-summary.md'),
  supervisorReport: path.join(out, 'supervisor-report.md'),
  replay: path.join(sessionDir, 'replay.html')
}, null, 2));

function run(args) {
  return execFileSync(node, [cli, ...args], { cwd: root, encoding: 'utf8' });
}

function git(args) {
  return execFileSync('git', args, { cwd: workspace, encoding: 'utf8' });
}
