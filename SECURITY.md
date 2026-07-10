# Security Policy

## Supported Version

Security fixes are applied to the latest v0.3.x release while Agent Ledger is in beta.

## Report A Vulnerability Privately

Do not open a public issue for a suspected vulnerability or exposed secret. Use [GitHub private vulnerability reporting](https://github.com/sprintagency-it/agent-ledger/security/advisories/new) and include:

- the affected version and installation path;
- a minimal reproduction;
- the expected and observed behavior;
- potential impact;
- any safe mitigation you already tested.

Remove real credentials, client data, and private run artifacts before submitting. We will validate the report, coordinate a fix when confirmed, and publish an advisory when disclosure is appropriate.

## Product Boundary

Agent Ledger applies deterministic risk signals and best-effort redaction. It does not replace secret scanning, sandboxing, dependency review, secure code review, or human approval for sensitive operations.
