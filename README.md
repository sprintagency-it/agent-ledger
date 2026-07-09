# Agent Ledger

PR-native review records for AI-generated code changes.

Agent Ledger turns an AI coding-agent run into a reviewable artifact for pull requests: what changed, what was verified, what looks risky, and what a human reviewer should inspect before merge.

> Review AI-generated code changes before they merge.

## Why This Exists

AI agents can generate useful code quickly, but PR reviewers are often left with only a diff and a vague chat transcript. That is not enough for teams that care about auth changes, sensitive files, tests, deploy risk, or auditability.

Agent Ledger creates a local-first review record:

- `pr-review.md` for PR comments, checks and job summaries;
- `executive-summary.md` for manager or supervisor review;
- `risk.md` for high-signal risk debriefs;
- `replay.html` for an offline timeline;
- `files-touched.csv` and `preexisting-dirty.csv` for scope and baseline review.

## What It Looks Like

Run the demo:

```bash
npm run demo:pr
```

Open:

```text
examples/pr-native-demo/index.html
```

The demo generates three AI-generated PR scenarios:

- [PASS example](examples/reports/pass/pr-review.md) - normal review can continue;
- [WARN example](examples/reports/warn/pr-review.md) - reviewer should inspect a specific command-level risk;
- [BLOCK example](examples/reports/block/pr-review.md) - human review required before merge.

## Install Locally

Agent Ledger requires Node 20+.

```bash
git clone https://github.com/sprintagency-it/agent-ledger.git
cd agent-ledger
npm test
npm run demo:pr
```

## Basic CLI Flow

```bash
node src/cli.mjs init --out .agent-ledger

SESSION="$(node src/cli.mjs start \
  --project "." \
  --name "review-ai-pr" \
  --goal "Review AI-generated code changes before merge" \
  --scope "." \
  --sensitive ".env,secrets,credentials,billing,finance,client,personal" \
  --out .agent-ledger)"

# After the AI agent has changed files:
node src/cli.mjs ingest --type git --session "$SESSION"
node src/cli.mjs render --session "$SESSION"

open "$SESSION/pr-review.md"
open "$SESSION/replay.html"
```

## GitHub Action

Use the Action to run an AI-agent command under Agent Ledger capture and publish `pr-review.md` to the GitHub Actions job summary.

This is a release-candidate check surface, not a full PR-diff bot yet. It captures changes made by the command you pass to the Action.

```yaml
name: Agent Ledger PR Review

on:
  workflow_dispatch:

jobs:
  agent-ledger:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # Run your AI coding-agent step here, or run Agent Ledger at the end
      # around a command that simulates or performs the agent work.

      - uses: sprintagency-it/agent-ledger@v0.1.0
        with:
          command: "node scripts/run-ai-agent-task.mjs"
          goal: "Review this AI-generated PR before merge"
          scope: "src,tests,scripts"
          fail-on-critical: "true"
          fail-on-high: "false"

      - uses: actions/upload-artifact@v4
        with:
          name: agent-ledger
          path: .agent-ledger/
```

For local testing inside this repo, use `uses: ./`.

Before making this a required PR check, test it in a disposable repository with the exact agent command you plan to use.

## Product Positioning

Agent Ledger is not an AI security agency and not a dashboard-first product. The first required moment is the PR:

1. An AI agent changes code.
2. Agent Ledger captures the local run evidence.
3. The PR gets a review record.
4. The human reviewer sees `PASS`, `WARN`, or `BLOCK` before merge.

## Design Partner CTA

Try Agent Ledger on one AI-generated PR. If the review record changes how you review, merge, block, or discuss the PR, you are the right design partner.

- Primary CTA: `Try it on one AI-generated PR`
- Secondary CTA: `Become a design partner`

See [docs/design-partner-brief.md](docs/design-partner-brief.md).

## Current Limits

This is an early local-first V0.

- It does not claim complete capture of every agent action.
- It does not upload prompts, diffs or transcripts to a hosted service.
- It is not a replacement for normal code review, tests, security review, or CI.
- GitHub App, org-level policy, signed reports and hosted retention are future paid/team surfaces.

## Before Public Release

Open [docs/publication-checklist.md](docs/publication-checklist.md) before publishing.

License: Apache-2.0.
