# Agent Ledger

An accountable self-review loop for AI coding agents.

[Website](https://agent-ledger.pages.dev) | [Live demo](https://agent-ledger.pages.dev/demo) | [Documentation](https://agent-ledger.pages.dev/docs)

Agent Ledger makes a coding agent declare scope before editing, capture what it changes, run verification, inspect its own findings, correct eligible issues, and leave a reviewable record for the human.

> The report is the evidence. The product is the better execution loop that creates it.

Agent Ledger is local-first and open source. The current release includes a Codex skill, a Node CLI, and a command-capturing GitHub Action.

## Install In One Command

Requirements: Git, Node 20+, and Codex.

Run this from the project you want Codex to work on:

```bash
npx --yes github:sprintagency-it/agent-ledger#v0.2.0 setup --project .
```

Then invoke the installed repository skill in Codex:

```text
Use $agent-ledger to add input validation to the signup form and verify it with the existing tests.
```

If Codex does not show the skill immediately, restart Codex once. The setup command installs:

- `.agents/skills/agent-ledger/` - the shareable workflow Codex discovers;
- `.agent-ledger/runtime/` - the local CLI runtime;
- `.agent-ledger/runs/` - private run evidence created during tasks.

Commit the skill if teammates should use the same workflow. Keep `.agent-ledger/` ignored.

## What Happens During A Task

1. **Scope** - the agent defines the outcome, allowed paths, acceptance checks, and boundaries before editing.
2. **Execute** - it performs the task and records deterministic commands when practical.
3. **Verify** - it runs tests, lint, smoke checks, or the closest available evidence.
4. **Review** - Agent Ledger renders a `PASS`, `WARN`, or `BLOCK` record plus machine-readable findings.
5. **Correct** - the agent classifies findings and fixes safe true positives inside scope.
6. **Explain** - the human receives a concise summary, unresolved decisions, and a visual replay.

The correction loop is bounded. Agent Ledger does not blindly change auth, secrets, permissions, billing, deployments, external data, or destructive operations.

## What You Get

Each run produces:

- `review.json` - status, evidence counts, and findings for agent-to-agent review;
- `fix-brief.md` - the correction queue and automatic-fix boundaries;
- `executive-summary.md` - the shortest human handoff;
- `pr-review.md` - a merge-facing `PASS`, `WARN`, or `BLOCK` record;
- `replay.html` - an offline visual timeline;
- `share/` - a smaller redacted bundle for deliberate sharing.

Raw diffs, snapshots, transcripts, and command logs remain in the local session root. Redaction is best-effort: inspect `share/` before publishing it.

## See The Product

Clone the repository and generate the three review scenarios:

```bash
git clone https://github.com/sprintagency-it/agent-ledger.git
cd agent-ledger
npm test
npm run demo:pr
```

Open `examples/pr-native-demo/index.html` to compare:

- [PASS example](examples/reports/pass/replay.html) - normal review can continue;
- [WARN example](examples/reports/warn/replay.html) - inspect a specific risk before trust;
- [BLOCK example](examples/reports/block/replay.html) - human review is required.

## Lower-Level CLI

The Codex skill uses the CLI automatically. You can also run it directly:

```bash
LEDGER=".agent-ledger/runtime/src/cli.mjs"
SESSION="$(node "$LEDGER" start \
  --project . \
  --name "review-ai-change" \
  --goal "Describe the concrete outcome" \
  --scope "src,tests" \
  --out .agent-ledger/runs/review-ai-change)"

# Make the change, then capture final state and render the review.
node "$LEDGER" ingest --type git --session "$SESSION"
node "$LEDGER" render --session "$SESSION"
```

Repeated Git ingestion refreshes the final file evidence. This lets an agent fix eligible findings and render the same session again without duplicating write events.

See the [complete quickstart](docs/quickstart.md) for privacy boundaries, direct CLI use, and troubleshooting.

## GitHub Action

The Action captures changes produced by the command passed to it and publishes `pr-review.md` to the job summary:

```yaml
- id: agent-ledger
  uses: sprintagency-it/agent-ledger@v0.2.0
  with:
    command: "node scripts/run-ai-agent-task.mjs"
    goal: "Review this AI-generated change before merge"
    scope: "src,tests"
    fail-on-critical: "true"

- uses: actions/upload-artifact@v7
  if: always()
  with:
    name: agent-ledger
    path: ${{ steps.agent-ledger.outputs.share }}
```

The Action only attributes changes created after its command starts. It is not yet a generic bot for an arbitrary already-open PR.

## What Agent Ledger Is Not

- It is not a hosted surveillance service.
- It does not silently observe an agent session that started before capture.
- It does not claim to make a model intrinsically more intelligent.
- It does not replace tests, code review, security review, or human judgment.

It improves execution discipline and makes the resulting evidence easier for both agents and humans to review.

## Current Limits

- The Codex adapter is the first agent-native workflow; other agents can still use the CLI manually.
- Capture is partial when commands bypass the wrapper or no transcript is available.
- Risk rules are deterministic signals, not semantic proof. Findings must be classified against real context.
- GitHub App, organization policy, signed reports, and hosted retention remain future team surfaces.

License: Apache-2.0.
