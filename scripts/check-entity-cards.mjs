#!/usr/bin/env node
/**
 * Validate Docs/architecture/entity-cards/*.yaml (flat Entity Card subset).
 * Zero runtime deps.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIR = join(ROOT, 'Docs/architecture/entity-cards');
const schema = JSON.parse(readFileSync(join(DIR, 'schema.json'), 'utf8'));
const REQUIRED = schema.required;
const PROPS = schema.properties;

/** Minimal YAML: top-level keys, quoted/unquoted scalars, string arrays. */
function parseEntityCardYaml(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    i += 1;
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (/^\s/.test(line)) throw new Error(`Unexpected indent: ${line}`);
    const m = line.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
    if (!m) throw new Error(`Cannot parse: ${line}`);
    const key = m[1];
    const rest = m[2].trim();
    if (rest === '' || rest === '[]') {
      const arr = [];
      if (rest === '') {
        while (i < lines.length) {
          const next = lines[i];
          if (!next.trim() || next.trim().startsWith('#')) {
            i += 1;
            continue;
          }
          if (!/^\s+- /.test(next)) break;
          arr.push(unquote(next.replace(/^\s+-\s+/, '').trim()));
          i += 1;
        }
      }
      out[key] = arr;
    } else {
      out[key] = coerce(unquote(rest));
    }
  }
  return out;
}

function unquote(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function coerce(s) {
  if (s === 'true') return true;
  if (s === 'false') return false;
  return s;
}

function validateCard(card, file) {
  const errors = [];
  for (const key of REQUIRED) {
    if (!(key in card)) errors.push(`missing required field: ${key}`);
  }
  for (const [key, value] of Object.entries(card)) {
    const prop = PROPS[key];
    if (!prop) {
      errors.push(`unknown field: ${key}`);
      continue;
    }
    if (prop.type === 'string') {
      if (typeof value !== 'string') {
        errors.push(`${key}: expected string`);
        continue;
      }
      if (prop.enum && value !== '' && !prop.enum.includes(value)) {
        errors.push(`${key}: must be one of ${prop.enum.join('|')}`);
      }
      if (prop.pattern && value !== '' && !new RegExp(prop.pattern).test(value)) {
        errors.push(`${key}: pattern mismatch`);
      }
      if (prop.minLength && value.length < prop.minLength) {
        errors.push(`${key}: too short`);
      }
    } else if (prop.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push(`${key}: expected array`);
        continue;
      }
      if (prop.minItems && value.length < prop.minItems) {
        errors.push(`${key}: need ≥ ${prop.minItems} items`);
      }
      for (const item of value) {
        if (typeof item !== 'string') errors.push(`${key}: items must be strings`);
        else if (prop.items?.pattern && !new RegExp(prop.items.pattern).test(item)) {
          errors.push(`${key}: invalid item "${item}"`);
        }
      }
    }
  }

  const stem = basename(file, '.yaml');
  if (card.id !== stem) errors.push(`id must match filename "${stem}"`);

  if (card.tier === 'A' && card.status === 'active') {
    if (card.ssot !== 'postgresql') errors.push('active Tier A requires ssot: postgresql');
    if (!card.databaseTable) errors.push('active Tier A requires databaseTable');
    if (!card.apiBasePath) errors.push('active Tier A requires apiBasePath');
    if (!card.frontendRepository) errors.push('active Tier A requires frontendRepository');
  }

  if (card.id === 'raw-lead' && card.status === 'deferred' && card.databaseTable) {
    errors.push('raw-lead deferred: databaseTable must stay empty until DDL gate');
  }

  return errors;
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.yaml')).sort();
if (!files.length) {
  console.error('No entity card YAML files found');
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  try {
    const card = parseEntityCardYaml(readFileSync(join(DIR, file), 'utf8'));
    const errors = validateCard(card, file);
    if (errors.length) {
      failed += 1;
      console.error(`✗ ${file}`);
      for (const e of errors) console.error(`  - ${e}`);
    } else {
      console.log(`✓ ${file} (${card.tier}/${card.status})`);
    }
  } catch (err) {
    failed += 1;
    console.error(`✗ ${file}: ${err.message}`);
  }
}

if (failed) {
  console.error(`\ncheck:entity-cards failed (${failed})`);
  process.exit(1);
}
console.log(`\ncheck:entity-cards ok (${files.length} cards)`);
