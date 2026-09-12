import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROOT_UNIT_ID,
  buildOrganizationTree,
  flattenTreeAssignments,
  flattenTreeUnits,
} from '../domain/organization/tree.js';

describe('organization tree projection', () => {
  it('places real user ids under units and never invents people', () => {
    const tree = buildOrganizationTree(
      [
        { id: ROOT_UNIT_ID, parentId: null, name: 'سازمان', code: 'ROOT', sortOrder: 0, isActive: true },
        { id: 'ou_sales', parentId: ROOT_UNIT_ID, name: 'فروش', code: 'SALES', sortOrder: 1, isActive: true },
      ],
      [
        {
          userId: 'u_real',
          unitId: 'ou_sales',
          displayName: 'مدیر جریان',
          username: 'admin',
          positionTitle: 'کارشناس فروش',
          isManager: false,
          userIsActive: true,
        },
      ],
    );
    assert.equal(tree.id, ROOT_UNIT_ID);
    assert.equal(tree.children[0].id, 'ou_sales');
    assert.equal(tree.children[0].children[0].id, 'u_real');
    assert.equal(tree.children[0].children[0].type, 'user');
    assert.equal(tree.children[0].children[0].username, 'admin');
  });

  it('flattens canvas tree back to units + assignments', () => {
    const tree = {
      id: ROOT_UNIT_ID,
      type: 'department',
      name: 'سازمان',
      code: 'ROOT',
      children: [
        {
          id: 'ou_ops',
          type: 'department',
          name: 'عملیات',
          code: 'OPS',
          children: [
            { id: 'u_1', type: 'user', userId: 'u_1', position: 'مسئول ارسال', isManager: true },
          ],
        },
      ],
    };
    const units = flattenTreeUnits(tree);
    const assignments = flattenTreeAssignments(tree);
    assert.equal(units.length, 2);
    assert.equal(assignments[0].userId, 'u_1');
    assert.equal(assignments[0].unitId, 'ou_ops');
    assert.equal(assignments[0].isManager, true);
  });
});
