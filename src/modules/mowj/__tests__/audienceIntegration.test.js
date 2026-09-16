/**
 * Audience segmentation integration — related-person recipients + ERP contracts.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import {
  AUDIENCE_BASE_SELECTION,
  AUDIENCE_SOURCE_TYPE,
  AUDIENCE_TARGET_LEVEL,
  CONDITION_OPERATOR,
  validateAudienceDefinition,
  normalizeAudienceDefinition,
  createAudienceDefinition,
  createAudienceResolver,
  createEmptyAudiencePort,
  snapshotMembersFromResolved,
  CAMPAIGN_PURPOSE,
  CAMPAIGN_TYPE,
  createCampaignDraft,
  MODULE_REF_KIND,
} from '../domain';
import {
  __testing,
  createAndActivateCampaign,
  getCampaignDetail,
  prepareCampaignExecution,
} from '../services/campaignFacade';
import { __setDefaultAudienceResolverForTests } from '../adapters/audienceResolver.runtime';

function companyRow(partial = {}) {
  return {
    companyId: '1',
    contactId: '1',
    province: 'تهران',
    city: 'تهران',
    activityDomain: 'ورق فولادی',
    leadSource: 'exhibition',
    orderCount: 2,
    totalPurchaseAmount: 1e9,
    totalPurchaseWeight: 10,
    purchasedProducts: ['ورق سیاه'],
    purchasedBrands: [],
    activityCount: 1,
    isDebtor: false,
    isCreditor: false,
    accountBalance: 0,
    debtAmount: 0,
    hasOverdue: false,
    openOrderCount: 1,
    orderStatuses: ['current'],
    suppliers: [],
    maxOrderAmount: 1e9,
    maxOrderWeight: 10,
    ...partial,
  };
}

function personFromCompany(company, overrides = {}) {
  const id = overrides.personId || `p-${company.companyId}`;
  return {
    ...company,
    personId: id,
    contactPersonId: id,
    contactId: id,
    personGender: overrides.personGender || 'male',
    personPosition: overrides.personPosition || 'مدیرعامل',
    personRelationType: overrides.personRelationType || 'مدیرعامل',
    personStatus: overrides.personStatus || 'active',
    ...overrides,
  };
}

function mockCompanyPort(rows) {
  const companies = rows || [
    companyRow({ companyId: '1', contactId: '1', province: 'تهران', orderCount: 2, purchasedProducts: ['ورق سیاه'] }),
    companyRow({
      companyId: '2',
      contactId: '2',
      province: 'اصفهان',
      activityDomain: 'نمایشگاه',
      leadSource: 'exhibition',
      orderCount: 0,
      totalPurchaseAmount: 0,
      purchasedProducts: [],
      openOrderCount: 0,
    }),
  ];
  const persons = [
    personFromCompany(companies[0], {
      personId: 'p1',
      personGender: 'female',
      personPosition: 'مدیر خرید',
      personRelationType: 'مدیر خرید',
    }),
    personFromCompany(companies[0], {
      personId: 'p2',
      personGender: 'male',
      personPosition: 'مدیرعامل',
    }),
    ...(companies[1] ? [personFromCompany(companies[1], { personId: 'p3' })] : []),
  ];
  return {
    ...createEmptyAudiencePort(),
    listCompanies: () => companies,
    listRelatedPersons: () => persons,
  };
}

describe('Audience definition validation', () => {
  it('rejects missing name and invalid source', () => {
    const bad = validateAudienceDefinition({ sourceType: 'SMS' });
    expect(bad.ok).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(0);
  });

  it('normalizes legacy COMPANY input to PERSON recipients', () => {
    const def = normalizeAudienceDefinition({
      name: 'افراد شرکت‌های بدون سفارش',
      source: AUDIENCE_SOURCE_TYPE.KANOON_COMPANY,
      baseSelection: AUDIENCE_BASE_SELECTION.WITHOUT_ORDERS,
      rules: [],
    });
    expect(def.source).toBe(AUDIENCE_SOURCE_TYPE.KANOON_PERSON);
    expect(def.sourceType).toBe(AUDIENCE_SOURCE_TYPE.KANOON_PERSON);
    expect(def.targetLevel).toBe(AUDIENCE_TARGET_LEVEL.PERSON);
    expect(def.baseSelection).toBe(AUDIENCE_BASE_SELECTION.WITHOUT_ORDERS);
    expect(def.id).toBeTruthy();
  });

  it('migrates legacy CONTACT/LEAD/CUSTOMER to KANOON_PERSON', () => {
    const fromContact = normalizeAudienceDefinition({
      name: 'قدیمی',
      sourceType: AUDIENCE_SOURCE_TYPE.CONTACT,
      filters: {},
    });
    expect(fromContact.sourceType).toBe(AUDIENCE_SOURCE_TYPE.KANOON_PERSON);

    const fromLead = normalizeAudienceDefinition({
      source: 'OFOGH_LEADS',
      label: 'سرنخ‌ها',
      filters: { leadSource: 'exhibition' },
    });
    expect(fromLead.sourceType).toBe(AUDIENCE_SOURCE_TYPE.KANOON_PERSON);
    expect(fromLead.rules.some((r) => r.conditionId === 'acquisitionSource')).toBe(true);
  });
});

describe('Audience resolver contract', () => {
  it('resolves all related persons from Kanoon projection', () => {
    const resolver = createAudienceResolver(mockCompanyPort());
    const result = resolver.resolve(createAudienceDefinition({
      name: 'همه افراد مرتبط',
      source: AUDIENCE_SOURCE_TYPE.KANOON_PERSON,
      baseSelection: AUDIENCE_BASE_SELECTION.ALL_COMPANIES,
    }));
    expect(result.ok).toBe(true);
    expect(result.count).toBe(3);
    expect(result.members[0].kind).toBe(MODULE_REF_KIND.KANOON_CONTACT_PERSON);
    expect(result.members[0].companyId).toBe('1');
  });

  it('resolves WITH_ORDERS and purchase product condition on persons', () => {
    const resolver = createAudienceResolver(mockCompanyPort());
    const withOrders = resolver.resolve(createAudienceDefinition({
      name: 'دارای سفارش',
      baseSelection: AUDIENCE_BASE_SELECTION.WITH_ORDERS,
    }));
    expect(withOrders.count).toBe(2);

    const byProduct = resolver.resolve(createAudienceDefinition({
      name: 'خریداران ورق',
      baseSelection: AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS,
      rules: [{
        conditionId: 'purchasedProduct',
        operator: CONDITION_OPERATOR.CONTAINS,
        value: 'ورق',
      }],
    }));
    expect(byProduct.ok).toBe(true);
    expect(byProduct.count).toBe(2);
    expect(byProduct.members[0].companyId).toBe('1');
  });

  it('resolves financial + acquisition conditions on persons', () => {
    const resolver = createAudienceResolver(mockCompanyPort([
      companyRow({ companyId: '1', isDebtor: true, debtAmount: 500, accountBalance: -500, leadSource: 'web' }),
      companyRow({ companyId: '2', leadSource: 'exhibition', isDebtor: false, orderCount: 0 }),
    ]));

    expect(resolver.resolve(createAudienceDefinition({
      name: 'بدهکاران',
      baseSelection: AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS,
      rules: [{ conditionId: 'isDebtor', operator: CONDITION_OPERATOR.EQUALS, value: true }],
    })).count).toBe(2);

    expect(resolver.resolve(createAudienceDefinition({
      name: 'نمایشگاه',
      baseSelection: AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS,
      rules: [{
        conditionId: 'acquisitionSource',
        operator: CONDITION_OPERATOR.EQUALS,
        value: 'exhibition',
      }],
    })).count).toBe(1);
  });

  it('maps resolved members to snapshot rows', () => {
    const rows = snapshotMembersFromResolved([
      {
        kind: MODULE_REF_KIND.KANOON_CONTACT_PERSON,
        contactId: 'p1',
        contactPersonId: 'p1',
        companyId: '1',
        customerId: '1',
      },
    ]);
    expect(rows[0].contactPersonId).toBe('p1');
    expect(rows[0].companyId).toBe('1');
    expect(rows[0].status).toBe('INCLUDED');
  });
});

describe('Campaign audience integration', () => {
  beforeEach(() => {
    __setDefaultAudienceResolverForTests(createAudienceResolver(mockCompanyPort()));
    __testing.resetToSeed();
    __setDefaultAudienceResolverForTests(createAudienceResolver(mockCompanyPort()));
  });

  it('creates campaign with related-person audience and prepares snapshot', () => {
    const created = createAndActivateCampaign({
      ...createCampaignDraft(),
      name: 'کمپین کانون',
      purpose: CAMPAIGN_PURPOSE.RETENTION,
      campaignType: CAMPAIGN_TYPE.BROADCAST,
      audience: createAudienceDefinition({
        name: 'افراد شرکت‌های تهران',
        source: AUDIENCE_SOURCE_TYPE.KANOON_PERSON,
        targetLevel: AUDIENCE_TARGET_LEVEL.PERSON,
        baseSelection: AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS,
        rules: [{
          conditionId: 'province',
          operator: CONDITION_OPERATOR.EQUALS,
          value: 'تهران',
        }],
      }),
      status: 'READY',
    });
    const prepared = prepareCampaignExecution(created.id);
    expect(prepared.ok).toBe(true);
    expect(prepared.execution.targetCount).toBe(2);
    expect(prepared.snapshot.members[0].companyId).toBe('1');
    expect(prepared.snapshot.members[0].contactPersonId).toBeTruthy();
  });

  it('creates person filter campaign (SMS-style gender)', () => {
    const created = createAndActivateCampaign({
      ...createCampaignDraft(),
      name: 'روز زن',
      purpose: CAMPAIGN_PURPOSE.RETENTION,
      campaignType: CAMPAIGN_TYPE.BROADCAST,
      audience: createAudienceDefinition({
        name: 'اشخاص زن',
        source: AUDIENCE_SOURCE_TYPE.KANOON_PERSON,
        targetLevel: AUDIENCE_TARGET_LEVEL.PERSON,
        baseSelection: AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS,
        rules: [{
          conditionId: 'personGender',
          operator: CONDITION_OPERATOR.EQUALS,
          value: 'female',
        }],
      }),
      status: 'READY',
    });
    const detail = getCampaignDetail(created.id);
    expect(detail.audience.sourceType).toBe(AUDIENCE_SOURCE_TYPE.KANOON_PERSON);
    expect(detail.audience.targetLevel).toBe(AUDIENCE_TARGET_LEVEL.PERSON);

    const prepared = prepareCampaignExecution(created.id);
    expect(prepared.ok).toBe(true);
    expect(prepared.snapshot.members[0].contactPersonId).toBe('p1');
  });
});
