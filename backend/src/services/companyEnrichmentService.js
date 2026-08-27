/**
 * enrichCompanyFromLinka — reusable use case:
 * CompanyBaseInfo + CompanyPerson + Gazette → PostgreSQL → canonical Company DTO.
 *
 * Policy:
 * - Official Linka fields (A) overwrite provider-owned legal/registry fields.
 * - Jarian operational fields (B) preserved (crmActivityDomain, notes, assignee, lifecycle, interactions).
 * - Gazette stored as payload.linkaGazette snapshot (no parallel LegalHistory entity yet).
 * - Contact persons upserted by providerNationalCode; multi-role → payload.linkaRoles.
 */
import { withTransaction } from '../db/pool.js';
import { appError, notFoundError } from '../lib/errors.js';
import { newEntityId, writeAudit } from '../lib/ids.js';
import * as defaultCompanyRepo from '../repositories/companyRepository.js';
import { resolveCompanyIdentity } from '../ports/companyIdentityResolver.port.js';
import {
  callLinkaCompanyPerson,
  callLinkaGazette,
  loginLinka,
} from '../integrations/linka/linkaClient.js';
import { userMessageForCode } from '../integrations/linka/linkaErrors.js';
import { buildLegalPayloadFromIdentity } from '../domain/companyIdentity/linkaLegalFields.js';
import {
  parseCompanyPersonEnvelope,
  dedupeLinkaPersonsByNationalCode,
  buildGovernanceFromLinkaPersons,
  buildContactPersonUpserts,
} from '../domain/companyIdentity/linkaPersonMapper.js';
import {
  parseGazetteEnvelope,
  buildGazetteSnapshot,
} from '../domain/companyIdentity/linkaGazetteMapper.js';

/**
 * Merge officialSpecs: Linka fills empty or overwrites Linka-owned keys; keep manual phone/website if set.
 * @param {Record<string, unknown>} existing
 * @param {Record<string, unknown>} fromLinka
 */
function mergeOfficialSpecs(existing = {}, fromLinka = {}) {
  const next = { ...existing };
  const linkaOwned = [
    'registrationNumber',
    'establishmentDate',
    'economicCode',
    'postalCode',
    'latestCapital',
    'address',
    'companyType',
    'companyStatus',
    'city',
    'latestGazette',
  ];
  for (const key of linkaOwned) {
    if (fromLinka[key] != null && String(fromLinka[key]).trim() !== '') {
      next[key] = fromLinka[key];
    }
  }
  // phone/website: only fill if empty (manual operational)
  for (const key of ['phone', 'website']) {
    if ((!next[key] || String(next[key]).trim() === '') && fromLinka[key]) {
      next[key] = fromLinka[key];
    }
  }
  return next;
}

/**
 * @param {{ companyId?: string, nationalId?: string, requestId?: string|null }} input
 * @param {string} actorUserId
 * @param {{
 *   identityResolver?: typeof resolveCompanyIdentity,
 *   fetchPersons?: typeof callLinkaCompanyPerson,
 *   fetchGazette?: typeof callLinkaGazette,
 *   companyRepo?: typeof defaultCompanyRepo,
 *   runTransaction?: typeof withTransaction,
 *   writeAuditFn?: typeof writeAudit,
 *   newId?: typeof newEntityId,
 * }} [deps]
 */
