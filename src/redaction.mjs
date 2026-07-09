import { homedir } from 'node:os';

const PATTERNS = [
  { name: 'openai_like_key', severity: 'critical', re: /\bsk-[A-Za-z0-9_-]{8,}\b/g, replacement: '[REDACTED_API_KEY]' },
  { name: 'bearer_token', severity: 'critical', re: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/gi, replacement: 'Bearer [REDACTED_TOKEN]' },
  { name: 'key_value_secret', severity: 'high', re: /\b(api[_-]?(?:key|token)|token|secret|password|cookie)\s*[:=]\s*["']?[A-Za-z0-9._/@:-]{8,}/gi, replacement: '[REDACTED_SECRET]' },
  { name: 'email', severity: 'medium', re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: '[REDACTED_EMAIL]' },
  { name: 'home_path', severity: 'low', re: new RegExp(escapeRegExp(homedir()), 'g'), replacement: '$HOME' }
];

export function redactText(input, stats = []) {
  let output = String(input ?? '');
  for (const pattern of PATTERNS) {
    let count = 0;
    output = output.replace(pattern.re, () => {
      count += 1;
      return pattern.replacement;
    });
    if (count > 0) {
      stats.push({ pattern: pattern.name, severity: pattern.severity, count });
    }
  }
  return output;
}

export function redactEvent(event, stats = []) {
  const redacted = { ...event };
  const eventStats = [];
  redacted.target = redactText(redacted.target, eventStats);
  redacted.summary = redactText(redacted.summary, eventStats);
  redacted.raw_ref = redactText(redacted.raw_ref, eventStats);
  if (redacted.meta) redacted.meta = redactJson(redacted.meta, eventStats);
  redacted.redacted = eventStats.length > 0 || Boolean(event.redacted);
  stats.push(...eventStats);
  return redacted;
}

export function redactEvents(events) {
  const stats = [];
  const redacted = events.map((event) => redactEvent(event, stats));
  return { redacted, stats: rollup(stats) };
}

function redactJson(value, stats) {
  if (Array.isArray(value)) return value.map((item) => redactJson(item, stats));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactJson(item, stats)]));
  }
  if (typeof value === 'string') return redactText(value, stats);
  return value;
}

function rollup(stats) {
  const byPattern = new Map();
  for (const item of stats) {
    const existing = byPattern.get(item.pattern) || { ...item, count: 0 };
    existing.count += item.count;
    byPattern.set(item.pattern, existing);
  }
  return [...byPattern.values()];
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
