# Public Release Checklist

## Must Be True Before Publishing

- [x] GitHub owner/repo URL selected.
- [x] License selected and `package.json` updated.
- [x] README links point to the real repo.
- [x] `npm test` passes.
- [x] `npm run demo:pr` generates PASS, WARN and BLOCK examples.
- [x] `examples/pr-native-demo/index.html` parses locally.
- [x] `site/index.html` parses locally.
- [x] GitHub Action workflow tested in a disposable repo or branch.
- [x] GitHub Action tested after a command-generated workspace change, not only on a clean PR checkout.
- [x] First launch uses the Action as a command-capturing same-job agent check.
- [x] Landing reviewed on desktop and mobile viewport.
- [x] Demo reviewed on desktop and mobile viewport.
- [x] Demo/test redaction fixtures reviewed so fake tokens cannot be mistaken for real secrets.
- [x] GitHub Action uploads the redacted `share` bundle rather than the raw session root.
- [x] No private vault paths appear in public README, examples or landing.
- [x] No secrets, client data, billing data or personal data present.
- [x] Apache-2.0 license is detected by GitHub from `LICENSE`.
- [x] `SECURITY.md`, `CONTRIBUTING.md`, CI, Discussions and Issue Forms are public.
- [x] The direct v0.3.3 install works in a clean temporary repository, including npm 12's Git-fetch policy.
- [x] The skills directory install includes the bundled runtime and works without a second bootstrap.
- [x] The 15-minute beta page links to the structured feedback form.

Browser QA evidence:

- [Browser Visual QA](browser-visual-qa.md) reports zero horizontal overflow, zero clipped text and zero missing local links for landing and demo on desktop/mobile.
- Screenshot set captured for landing and demo at `1440x900` and `390x844`.

Fixture review:

- `DEMO_TOKEN_VALUE_1234567890` appears only in synthetic tests and transcript fixtures.
- Public demo config uses `AGENT_LEDGER_DEMO_PLACEHOLDER=replace-me-demo-only`.
- Generated visible reports redact the synthetic token value.
- Raw diffs, transcripts, workspace snapshots and command logs are excluded from `share/` by default.

## Suggested Launch Order

1. Publish GitHub release v0.3.3 and the beta page.
2. Confirm the direct and skills directory installs from clean repositories.
3. Recruit 5-10 AI-heavy builders for one small real task.
4. Record activation, completed runs, useful catches, friction, and retained usage.
5. Post more broadly only after at least three external completed runs.

## Launch Copy

Headline:

> Review AI-generated code changes before they merge.

One-liner:

> Agent Ledger gives AI coding agents a bounded self-review loop for scope, verification, finding review, safe correction, and evidence-based human handoff.

Primary CTA:

> Try it on one AI-generated PR.

Secondary CTA:

> Become a design partner.

## Open Decisions

License:

- MIT is simplest for adoption.
- Apache-2.0 adds explicit patent language.
- BSL/source-available is possible but weakens open-source distribution.

Commercial boundary:

- Free: CLI, generated reports, GitHub Action, examples.
- Paid later: GitHub App, org policies, required checks, team audit, signed reports, self-host.
