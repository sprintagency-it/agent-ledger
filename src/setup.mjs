import { cpSync, existsSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { ensureDir, readJson, readText, writeJson, writeText } from './fs-utils.mjs';

const PACKAGE_ROOT = path.resolve(import.meta.dirname, '..');
const RUNTIME_SOURCE = path.join(PACKAGE_ROOT, 'src');

export function setupAgentProject(options = {}) {
  const project = path.resolve(options.project || process.cwd());
  if (!existsSync(project) || !lstatSync(project).isDirectory()) {
    throw new Error(`Project directory does not exist: ${project}`);
  }
  const skillSource = resolveSkillSource(project);

  const codexSkillTarget = path.join(project, '.agents', 'skills', 'agent-ledger');
  const claudeSkillTarget = path.join(project, '.claude', 'skills', 'agent-ledger');
  const runtimeRoot = path.join(project, '.agent-ledger', 'runtime');
  const runtimeTarget = path.join(runtimeRoot, 'src');
  const packageMeta = readJson(path.join(PACKAGE_ROOT, 'package.json'), {});

  copySkill(skillSource, codexSkillTarget);
  copySkill(skillSource, claudeSkillTarget);

  ensureDir(runtimeRoot);
  if (path.resolve(runtimeTarget) !== path.resolve(RUNTIME_SOURCE)) {
    cpSync(RUNTIME_SOURCE, runtimeTarget, { recursive: true, force: true });
  }
  writeJson(path.join(runtimeRoot, 'package.json'), {
    name: 'agent-ledger-runtime',
    version: packageMeta.version || '0.0.0',
    private: true,
    type: 'module'
  });
  writeText(path.join(runtimeRoot, 'VERSION'), `${packageMeta.version || '0.0.0'}\n`);

  if (options.gitignore !== false) ensureGitignoreEntry(project, '.agent-ledger/');

  return {
    project,
    skill: codexSkillTarget,
    skills: {
      codex: codexSkillTarget,
      claude: claudeSkillTarget
    },
    runtime: runtimeRoot,
    cli: path.join(runtimeTarget, 'cli.mjs'),
    version: packageMeta.version || '0.0.0'
  };
}

// Keep the original export available for callers using the v0.2 API.
export const setupCodexProject = setupAgentProject;

function resolveSkillSource(project) {
  const candidates = [
    path.join(PACKAGE_ROOT, '.agents', 'skills', 'agent-ledger'),
    path.join(project, '.agents', 'skills', 'agent-ledger'),
    path.join(project, '.claude', 'skills', 'agent-ledger')
  ];
  const source = candidates.find((candidate) => existsSync(path.join(candidate, 'SKILL.md')));
  if (!source) throw new Error(`Bundled Agent Ledger skill is missing. Checked: ${candidates.join(', ')}`);
  return source;
}

function copySkill(source, target) {
  ensureDir(path.dirname(target));
  if (path.resolve(target) !== path.resolve(source)) {
    cpSync(source, target, { recursive: true, force: true });
  }
}

function ensureGitignoreEntry(project, entry) {
  const gitignore = path.join(project, '.gitignore');
  const current = readText(gitignore);
  const lines = current.split(/\r?\n/).map((line) => line.trim());
  if (lines.includes(entry)) return;

  const prefix = current && !current.endsWith('\n') ? '\n' : '';
  const heading = current ? '' : '# Local Agent Ledger evidence and runtime\n';
  writeText(gitignore, `${current}${prefix}${heading}${entry}\n`);
}
