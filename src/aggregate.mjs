import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { outputRoot, sessionsRoot } from './session.mjs';
import { readText, writeText } from './fs-utils.mjs';

export function aggregateSessions(options = {}) {
  const sessionDirs = resolveSessionDirs(options);
  if (!sessionDirs.length) {
    throw new Error('No session directories found to aggregate.');
  }

  const summaries = sessionDirs.map((dir) => {
    const summaryPath = path.join(dir, 'executive-summary.md');
    const summary = readText(summaryPath);
    if (!summary) throw new Error(`Missing executive-summary.md in ${dir}`);
    return {
      dir,
      name: path.basename(dir),
      summary,
      verdict: extractSection(summary, 'Verdict'),
      whatHappened: extractSection(summary, 'What Happened'),
      review: extractSection(summary, 'Read This Before Trusting The Run'),
      topRisks: extractSection(summary, 'Top Risk Events')
    };
  });

  const outPath = path.resolve(options.out || path.join(outputRoot(options), 'supervisor-report.md'));
  writeText(outPath, renderSupervisorReport(summaries));
  return { outPath, sessionCount: summaries.length };
}

function resolveSessionDirs(options) {
  if (options._?.length) {
    return options._
      .map((item) => path.resolve(item))
      .filter((item) => existsSync(path.join(item, 'executive-summary.md')));
  }

  const base = options.sessions ? path.resolve(options.sessions) : sessionsRoot(outputRoot(options));
  if (!existsSync(base)) return [];

  return readdirSync(base)
    .map((name) => path.join(base, name))
    .filter((item) => statSync(item).isDirectory() && existsSync(path.join(item, 'executive-summary.md')))
    .sort();
}

function renderSupervisorReport(summaries) {
  const critical = sumRisk(summaries, 'Critical');
  const high = sumRisk(summaries, 'High');
  const verdict = critical > 0
    ? 'Do not trust the combined work blindly. At least one run needs human review before handoff.'
    : high > 0
      ? 'Review high-risk runs before handoff.'
      : 'No critical/high events detected by V0 summaries.';
  const reviewItems = summaries.flatMap((summary) => {
    return extractBullets(summary.review).map((line) => `${summary.name}: ${line}`);
  });
  const topRisks = summaries.flatMap((summary) => {
    return extractBullets(summary.topRisks).map((line) => `${summary.name}: ${line}`);
  });

  return `# Agent Ledger Supervisor Report

Sessions reviewed: ${summaries.length}

## Supervisor Verdict

${verdict}

## Combined Risk Snapshot

- Critical: ${critical}
- High: ${high}
- Medium: ${sumRisk(summaries, 'Medium')}
- Low: ${sumRisk(summaries, 'Low')}

## Runs

${summaries.map((summary) => `### ${summary.name}

${summary.verdict || 'No verdict found.'}

${summary.whatHappened || ''}
`).join('\n')}

## Cross-Run Review Queue

${reviewItems.map((item) => `- ${item}`).join('\n') || '- No review items found.'}

## Cross-Run Top Risks

${topRisks.slice(0, 20).map((item) => `- ${item}`).join('\n') || '- No top risks found.'}

## Prompt For CEO/Supervisor Agent

> You are reviewing multiple AI agent runs. Decide which runs can be trusted, which require human review, what policy should change, and whether any subagent needs to rerun work. Missing evidence is unknown, not safe.
`;
}

function extractSection(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start < 0) return '';
  const body = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^#{1,2}\s+/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join('\n').trim();
}

function extractBullets(section) {
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
}

function sumRisk(summaries, label) {
  const re = new RegExp(`- ${label}:\\s*(\\d+)`, 'i');
  return summaries.reduce((total, summary) => total + Number(summary.summary.match(re)?.[1] || 0), 0);
}
