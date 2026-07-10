# Agent Ledger 15-Minute Beta Test

The beta has one question: does Agent Ledger make one real coding-agent task easier to trust without adding unacceptable friction?

## Before You Start

- Use a repository you can safely edit.
- Choose one small, reversible task that normally takes 5-10 minutes.
- Start from a clean branch when practical.
- Requirements: Git, Node 20+, and Codex or Claude Code.

Do not use your first beta run for production deployment, auth changes, secret rotation, billing, destructive operations, or sensitive client data.

## Minute 0-2 - Install v0.3.1

Primary setup for Codex and Claude Code:

```bash
npx --yes github:sprintagency-it/agent-ledger#v0.3.1 setup --project .
```

Directory setup with the self-contained skill runtime:

```bash
npx skills add sprintagency-it/agent-ledger
```

The official `skills` CLI collects anonymous installation telemetry by default. Use `DISABLE_TELEMETRY=1 npx skills add sprintagency-it/agent-ledger` to opt out. Agent Ledger receives no install telemetry and sends no run data anywhere.

## Minute 2-10 - Run One Real Task

Give your agent a concrete outcome, likely path boundaries, and the check you expect:

```text
# Codex
Use $agent-ledger to make this small change: <task>. Stay within <paths> and run <check> before handoff.

# Claude Code
/agent-ledger Make this small change: <task>. Stay within <paths> and run <check> before handoff.
```

Let the skill complete its bounded review and one safe correction pass. Do not manually manufacture a PASS; a useful WARN or BLOCK is valid beta evidence.

## Minute 10-13 - Inspect The Record

Open the run folder under `.agent-ledger/runs/` and read:

1. `executive-summary.md` - can you understand the outcome without reopening the chat?
2. `review.json` - are status, evidence, and findings machine-readable?
3. `fix-brief.md` - did the agent classify critical or high signals instead of blindly fixing them?
4. `replay.html` - is the task legible to a human reviewer?

The run is useful only if the record matches what actually happened. A successful command alone is not enough.

## Minute 13-15 - Send Feedback

Answer four practical questions:

- Did Agent Ledger catch or clarify anything you would otherwise have missed?
- Could you tell what changed, what was checked, and what remained unresolved?
- How much extra time or friction did the loop add?
- Would you use it again on an AI-generated change?

[Submit the structured beta feedback form](https://github.com/sprintagency-it/agent-ledger/issues/new?template=beta-feedback.yml).

## Privacy Boundary

Agent Ledger has no hosted account and sends no run data to the maintainer. Raw diffs, snapshots, transcripts, and command logs remain local under `.agent-ledger/`. The smaller `share/` bundle is redacted on a best-effort basis, so inspect every file before attaching it to feedback. A text-only answer is enough; uploads are optional.

## What Counts As A Completed Beta Run

A run counts when installation succeeds, the agent completes one real task, the tester inspects at least the executive summary and replay, and the feedback form records the outcome. Product adoption claims require external completed runs, not installs alone.
