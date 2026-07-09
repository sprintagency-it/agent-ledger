import path from 'node:path';
import { readJsonl, readText, writeJson, writeText } from './fs-utils.mjs';
import { classifyEvents, policySuggestions, summarizeRisks, toYaml } from './risk.mjs';
import { mergeRedactionStats, redactEvents, redactValue } from './redaction.mjs';
import { sessionFile } from './session.mjs';

const SHARE_FILES = [
  'pr-review.md',
  'executive-summary.md',
  'fix-brief.md',
  'review.json',
  'risk.md',
  'replay.html',
  'session.redacted.jsonl',
  'redactions.json',
  'policy-suggestions.yaml'
];

export function renderSession(session) {
  const rawEvents = readJsonl(sessionFile(session.dir, 'session.jsonl'));
  const classified = classifyEvents(rawEvents, session.meta);
  const { redacted, stats: eventStats } = redactEvents(classified);
  const { redacted: redactedMeta, stats: metaStats } = redactValue(session.meta);
  const publicMeta = {
    ...redactedMeta,
    project_path: path.basename(session.meta.project_path || '') || '[LOCAL_PROJECT]',
    output_root: '[LOCAL_OUTPUT]',
    session_dir: '[LOCAL_SESSION]'
  };
  const stats = mergeRedactionStats(eventStats, metaStats);
  const counts = summarizeRisks(redacted);
  const policies = policySuggestions(redacted);
  const reviewItems = trustChecklist(redacted);
  const status = prStatus(counts);
  const review = buildMachineReview(publicMeta, redacted, counts, reviewItems, status);

  writeText(sessionFile(session.dir, 'session.redacted.jsonl'), redacted.map((event) => JSON.stringify(event)).join('\n') + '\n');
  writeJson(sessionFile(session.dir, 'redactions.json'), { generated_at: new Date().toISOString(), redactions: stats });
  writeText(sessionFile(session.dir, 'policy-suggestions.yaml'), toYaml({ rules: policies }) + '\n');
  writeText(sessionFile(session.dir, 'risk.md'), renderRiskMarkdown(publicMeta, redacted, counts, reviewItems));
  writeText(sessionFile(session.dir, 'executive-summary.md'), renderExecutiveSummary(publicMeta, redacted, counts, stats, policies, reviewItems));
  writeText(sessionFile(session.dir, 'fix-brief.md'), renderFixBrief(review));
  writeJson(sessionFile(session.dir, 'review.json'), review);
  writeText(sessionFile(session.dir, 'pr-review.md'), renderPrReviewMarkdown(publicMeta, redacted, counts, reviewItems));
  writeText(sessionFile(session.dir, 'replay.html'), renderHtml(publicMeta, redacted, counts, stats, policies, reviewItems));
  const shareDir = writeShareBundle(session);

  return { events: redacted, counts, stats, policies, reviewItems, status, review, shareDir };
}

function buildMachineReview(meta, events, counts, reviewItems, status) {
  const findings = events
    .filter((event) => ['critical', 'high'].includes(event.risk))
    .slice(0, 20)
    .map((event, index) => ({
      id: `AL-${String(index + 1).padStart(3, '0')}`,
      risk: event.risk,
      event_type: event.event_type,
      target: event.target || '',
      summary: event.summary || '',
      tags: event.risk_tags || [],
      reasons: event.risk_reasons || [],
      classification: 'unresolved'
    }));
  const verificationEvents = events.filter((event) => {
    const text = `${event.summary || ''} ${event.target || ''}`.toLowerCase();
    return /\b(test|check|lint|verify|validation|smoke)\b/.test(text);
  });

  return {
    schema_version: '0.2',
    generated_at: new Date().toISOString(),
    status: status.kind,
    status_label: status.label,
    status_summary: status.summary,
    session: {
      name: meta.name,
      goal: meta.goal || '',
      scope: meta.scope || '',
      project: meta.project_path || ''
    },
    risk_counts: counts,
    evidence: {
      events: events.length,
      writes: events.filter((event) => event.event_type === 'write').length,
      commands: events.filter((event) => event.event_type === 'execute').length,
      verification_events: verificationEvents.length,
      git_ingested: events.some((event) => event.source === 'git' && event.event_type === 'diff'),
      transcript_ingested: events.some((event) => event.source === 'transcript')
    },
    review_items: reviewItems,
    findings,
    next_action: status.kind === 'PASS'
      ? 'Complete normal human review and hand off the evidence record.'
      : 'Classify each finding as true_positive, false_positive, or unresolved before fixing or accepting it.'
  };
}

