# Agent Ledger PR Review Record

<!-- agent-ledger:pr-review:v0.1 -->

Status: WARN

[WARN] **Review high-risk items before merge** - High-risk Agent Ledger finding(s) were detected.

## Run Context

- Session: `demo-warn-pr`
- Goal: Review an AI-generated reporting helper update before merge
- Scope: docs,scripts,tests
- Project: `$REPO_ROOT/examples/pr-native-demo/scenarios/warn/repo`

## Risk Snapshot

- Critical: 0
- High: 1
- Medium: 2
- Low: 11

## Reviewer Actions

- Review 1 high-risk event(s), especially sensitive paths and side effects.
- Inspect 4 write event(s) against the stated goal and scope.
- Review 1 event(s) outside the declared scope.

## Evidence-Based Findings

### AL-001 - HIGH execute

- Evidence: `chmod +x scripts/check-report.js`
- Why it matters: Command execution; High-risk command pattern
- Reviewer action: inspect this change before merge and require a fix or explicit acceptance if the risk is real.
- Summary: Command started: chmod +x scripts/check-report.js

## Files And Commands Summary

- Files/write events: 4
- Command executions: 1
- Verification-like events observed: 4

- `docs/reporting.md`: Git status M for docs/reporting.md
- `scripts/check-report.js`: Git status M for scripts/check-report.js
- `docs/reporting.md.`: - Edited docs/reporting.md.
- `scripts/check-report.js.`: - Edited scripts/check-report.js.


## Local Artifacts

- Executive summary: `executive-summary.md`
- Risk debrief: `risk.md`
- Replay: `replay.html`
- Files touched: `files-touched.csv`
- Pre-existing dirty baseline: `preexisting-dirty.csv`

## V0 Limit

This is a local-first review record for AI-generated changes. Missing transcript, hooks, tests or CI evidence is unknown, not safe.
