# Agent Ledger PR-Native Demo

This folder is a complete local sales/demo package for Agent Ledger.

Open first:

- [index.html](index.html) - visual product demo.
- [pull-request.md](pull-request.md) - simulated PR status spectrum.
- [../reports/README.md](../reports/README.md) - stable example reports.

## Scenarios

### PASS - AI-generated docs copy cleanup

- [Simulated PR](pull-request-pass.md)
- [PR review record](../reports/pass/pr-review.md)
- [Executive summary](../reports/pass/executive-summary.md)
- [Risk debrief](../reports/pass/risk.md)
- [Replay](../reports/pass/replay.html)

### WARN - AI-generated report script update

- [Simulated PR](pull-request-warn.md)
- [PR review record](../reports/warn/pr-review.md)
- [Executive summary](../reports/warn/executive-summary.md)
- [Risk debrief](../reports/warn/risk.md)
- [Replay](../reports/warn/replay.html)

### BLOCK - AI-generated checkout auth update

- [Simulated PR](pull-request-block.md)
- [PR review record](../reports/block/pr-review.md)
- [Executive summary](../reports/block/executive-summary.md)
- [Risk debrief](../reports/block/risk.md)
- [Replay](../reports/block/replay.html)


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