function renderFixBrief(review) {
  const findings = review.findings.length
    ? review.findings.map((finding) => `- [ ] **${finding.id} / ${finding.risk.toUpperCase()}** \`${finding.target || 'n/a'}\` - ${finding.summary}\n  - Classification: \`unresolved\`\n  - Evidence: ${finding.reasons.join('; ') || 'Risk rule matched.'}`).join('\n')
    : '- No critical/high findings. Complete normal review and verify the stated goal.';

  return `# Agent Ledger Fix Brief

Status: ${review.status}

Goal: ${review.session.goal || 'n/a'}

## Correction Queue

${findings}

## Classification Rule

For each finding, choose one classification before acting:

- \`true_positive\`: the run created a real problem or required evidence is missing;
- \`false_positive\`: harmless context triggered the rule and concrete evidence proves it;
- \`unresolved\`: evidence is insufficient or human judgment is required.

## Automatic Fix Boundary

The executing agent may fix a true positive automatically only when the change is reversible, inside declared scope, and does not alter auth, secrets, permissions, billing, deployment, external data, or destructive behavior. Those boundaries require human approval.

After eligible fixes, rerun verification, refresh Git ingestion, and render the session again. Stop after one correction pass unless another pass is clearly necessary and safe.
`;
}

function writeShareBundle(session) {
  const shareDir = sessionFile(session.dir, 'share');
  for (const file of SHARE_FILES) {
    writeText(path.join(shareDir, file), readText(sessionFile(session.dir, file)));
  }
  writeText(path.join(shareDir, 'README.md'), `# Agent Ledger Share Bundle

This folder contains the rendered and redacted review record intended for deliberate sharing.

Excluded on purpose: raw \`session.jsonl\`, \`diff.patch\`, workspace snapshots, git baselines, transcripts and command logs.

Redaction is best-effort. Review this folder before uploading it or attaching it to a pull request.
`);
  return shareDir;
}

function renderExecutiveSummary(meta, events, counts, redactions, policies, reviewItems) {
  const highRisk = events.filter((event) => ['critical', 'high'].includes(event.risk));
  const writes = events.filter((event) => event.event_type === 'write');
  const executes = events.filter((event) => event.event_type === 'execute');
  const toolCalls = events.filter((event) => event.event_type === 'tool_call');
  const scopeDrift = events.filter((event) => (event.risk_tags || []).includes('scope_drift'));
  const preexistingIgnored = sumMeta(events, 'preexisting_ignored_count');
  const recommendation = counts.critical > 0
    ? 'Do not trust blindly. Human review required before merge, deploy, send, or handoff.'
    : counts.high > 0
      ? 'Review high-risk items before trusting this run.'
      : 'Low immediate risk detected by V0 rules, but capture is partial.';

  return `# Agent Ledger Executive Summary

Session: ${meta.name}

Goal: ${meta.goal || 'n/a'}

Scope: ${meta.scope || 'n/a'}

## Verdict

${recommendation}

## What Happened

- Events captured: ${events.length}
- File/write events: ${writes.length}
- Command executions: ${executes.length}
- Tool calls: ${toolCalls.length}
- Scope drift events: ${scopeDrift.length}
- Pre-existing dirty paths ignored: ${preexistingIgnored}
- Redaction patterns triggered: ${redactions.length}

## Risk Snapshot

- Critical: ${counts.critical || 0}
- High: ${counts.high || 0}
- Medium: ${counts.medium || 0}
- Low: ${counts.low || 0}

## Read This Before Trusting The Run

${reviewItems.map((item) => `- ${item}`).join('\n') || '- No blocking review items generated by V0 rules.'}

## Top Risk Events

${highRisk.slice(0, 8).map((event) => `- **${event.risk.toUpperCase()}** ${event.event_type} \`${event.target || 'n/a'}\`: ${event.summary}`).join('\n') || '- No critical/high events detected.'}

