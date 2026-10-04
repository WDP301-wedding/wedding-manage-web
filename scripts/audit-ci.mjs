import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const reviewedAdvisory = '1240992|braces|https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';
const reviewExpiresAt = new Date('2026-10-16T00:00:00.000Z');
const knownSeverities = new Set(['info', 'low', 'moderate', 'high', 'critical']);
const dependencySections = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];
const reviewedPackages = new Map([
  ['braces', '3.0.3'],
  ['micromatch', '4.0.8'],
  ['fast-glob', '3.3.1'],
  ['@next/eslint-plugin-next', '16.3.6'],
]);
const reviewedReferences = new Map([
  ['braces', [{ packageName: 'micromatch', section: 'dependencies', range: '^3.0.3' }]],
  ['micromatch', [{ packageName: 'fast-glob', section: 'dependencies', range: '^4.0.4' }]],
  [
    'fast-glob',
    [
      {
        packageName: '@next/eslint-plugin-next',
        section: 'dependencies',
        range: '3.3.1',
      },
    ],
  ],
]);

function advisoryIdentity(advisory) {
  return `${advisory?.source}|${advisory?.name}|${advisory?.url}`;
}

function isHighOrCritical(value) {
  return value?.severity === 'high' || value?.severity === 'critical';
}

function findRootAdvisories(packageName, vulnerabilities) {
  const roots = new Set();
  const unresolved = new Set();
  const visiting = new Set();
  const visited = new Set();

  function visit(currentPackage) {
    if (visiting.has(currentPackage) || visited.has(currentPackage)) return;
    const vulnerability = vulnerabilities[currentPackage];
    if (!vulnerability || !Array.isArray(vulnerability.via)) {
      unresolved.add(`unresolved:${currentPackage}`);
      return;
    }

    visiting.add(currentPackage);
    for (const cause of vulnerability.via) {
      if (typeof cause === 'string') {
        const dependency = vulnerabilities[cause];
        if (!dependency) unresolved.add(`unresolved:${cause}`);
        else if (isHighOrCritical(dependency)) visit(cause);
        else if (!knownSeverities.has(dependency.severity)) unresolved.add(`unresolved:${cause}`);
      } else if (cause && typeof cause === 'object') {
        if (isHighOrCritical(cause)) roots.add(advisoryIdentity(cause));
        else if (!knownSeverities.has(cause.severity)) {
          unresolved.add(`unresolved:${currentPackage}`);
        }
      } else {
        unresolved.add(`unresolved:${currentPackage}`);
      }
    }
    visiting.delete(currentPackage);
    visited.add(currentPackage);
  }

  visit(packageName);
  if (roots.size === 0 && unresolved.size === 0) unresolved.add(`unresolved:${packageName}`);
  return new Set([...roots, ...unresolved]);
}

function packageNameFromLockPath(lockPath) {
  const marker = 'node_modules/';
  const index = lockPath.lastIndexOf(marker);
  return index === -1 ? lockPath : lockPath.slice(index + marker.length);
}

function dependencyReferences(lockfile, dependencyName) {
  const references = [];
  for (const [lockPath, entry] of Object.entries(lockfile.packages)) {
    for (const section of dependencySections) {
      if (entry?.[section] && Object.hasOwn(entry[section], dependencyName)) {
        references.push({
          packageName: lockPath === '' ? '<root>' : packageNameFromLockPath(lockPath),
          range: entry[section][dependencyName],
          section,
        });
      }
    }
  }
  return references;
}

