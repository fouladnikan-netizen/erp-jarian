import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCompanyPersonEnvelope,
  dedupeLinkaPersonsByNationalCode,
  pickPrimaryRoleTitle,
  buildGovernanceFromLinkaPersons,
  buildContactPersonUpserts,
} from '../domain/companyIdentity/linkaPersonMapper.js';
import {
  parseGazetteEnvelope,
  parseJalaliSortKey,
  buildGazetteSnapshot,
} from '../domain/companyIdentity/linkaGazetteMapper.js';
import { buildLegalPayloadFromIdentity } from '../domain/companyIdentity/linkaLegalFields.js';

describe('linkaPersonMapper', () => {
  it('parses CompanyPerson envelope', () => {
    const parsed = parseCompanyPersonEnvelope({
      success: true,
      errors: [],
      data: {
        totalCount: 2,
        rows: [
          { fullName: 'علی', nationalCode: '001', postDescription: 'مدیرعامل', postCategoryTitle: 'مدیر عامل' },
          { fullName: 'علی', nationalCode: '001', postDescription: 'نایب رئیس هیئت مدیره', postCategoryTitle: 'اعضای هیئت مدیره' },
        ],
      },
    });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.totalCount, 2);
    assert.equal(parsed.rows.length, 2);
  });

  it('dedupes same person with multiple roles', () => {
    const persons = dedupeLinkaPersonsByNationalCode([
      {
        fullName: 'علی رضایی',
        nationalCode: '1234567890',
        postDescription: 'مدیرعامل',
        postCategoryTitle: 'مدیر عامل',
        personAttendanceStatusDescription: 'فعال',
      },
      {
        fullName: 'علی رضایی',
        nationalCode: '1234567890',
        postDescription: 'نایب رئیس هیئت مدیره',
        postCategoryTitle: 'اعضای هیئت مدیره',
        personAttendanceStatusDescription: 'فعال',
      },
      {
        fullName: 'علی رضایی',
        nationalCode: '1234567890',
        postDescription: 'عضو هیئت مدیره',
        postCategoryTitle: 'اعضای هیئت مدیره',
        personAttendanceStatusDescription: 'فعال',
      },
    ]);
    assert.equal(persons.length, 1);
    assert.equal(persons[0].roles.length, 3);
    assert.equal(pickPrimaryRoleTitle(persons[0].roles), 'مدیرعامل');

    const upserts = buildContactPersonUpserts(persons, 'co_1');
    assert.equal(upserts.length, 1);
    assert.equal(upserts[0].payload.linkaRoleTitles.length, 3);

    const gov = buildGovernanceFromLinkaPersons(persons);
    assert.equal(gov.ceo.name, 'علی رضایی');
    assert.ok(gov.boardMembers.length >= 1);
  });
});

describe('linkaGazetteMapper', () => {
  it('resolves latest by date not rows[0]', () => {
    const parsed = parseGazetteEnvelope({
      success: true,
      data: {
        totalCount: 2,
        rows: [
          {
            gazetteDate: '06/08/2003 00:00:00',
            gazetteNumber: '1',
            gazetteTitle: 'قدیمی',
            gazetteBody: 'a',
          },
          {
            gazetteDate: '07/15/2026 00:00:00',
            gazetteNumber: '99',
            gazetteTitle: 'جدید',
            gazetteBody: 'b',
          },
        ],
      },
    });
    assert.equal(parsed.ok, true);
    const snap = buildGazetteSnapshot(parsed.rows, { totalCount: 2 });
    assert.equal(snap.latest.gazetteTitle, 'جدید');
    assert.equal(snap.latest.gazetteNumber, '99');
    assert.match(snap.latest.gazetteDate, /^14\d{2}\/\d{2}\/\d{2}$/);
    assert.equal(snap.history.length, 2);
    assert.ok(String(snap.latestSummary).includes(snap.latest.gazetteDate));
  });

  it('parses jalali sort keys', () => {
    assert.ok(parseJalaliSortKey('1404/06/15') > 0);
    assert.ok(parseJalaliSortKey('07/15/2026 00:00:00') > parseJalaliSortKey('06/08/2003 00:00:00'));
    assert.equal(parseJalaliSortKey(''), null);
  });
});

describe('buildLegalPayloadFromIdentity', () => {
  it('maps base info into officialSpecs including type/status/city', () => {
    const legal = buildLegalPayloadFromIdentity({
      name: 'شرکت نمونه',
      registrationNumber: '123',
      registrationDate: '1390/01/01',
      companyType: 'سهامی خاص',
      legalStatus: 'فعال',
      registeredCapital: 1000,
      city: 'تهران',
      address: 'آدرس',
      postalCode: '1234567890',
      signatureAuthority: 'مدیران مجتمعاً',
      economicCode: '411',
      activityDomain: 'long linka text',
    });
    assert.equal(legal.officialSpecs.companyType, 'سهامی خاص');
    assert.equal(legal.officialSpecs.companyStatus, 'فعال');
    assert.equal(legal.officialSpecs.city, 'تهران');
    assert.equal(legal.governance.signatureRight, 'مدیران مجتمعاً');
    assert.equal(legal.linkaIdentity.activityDescription, 'long linka text');
    assert.equal(legal.officialSpecs.establishmentDate, '1390/01/01');
    assert.equal(legal.officialSpecs.latestCapital, '1,000');
  });

  it('converts Linka US Gregorian dates and formats capital', () => {
    const legal = buildLegalPayloadFromIdentity({
      name: 'شرکت',
      registrationDate: '06/08/2003 00:00:00',
      registeredCapital: 120000000000,
    });
    assert.match(legal.officialSpecs.establishmentDate, /^1382\/\d{2}\/\d{2}$/);
    assert.equal(legal.officialSpecs.latestCapital, '120,000,000,000');
  });
});