## Suggested Policy Updates

${policies.slice(0, 8).map((item) => `- \`${JSON.stringify(item)}\``).join('\n') || '- No policy suggestions generated.'}

## Supervisor-Agent Input

Use this section as input for a higher-level review agent:

> Review this run as an accountability supervisor. Decide whether the human can trust it, what must be checked manually, what policy should change, and whether the original goal was satisfied. Do not assume complete capture: missing evidence is unknown, not safe.

## V0 Limit

This is a partial local ledger. It is useful for review and coordination, but it is not yet a complete agent observability or security system.
`;
}

function renderPrReviewMarkdown(meta, events, counts, reviewItems) {
  const status = prStatus(counts);
  const highRisk = events.filter((event) => ['critical', 'high'].includes(event.risk));
  const writes = events.filter((event) => event.event_type === 'write');
  const executes = events.filter((event) => event.event_type === 'execute');
  const verificationEvents = events.filter((event) => {
    const text = `${event.summary || ''} ${event.target || ''}`.toLowerCase();
    return /\b(test|check|lint|verify|validation|smoke)\b/.test(text);
  });

  return `# Agent Ledger PR Review Record

<!-- agent-ledger:pr-review:v0.1 -->

Status: ${status.kind}

${status.badge} **${status.label}** - ${status.summary}

## Run Context

- Session: \`${meta.name}\`
- Goal: ${meta.goal || 'n/a'}
- Scope: ${meta.scope || 'n/a'}
- Project: \`${meta.project_path || 'n/a'}\`

## Risk Snapshot

- Critical: ${counts.critical || 0}
- High: ${counts.high || 0}
- Medium: ${counts.medium || 0}
- Low: ${counts.low || 0}

## Reviewer Actions

${reviewItems.map((item) => `- ${item}`).join('\n') || '- No blocking review items generated by V0 rules.'}

## Evidence-Based Findings

${renderPrFindings(highRisk)}

## Files And Commands Summary

- Files/write events: ${writes.length}
- Command executions: ${executes.length}
- Verification-like events observed: ${verificationEvents.length}

${writes.slice(0, 12).map((event) => `- \`${event.target || 'n/a'}\`: ${event.summary}`).join('\n') || '- No write events captured.'}
${writes.length > 12 ? `\n- ${writes.length - 12} additional write event(s) omitted from this PR summary. Open \`files-touched.csv\` for the full list.` : ''}

## Local Artifacts

- Executive summary: \`executive-summary.md\`
- Risk debrief: \`risk.md\`
- Replay: \`replay.html\`
- Share-safe bundle: \`share/\`
- Full local evidence: \`files-touched.csv\`, \`preexisting-dirty.csv\`, \`diff.patch\`, workspace snapshots and raw artifacts. Review these before sharing.

## V0 Limit

This is a local-first review record for AI-generated changes. Missing transcript, hooks, tests or CI evidence is unknown, not safe.
`;
}

