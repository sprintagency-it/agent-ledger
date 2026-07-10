import { newId } from './fs-utils.mjs';

export const SCHEMA_VERSION = '0.1';

export function createEvent(input) {
  return {
    schema_version: SCHEMA_VERSION,
    session_id: input.session_id,
    event_id: input.event_id || newId(),
    ts: input.ts || new Date().toISOString(),
    actor: input.actor || 'unknown',
    source: input.source || 'manual',
    event_type: input.event_type || 'note',
    target: input.target || null,
    summary: input.summary || '',
    risk: input.risk || 'low',
    risk_tags: input.risk_tags || [],
    before_hash: input.before_hash || null,
    after_hash: input.after_hash || null,
    redacted: Boolean(input.redacted),
    raw_ref: input.raw_ref || null,
    meta: input.meta || {}
  };
}

export function validateEvent(event) {
  const required = ['schema_version', 'session_id', 'event_id', 'ts', 'actor', 'source', 'event_type', 'summary'];
  const missing = required.filter((key) => event[key] == null);
  if (missing.length) {
    throw new Error(`Invalid event, missing: ${missing.join(', ')}`);
  }
  return event;
}
