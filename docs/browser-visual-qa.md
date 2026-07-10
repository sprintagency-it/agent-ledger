# Browser Visual QA

Date: 2026-07-10

Agent Ledger landing, beta protocol, demo, documentation, and report replay were reviewed in a real browser after the v0.3.1 beta-readiness pass.

## Results

| Surface | Viewport | Horizontal overflow | Truncated controls | Broken primary navigation |
|---|---:|---:|---:|---:|
| Landing | 1440x900 | 0 | 0 | 0 |
| Landing | 390x844 | 0* | 0 | 0 |
| Beta protocol | 1440x900 | 0 | 0 | 0 |
| Beta protocol | 390x844 | 0 | 0 | 0 |
| Demo | 1440x900 | 0 | 0 | 0 |
| Demo | 390x844 | 0 | 0 | 0 |
| Documentation | 1440x900 | 0 | 0 | 0 |
| Documentation | 390x844 | 0 | 0 | 0 |
| WARN replay | default desktop | 0 | 0 | 0 |

`*` The landing install command is intentionally wider than its mobile container and scrolls inside `overflow-x: auto`; the document width remains inside the viewport.

## Verified

- The first viewport identifies Agent Ledger, states the self-review promise, and routes testers to the 15-minute beta.
- The beta protocol shows one primary path, v0.3.1 commands, explicit timing, privacy boundaries, and a structured feedback CTA.
- The landing loads a real Agent Ledger replay screenshot.
- The replay image preserves its native 1265x712 ratio on desktop and mobile instead of cropping its sides.
- The install CTA is agent-neutral, and the quickstart shows both Codex and Claude Code invocations.
- Demo and Docs menu items open styled HTML pages rather than raw Markdown.
- PASS, WARN, and BLOCK cards point to generated HTML replays.
- No public site link ends in `.md`.
- Mobile layouts keep buttons, headings, navigation, code, and tables inside the viewport.
- Landing, beta, demo, and docs loaded with the expected titles, zero broken images, and zero broken local references.
