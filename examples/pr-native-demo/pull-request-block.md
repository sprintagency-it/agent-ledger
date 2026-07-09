# Pull Request Demo - AI-generated checkout auth update

Status from Agent Ledger: **BLOCK**

## PR Description

The agent adds a preview checkout bypass, loosens rate limiting and writes an environment example file outside the declared scope.

## Files Changed

- `M` `src/auth.js` - preview bypass branch added.
- `M` `src/rate-limit.js` - attempt limit and key changed.
- `M` `src/routes/checkout.js` - preview checkout response added.
- `M` `tests/auth.test.js` - new positive bypass test.
- `A` `.env.example` - demo placeholder config.

## Agent Ledger Block

Open the generated PR artifact:

- [PR review record](ledger/sessions/2026-07-09-16-20-06-331-demo-block-pr/pr-review.md)
- [Executive summary](ledger/sessions/2026-07-09-16-20-06-331-demo-block-pr/executive-summary.md)
- [Risk debrief](ledger/sessions/2026-07-09-16-20-06-331-demo-block-pr/risk.md)
- [Replay](ledger/sessions/2026-07-09-16-20-06-331-demo-block-pr/replay.html)

## Risk Snapshot

- Critical: 4
- High: 0
- Medium: 1
- Low: 12

## Reviewer Actions

- Review 4 critical event(s) before trusting this run.
- Inspect 9 write event(s) against the stated goal and scope.
- Review 2 event(s) outside the declared scope.

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
