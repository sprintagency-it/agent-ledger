# Agent Ledger Supervisor Report

Sessions reviewed: 3

## Supervisor Verdict

Do not trust the combined work blindly. At least one run needs human review before handoff.

## Combined Risk Snapshot

- Critical: 4
- High: 1
- Medium: 4
- Low: 36

## Runs

### 2026-07-09-16-20-05-770-demo-pass-pr

Low immediate risk detected by V0 rules, but capture is partial.

- Events captured: 14
- File/write events: 4
- Command executions: 1
- Tool calls: 0
- Scope drift events: 1
- Pre-existing dirty paths ignored: 0
- Redaction patterns triggered: 1

### 2026-07-09-16-20-06-061-demo-warn-pr

Review high-risk items before trusting this run.

- Events captured: 14
- File/write events: 4
- Command executions: 1
- Tool calls: 0
- Scope drift events: 1
- Pre-existing dirty paths ignored: 0
- Redaction patterns triggered: 0

### 2026-07-09-16-20-06-331-demo-block-pr

Do not trust blindly. Human review required before merge, deploy, send, or handoff.

- Events captured: 17
- File/write events: 9
- Command executions: 0
- Tool calls: 0
- Scope drift events: 2
- Pre-existing dirty paths ignored: 0
- Redaction patterns triggered: 0


## Cross-Run Review Queue

- 2026-07-09-16-20-05-770-demo-pass-pr: Inspect 4 write event(s) against the stated goal and scope.
- 2026-07-09-16-20-05-770-demo-pass-pr: Review 1 event(s) outside the declared scope.
- 2026-07-09-16-20-06-061-demo-warn-pr: Review 1 high-risk event(s), especially sensitive paths and side effects.
- 2026-07-09-16-20-06-061-demo-warn-pr: Inspect 4 write event(s) against the stated goal and scope.
- 2026-07-09-16-20-06-061-demo-warn-pr: Review 1 event(s) outside the declared scope.
- 2026-07-09-16-20-06-331-demo-block-pr: Review 4 critical event(s) before trusting this run.
- 2026-07-09-16-20-06-331-demo-block-pr: Inspect 9 write event(s) against the stated goal and scope.
- 2026-07-09-16-20-06-331-demo-block-pr: Review 2 event(s) outside the declared scope.

## Cross-Run Top Risks

- 2026-07-09-16-20-05-770-demo-pass-pr: No critical/high events detected.
- 2026-07-09-16-20-06-061-demo-warn-pr: **HIGH** execute `chmod +x scripts/check-report.js`: Command started: chmod +x scripts/check-report.js
- 2026-07-09-16-20-06-331-demo-block-pr: **CRITICAL** write `src/auth.js`: Git status M for src/auth.js
- 2026-07-09-16-20-06-331-demo-block-pr: **CRITICAL** write `tests/auth.test.js`: Git status M for tests/auth.test.js
- 2026-07-09-16-20-06-331-demo-block-pr: **CRITICAL** write `.env.example`: Git status ?? for .env.example
- 2026-07-09-16-20-06-331-demo-block-pr: **CRITICAL** write `src/auth.js to allow a preview bypass header.`: - Edited src/auth.js to allow a preview bypass header.

## Prompt For CEO/Supervisor Agent

> You are reviewing multiple AI agent runs. Decide which runs can be trusted, which require human review, what policy should change, and whether any subagent needs to rerun work. Missing evidence is unknown, not safe.
