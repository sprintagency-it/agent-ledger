# Browser Visual QA

Date: 2026-07-09

Agent Ledger landing, demo, documentation, and report replay were reviewed in a real browser after the v0.2.0 agent-native onboarding pass.

## Results

| Surface | Viewport | Horizontal overflow | Truncated controls | Broken primary navigation |
|---|---:|---:|---:|---:|
| Landing | 1280x720 | 0 | 0 | 0 |
| Landing | 390x844 | 0 | 0 | 0 |
| Demo | 390x844 | 0 | 0 | 0 |
| Documentation | 390x844 | 0 | 0 | 0 |
| WARN replay | default desktop | 0 | 0 | 0 |

## Verified

- The first viewport identifies Agent Ledger, states the self-review promise, and exposes the install command.
- The landing loads a real Agent Ledger replay screenshot.
- Demo and Docs menu items open styled HTML pages rather than raw Markdown.
- PASS, WARN, and BLOCK cards point to generated HTML replays.
- No public site link ends in `.md`.
- Mobile layouts keep buttons, headings, navigation, code, and tables inside the viewport.
- Landing navigation clicks reached `demo.html` and `docs.html` with the expected page titles.
