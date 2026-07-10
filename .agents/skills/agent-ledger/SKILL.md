---
name: agent-ledger
description: Execute a coding or repository task with an accountable self-review loop. Use when the user asks to run Agent Ledger, make an agent task more reliable, capture scoped changes, verify work, review PASS/WARN/BLOCK findings, correct eligible issues, or produce a human and machine-readable run record. Do not use for read-only questions or trivial commands that do not modify a project.
---

# Agent Ledger

Make the task itself more disciplined: declare the goal and scope before editing, capture changes and checks, inspect the resulting findings, correct safe issues, and leave a concise evidence record for the human.

## Runtime

Resolve the runtime in this order:

1. `.agent-ledger/runtime/src/cli.mjs` when the full setup command was used;
2. `.agents/skills/agent-ledger/runtime/src/cli.mjs` when installed with the skills CLI for Codex or another compatible agent;
3. `.claude/skills/agent-ledger/runtime/src/cli.mjs` when installed for Claude Code.

Set `LEDGER` to the first existing path. The bundled skill runtime is self-contained; run evidence still belongs under `.agent-ledger/runs/` and must remain ignored by Git.

When the repository-local runtime is missing but a bundled skill runtime exists, bootstrap locally before the first session:

```bash
node "$LEDGER" setup --project .
LEDGER=".agent-ledger/runtime/src/cli.mjs"
```

This uses only the installed skill files, installs the shared local runtime, prepares both Codex and Claude Code skill locations, and ensures `.agent-ledger/` is ignored. It does not require network access.

If no runtime exists, tell the user that setup is required and run this from the repository root after approval for network access:

```bash
npx --allow-git=all --yes github:sprintagency-it/agent-ledger#v0.3.2 setup --project .
```

Store run output under `.agent-ledger/runs/<run-name>`. This directory is local evidence and should remain ignored by Git. The installed skills under `.agents/skills/agent-ledger` (Codex) and `.claude/skills/agent-ledger` (Claude Code) are intended to be committed.

## Workflow

### 1. Preflight Before Editing

Read repository instructions first. State internally and in the run metadata:

- the concrete outcome;
- the smallest machine-readable scope, as comma-separated project-relative paths;
- acceptance checks that can prove the task works;
- explicit non-goals and approval boundaries.

Do not use `.` as scope when narrower paths are known. Never include unrelated dirty files simply to make the ledger clean.

Start the session before modifying files:

```bash
LEDGER=".agent-ledger/runtime/src/cli.mjs"
OUT=".agent-ledger/runs/<run-name>"
SESSION="$(node "$LEDGER" start \
  --project . \
  --name "<run-name>" \
  --goal "<concrete outcome>" \
  --scope "<path-one,path-two>" \
  --sensitive ".env,secrets,credentials,tokens,auth,billing,deploy" \
  --out "$OUT")"
```

Keep `SESSION` available for the entire task.

### 2. Execute Deliberately

Make only changes required by the goal. Before each substantial action, check it against scope and non-goals.

Run deterministic validation commands through the wrapper whenever practical:

```bash
node "$LEDGER" run --session "$SESSION" -- <command> <args...>
```

The wrapper does not support shell syntax such as pipes, redirects, glob expansion, or chained commands. For those cases, either call the underlying executable directly with safe arguments or run the command normally and record the limitation in the final handoff.

### 3. Render The Review

After implementation and validation:

```bash
node "$LEDGER" ingest --type git --session "$SESSION"
node "$LEDGER" render --session "$SESSION"
```

Read these files in order:

1. `review.json` for status, evidence counts, and machine-readable findings.
2. `fix-brief.md` for the correction queue and approval boundaries.
3. `executive-summary.md` for the human handoff.
4. `replay.html` only when a visual timeline is useful.

### 4. Classify Before Fixing

For every critical or high finding, classify it as:

- `true_positive`: the run created a real problem or lacks required evidence;
- `false_positive`: the signal is attributable to harmless context and evidence proves it;
- `unresolved`: evidence is insufficient or the decision belongs to a human.

Do not dismiss a finding only because a command succeeded.

Automatically fix true positives only when the fix is reversible, inside declared scope, and does not alter auth, secrets, permissions, billing, deployment, external data, or destructive behavior. Ask before crossing those boundaries.

### 5. Verify The Correction Loop

After eligible fixes, rerun the relevant validation commands, then refresh the same session:

```bash
node "$LEDGER" ingest --type git --session "$SESSION"
node "$LEDGER" render --session "$SESSION"
```

Git ingestion is a refresh, not an append, so the final report represents the final repository state while preserving command evidence.

Stop after one correction pass unless another pass is clearly necessary and safe. Do not create an unbounded autonomous loop.

## Final Handoff

Report:

- task outcome and acceptance checks;
- final Agent Ledger status;
- true positives fixed;
- false positives with evidence;
- unresolved items requiring human judgment;
- paths to `executive-summary.md`, `review.json`, and `replay.html`.

The report supports human judgment; it does not replace code review, security review, or CI.
