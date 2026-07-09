# Agent Ledger Quickstart

Agent Ledger currently has two usable paths: a local CLI and a command-capturing GitHub Action.

It is not yet a universal agent skill. Capture must begin before the agent changes the repository.

## Path 1 - See The Product

Requirements: Git and Node 20+.

```bash
git clone https://github.com/sprintagency-it/agent-ledger.git
cd agent-ledger
npm test
npm run demo:pr
```

Open `examples/pr-native-demo/index.html` and compare the PASS, WARN and BLOCK review records.

## Path 2 - Review One Real Local Agent Run

Clone Agent Ledger next to the repository you want to review:

```text
workspace/
  agent-ledger/
  your-project/
```

From `agent-ledger/`, start the ledger before asking Codex, Claude Code or another agent to edit `your-project/`:

```bash
node src/cli.mjs init --out ../your-project/.agent-ledger

SESSION="$(node src/cli.mjs start \
  --project ../your-project \
  --name "first-real-run" \
  --goal "Describe the agent task" \
  --scope "src,tests" \
  --sensitive ".env,secrets,credentials,auth,billing" \
  --out ../your-project/.agent-ledger)"
```

Now let the agent perform the task. When it finishes:

```bash
node src/cli.mjs ingest --type git --session "$SESSION"
node src/cli.mjs render --session "$SESSION"
```

Read in this order:

1. `pr-review.md` - merge-facing PASS, WARN or BLOCK record.
2. `executive-summary.md` - concise human or supervisor view.
3. `replay.html` - visual event timeline.
4. `risk.md` - detailed critical/high review queue.

Use `share/` when you intentionally attach a redacted bundle to a PR or send it to another reviewer.

Keep the session root local unless you have manually reviewed it. It can contain raw diffs, file inventories, transcripts and command output.

## Path 3 - Capture An Agent Command In GitHub Actions

Use the Action only when the AI-agent command itself can run inside the same GitHub Actions job:

```yaml
- id: agent-ledger
  uses: sprintagency-it/agent-ledger@v0.1.1
  with:
    command: "node scripts/run-ai-agent-task.mjs"
    goal: "Review this AI-generated change before merge"
    scope: "src,tests"

- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: agent-ledger
    path: ${{ steps.agent-ledger.outputs.share }}
```

Changes already present when the Action starts are treated as baseline. Reviewing an arbitrary existing PR diff is a separate future integration.

Keep `if: always()` on the upload step so the review bundle is retained even when Agent Ledger blocks the change or the captured command fails.

## What Success Looks Like

The first run is useful when a reviewer can answer, without reopening the original agent chat:

- what changed;
- what was verified;
- which evidence is incomplete;
- what needs human inspection;
- whether normal review can proceed, needs a warning, or should stop.
