import path from 'node:path';
import { appendJsonl, ensureDir, readText, writeText } from './fs-utils.mjs';
import { createEvent } from './events.mjs';
import { sessionFile } from './session.mjs';

export function ingestTranscript(session, transcriptPath) {
  const absolute = path.resolve(transcriptPath);
  const raw = readText(absolute);
  if (!raw) throw new Error(`Transcript is empty or missing: ${absolute}`);

  const artifactRel = path.join('artifacts', path.basename(absolute));
  const artifactPath = sessionFile(session.dir, artifactRel);
  ensureDir(path.dirname(artifactPath));
  writeText(artifactPath, raw);

  const events = [
    createEvent({
      session_id: session.meta.session_id,
      actor: 'human',
      source: 'transcript',
      event_type: 'artifact',
      target: artifactRel,
      summary: `Transcript ingested: ${path.basename(absolute)}`,
      raw_ref: artifactRel
    }),
    ...parseTranscript(raw, session.meta.session_id, artifactRel)
  ];

  appendJsonl(sessionFile(session.dir, 'session.jsonl'), events);
  return { artifactRel, events };
}

export function parseTranscript(raw, sessionId, rawRef = null) {
  const events = [];
  const lines = raw.split(/\r?\n/);
  let inCode = false;
  let codeLang = '';

  lines.forEach((line, index) => {
    const fence = line.match(/^```(\w+)?/);
    if (fence) {
      inCode = !inCode;
      codeLang = inCode ? (fence[1] || '') : '';
      return;
    }

    const trimmed = line.trim();
    if (!trimmed) return;

    const shell = trimmed.match(/^(?:\$|>)\s+(.+)/);
    if (shell || (inCode && ['bash', 'sh', 'shell', 'zsh'].includes(codeLang) && looksLikeCommand(trimmed))) {
      const command = shell ? shell[1] : trimmed;
      events.push(createEvent({
        session_id: sessionId,
        actor: 'agent',
        source: 'transcript',
        event_type: 'execute',
        target: command.split(/\s+/).slice(0, 3).join(' '),
        summary: command,
        raw_ref: rawRef,
        meta: { line: index + 1 }
      }));
      return;
    }

    const tool = trimmed.match(/^(?:tool|mcp|function)\s*[:=-]\s*(.+)$/i);
    if (tool) {
      events.push(createEvent({
        session_id: sessionId,
        actor: 'agent',
        source: 'transcript',
        event_type: 'tool_call',
        target: tool[1],
        summary: trimmed,
        raw_ref: rawRef,
        meta: { line: index + 1 }
      }));
      return;
    }

    const fileAction = trimmed.match(/\b(?:created|modified|updated|deleted|wrote|touched|edited)\b\s+`?([^`]+?)`?$/i);
    if (fileAction) {
      const verb = fileAction[0].toLowerCase();
      events.push(createEvent({
        session_id: sessionId,
        actor: 'agent',
        source: 'transcript',
        event_type: verb.includes('delete') ? 'delete' : 'write',
        target: fileAction[1].trim(),
        summary: trimmed,
        raw_ref: rawRef,
        meta: { line: index + 1 }
      }));
      return;
    }

    if (/\b(approval|permission|allowed|denied|asked)\b/i.test(trimmed)) {
      events.push(createEvent({
        session_id: sessionId,
        actor: 'human',
        source: 'transcript',
        event_type: 'approval',
        target: null,
        summary: trimmed,
        raw_ref: rawRef,
        meta: { line: index + 1 }
      }));
      return;
    }

    if (/\b(risk|warning|secret|token|api key|unsafe|unverified|not verified)\b/i.test(trimmed)) {
      events.push(createEvent({
        session_id: sessionId,
        actor: 'agent',
        source: 'transcript',
        event_type: 'note',
        target: null,
        summary: trimmed,
        raw_ref: rawRef,
        meta: { line: index + 1 }
      }));
    }
  });

  return events;
}

function looksLikeCommand(line) {
  return /^(npm|pnpm|node|python|git|curl|rm|mv|cp|chmod|mkdir|touch|sed|rg|grep)\b/.test(line);
}

