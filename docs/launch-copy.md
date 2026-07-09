# Launch Copy

## Positioning

Agent Ledger is an accountable self-review loop for AI coding agents.

The agent scopes the task, verifies its work, reviews findings, corrects eligible issues, and leaves evidence for the human.

## Primary Claim

Make your coding agent check its own work.

## Short Description

Agent Ledger gives Codex a bounded loop for scope, execution, verification, finding review, and safe correction. Every run ends with machine-readable findings and a human-readable record of what changed, what passed, and what still needs a decision.

## GitHub README Hook

Your AI agent should not wait for the human to reconstruct every missed check from a chat transcript.

Invoke `$agent-ledger` and the agent will:

- declare outcome and scope before editing;
- capture practical command and Git evidence;
- render `PASS`, `WARN`, or `BLOCK` findings;
- classify findings before fixing or dismissing them;
- correct safe true positives inside scope;
- hand off `review.json`, `fix-brief.md`, `executive-summary.md`, and `replay.html`.

## Proof Surface

PR-native review records remain the clearest team-facing proof. Use this secondary claim:

> Every AI-generated change should arrive with the evidence needed to review it.

The GitHub Action captures changes produced by the command passed to it. Do not imply that it automatically understands every already-open PR or every agent action.

## CTA Variants

- Install Agent Ledger for Codex.
- Try it on one real agent task.
- Make your next AI change self-reviewing.
- Open the PASS / WARN / BLOCK demo.

## Show HN Candidates

- Show HN: Agent Ledger - a self-review loop for AI coding agents
- Show HN: I made Codex review and correct its own task before handoff
- Agent Ledger: scoped execution, verification, and evidence for AI coding tasks

## What Not To Say

- Do not claim that Agent Ledger makes the underlying model intrinsically smarter.
- Do not call it a generic logger.
- Do not imply complete observability or security guarantees.
- Do not promise blind automatic fixes across auth, secrets, permissions, billing, deploys, or destructive behavior.
- Do not sell manual AI security audits.