export async function enrichCompanyFromLinka(input, actorUserId, deps = {}) {
  const companyRepo = deps.companyRepo || defaultCompanyRepo;
  const runTransaction = deps.runTransaction || withTransaction;
  const writeAuditFn = deps.writeAuditFn || writeAudit;
  const newId = deps.newId || newEntityId;
  const companyId = input.companyId ? String(input.companyId) : null;
  const nationalIdInput = input.nationalId
    ? String(input.nationalId).replace(/\D/g, '')
    : null;

  let company = null;
  if (companyId) {
    company = await companyRepo.findById(companyId);
  } else if (nationalIdInput) {
    company = await companyRepo.findByNationalId(nationalIdInput);
  }

  if (!company) {
    throw notFoundError('شرکت یافت نشد.');
  }

  const nationalId = String(company.nationalId || nationalIdInput || '').replace(/\D/g, '');
  if (!nationalId || nationalId.length !== 11) {
    throw appError(
      'COMPANY_IDENTITY_INVALID_NATIONAL_ID',
      'شناسه ملی شرکت برای استعلام لینکا معتبر نیست.',
      422,
    );
  }

  const requestId = input.requestId || null;
  const resolve = deps.identityResolver || resolveCompanyIdentity;
  const fetchPersons = deps.fetchPersons || callLinkaCompanyPerson;
  const fetchGazette = deps.fetchGazette || callLinkaGazette;

  /** @type {{ base: 'ok'|'failed'|'skipped', persons: 'ok'|'failed'|'skipped', gazette: 'ok'|'failed'|'skipped' }} */
  const sections = { base: 'skipped', persons: 'skipped', gazette: 'skipped' };
  /** @type {Record<string, string|null>} */
  const sectionErrors = { base: null, persons: null, gazette: null };

  // Single login first, then parallel GETs sharing token cache (avoids isForce races).
  await loginLinka({ requestId });

  const [identityResult, personHttp, gazetteHttp] = await Promise.all([
    resolve({ nationalId, requestId }),
    fetchPersons({ nationalId, pageIndex: 1, requestId }),
    fetchGazette({ nationalId, pageIndex: 1, requestId }),
  ]);

  let legalFromBase = null;
  if (identityResult?.ok) {
    sections.base = 'ok';
    const identity = identityResult.identity || {
      nationalId: identityResult.nationalId,
      name: identityResult.suggestedName,
    };
    legalFromBase = buildLegalPayloadFromIdentity(identity);
  } else {
    sections.base = 'failed';
    sectionErrors.base = identityResult?.error
      || userMessageForCode(identityResult?.errorCode)
      || 'استعلام اطلاعات پایه ناموفق بود.';
  }

  let personDedupe = [];
  let governanceFromPersons = null;
  if (personHttp?.ok) {
    const parsed = parseCompanyPersonEnvelope(personHttp.data);
    if (parsed.ok) {
      sections.persons = 'ok';
      personDedupe = dedupeLinkaPersonsByNationalCode(parsed.rows);
      governanceFromPersons = buildGovernanceFromLinkaPersons(personDedupe);
    } else {
      sections.persons = 'failed';
      sectionErrors.persons = 'پاسخ اشخاص مرتبط نامعتبر بود.';
    }
  } else {
    sections.persons = 'failed';
    sectionErrors.persons = userMessageForCode(personHttp?.errorCode)
      || 'دریافت اشخاص مرتبط ناموفق بود.';
  }

  let gazetteSnapshot = null;
  if (gazetteHttp?.ok) {
    const parsed = parseGazetteEnvelope(gazetteHttp.data);
    if (parsed.ok) {
      sections.gazette = 'ok';
      gazetteSnapshot = buildGazetteSnapshot(parsed.rows, {
        totalCount: parsed.totalCount,
        fetchedAt: new Date().toISOString(),
      });
    } else {
      sections.gazette = 'failed';
      sectionErrors.gazette = 'پاسخ روزنامه رسمی نامعتبر بود.';
    }
  } else {
    sections.gazette = 'failed';
    sectionErrors.gazette = userMessageForCode(gazetteHttp?.errorCode)
      || 'دریافت روزنامه رسمی ناموفق بود.';
  }

  const prevPayload = (company.payload && typeof company.payload === 'object')
    ? { ...company.payload }
    : {};

  // Preserve operational (B) fields
  const preserved = {
    crmActivityDomain: prevPayload.crmActivityDomain,
    notes: prevPayload.notes,
    interactions: prevPayload.interactions,
    leadSource: prevPayload.leadSource,
    convertedFromLeadId: prevPayload.convertedFromLeadId,
    recordType: prevPayload.recordType || 'CUSTOMER',
    personType: prevPayload.personType || 'legal',
  };

  const nextOfficial = mergeOfficialSpecs(
    prevPayload.officialSpecs || {},
    {
      ...(legalFromBase?.officialSpecs || {}),
      latestGazette: gazetteSnapshot?.latestSummary
        || (prevPayload.officialSpecs?.latestGazette || ''),
    },
  );

  const prevGov = prevPayload.governance || {};
  const nextGovernance = {
    signatureRight: (legalFromBase?.governance?.signatureRight
      || prevGov.signatureRight
      || ''),
    ceo: governanceFromPersons?.ceo?.name
      ? governanceFromPersons.ceo
      : (prevGov.ceo || { name: '', nationalId: '', validUntil: '' }),
    boardMembers: (governanceFromPersons?.boardMembers?.length
      ? governanceFromPersons.boardMembers
      : (prevGov.boardMembers || [])),
    boardValidUntil: prevGov.boardValidUntil || '',
    inspectors: governanceFromPersons?.inspectors || prevGov.inspectors || [],
  };

  const nextPayload = {
    ...prevPayload,
    ...preserved,
    officialSpecs: nextOfficial,
    governance: nextGovernance,
    linkaIdentity: legalFromBase?.linkaIdentity || prevPayload.linkaIdentity || null,
    linkaGazette: gazetteSnapshot || prevPayload.linkaGazette || null,
    linkaEnrichment: {
      fetchedAt: new Date().toISOString(),
      sections,
      sectionErrors,
    },
  };

  const columnPatch = {};
  if (legalFromBase?.linkaIdentity) {
    const idn = legalFromBase.linkaIdentity;
    // Official name from Linka (A)
    if (identityResult?.identity?.name || identityResult?.suggestedName) {
      columnPatch.name = identityResult.identity?.name || identityResult.suggestedName;
    }
    if (identityResult?.identity?.province) {
      columnPatch.province = identityResult.identity.province;
    }
    // Never overwrite CRM activityDomain column from Linka text
  }

  await runTransaction(async (client) => {
    await companyRepo.update(company.id, {
      ...columnPatch,
      payload: nextPayload,
    }, actorUserId, client);

    if (sections.persons === 'ok') {
      const upserts = buildContactPersonUpserts(personDedupe, company.id);
      for (const row of upserts) {
        const code = row.payload?.providerNationalCode;
        let existing = null;
        if (code) {
          existing = await companyRepo.findPersonByProviderNationalCode(
            company.id,
            code,
            client,
          );
        }
        if (existing) {
          const mergedPayload = {
            ...(existing.payload || {}),
            ...row.payload,
          };
          await companyRepo.updatePerson(existing.id, {
            fullName: row.fullName,
            roleTitle: row.roleTitle,
            payload: mergedPayload,
          }, client);
        } else {
          await companyRepo.insertPerson({
            id: newId('cp'),
            companyId: company.id,
            fullName: row.fullName,
            mobile: row.mobile,
            roleTitle: row.roleTitle,
            payload: row.payload,
          }, client);
        }
      }
    }

    await writeAuditFn({
      actorUserId,
      action: 'company.enrich_from_linka',
      entityType: 'company',
      entityId: company.id,
      detail: {
        nationalId,
        sections,
        personCount: personDedupe.length,
        gazetteCount: gazetteSnapshot?.history?.length ?? 0,
      },
    }, client);
  });

  const companyRow = await companyRepo.findById(company.id);
  const persons = await companyRepo.findPersonsByCompanyId(company.id);
  const enriched = { ...companyRow, persons };

  const allOk = sections.base === 'ok'
    && sections.persons === 'ok'
    && sections.gazette === 'ok';

  return {
    company: enriched,
    sections,
    sectionErrors,
    complete: allOk,
    message: allOk
      ? 'اطلاعات کامل از لینکا دریافت و ذخیره شد.'
      : 'غنی‌سازی جزئی انجام شد — برخی بخش‌ها ناموفق بودند.',
  };
}

export default { enrichCompanyFromLinka };
