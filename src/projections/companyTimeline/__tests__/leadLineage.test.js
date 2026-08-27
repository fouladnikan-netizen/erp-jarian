import { describe, expect, it } from 'vitest';
import { buildCompanyTimelineEvents } from '../buildCompanyTimelineEvents.js';

const COMPANY_ID = 'company-lineage-1';

function company() {
  return { id: COMPANY_ID, entityType: 'customer' };
}

describe('Gap 3 — Lead lineage projection onto Customer 360 timeline', () => {
  it('projects pre-conversion Lead Activities/Tasks and a conversion marker without mutating source rows', () => {
    const lead = {
      id: 'lead-1',
      leadSource: 'نمایشگاه',
      convertedAt: '2024-05-01T08:00:00.000Z',
      convertedCompanyId: COMPANY_ID,
    };
    const leadLineage = [
      {
        lead,
        deepLink: '/ofogh?leadId=lead-1',
        activities: [
          {
            id: 'act-1',
            type: 'call',
            date: '2024-04-01T09:00:00.000Z',
            note: 'تماس اول با سرنخ',
          },
        ],
        tasks: [
          {
            id: 'task-1',
            title: 'پیگیری ارسال کاتالوگ',
            status: 'COMPLETED',
            dueAt: '2024-04-10T09:00:00.000Z',
          },
        ],
      },
    ];

    const events = buildCompanyTimelineEvents(company(), [], [], leadLineage);

    const leadActivity = events.find((e) => e.id === 'lead-ix-lead-1-act-1');
    const leadTask = events.find((e) => e.id === 'lead-task-lead-1-task-1');
    const conversion = events.find((e) => e.id === 'lead-converted-lead-1');

    expect(leadActivity).toBeTruthy();
    expect(leadActivity.kind).toBe('lead-activity');
    expect(leadActivity.body).toBe('تماس اول با سرنخ');
    expect(leadActivity.leadId).toBe('lead-1');
    expect(leadActivity.links[0]).toMatchObject({ path: '/ofogh?leadId=lead-1', kind: 'lead' });

    expect(leadTask).toBeTruthy();
    expect(leadTask.kind).toBe('lead-task');
    expect(leadTask.title).toBe('پیگیری ارسال کاتالوگ');

    expect(conversion).toBeTruthy();
    expect(conversion.kind).toBe('lead-conversion');
    expect(conversion.body).toContain('نمایشگاه');

    // Source objects must not be re-keyed/mutated by the projection.
    expect(lead.convertedCompanyId).toBe(COMPANY_ID);
    expect(leadLineage[0].activities[0].id).toBe('act-1');
  });

  it('merges lead-era and company-era events into one chronological timeline', () => {
    const leadLineage = [
      {
        lead: { id: 'lead-2', convertedAt: '2024-01-01T00:00:00.000Z' },
        deepLink: '/ofogh?leadId=lead-2',
        activities: [{ id: 'a1', type: 'note', date: '2023-12-01T00:00:00.000Z', note: 'قدیمی' }],
        tasks: [],
      },
    ];

    const events = buildCompanyTimelineEvents(company(), [], [], leadLineage);
    // Newest first: conversion (2024-01-01) should sort before the lead activity (2023-12-01).
    const conversionIdx = events.findIndex((e) => e.kind === 'lead-conversion');
    const activityIdx = events.findIndex((e) => e.kind === 'lead-activity');
    expect(conversionIdx).toBeGreaterThanOrEqual(0);
    expect(activityIdx).toBeGreaterThan(conversionIdx);
  });

  it('is backward compatible when no leadLineage argument is passed', () => {
    expect(() => buildCompanyTimelineEvents(company(), [], [])).not.toThrow();
  });
});