function renderPrFindings(events) {
  if (!events.length) {
    return '- No critical/high findings detected. Still review touched files, verification evidence and baseline limits before merge.';
  }

  return events.slice(0, 8).map((event, index) => {
    const reasons = event.risk_reasons?.length ? event.risk_reasons.join('; ') : 'Risk rule matched.';
    return `### AL-${String(index + 1).padStart(3, '0')} - ${event.risk.toUpperCase()} ${event.event_type}

- Evidence: \`${event.target || 'n/a'}\`
- Why it matters: ${reasons}
- Reviewer action: inspect this change before merge and require a fix or explicit acceptance if the risk is real.
- Summary: ${event.summary}`;
  }).join('\n\n');
}

function prStatus(counts) {
  if ((counts.critical || 0) > 0) {
    return {
      kind: 'BLOCK',
      badge: '[BLOCK]',
      label: 'Human review required before merge',
      summary: 'Critical Agent Ledger finding(s) were detected.'
    };
  }
  if ((counts.high || 0) > 0) {
    return {
      kind: 'WARN',
      badge: '[WARN]',
      label: 'Review high-risk items before merge',
      summary: 'High-risk Agent Ledger finding(s) were detected.'
    };
  }
  return {
    kind: 'PASS',
    badge: '[PASS]',
    label: 'No critical/high findings detected',
    summary: 'V0 rules did not find critical or high-risk events, but the run still needs normal code review.'
  };
}

function renderRiskMarkdown(meta, events, counts, reviewItems) {
  const high = events.filter((event) => ['critical', 'high'].includes(event.risk));
  const preexistingIgnored = sumMeta(events, 'preexisting_ignored_count');
  return `# Agent Ledger Risk Debrief

Session: ${meta.name}

Goal: ${meta.goal || 'n/a'}

## Risk Counts

- Critical: ${counts.critical || 0}
- High: ${counts.high || 0}
- Medium: ${counts.medium || 0}
- Low: ${counts.low || 0}

## What To Review Before Trusting This Run

${reviewItems.map((item) => `- ${item}`).join('\n') || '- No blocking review items generated.'}

## Baseline Context

- Pre-existing dirty paths ignored: ${preexistingIgnored}

## High-Risk Events

${high.map((event) => `- **${event.risk.toUpperCase()}** ${event.event_type} \`${event.target || 'n/a'}\`: ${event.summary}`).join('\n') || '- None.'}

## Accountability Notes

