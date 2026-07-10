# Agent Ledger

An accountable self-review loop for AI coding agents.

[![CI](https://github.com/sprintagency-it/agent-ledger/actions/workflows/ci.yml/badge.svg)](https://github.com/sprintagency-it/agent-ledger/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/sprintagency-it/agent-ledger)](https://github.com/sprintagency-it/agent-ledger/releases/latest)
[![License](https://img.shields.io/github/license/sprintagency-it/agent-ledger)](LICENSE)
[![skills.sh](https://skills.sh/b/sprintagency-it/agent-ledger)](https://skills.sh/sprintagency-it/agent-ledger)

[15-minute beta test](https://agent-ledger.pages.dev/beta) | [Live demo](https://agent-ledger.pages.dev/demo) | [Documentation](https://agent-ledger.pages.dev/docs) | [Website](https://agent-ledger.pages.dev)

> **Beta testers wanted:** run Agent Ledger on one small real task, inspect the record, and tell us whether it caught something useful or made the handoff clearer. [Start the 15-minute beta](https://agent-ledger.pages.dev/beta).

Agent Ledger makes a coding agent declare scope before editing, capture what it changes, run verification, inspect its own findings, correct eligible issues, and leave a reviewable record for the human.

> The report is the evidence. The product is the better execution loop that creates it.

Agent Ledger is local-first and open source. The current release includes project skills for Codex and Claude Code, a Node CLI, and a command-capturing GitHub Action.

## Install In One Command

Requirements: Git, Node 20+, and Codex or Claude Code.

Recommended beta install from the skills directory:

```bash
npx skills add sprintagency-it/agent-ledger --skill agent-ledger --yes --copy
```

The CLI detects the active agent. If needed, add `--agent codex` or `--agent claude-code`. The installed skill includes its local runtime and bootstraps the ignored `.agent-ledger/` workspace on first use.

Then invoke the installed repository skill in Codex or Claude Code:

```text
Use $agent-ledger to add input validation to the signup form and verify it with the existing tests.

# Claude Code
/agent-ledger Add input validation to the signup form and verify it with the existing tests.
```

The official `skills` CLI collects anonymous installation telemetry by default; set `DISABLE_TELEMETRY=1` to opt out. Agent Ledger itself sends no run data anywhere.

### Install Codex And Claude Code Together

Use the tagged setup command when you want both skill locations prepared immediately:

```bash
npx --allow-git=all --yes github:sprintagency-it/agent-ledger#v0.3.3 setup --project .
```

`--allow-git=all` explicitly permits this one `npx` process to fetch the tagged Git package, which npm 12 blocks by default. The setup command installs:

- `.agents/skills/agent-ledger/` - the shareable workflow Codex discovers;
- `.claude/skills/agent-ledger/` - the same workflow for Claude Code;
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

## Run The 15-Minute Beta

Use a small, reversible task in a repository you can safely edit. Install v0.3.3, invoke `$agent-ledger` or `/agent-ledger`, then inspect `executive-summary.md` and `replay.html` before submitting the short feedback form.

[Open the beta protocol](docs/beta-test.md) | [Submit beta feedback](https://github.com/sprintagency-it/agent-ledger/issues/new?template=beta-feedback.yml)

Agent Ledger has no hosted telemetry. Run evidence stays under the ignored `.agent-ledger/` directory; share only the files you deliberately choose after reviewing them.

## Lower-Level CLI

The agent skills use the CLI automatically. You can also run it directly:

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
  uses: sprintagency-it/agent-ledger@v0.3.3
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

- Codex and Claude Code have first-class repository skills; other agents can still use the CLI manually.
- Capture is partial when commands bypass the wrapper or no transcript is available.
- Risk rules are deterministic signals, not semantic proof. Findings must be classified against real context.
- GitHub App, organization policy, signed reports, and hosted retention remain future team surfaces.

## Community And Security

- [Ask a question or share an idea](https://github.com/sprintagency-it/agent-ledger/discussions)
- [Report a bug](https://github.com/sprintagency-it/agent-ledger/issues/new?template=bug-report.yml)
- [Contribute](CONTRIBUTING.md)
- [Report a vulnerability privately](SECURITY.md)

License: [Apache-2.0](LICENSE).
