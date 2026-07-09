# Public Release Checklist

## Must Be True Before Publishing

- [x] GitHub owner/repo URL selected.
- [x] License selected and `package.json` updated.
- [x] README links point to the real repo.
- [x] `npm test` passes.
- [x] `npm run demo:pr` generates PASS, WARN and BLOCK examples.
- [x] `examples/pr-native-demo/index.html` parses locally.
- [x] `site/index.html` parses locally.
- [ ] GitHub Action workflow tested in a disposable repo or branch.
- [ ] GitHub Action tested after a real AI-agent step, not only on a clean PR checkout.
- [x] First launch uses the Action as a command-capturing same-job agent check.
- [ ] Landing reviewed on desktop and mobile viewport.
- [ ] Demo/test redaction fixtures reviewed so fake tokens cannot be mistaken for real secrets.
- [ ] No private vault paths appear in public README, examples or landing.
- [ ] No secrets, client data, billing data or personal data present.

## Suggested Launch Order

1. Publish GitHub repo.
2. Run the Action in a disposable repo with a real agent-generated change.
3. Open the demo locally and capture one short GIF or screenshot.
4. Publish a simple static landing page.
5. Invite 10-20 AI-heavy builders to try it on one PR.
6. Post Show HN only after at least one external user can run it.

## Launch Copy

Headline:

> Review AI-generated code changes before they merge.

One-liner:

> Agent Ledger creates PR-native review records for AI coding-agent work: files changed, verification, risk, and reviewer actions in one local-first artifact.

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
