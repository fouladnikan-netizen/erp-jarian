import { describe, expect, it } from 'vitest';
import { countRoleAssignees } from '../countRoleAssignees.js';

describe('countRoleAssignees', () => {
  it('splits active and inactive assignments', () => {
    expect(countRoleAssignees([
      { isActive: true },
      { isActive: true },
      { isActive: false },
    ])).toEqual({ active: 2, inactive: 1, total: 3 });
  });

  it('treats empty as zero of each', () => {
    expect(countRoleAssignees([])).toEqual({ active: 0, inactive: 0, total: 0 });
  });
});
