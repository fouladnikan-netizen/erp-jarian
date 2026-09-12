import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const indexSrc = readFileSync(join(here, '../index.js'), 'utf8');

describe('Phase 2.1 public HTTP mount', () => {
  it('wires CRM and tasks presentation into the same /api/v1 prefixes', () => {
    const mounts = [
      ['/api/v1/companies', 'modules/crm/presentation/companies.js'],
      ['/api/v1/contacts', 'modules/crm/presentation/contacts.js'],
      ['/api/v1/leads', 'modules/crm/presentation/leads.js'],
      ['/api/v1/lead-pipelines', 'modules/crm/presentation/leadPipelines.js'],
      ['/api/v1/identity', 'modules/crm/presentation/identity.js'],
      ['/api/v1/tasks', 'modules/tasks/presentation/tasks.js'],
      ['/api/v1/activities', 'modules/tasks/presentation/activities.js'],
      ['/api/v1/activity-types', 'modules/tasks/presentation/activityTypes.js'],
    ];
    for (const [prefix, file] of mounts) {
      assert.match(indexSrc, new RegExp(`app\\.use\\('${prefix.replace(/\//g, '\\/')}'`));
      assert.match(indexSrc, new RegExp(file.replace(/\./g, '\\.')));
    }
  });
});
