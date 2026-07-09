# Launch Copy

## Positioning

Agent Ledger creates PR-native review records for AI-generated code changes.

## Primary Claim

Review AI-generated code changes before they merge.

## Short Description

AI agents can ship code faster than teams can review it. Agent Ledger turns an AI coding-agent run into a PR review record: files changed, verification evidence, risk signals and reviewer actions.

## GitHub README Hook

Your AI agent changed the code. The PR reviewer should not have to reconstruct the run from a chat transcript.

Agent Ledger generates `pr-review.md` for every AI-generated PR so reviewers can see:

- what changed;
- what was verified;
- what touched sensitive scope;
- what should be reviewed before merge;
- whether the PR is `PASS`, `WARN`, or `BLOCK`.

## GitHub Action Wording

Use conservative wording until the Action has been tested in a disposable GitHub repo with a real agent-generated change:

> Agent Ledger can publish a PR review record from the evidence captured during an AI-agent workflow.

Avoid saying that the Action automatically understands every clean `pull_request` checkout. The first public workflow should be described as a same-job agent check or local-first review artifact until PR-diff bot behavior is built and verified.

## CTA Variants

- Try it on one AI-generated PR.
- Attach a ledger to your next AI PR.
- Become a design partner.
- Make AI-generated PRs reviewable.

## Show HN Candidates

- Show HN: Agent Ledger - PR review records for AI-generated code
- Show HN: I built a local review record for AI coding-agent PRs
- Every AI-generated PR should come with a ledger

## What Not To Say

- Do not call it a generic logger.
- Do not sell manual AI security audits.
- Do not imply complete observability yet.
- Do not claim security guarantees from V0 risk rules.
