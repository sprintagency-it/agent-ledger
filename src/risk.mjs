import path from 'node:path';

const CRITICAL_COMMANDS = [
  /\brm\s+-rf\b/,
  /\bsudo\b/,
  /\bcurl\b.+\|\s*(?:sh|bash)\b/,
  /\bchmod\s+777\b/
];

const HIGH_COMMANDS = [
  /\brm\b/,
  /\bmv\b/,
  /\bchmod\b/,
  /\bchown\b/,
  /\bdeploy\b/,
  /\bwrangler\b/,
  /\bgh\s+release\b/,
  /\bnpm\s+publish\b/,
  /\bgit\s+push\b/
];

const SENSITIVE_PATH = /(^|\/|\\)(\.env|secrets?|credentials?|tokens?|cookies?|auth|billing|finance|private|client|source_of_truth)(\/|\\|\.|$)/i;
const MCP_SIDE_EFFECT = /\b(write|delete|send|pay|commit|publish|deploy|archive|trash|mail|calendar)\b/i;
const SECRET_TEXT = /\b(api[_-]?(?:key|token)|token|secret|password|cookie|bearer|sk-[A-Za-z0-9_-]{8,})\b/i;
const SECRET_ACCESS_COMMAND = /\bsecurity\s+find-generic-password\b/i;
const SAFE_SECRET_PRESENCE_CHECK = /\bsecurity\s+find-generic-password\b[\s\S]*(?:>\s*\/dev\/null|1>\s*\/dev\/null)[\s\S]*(?:2>&1|2>\s*\/dev\/null)[\s\S]*\becho\s+[a-z0-9_-]*(?:present|missing)\b/i;

export function classifyEvent(event, meta = {}) {
  const text = `${event.event_type || ''} ${event.target || ''} ${event.summary || ''}`.toLowerCase();
  const target = String(event.target || '');
  const tags = new Set(event.risk_tags || []);
  const reasons = [];
  const safeSecretPresenceCheck = SAFE_SECRET_PRESENCE_CHECK.test(text);
  const secretAccessCommand = SECRET_ACCESS_COMMAND.test(text);
  let score = 0;

  if (event.event_type === 'delete') add(7, 'delete', 'Delete event');
  if (event.event_type === 'write') add(3, 'write', 'Write event');
  if (event.event_type === 'execute') add(2, 'execute', 'Command execution');
  if (event.event_type === 'tool_call') add(2, 'tool_call', 'Tool call');
  if (event.event_type === 'network') add(4, 'network', 'Network access');
  if (event.event_type === 'approval') add(1, 'approval', 'Approval boundary');

  for (const pattern of CRITICAL_COMMANDS) {
    if (pattern.test(text)) add(10, 'destructive', 'Critical command pattern');
  }
  for (const pattern of HIGH_COMMANDS) {
    if (pattern.test(text)) add(6, 'command_risk', 'High-risk command pattern');
  }
  if (secretAccessCommand) {
    if (safeSecretPresenceCheck) {
      add(4, 'secret_presence_check', 'Secret presence checked with output redirected');
    } else {
      add(9, 'secret_access', 'Command may read secret material');
    }
  }
  if (SENSITIVE_PATH.test(target) || SENSITIVE_PATH.test(text)) add(7, 'sensitive_path', 'Sensitive path or topic');
  if (SECRET_TEXT.test(text) && !safeSecretPresenceCheck) add(8, 'secret_possible', 'Possible secret/token material');
  if (event.source === 'transcript' && /\bnot verified|unverified|untested|not tested\b/i.test(text)) {
    add(4, 'missing_verification', 'Missing verification note');
  }
  if (event.event_type === 'tool_call' && MCP_SIDE_EFFECT.test(text)) {
    add(6, 'external_side_effect', 'Tool may create external side effects');
  }
  if (looksOutsideProject(target, meta.project_path, event.event_type)) {
    add(6, 'boundary', 'Target appears outside project root');
  }
  for (const sensitive of meta.sensitive_paths || []) {
    if (matchesSensitiveScope(target, sensitive, meta.project_path, safeSecretPresenceCheck)) {
      add(7, 'sensitive_scope', `Matches sensitive scope: ${sensitive}`);
    }
  }
  if (isOutsideDeclaredScope(target, meta.scope)) {
    add(4, 'scope_drift', `Target is outside declared scope: ${meta.scope}`);
  }

  const risk = score >= 10 ? 'critical' : score >= 7 ? 'high' : score >= 4 ? 'medium' : 'low';
  return { ...event, risk, risk_tags: [...tags], risk_reasons: reasons };

  function add(points, tag, reason) {
    score += points;
    tags.add(tag);
    reasons.push(reason);
  }
}

