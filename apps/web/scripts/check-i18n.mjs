import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../src/app', import.meta.url));
const included = [
  join(root, 'App.tsx'),
  join(root, 'components', 'Layout.tsx'),
  join(root, 'pages'),
];
const ignored = new Set([join(root, 'i18n.ts')]);
const disallowed = [
  /Failed to load [^'"`<]+/g,
  /[\u4e00-\u9fff]{2,}/g,
];

const files = [];
for (const path of included) {
  collect(path);
}

const violations = [];
for (const file of files) {
  if (ignored.has(file)) continue;
  const text = readFileSync(file, 'utf8');
  for (const pattern of disallowed) {
    for (const match of text.matchAll(pattern)) {
      const value = match[0];
      if (isAllowed(value)) continue;
      violations.push(`${file}: ${value}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Hardcoded UI text found outside i18n resources:');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log('i18n check passed');

function collect(path) {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const child of readdirSync(path)) {
      collect(join(path, child));
    }
    return;
  }
  if (path.endsWith('.tsx') || path.endsWith('.ts')) {
    files.push(path);
  }
}

function isAllowed(value) {
  return [
    '中文',
    'English',
  ].includes(value);
}
