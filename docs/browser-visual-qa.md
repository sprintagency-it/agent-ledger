# Browser Visual QA

Date: 2026-07-09

Agent Ledger landing and PR-native demo were reviewed in Chromium with desktop and mobile viewports before the public V0 release.

## Result

| Surface | Viewport | Horizontal overflow | Clipped text | Missing local links |
|---|---:|---:|---:|---:|
| Landing | 1440x900 | 0 | 0 | 0 |
| Landing | 390x844 | 0 | 0 | 0 |
| PR-native demo | 1440x900 | 0 | 0 | 0 |
| PR-native demo | 390x844 | 0 | 0 | 0 |
| Replay report | 1440x900 | 0 | 0 | n/a |
| Replay report | 390x844 | 0 | 0 | n/a |

## Notes

- The hero headline line-height was increased from `0.98` to `1.04` to avoid tight font-metric clipping on small screens.
- The demo status spectrum remained visible and readable across PASS, WARN and BLOCK cards.
- The human-facing surfaces now share a warm developer-tool palette, monospace metadata, compact corners and the `>_` product mark.
- Replay reports expose the PASS/WARN/BLOCK state in the first viewport and keep the event timeline horizontally contained on mobile.
- Local links from the landing and demo resolved successfully.
