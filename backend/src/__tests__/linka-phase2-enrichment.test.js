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

function makeRepo({ existingPerson = null } = {}) {
  const inserted = [];
  const updated = [];
  const payloadWrites = [];
  let personLookupCount = 0;

  const companyRepo = {
    async findById() {
      return makeCompany();
    },
    async findByNationalId() {
      return makeCompany();
    },
    async findPersonsByCompanyId() {
      return [];
    },
    async update(_id, data) {
      payloadWrites.push(data.payload);
    },
    async findPersonByProviderNationalCode() {
      personLookupCount += 1;
      if (existingPerson && personLookupCount > 1) return existingPerson;
      return null;
    },
    async insertPerson(row) {
      inserted.push(row);
    },
    async updatePerson(id, data) {
      updated.push({ id, data });
    },
  };

  return { companyRepo, inserted, updated, payloadWrites };
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
  it('merges base + persons + gazette and upserts persons idempotently', async () => {
    const { companyRepo, inserted, updated, payloadWrites } = makeRepo();

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
        newId: () => 'cp_new',
      },
    );

    assert.equal(result1.complete, true);
    assert.equal(result1.sections.base, 'ok');
    assert.equal(result1.sections.persons, 'ok');
    assert.equal(result1.sections.gazette, 'ok');
    assert.equal(inserted.length, 1);
    assert.equal(inserted[0].payload.linkaRoleTitles.length, 2);
    assert.equal(payloadWrites[0].notes, 'manual note keep me');
    assert.equal(payloadWrites[0].crmActivityDomain, 'صنایع فولادی');
    assert.equal(payloadWrites[0].governance.ceo.name, 'علی احمدی');
    assert.equal(payloadWrites[0].linkaGazette.latest.gazetteNumber, '55');

    const repo2 = makeRepo({
      existingPerson: {
        id: 'cp_existing',
        fullName: 'علی',
        roleTitle: 'مدیرعامل',
        payload: { providerNationalCode: '0012345678' },
      },
    });
    // Force first lookup to hit existing (simulates second enrichment)
    let n = 0;
    repo2.companyRepo.findPersonByProviderNationalCode = async () => {
      n += 1;
      return {
        id: 'cp_existing',
        fullName: 'علی',
        roleTitle: 'مدیرعامل',
        payload: { providerNationalCode: '0012345678' },
      };
    };

    const result2 = await enrichCompanyFromLinka(
      { companyId: 'co_test' },
      'u_admin',
      {
        identityResolver,
        fetchPersons,
        fetchGazette,
        companyRepo: repo2.companyRepo,
        runTransaction: async (fn) => fn({}),
        writeAuditFn: async () => {},
        newId: () => 'cp_should_not',
      },
    );
    assert.equal(result2.complete, true);
    assert.equal(repo2.updated.length, 1);
    assert.equal(repo2.inserted.length, 0);
    assert.equal(n, 1);
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
        newId: () => 'cp_x',
      },
    );

    assert.equal(result.complete, false);
    assert.equal(result.sections.base, 'ok');
    assert.equal(result.sections.persons, 'failed');
    assert.equal(result.sections.gazette, 'failed');
  });
});
