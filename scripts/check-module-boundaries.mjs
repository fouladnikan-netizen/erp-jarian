#!/usr/bin/env node
/**
 * Lightweight module boundary guard — fails on direct cross-module store imports.
 * Run: npm run check:module-boundaries
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');

const STORE_PATTERNS = [
  { re: /useContactsStore/, label: 'useContactsStore' },
  { re: /useLeadsStore/, label: 'useLeadsStore' },
  { re: /useNabzStore/, label: 'useNabzStore' },
  { re: /useNabzOrders/, label: 'useNabzOrders' },
  { re: /useActivitiesStore/, label: 'useActivitiesStore' },
  { re: /useTasksStore/, label: 'useTasksStore' },
];

const MODULES = ['kanoon', 'ofogh', 'nabz', 'pooyesh', 'mowj', 'gahshomar'];

/** Owner module may import its own store (via public facade or internal). */
function ownerForStore(label) {
  const map = {
    useContactsStore: 'kanoon',
    useLeadsStore: 'ofogh',
    useNabzStore: 'nabz',
    useNabzOrders: 'nabz',
    useActivitiesStore: 'pooyesh',
    useTasksStore: 'pooyesh',
  };
  return map[label];
}

const ALLOWLIST = [
  // Public facades are the only cross-module store touchpoints
  /\/public\//,
  /\/store\/useContactsStore/,
  /\/store\/useLeadsStore/,
  /\/store\/useNabzStore/,
  /\/store\/useActivitiesStore/,
  /\/store\/useTasksStore/,
  /\/stores\/useContactsStore/,
  /\/stores\/useLeadsStore/,
  /\/stores\/useNabzStore/,
  /\/stores\/useActivitiesStore/,
  /\/stores\/useTasksStore/,
  /\/ports\/subjectEntity\.port/,
  /\/interactionFacade/,
  /\/taskFacade/,
  /\/NabzOrdersContext/,
  /\/legalInfoService/,
  /\/kanoon\/store\//,
  /\/__tests__\//,
  /\.test\./,
  /\.spec\./,
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walk(full, files);
    } else if (/\.(js|jsx|ts|tsx)$/.test(name)) {
      files.push(full);
    }
  }
  return files;
}

function moduleOf(filePath) {
  const rel = relative(SRC, filePath).replace(/\\/g, '/');
  const m = rel.match(/^modules\/([^/]+)/);
  return m ? m[1] : null;
}

function isAllowlisted(filePath) {
  const rel = relative(SRC, filePath).replace(/\\/g, '/');
  return ALLOWLIST.some((re) => re.test(rel));
}

function hasStoreImport(content, storeLabel) {
  const importRe = new RegExp(
    `import\\s+[\\s\\S]*?\\b${storeLabel}\\b[\\s\\S]*?from\\s+['"][^'"]+['"]`,
    'm',
  );
  return importRe.test(content);
}

const violations = [];

for (const file of walk(SRC)) {
  const fromModule = moduleOf(file);
  if (!fromModule || !MODULES.includes(fromModule)) continue;
  if (isAllowlisted(file)) continue;

  const content = readFileSync(file, 'utf8');
  for (const { label } of STORE_PATTERNS) {
    if (!hasStoreImport(content, label)) continue;
    const owner = ownerForStore(label);
    if (owner === fromModule) continue;
    violations.push({
      file: relative(ROOT, file),
      from: fromModule,
      store: label,
      owner,
    });
  }
}

if (violations.length) {
  console.error('check:module-boundaries FAILED\n');
  for (const v of violations) {
    console.error(`  ${v.file}`);
    console.error(`    ${v.from} → ${v.store} (owner: ${v.owner})`);
  }
  console.error(`\n${violations.length} violation(s). Use module public/* facades or ports.`);
  process.exit(1);
}

console.log('check:module-boundaries ok');
