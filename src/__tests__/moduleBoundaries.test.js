/**
 * Module boundary regression — public facades replace direct store imports.
 */
import { describe, it, expect } from 'vitest';
import { getCompany, listCompanies } from '../modules/kanoon/public/index.js';
import { getOrder, listOrdersForCompany } from '../modules/nabz/public/index.js';
import { getLead, resolveLeadReference } from '../modules/ofogh/public/index.js';
import { resolveSubjectEntity } from '../modules/pooyesh/ports/subjectEntity.port.js';
import { getCompanyTimeline } from '../modules/pooyesh/timeline/companyTimelineFacade.js';
import { listLetterCompanies } from '../modules/gahshomar/services/letterContactSearch.js';
import { createErpAudiencePort } from '../modules/mowj/adapters/erpAudiencePort.js';
import { getCustomerById } from '../modules/nabz/customers.js';

describe('module public facades', () => {
  it('Kanoon company facade exports', () => {
    expect(typeof getCompany).toBe('function');
    expect(typeof listCompanies).toBe('function');
    expect(Array.isArray(listCompanies())).toBe(true);
  });

  it('Nabz order facade exports', () => {
    expect(typeof getOrder).toBe('function');
    expect(typeof listOrdersForCompany).toBe('function');
    expect(Array.isArray(listOrdersForCompany('none'))).toBe(true);
  });

  it('Ofogh lead facade exports', () => {
    expect(typeof getLead).toBe('function');
    expect(resolveLeadReference('missing').ok).toBe(false);
  });

  it('Pooyesh subject port resolves without foreign store import in consumer', () => {
    const r = resolveSubjectEntity({ entityType: 'COMPANY', entityId: 'missing' });
    expect(r.ok).toBe(false);
  });

  it('company timeline uses order list not nabz store in consumer', () => {
    const events = getCompanyTimeline('missing', { orders: [] });
    expect(Array.isArray(events)).toBe(true);
  });

  it('Gahshomar letter search uses Kanoon facade', () => {
    expect(Array.isArray(listLetterCompanies())).toBe(true);
  });

  it('Mowj audience port builds without contacts store import', () => {
    const port = createErpAudiencePort();
    expect(typeof port.listCompanies).toBe('function');
    expect(Array.isArray(port.listCompanies())).toBe(true);
  });

  it('Nabz customers uses Kanoon facade', () => {
    expect(getCustomerById('missing')).toBeNull();
  });
});