function validateReviewedLockScope(lockfile) {
  if (
    !lockfile ||
    lockfile.lockfileVersion !== 3 ||
    !lockfile.packages ||
    typeof lockfile.packages !== 'object'
  ) {
    return ['Cannot verify the braces exception against an npm v3 lockfile.'];
  }

  const blocking = [];
  const entries = Object.entries(lockfile.packages);
  for (const [packageName, expectedVersion] of reviewedPackages) {
    const matches = entries.filter(
      ([lockPath]) => packageNameFromLockPath(lockPath) === packageName,
    );
    if (
      matches.length !== 1 ||
      matches[0]?.[1]?.version !== expectedVersion ||
      matches[0]?.[1]?.dev !== true
    ) {
      blocking.push(`Expected one dev-only ${packageName}@${expectedVersion} lockfile entry.`);
    }
  }

  for (const [dependencyName, expectedReferences] of reviewedReferences) {
    const actual = dependencyReferences(lockfile, dependencyName);
    const normalize = (value) => `${value.packageName}|${value.section}|${String(value.range)}`;
    const actualKeys = actual.map(normalize).sort();
    const expectedKeys = expectedReferences.map(normalize).sort();
    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
      blocking.push(
        `Unexpected ${dependencyName} dependency scope: ${actualKeys.join(', ') || 'none'}.`,
      );
    }
  }
  return blocking;
}

export function evaluateAuditReport(report, lockfile, now = new Date()) {
  if (
    !report ||
    typeof report !== 'object' ||
    !report.vulnerabilities ||
    typeof report.vulnerabilities !== 'object' ||
    typeof now?.getTime !== 'function' ||
    Number.isNaN(now.getTime())
  ) {
    throw new Error('npm audit returned an invalid report.');
  }

  const allowed = [];
  const blocking = [];
  for (const [packageName, vulnerability] of Object.entries(report.vulnerabilities)) {
    if (
      !vulnerability ||
      !knownSeverities.has(vulnerability.severity) ||
      !Array.isArray(vulnerability.via)
    ) {
      blocking.push(`Invalid vulnerability data: ${packageName}.`);
      continue;
    }
    if (vulnerability.severity === 'critical') {
      blocking.push(`Critical vulnerability: ${packageName}.`);
      continue;
    }
    if (vulnerability.severity !== 'high') continue;

    const roots = [...findRootAdvisories(packageName, report.vulnerabilities)];
    if (roots.length === 0 || roots.some((root) => root !== reviewedAdvisory)) {
      blocking.push(`Unreviewed high vulnerability: ${packageName} (${roots.join(', ')}).`);
      continue;
    }
    allowed.push(packageName);
  }

  allowed.sort();
  if (allowed.length > 0 && now >= reviewExpiresAt) {
    blocking.push(`The braces allowlist expired at ${reviewExpiresAt.toISOString()}.`);
  }
  if (allowed.length > 0) blocking.push(...validateReviewedLockScope(lockfile));
  return { allowed, blocking, ok: blocking.length === 0 };
}

function runNpmAudit() {
  const npmExecutable = process.env.npm_execpath;
  const useWindowsShell = !npmExecutable && process.platform === 'win32';
  const command = npmExecutable ? process.execPath : useWindowsShell ? process.env.ComSpec : 'npm';
  const arguments_ = npmExecutable
    ? [npmExecutable, 'audit', '--json']
    : useWindowsShell
      ? ['/d', '/s', '/c', 'npm audit --json']
      : ['audit', '--json'];
  const audit = spawnSync(command, arguments_, { encoding: 'utf8', windowsHide: true });
  if (audit.error) throw audit.error;
  if (!audit.stdout.trim()) {
    throw new Error(`npm audit produced no JSON output. ${audit.stderr.trim()}`);
  }
  const report = JSON.parse(audit.stdout);
  if (report.error) {
    throw new Error(`npm audit failed: ${report.error.summary ?? 'unknown registry error'}`);
  }
  return report;
}

function main() {
  const report = runNpmAudit();
  const lockfile = JSON.parse(
    readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'),
  );
  const result = evaluateAuditReport(report, lockfile);
  const counts = report.metadata?.vulnerabilities;
  if (counts) {
    console.log(
      `Audit findings: ${counts.critical ?? 0} critical, ${counts.high ?? 0} high, ` +
        `${counts.moderate ?? 0} moderate, ${counts.low ?? 0} low.`,
    );
  }
  if (result.allowed.length > 0 && result.ok) {
    console.warn(
      `Temporarily allowed GHSA-vfj7-8cjw-p6xm through 2026-10-15 across ` +
        `${result.allowed.length} dev-only audit package(s); lockfile scope verified.`,
    );
  }
  if (!result.ok) {
    for (const reason of result.blocking) console.error(reason);
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) main();
