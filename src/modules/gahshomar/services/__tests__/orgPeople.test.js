import { describe, expect, it } from 'vitest';
import {
  getDefaultAssignee,
  listOrgPeopleForReferral,
  resolveAssignee,
} from '../orgPeople';

describe('orgPeople referral roster', () => {
  it('defaults to current user first', () => {
    const people = listOrgPeopleForReferral();
    expect(people.length).toBeGreaterThan(1);
    expect(people[0].isCurrent).toBe(true);
    expect(getDefaultAssignee().id).toBe(people[0].id);
  });

  it('resolves assignee by id', () => {
    const people = listOrgPeopleForReferral();
    const target = people[1] || people[0];
    expect(resolveAssignee(target.id)?.name).toBe(target.name);
  });
});
