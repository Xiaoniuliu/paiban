import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, join, normalize } from 'node:path';

const root = fileURLToPath(new URL('../src/app', import.meta.url));
const ignoredFiles = new Set([
  join(root, 'components', 'time.tsx'),
  join(root, 'lib', 'time.ts'),
  join(root, 'lib', 'TimeDisplayContext.tsx'),
]);
const ignoredDirectories = [
  join(root, 'components', 'ui'),
];
const legacyVisualReferenceFiles = new Set([
  'ComplianceCheck.tsx',
  'ComplianceReports.tsx',
  'ComplianceViolations.tsx',
  'CrewLicense.tsx',
  'CrewManagement.tsx',
  'CrewTraining.tsx',
  'Dashboard.tsx',
  'FlightAircraft.tsx',
  'FlightManagement.tsx',
  'FlightRoute.tsx',
  'ReportCenter.tsx',
  'ReportExport.tsx',
  'ScheduleGantt.tsx',
  'SystemSettings.tsx',
]);

const disallowed = [
  { name: 'naked new Date', pattern: /\bnew\s+Date\s*\(/g },
  { name: 'toLocaleString', pattern: /\.toLocaleString\s*\(/g },
  { name: 'toISOString', pattern: /\.toISOString\s*\(/g },
  { name: 'Date.parse', pattern: /\bDate\.parse\s*\(/g },
  { name: 'string time slice', pattern: /\.slice\s*\(\s*11/g },
  { name: 'direct time formatter call', pattern: /\bformat(?:DateTime|Date|TimeRange|GanttTimeLabel)\s*\(/g },
];

const files = [];
collect(root);

const violations = [];
for (const file of files) {
  if (ignoredFiles.has(file)) continue;
  if (legacyVisualReferenceFiles.has(basename(file))) continue;

  const text = readFileSync(file, 'utf8');
  for (const rule of disallowed) {
    for (const match of text.matchAll(rule.pattern)) {
      violations.push(`${file}:${lineNumber(text, match.index ?? 0)} ${rule.name}: ${match[0]}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Unsafe time handling found outside the approved time layer:');
  console.error(violations.join('\n'));
  console.error('Use TimeDisplayProvider, useTimeFormatter, or Timestamp/DateOnly/TimeRange/GanttTimeLabel.');
  process.exit(1);
}

console.log('time safety check passed');

function collect(path) {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    if (ignoredDirectories.some((ignored) => normalize(path) === normalize(ignored))) {
      return;
    }
    for (const child of readdirSync(path)) {
      collect(join(path, child));
    }
    return;
  }
  if (path.endsWith('.tsx') || path.endsWith('.ts')) {
    files.push(path);
  }
}

function lineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}
