# Status Model

- `PASS`: no critical or high findings were detected by current rules. Normal review still applies.
- `WARN`: at least one high finding needs inspection before trust or merge.
- `BLOCK`: at least one critical finding requires human review before trust, merge, deployment, send, or handoff.

Status is evidence routing, not a statement that the code is correct or incorrect. Classify each finding against the actual task and repository context before fixing or dismissing it.
