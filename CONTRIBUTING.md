# Contributing To Agent Ledger

Agent Ledger is in an evidence-first beta. Small changes that improve real task reliability, installation, report clarity, or false-positive handling are preferred over broad feature additions.

## Start With The Right Surface

- Use [beta feedback](https://github.com/sprintagency-it/agent-ledger/issues/new?template=beta-feedback.yml) for a completed test run.
- Use the [bug report](https://github.com/sprintagency-it/agent-ledger/issues/new?template=bug-report.yml) for reproducible defects.
- Use [Discussions](https://github.com/sprintagency-it/agent-ledger/discussions) for design questions and proposals.
- Follow [SECURITY.md](SECURITY.md) for vulnerabilities.

## Local Development

Requirements: Git and Node 20+.

```bash
npm run sync:skill
npm run verify
```

`sync:skill` copies the CLI runtime into the distributable skill. `verify` checks runtime parity, tests, generated demo output, and local site links.

## Pull Requests

Keep each pull request focused. Explain the user-visible outcome, paths changed, checks run, and any unresolved risk. Add or update tests when behavior changes. Do not commit `.agent-ledger/`, raw run artifacts, secrets, client data, or unrelated generated files.

By contributing, you agree that your contribution is licensed under Apache-2.0.
