# Agent Ledger PR-Native Demo

This folder is a complete local sales/demo package for Agent Ledger.

Open first:

- [index.html](index.html) - visual product demo.
- [pull-request.md](pull-request.md) - simulated PR status spectrum.
- [supervisor-report.md](ledger/supervisor-report.md) - aggregated supervisor report.

## Scenarios

### PASS - AI-generated docs copy cleanup

- [Simulated PR](pull-request-pass.md)
- [PR review record](ledger/sessions/2026-07-09-16-20-05-770-demo-pass-pr/pr-review.md)
- [Executive summary](ledger/sessions/2026-07-09-16-20-05-770-demo-pass-pr/executive-summary.md)
- [Risk debrief](ledger/sessions/2026-07-09-16-20-05-770-demo-pass-pr/risk.md)
- [Replay](ledger/sessions/2026-07-09-16-20-05-770-demo-pass-pr/replay.html)

### WARN - AI-generated report script update

- [Simulated PR](pull-request-warn.md)
- [PR review record](ledger/sessions/2026-07-09-16-20-06-061-demo-warn-pr/pr-review.md)
- [Executive summary](ledger/sessions/2026-07-09-16-20-06-061-demo-warn-pr/executive-summary.md)
- [Risk debrief](ledger/sessions/2026-07-09-16-20-06-061-demo-warn-pr/risk.md)
- [Replay](ledger/sessions/2026-07-09-16-20-06-061-demo-warn-pr/replay.html)

### BLOCK - AI-generated checkout auth update

- [Simulated PR](pull-request-block.md)
- [PR review record](ledger/sessions/2026-07-09-16-20-06-331-demo-block-pr/pr-review.md)
- [Executive summary](ledger/sessions/2026-07-09-16-20-06-331-demo-block-pr/executive-summary.md)
- [Risk debrief](ledger/sessions/2026-07-09-16-20-06-331-demo-block-pr/risk.md)
- [Replay](ledger/sessions/2026-07-09-16-20-06-331-demo-block-pr/replay.html)


## Why This Matters

The demo shows that Agent Ledger is not just a blocker. It separates AI-generated PRs into three operational outcomes:

- PASS - proceed with normal review;
- WARN - review a specific risk signal;
- BLOCK - stop before merge until a human reviews the issue.

## Regenerate

From the repository root:

```bash
node scripts/create-pr-native-demo.mjs
```

Or use:

```bash
npm run demo:pr
```

No live private values, customer data, billing data or production systems are used in this demo.
