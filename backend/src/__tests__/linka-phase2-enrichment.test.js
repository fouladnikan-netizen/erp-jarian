import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { enrichCompanyFromLinka } from '../services/companyEnrichmentService.js';

function makeCompany(overrides = {}) {
  return {
    id: 'co_test',
    name: 'یورو اسلات پارس',
    nationalId: '10102457605',
    province: null,
    activityDomain: 'صنایع فولادی',
    payload: {
      recordType: 'CUSTOMER',
      personType: 'legal',
      crmActivityDomain: 'صنایع فولادی',
      notes: 'manual note keep me',
      officialSpecs: {},
      governance: {},
    },
    ...overrides,
  };
}

function makeRepo() {
  const payloadWrites = [];
  const companyRepo = {
    async findById() {
      return makeCompany();
    },
    async findByNationalId() {
      return makeCompany();
    },
    async update(_id, data) {
      payloadWrites.push(data.payload);
    },
  };
  return { companyRepo, payloadWrites };
}

const identityResolver = async () => ({
  ok: true,
  identity: {
    nationalId: '10102457605',
    name: 'یورو اسلات پارس',
    registrationNumber: '123',
    registrationDate: '1380/01/01',
    companyType: 'سهامی خاص',
    legalStatus: 'فعال',
    registeredCapital: 5000,
    province: 'تهران',
    city: 'تهران',
    address: 'آدرس رسمی',
    postalCode: '1111111111',
    signatureAuthority: 'حق امضا نمونه',
    economicCode: '4111',
    activityDomain: 'long text',
    rawProviderReference: 'LINKA',
  },
});

const fetchPersons = async () => ({
  ok: true,
  data: {
    success: true,
    data: {
      totalCount: 2,
      rows: [
        {
          fullName: 'علی احمدی',
          nationalCode: '0012345678',
          postDescription: 'مدیرعامل',
          postCategoryTitle: 'مدیر عامل',
          personAttendanceStatusDescription: 'فعال',
        },
        {
          fullName: 'علی احمدی',
          nationalCode: '0012345678',
          postDescription: 'عضو هیئت مدیره',
          postCategoryTitle: 'اعضای هیئت مدیره',
          personAttendanceStatusDescription: 'فعال',
        },
      ],
    },
  },
});

const fetchGazette = async () => ({
  ok: true,
  data: {
    success: true,
    data: {
      totalCount: 1,
      rows: [{
        gazetteDate: '1404/01/10',
        gazetteNumber: '55',
        gazetteTitle: 'تغییرات هیئت مدیره',
        gazetteBody: 'متن آگهی',
        newsPaperDate: '1404/01/11',
        newsPaperNumber: '1',
        newsPaperPageNumber: '2',
      }],
    },
  },
});

describe('enrichCompanyFromLinka', () => {
  it('merges base + persons + gazette and upserts canonical Linka contacts', async () => {
    const { companyRepo, payloadWrites } = makeRepo();
    const upsertCalls = [];

    const result1 = await enrichCompanyFromLinka(
      { companyId: 'co_test' },
      'u_admin',
      {
        identityResolver,
        fetchPersons,
        fetchGazette,
        companyRepo,
        runTransaction: async (fn) => fn({}),
        writeAuditFn: async () => {},
        upsertLinkaPersons: async (companyId, persons, actorUserId, client) => {
          upsertCalls.push({ companyId, count: persons.length, actorUserId, client });
          return persons.length;
        },
      },
    );

    assert.equal(result1.complete, true);
    assert.equal(result1.sections.base, 'ok');
    assert.equal(result1.sections.persons, 'ok');
    assert.equal(result1.sections.gazette, 'ok');
    assert.equal(upsertCalls.length, 1);
    assert.equal(upsertCalls[0].count, 1);
    assert.equal(payloadWrites[0].notes, 'manual note keep me');
    assert.equal(payloadWrites[0].crmActivityDomain, 'صنایع فولادی');
    assert.equal(payloadWrites[0].governance.ceo.name, 'علی احمدی');
    assert.equal(payloadWrites[0].linkaGazette.latest.gazetteNumber, '55');
    assert.equal(payloadWrites[0].interactions, undefined);
  });

  it('reports partial failure without claiming complete', async () => {
    const { companyRepo } = makeRepo();
    const result = await enrichCompanyFromLinka(
      { companyId: 'co_test' },
      'u_admin',
      {
        identityResolver: async () => ({
          ok: true,
          identity: {
            nationalId: '10102457605',
            name: 'Test',
            signatureAuthority: 'x',
          },
        }),
        fetchPersons: async () => ({ ok: false, errorCode: 'COMPANY_IDENTITY_PROVIDER_TIMEOUT' }),
        fetchGazette: async () => ({ ok: false, errorCode: 'COMPANY_IDENTITY_PROVIDER_UNAVAILABLE' }),
        companyRepo,
        runTransaction: async (fn) => fn({}),
        writeAuditFn: async () => {},
        upsertLinkaPersons: async () => 0,
      },
    );

    assert.equal(result.complete, false);
    assert.equal(result.sections.base, 'ok');
    assert.equal(result.sections.persons, 'failed');
    assert.equal(result.sections.gazette, 'failed');
  });
});