- This V0 is a local ledger, not a complete capture system.
- Treat missing hooks/transcripts as unknown, not safe.
- Use this debrief to update future allow/ask/block/warn policy.
`;
}

function renderHtml(meta, events, counts, redactions, policies, reviewItems) {
  const status = prStatus(counts);
  const rows = events.map((event) => `
    <tr class="risk-${event.risk}">
      <td>${escapeHtml(event.ts)}</td>
      <td><span class="pill">${escapeHtml(event.actor)}</span></td>
      <td>${escapeHtml(event.source)}</td>
      <td>${escapeHtml(event.event_type)}</td>
      <td><strong>${escapeHtml(event.risk)}</strong><br><small>${escapeHtml((event.risk_tags || []).join(', '))}</small></td>
      <td><code>${escapeHtml(event.target || '')}</code></td>
      <td>${escapeHtml(event.summary)}${event.risk_reasons?.length ? `<br><small>${escapeHtml(event.risk_reasons.join(' | '))}</small>` : ''}</td>
    </tr>
  `).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Agent Ledger - ${escapeHtml(meta.name)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f1ea;
      --panel: #fffdf9;
      --ink: #1d1a17;
      --muted: #6f675f;
      --line: #d9d0c5;
      --low: #edf6ef;
      --medium: #fff5d9;
      --high: #fff0e7;
      --critical: #fde7e2;
      --accent: #d97757;
      --accent-dark: #a84d32;
      --terminal: #1f1c19;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 1180px; margin: 0 auto; padding: 28px; }
    h1, h2 { margin: 0 0 12px; line-height: 1.15; }
    h1 { max-width: 900px; font-size: clamp(28px, 4vw, 46px); overflow-wrap: anywhere; }
    h2 { font-size: 17px; margin-top: 24px; }
    p { margin: 0 0 10px; color: var(--muted); }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; word-break: break-word; }
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 10px 0 18px; border-bottom: 1px solid var(--line); }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 760; }
    .mark { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 5px; background: var(--accent); color: var(--ink); font: 800 13px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .state { display: inline-flex; align-items: center; min-height: 30px; padding: 0 10px; border: 1px solid currentColor; border-radius: 4px; font: 800 11px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .state-pass { color: #17664c; background: #edf6ef; }
    .state-warn { color: #805700; background: #fff5d9; }
    .state-block { color: #9c3127; background: #fde7e2; }
    .run-head { padding: 30px 0 10px; }
    .kicker { margin-bottom: 10px; color: var(--accent-dark); font: 700 11px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }
    .card { background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 16px; }
    .session-card { border-color: #2a2521; box-shadow: 3px 3px 0 var(--accent); }
    .metric-card { position: relative; overflow: hidden; }
    .metric-card::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--line); }
    .metric-critical::before { background: #9c3127; }
    .metric-high::before { background: var(--accent); }
    .metric-medium::before { background: #c58b20; }
    .metric-low::before { background: #2d7a5d; }
    .metric { font: 760 28px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .label { margin-top: 7px; color: var(--muted); font: 700 11px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; text-transform: uppercase; }
    .pill { display: inline-block; border: 1px solid var(--line); border-radius: 4px; padding: 3px 7px; background: #faf6f0; font: 700 11px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .section-label { display: block; margin-bottom: 12px; color: var(--accent-dark); font: 700 11px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; text-transform: uppercase; }
    .table-shell { overflow-x: auto; border: 1px solid var(--line); border-radius: 6px; background: var(--panel); }
    table { width: 100%; min-width: 920px; border-collapse: collapse; background: var(--panel); }
    th, td { border-bottom: 1px solid var(--line); padding: 9px; text-align: left; vertical-align: top; }
    th { background: var(--terminal); color: #eee6dd; font: 650 11px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    tr.risk-low { background: var(--low); }
    tr.risk-medium { background: var(--medium); }
    tr.risk-high { background: var(--high); }
    tr.risk-critical { background: var(--critical); }
    ul { margin-top: 6px; padding-left: 20px; }
    li + li { margin-top: 6px; }
    .muted { color: var(--muted); }
    @media (max-width: 820px) {
      main { padding: 16px; }
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .topbar { align-items: flex-start; }
      table { font-size: 12px; }
      th, td { padding: 7px; }
    }
  </style>
</head>
<body>
<main>
  <div class="topbar">
    <div class="brand"><span class="mark" aria-hidden="true">&gt;_</span><span>Agent Ledger</span></div>
    <span class="state state-${status.kind.toLowerCase()}">${status.kind} / REVIEW RECORD</span>
  </div>

  <header class="run-head">
    <p class="kicker">Local-first / agent accountability</p>
    <h1>${escapeHtml(meta.name)}</h1>
    <p>${escapeHtml(summaryVerdict(counts))}</p>
  </header>

  <section class="card session-card">
    <span class="section-label">01 / Run context</span>
    <p>Goal: ${escapeHtml(meta.goal || 'n/a')}</p>
    <p>Scope: ${escapeHtml(meta.scope || 'n/a')}</p>
    <p>Project: <code>${escapeHtml(meta.project_path)}</code></p>
  </section>

  <section class="grid">
    ${metric('Critical', counts.critical || 0)}
    ${metric('High', counts.high || 0)}
    ${metric('Medium', counts.medium || 0)}
    ${metric('Low', counts.low || 0)}
  </section>

  <section class="card">
    <span class="section-label">02 / Trust checklist</span>
    <h2>What To Review Before Trusting This Run</h2>
    <ul>${reviewItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n') || '<li>No blocking review items generated.</li>'}</ul>
  </section>

  <section class="card">
    <span class="section-label">03 / Human brief</span>
    <h2>Human Brief</h2>
    <p><strong>${escapeHtml(summaryVerdict(counts))}</strong></p>
    <p>${events.length} events captured. ${events.filter((event) => event.event_type === 'write').length} write events, ${events.filter((event) => event.event_type === 'execute').length} commands, ${events.filter((event) => event.event_type === 'tool_call').length} tool calls.</p>
    <p>For a manager-level view, open <code>executive-summary.md</code>.</p>
  </section>

  <section class="card">
    <span class="section-label">04 / Redactions</span>
    <h2>Redaction Summary</h2>
    <ul>${redactions.map((item) => `<li>${escapeHtml(item.pattern)}: ${item.count} (${escapeHtml(item.severity)})</li>`).join('\n') || '<li>No redactions applied.</li>'}</ul>
  </section>

  <section class="card">
    <span class="section-label">05 / Policy</span>
    <h2>Policy Suggestions</h2>
    <ul>${policies.map((item) => `<li><code>${escapeHtml(JSON.stringify(item))}</code></li>`).join('\n') || '<li>No policy suggestions generated.</li>'}</ul>
  </section>

  <span class="section-label">06 / Event stream</span>
  <h2>Timeline</h2>
  <div class="table-shell"><table>
    <thead>
      <tr>
        <th>Time</th>
        <th>Actor</th>
        <th>Source</th>
        <th>Type</th>
        <th>Risk</th>
        <th>Target</th>
        <th>Summary</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table></div>
</main>
</body>
</html>`;
}

