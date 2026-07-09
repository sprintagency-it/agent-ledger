# Agent Ledger Design Partner Brief

## Who This Is For

Agent Ledger is for teams already using AI coding agents in real repositories.

Good fit:

- you merge AI-generated PRs weekly;
- more than one human reviews agent-generated code;
- you care about auth, payments, data, CI, deploy, or audit trails;
- you want a PR-native record, not another generic dashboard.

Bad fit:

- you only use AI for isolated snippets;
- you do not use pull requests;
- you want a managed AI security agency to review code manually.

## Pilot Promise

Try Agent Ledger on one AI-generated PR.

At the end of the pilot, you should know:

- what changed;
- what was verified;
- what was risky;
- what the reviewer should inspect;
- whether the PR should pass, warn, or block before merge.

## Design Partner CTA

Primary:

> Try it on one AI-generated PR.

Secondary:

> Become a design partner.

## Design Partner Ask

Use Agent Ledger on 3 real AI-generated PRs and share:

- whether `pr-review.md` changed reviewer behavior;
- which findings were useful;
- which findings were noisy;
- what should be configurable;
- whether this should become a required PR check.

Start with the [local quickstart](quickstart.md). For V0, capture begins before the agent edits the repository; the GitHub Action path is only for agent commands that run inside the same CI job.

## What We Are Not Selling Yet

- No agency review package.
- No fake enterprise dashboard.
- No hosted upload by default.
- No promise that V0 captures every agent action.

## Future Paid Surfaces

- GitHub App with org-level policy;
- required checks;
- team retention and audit history;
- signed reports;
- Slack/GitHub workflows;
- self-hosted enterprise mode;
- support and onboarding.
