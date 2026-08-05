/**
 * Audience segmentation engine — related persons + registry conditions.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import {
  AUDIENCE_BASE_SELECTION,
  AUDIENCE_SOURCE_TYPE,
  AUDIENCE_TARGET_LEVEL,
  CONDITION_OPERATOR,
  CONDITION_DATA_TYPE,
  CONDITION_CATEGORY,
  getConditionDefinition,
  listConditionDefinitions,
  listConditionCategories,
  resolveValueProvider,
  validateAudienceCondition,
  validateAudienceDefinition,
  normalizeAudienceRule,
  normalizeAudienceDefinition,
  createAudienceResolver,
  createEmptyAudiencePort,
  companyMatchesDefinition,
  VALUE_PROVIDER_ALL,
  REMOVED_AUDIENCE_CONDITION_IDS,
  MODULE_REF_KIND,
  RULE_COMBINATOR,
} from '../domain';
import {
  __testing,
  previewSegment,
  saveSegment,
  listSegments,
} from '../services/campaignFacade';

describe('Audience model — related persons only', () => {
  it('migrates COMPANY target to PERSON recipients', () => {
    const company = normalizeAudienceDefinition({
      name: 'بدهکاران',
      targetLevel: AUDIENCE_TARGET_LEVEL.COMPANY,
      baseSelection: AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS,
      rules: [{ conditionId: 'isDebtor', operator: CONDITION_OPERATOR.EQUALS, value: true }],
    });
    expect(company.targetLevel).toBe(AUDIENCE_TARGET_LEVEL.PERSON);
    expect(company.source).toBe(AUDIENCE_SOURCE_TYPE.KANOON_PERSON);

    const person = normalizeAudienceDefinition({
      name: 'روز زن',
      targetLevel: AUDIENCE_TARGET_LEVEL.PERSON,
      baseSelection: AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS,
      rules: [{ conditionId: 'personGender', operator: CONDITION_OPERATOR.EQUALS, value: 'female' }],
    });
    expect(person.targetLevel).toBe(AUDIENCE_TARGET_LEVEL.PERSON);
    expect(person.source).toBe(AUDIENCE_SOURCE_TYPE.KANOON_PERSON);
  });

  it('allows person + company filter conditions together', () => {
    const result = validateAudienceDefinition({
      name: 'مدیران خرید فولاد',
      targetLevel: AUDIENCE_TARGET_LEVEL.PERSON,
      baseSelection: AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS,
      rules: [
        { conditionId: 'personGender', operator: CONDITION_OPERATOR.EQUALS, value: 'female' },
        { conditionId: 'industry', operator: CONDITION_OPERATOR.EQUALS, value: 'فولاد' },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it('removes relatedExpert from audience filters (keeps relatedKnight company filter)', () => {
    expect(getConditionDefinition('relatedExpert')).toBeNull();
    expect(REMOVED_AUDIENCE_CONDITION_IDS).toContain('relatedExpert');
    expect(normalizeAudienceRule({
      conditionId: 'relatedExpert',
      operator: CONDITION_OPERATOR.EQUALS,
      value: 'u-1',
    })).toBeNull();
    expect(getConditionDefinition('relatedKnight')?.label).toBe('شوالیه مرتبط');
  });
});

describe('Condition registry + value providers', () => {
  it('exposes all filter categories for person audience', () => {
    const cats = listConditionCategories({ targetLevel: AUDIENCE_TARGET_LEVEL.PERSON });
    expect(cats.some((c) => c.id === CONDITION_CATEGORY.CONTACT_PERSON)).toBe(true);
    expect(cats.some((c) => c.id === CONDITION_CATEGORY.COMPANY_BASE)).toBe(true);
    expect(cats.some((c) => c.id === CONDITION_CATEGORY.FINANCIAL)).toBe(true);
    expect(cats.some((c) => c.id === CONDITION_CATEGORY.OFOGH)).toBe(true);
    expect(cats[0].id).toBe(CONDITION_CATEGORY.CONTACT_PERSON);

    const companyFields = listConditionDefinitions(CONDITION_CATEGORY.COMPANY_BASE, {
      targetLevel: AUDIENCE_TARGET_LEVEL.PERSON,
    });
    expect(companyFields.some((f) => f.id === 'industry')).toBe(true);
    expect(getConditionDefinition('personGender').dataType).toBe(CONDITION_DATA_TYPE.SELECT);
    expect(getConditionDefinition('personPosition').valueProvider).toBe('personPositions');
  });

  it('resolves gender / position / relative-date selectors', () => {
    const genders = resolveValueProvider('personGenders');
    expect(genders.some((o) => o.value === 'male' && o.label === 'مرد')).toBe(true);
    expect(genders.some((o) => o.value === 'female')).toBe(true);

    const positions = resolveValueProvider('personPositions');
    expect(positions.some((o) => String(o.label).includes('مدیر خرید'))).toBe(true);

    const cities = resolveValueProvider('cities');
    expect(cities.some((o) => o.value === VALUE_PROVIDER_ALL.value)).toBe(true);

    const dates = resolveValueProvider('relativeDatePresets');
    expect(dates.some((o) => o.value === 'older_than_6m')).toBe(true);
    expect(dates.some((o) => o.value === 'in_last_30d')).toBe(true);
  });

  it('validates numeric / financial / order conditions', () => {
    expect(validateAudienceCondition({
      conditionId: 'orderCount',
      operator: CONDITION_OPERATOR.GREATER_THAN,
      value: 10,
    }).ok).toBe(true);

    expect(validateAudienceCondition({
      conditionId: 'accountBalance',
      operator: CONDITION_OPERATOR.LESS_THAN,
      value: 0,
    }).ok).toBe(true);

    expect(validateAudienceCondition({
      conditionId: 'isDebtor',
      operator: CONDITION_OPERATOR.EQUALS,
      value: true,
    }).ok).toBe(true);

    expect(normalizeAudienceRule({
      conditionId: 'totalPurchaseAmount',
      operator: CONDITION_OPERATOR.BETWEEN,
      value: [1e9, 5e9],
    })?.value).toEqual([1e9, 5e9]);
  });
});

describe('Resolver + preview + snapshot compatibility', () => {
  beforeEach(() => {
    __testing.resetToSeed();
  });

  it('always resolves related-person members (company filters apply on person rows)', () => {
    const companies = [
      {
        companyId: '1',
        contactId: '1',
        province: 'تهران',
        activityDomain: 'صنایع فولادی',
        orderCount: 2,
        totalPurchaseAmount: 10,
        purchasedProducts: ['ورق'],
        activityCount: 0,
        isDebtor: true,
        isCreditor: false,
        accountBalance: -100,
        debtAmount: 100,
        hasOverdue: false,
        openOrderCount: 1,
        purchasedBrands: [],
        orderStatuses: ['current'],
        suppliers: [],
        maxOrderAmount: 10,
        maxOrderWeight: 0,
        totalPurchaseWeight: 0,
      },
    ];
    const persons = [
      {
        ...companies[0],
        personId: 'p1',
        contactPersonId: 'p1',
        contactId: 'p1',
        personGender: 'female',
        personPosition: 'مدیر خرید',
        personRelationType: 'مدیر خرید',
        personStatus: 'active',
      },
      {
        ...companies[0],
        personId: 'p2',
        contactPersonId: 'p2',
        contactId: 'p2',
        personGender: 'male',
        personPosition: 'مدیرعامل',
        personRelationType: 'مدیرعامل',
        personStatus: 'active',
      },
    ];
    const resolver = createAudienceResolver({
      ...createEmptyAudiencePort(),
      listCompanies: () => companies,
      listRelatedPersons: () => persons,
    });

    const debtors = resolver.resolve({
      name: 'بدهکاران',
      targetLevel: AUDIENCE_TARGET_LEVEL.COMPANY,
      baseSelection: AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS,
      rules: [{ conditionId: 'isDebtor', operator: CONDITION_OPERATOR.EQUALS, value: true }],
    });
    expect(debtors.count).toBe(2);
    expect(debtors.members[0].kind).toBe(MODULE_REF_KIND.KANOON_CONTACT_PERSON);
    expect(debtors.definition.targetLevel).toBe(AUDIENCE_TARGET_LEVEL.PERSON);

    const women = resolver.resolve({
      name: 'روز زن',
      targetLevel: AUDIENCE_TARGET_LEVEL.PERSON,
      baseSelection: AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS,
      rules: [{ conditionId: 'personGender', operator: CONDITION_OPERATOR.EQUALS, value: 'female' }],
    });
    expect(women.count).toBe(1);
    expect(women.members[0].kind).toBe(MODULE_REF_KIND.KANOON_CONTACT_PERSON);
    expect(women.members[0].contactPersonId).toBe('p1');

    const purchaseManagers = resolver.resolve({
      name: 'ورق',
      targetLevel: AUDIENCE_TARGET_LEVEL.PERSON,
      baseSelection: AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS,
      rules: [
        { conditionId: 'industry', operator: CONDITION_OPERATOR.EQUALS, value: 'صنایع فولادی' },
        { conditionId: 'personPosition', operator: CONDITION_OPERATOR.EQUALS, value: 'مدیر خرید' },
      ],
    });
    expect(purchaseManagers.count).toBe(1);

    expect(companyMatchesDefinition(persons[0], {
      rules: [{ conditionId: 'personGender', operator: CONDITION_OPERATOR.EQUALS, value: 'female' }],
    })).toBe(true);
  });

  it('seeds and preview use KANOON_PERSON source', () => {
    const rows = listSegments();
    expect(rows.every((row) => row.sourceType === AUDIENCE_SOURCE_TYPE.KANOON_PERSON)).toBe(true);
    expect(rows.every((row) => row.targetLevel === AUDIENCE_TARGET_LEVEL.PERSON)).toBe(true);

    const preview = previewSegment('seg-all-companies');
    expect(preview.ok).toBe(true);
    expect(typeof preview.count).toBe('number');

    const saved = saveSegment({
      name: 'مدیران خرید فولاد',
      source: AUDIENCE_SOURCE_TYPE.KANOON_PERSON,
      targetLevel: AUDIENCE_TARGET_LEVEL.PERSON,
      baseSelection: AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS,
      rules: [
        {
          conditionId: 'industry',
          operator: CONDITION_OPERATOR.EQUALS,
          value: 'صنایع فولادی',
        },
        {
          conditionId: 'personPosition',
          operator: CONDITION_OPERATOR.EQUALS,
          value: 'مدیر خرید',
        },
      ],
    });
    expect(saved).toBeTruthy();
    expect(saved.targetLevel).toBe(AUDIENCE_TARGET_LEVEL.PERSON);
    expect(saved.source).toBe(AUDIENCE_SOURCE_TYPE.KANOON_PERSON);
    expect(previewSegment(saved).ok).toBe(true);
  });
});

describe('AND/OR groups + orderCountInRange', () => {
  it('evaluates grouped rules and order count in date window on person projections', () => {
    const persons = [{
      companyId: '1',
      contactId: 'p1',
      contactPersonId: 'p1',
      personId: 'p1',
      activityDomain: 'فولاد',
      province: 'تهران',
      orderCount: 3,
      orderRegisteredDates: ['2026-01-10', '2026-02-01', '2026-03-15'],
      totalPurchaseAmount: 6e9,
      purchasedProducts: [],
      purchasedBrands: [],
      activityCount: 0,
      isDebtor: false,
      isCreditor: false,
      accountBalance: 0,
      debtAmount: 0,
      hasOverdue: false,
      openOrderCount: 0,
      orderStatuses: [],
      suppliers: [],
      maxOrderAmount: 0,
      maxOrderWeight: 0,
      totalPurchaseWeight: 0,
      personGender: 'male',
      personPosition: 'مدیر خرید',
    }];
    const resolver = createAudienceResolver({
      ...createEmptyAudiencePort(),
      listCompanies: () => [],
      listRelatedPersons: () => persons,
    });

    const grouped = resolver.resolve({
      name: 'گروهی',
      targetLevel: AUDIENCE_TARGET_LEVEL.PERSON,
      baseSelection: AUDIENCE_BASE_SELECTION.MATCHING_CONDITIONS,
      rules: [{
        conditionId: 'province',
        operator: CONDITION_OPERATOR.EQUALS,
        value: 'تهران',
      }],
      groups: [{
        combinator: RULE_COMBINATOR.OR,
        rules: [
          { conditionId: 'industry', operator: CONDITION_OPERATOR.EQUALS, value: 'فولاد' },
          { conditionId: 'industry', operator: CONDITION_OPERATOR.EQUALS, value: 'ساختمان' },
        ],
      }],
      groupCombinator: RULE_COMBINATOR.AND,
    });
    expect(grouped.count).toBe(1);
    expect(grouped.members[0].kind).toBe(MODULE_REF_KIND.KANOON_CONTACT_PERSON);

    expect(companyMatchesDefinition(persons[0], {
      rules: [{
        conditionId: 'orderCountInRange',
        operator: CONDITION_OPERATOR.GREATER_THAN,
        value: 1,
        rangeFrom: '2026-01-01',
        rangeTo: '2026-02-28',
      }],
    })).toBe(true);

    expect(getConditionDefinition('orderCountInRange')).toBeTruthy();
    expect(getConditionDefinition('relatedExpert')).toBeNull();
  });
});