export function classifyEvents(events, meta) {
  return events.map((event) => classifyEvent(event, meta));
}

export function summarizeRisks(events) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const event of events) counts[event.risk] = (counts[event.risk] || 0) + 1;
  return counts;
}

export function policySuggestions(events) {
  const suggestions = [];
  const seen = new Set();

  for (const event of events) {
    for (const tag of event.risk_tags || []) {
      let suggestion = null;
      if (tag === 'sensitive_path' || tag === 'sensitive_scope') {
        suggestion = {
          match: event.target || '*sensitive*',
          action: 'ask',
          reason: 'Sensitive path or scope touched by agent run.'
        };
      } else if (tag === 'destructive') {
        suggestion = {
          match_command: 'rm -rf|sudo|curl * | sh|chmod 777',
          action: 'block',
          reason: 'Destructive or privilege-escalating command pattern.'
        };
      } else if (tag === 'external_side_effect') {
        suggestion = {
          match_tool: event.target || 'mcp:*',
          action: 'ask',
          reason: 'Tool call may create external side effects.'
        };
      } else if (tag === 'secret_possible' || tag === 'secret_access') {
        suggestion = {
          match: event.target || '*',
          action: 'redact',
          reason: 'Possible secret or token material observed.'
        };
      } else if (tag === 'secret_presence_check') {
        suggestion = {
          match_command: 'security find-generic-password *> /dev/null',
          action: 'warn',
          reason: 'Secret presence check observed; confirm output stays redirected.'
        };
      } else if (tag === 'missing_verification') {
        suggestion = {
          match_event: 'post_run_debrief',
          action: 'warn',
          reason: 'Run contains unverified or untested work.'
        };
      }
      if (!suggestion) continue;
      const key = JSON.stringify(suggestion);
      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push(suggestion);
      }
    }
  }

  return suggestions;
}

export function toYaml(value, indent = 0) {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    return value.map((item) => `${pad}- ${formatYamlValue(item, indent + 2)}`).join('\n');
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([key, item]) => `${pad}${key}: ${formatYamlValue(item, indent + 2)}`).join('\n');
  }
  return formatScalar(value);
}

function formatYamlValue(value, indent) {
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    const nested = toYaml(value, indent);
    return `\n${nested}`;
  }
  return formatScalar(value);
}

function formatScalar(value) {
  if (value == null) return 'null';
  const text = String(value);
  return /[:#\n|"']/.test(text) ? JSON.stringify(text) : text;
}

function looksOutsideProject(target, projectPath, eventType) {
  if (!target || !projectPath) return false;
  if (eventType === 'execute' || eventType === 'tool_call') return false;
  const normalizedTarget = expandHome(target);
  const normalizedProject = expandHome(projectPath);
  if (!path.isAbsolute(normalizedTarget)) return false;
  const relative = path.relative(normalizedProject, normalizedTarget);
  return relative.startsWith('..') || path.isAbsolute(relative);
}

function matchesSensitiveScope(target, sensitive, projectPath, safeSecretPresenceCheck) {
  if (!target || !sensitive) return false;
  if (safeSecretPresenceCheck) return false;
  const normalizedTarget = expandHome(String(target)).toLowerCase();
  const normalizedProject = expandHome(String(projectPath || '')).toLowerCase();
  const normalizedSensitive = String(sensitive).toLowerCase();
  if (!normalizedTarget.includes(normalizedSensitive)) return false;
  if (normalizedProject.includes(normalizedSensitive) && normalizedTarget.includes(normalizedProject)) return false;
  return true;
}

function expandHome(value) {
  const home = process.env.HOME || '';
  return String(value || '').replace(/\$HOME\b/g, home);
}

function isOutsideDeclaredScope(target, scope) {
  if (!target || !scope) return false;
  if (/^(diff\.patch|files-touched\.csv|preexisting-dirty\.csv|git-status-before\.csv|workspace-|artifacts\/|session\.)/.test(target)) return false;
  if (/^[a-z]+:\/\//i.test(target)) return false;
  const scopes = String(scope)
    .split(',')
    .map((item) => normalizeScopeItem(item))
    .filter(Boolean);
  if (!scopes.length) return false;
  const normalizedTarget = String(target).replace(/^\.\/+/, '');
  if (normalizedTarget.includes(' ') || normalizedTarget.length > 220) return false;
  return !scopes.some((item) => normalizedTarget === item || normalizedTarget.startsWith(`${item}/`));
}

function normalizeScopeItem(item) {
  const normalized = String(item || '').trim().replace(/^\.\/+/, '').replace(/\/+$/, '');
  return normalized === '.' ? '' : normalized;
}
