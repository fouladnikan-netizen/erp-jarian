#!/usr/bin/env node
/**
 * RFC-001 — Theme color audit (JS + CSS).
 * Fails if hex/rgb/rgba/hsl appear outside src/styles/theme-tokens.css.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ALLOWED_CSS = new Set(['src/styles/theme-tokens.css']);

/** Print/paper CSS strings still migrating — tracked separately */
const JS_ALLOWLIST = new Set([]);

const CSS_COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/;
const JS_COLOR_RE = /['"`]#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b['"`]|rgba?\(|hsla?\(/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === 'coverage' || name === '.git') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function rel(p) {
  return relative(ROOT, p).replaceAll('\\', '/');
}

const violations = [];

for (const file of walk(join(ROOT, 'src'))) {
  const r = rel(file);

  if (r.endsWith('.css')) {
    if (ALLOWED_CSS.has(r)) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (CSS_COLOR_RE.test(line)) {
        violations.push(`${r}:${i + 1}: CSS hardcoded color — ${line.trim().slice(0, 120)}`);
      }
    });
  }

  if (/\.(jsx?|tsx?)$/.test(r)) {
    if (JS_ALLOWLIST.has(r)) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      if (JS_COLOR_RE.test(line)) {
        violations.push(`${r}:${i + 1}: JS hardcoded color — ${trimmed.slice(0, 120)}`);
      }
    });
  }
}

if (violations.length) {
  console.error(`\nRFC-001 Theme Token violations (${violations.length}):\n`);
  violations.slice(0, 100).forEach((v) => console.error(`  ✗ ${v}`));
  if (violations.length > 100) console.error(`  … +${violations.length - 100} more`);
  console.error('\nFix: add tokens in src/styles/theme-tokens.css, then consume via var(--token).\n');
  process.exit(1);
}

console.log('RFC-001 audit: no hardcoded colors outside theme-tokens.css ✓');
