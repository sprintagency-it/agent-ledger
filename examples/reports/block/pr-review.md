# Agent Ledger PR Review Record

<!-- agent-ledger:pr-review:v0.1 -->

Status: BLOCK

[BLOCK] **Human review required before merge** - Critical Agent Ledger finding(s) were detected.

## Run Context

- Session: `demo-block-pr`
- Goal: Review AI-generated checkout and auth changes before merge
- Scope: src,tests,.github
- Project: `$REPO_ROOT/examples/pr-native-demo/scenarios/block/repo`

## Risk Snapshot

- Critical: 4
- High: 0
- Medium: 0
- Low: 13

## Reviewer Actions

- Review 4 critical event(s) before trusting this run.
- Inspect 9 write event(s) against the stated goal and scope.
- Review 1 event(s) outside the declared scope.

## Evidence-Based Findings

### AL-001 - CRITICAL write

- Evidence: `src/auth.js`
- Why it matters: Write event; Sensitive path or topic; Matches sensitive scope: auth
- Reviewer action: inspect this change before merge and require a fix or explicit acceptance if the risk is real.
- Summary: Git status M for src/auth.js

### AL-002 - CRITICAL write

- Evidence: `tests/auth.test.js`
- Why it matters: Write event; Sensitive path or topic; Matches sensitive scope: auth
- Reviewer action: inspect this change before merge and require a fix or explicit acceptance if the risk is real.
- Summary: Git status M for tests/auth.test.js

### AL-003 - CRITICAL write

- Evidence: `.env.example`
- Why it matters: Write event; Sensitive path or topic; Matches sensitive scope: .env; Target is outside declared scope: src,tests,.github
- Reviewer action: inspect this change before merge and require a fix or explicit acceptance if the risk is real.
- Summary: Git status ?? for .env.example

### AL-004 - CRITICAL write

- Evidence: `src/auth.js to allow a preview bypass header.`
- Why it matters: Write event; Sensitive path or topic; Matches sensitive scope: auth
- Reviewer action: inspect this change before merge and require a fix or explicit acceptance if the risk is real.
- Summary: - Edited src/auth.js to allow a preview bypass header.

## Files And Commands Summary

- Files/write events: 9
- Command executions: 0
- Verification-like events observed: 1

- `.github/workflows/ci.yml`: Git status M for .github/workflows/ci.yml
- `src/auth.js`: Git status M for src/auth.js
- `src/rate-limit.js`: Git status M for src/rate-limit.js
- `src/routes/checkout.js`: Git status M for src/routes/checkout.js
- `tests/auth.test.js`: Git status M for tests/auth.test.js
- `.env.example`: Git status ?? for .env.example
- `src/auth.js to allow a preview bypass header.`: - Edited src/auth.js to allow a preview bypass header.
- `src/routes/checkout.js to return a preview checkout id.`: - Edited src/routes/checkout.js to return a preview checkout id.
- `CI reporter output.`: - Updated CI reporter output.


## Local Artifacts

- Executive summary: `executive-summary.md`
- Risk debrief: `risk.md`
- Replay: `replay.html`
- Files touched: `files-touched.csv`
- Pre-existing dirty baseline: `preexisting-dirty.csv`

## V0 Limit

This is a local-first review record for AI-generated changes. Missing transcript, hooks, tests or CI evidence is unknown, not safe.
