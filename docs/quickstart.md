# Agent Ledger Quickstart

Agent Ledger has three usable paths. Start with the project skill for Codex or Claude Code unless you need lower-level control or CI capture.

## Path 1 - Make An Agent Task Self-Reviewing

Requirements: Git, Node 20+, and Codex or Claude Code.

From the root of your project:

```bash
npx --yes github:sprintagency-it/agent-ledger#v0.3.0 setup --project .
```

The setup command installs repository-scoped skills for both agents and one shared local runtime. It also adds `.agent-ledger/` to `.gitignore`.

Invoke the skill with a concrete task:

```text
Use $agent-ledger to fix the checkout validation bug, stay within src/checkout and tests, and run the relevant tests.

# Claude Code
/agent-ledger Fix the checkout validation bug, stay within src/checkout and tests, and run the relevant tests.
```

The skill will:

1. define goal, scope, acceptance checks, and boundaries before edits;
2. start local capture;
3. execute the task and record practical verification commands;
4. render `review.json`, `fix-brief.md`, and human reports;
5. classify critical/high findings;
6. fix only safe true positives inside scope;
7. rerun checks and refresh the final review once.

Read the final output in this order:

1. `executive-summary.md` - concise human handoff;
2. `review.json` - machine-readable status and findings;
3. `fix-brief.md` - correction decisions and boundaries;
4. `replay.html` - visual timeline.

## Path 2 - Run The CLI Directly

The runtime installed by setup lives at `.agent-ledger/runtime/src/cli.mjs`:

```bash
LEDGER=".agent-ledger/runtime/src/cli.mjs"
OUT=".agent-ledger/runs/first-real-run"

SESSION="$(node "$LEDGER" start \
  --project . \
  --name "first-real-run" \
  --goal "Describe the concrete agent task" \
  --scope "src,tests" \
  --sensitive ".env,secrets,credentials,tokens,auth,billing,deploy" \
  --out "$OUT")"
```

Start this before the agent changes files. Run deterministic checks through the wrapper when they do not require shell pipes or redirects:

```bash
node "$LEDGER" run --session "$SESSION" -- npm test
```

Render the final review:

```bash
node "$LEDGER" ingest --type git --session "$SESSION"
node "$LEDGER" render --session "$SESSION"
```

After a safe correction, rerun checks and call `ingest` plus `render` again. Git evidence is refreshed, so the final report reflects the corrected repository state without duplicate write events.

## Path 3 - Capture An Agent Command In GitHub Actions

Use the Action when the AI-agent command can run inside the same job:

```yaml
- id: agent-ledger
  uses: sprintagency-it/agent-ledger@v0.3.0
  with:
    command: "node scripts/run-ai-agent-task.mjs"
    goal: "Review this AI-generated change before merge"
    scope: "src,tests"

- uses: actions/upload-artifact@v7
  if: always()
  with:
    name: agent-ledger
    path: ${{ steps.agent-ledger.outputs.share }}
```

Changes already present when the Action starts are baseline. Reviewing an arbitrary existing PR diff is a separate future integration.

Keep `if: always()` so the review bundle remains available even when the captured command fails or Agent Ledger blocks the change.

## Privacy Boundary

- Agent Ledger does not upload run data to a hosted service.
- The session root can contain raw diffs, snapshots, transcripts, and command logs.
- `share/` excludes raw evidence and applies best-effort redaction.
- Review `share/` before attaching it to a PR or sending it elsewhere.

## A Useful First Run

The run is useful when the agent and reviewer can answer without reopening the original chat:

- what outcome was attempted;
- which files were inside scope;
- what changed and what was verified;
- which findings were fixed or dismissed with evidence;
- what remains unresolved for a human;
- whether normal review can proceed, needs a warning, or should stop.