function summaryVerdict(counts) {
  if ((counts.critical || 0) > 0) return 'Human review required before trusting this run.';
  if ((counts.high || 0) > 0) return 'Review high-risk items before trusting this run.';
  return 'No critical/high events detected by V0 rules.';
}

function trustChecklist(events) {
  const items = [];
  const critical = events.filter((event) => event.risk === 'critical');
  const high = events.filter((event) => event.risk === 'high');
  const writes = events.filter((event) => event.event_type === 'write');
  const deletes = events.filter((event) => event.event_type === 'delete');
  const unverified = events.filter((event) => (event.risk_tags || []).includes('missing_verification'));
  const secrets = events.filter((event) => (event.risk_tags || []).includes('secret_possible'));
  const scopeDrift = events.filter((event) => (event.risk_tags || []).includes('scope_drift'));
  const preexistingIgnored = sumMeta(events, 'preexisting_ignored_count');

  if (critical.length) items.push(`Review ${critical.length} critical event(s) before trusting this run.`);
  if (high.length) items.push(`Review ${high.length} high-risk event(s), especially sensitive paths and side effects.`);
  if (writes.length) items.push(`Inspect ${writes.length} write event(s) against the stated goal and scope.`);
  if (deletes.length) items.push(`Confirm ${deletes.length} delete event(s) were intended.`);
  if (secrets.length) items.push(`Confirm redaction and secret handling for ${secrets.length} possible secret event(s).`);
  if (scopeDrift.length) items.push(`Review ${scopeDrift.length} event(s) outside the declared scope.`);
  if (preexistingIgnored) items.push(`${preexistingIgnored} pre-existing dirty path(s) were ignored from run risk; inspect preexisting-dirty.csv if repo-wide confidence matters.`);
  if (unverified.length) items.push(`Run missing verification checks before merge/deploy.`);
  if (!events.some((event) => event.source === 'transcript')) items.push('No transcript was ingested; agent reasoning/tool context may be incomplete.');
  if (!events.some((event) => event.source === 'git')) items.push('No git ingest was found; file changes may be incomplete.');
  return [...new Set(items)];
}

function sumMeta(events, key) {
  return events.reduce((sum, event) => sum + Number(event.meta?.[key] || 0), 0);
}

function metric(label, value) {
  return `<div class="card metric-card metric-${label.toLowerCase()}"><div class="metric">${value}</div><div class="label">${escapeHtml(label)}</div></div>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
