/**
 * Identity matching & duplicate governance service (DDL-25).
 */
import { appError } from '../lib/errors.js';
import { MATCH_CLASS, classifyMatch, aggregateMatchResults } from '../domain/identity/matchClassification.js';
import {
  normalizeNationalId,
  normalizeCompanyName,
  normalizePersonName,
  normalizeMobile,
} from '../domain/identity/normalize.js';
import * as companyRepo from '../repositories/companyRepository.js';
import * as contactRepo from '../repositories/contactRepository.js';
import * as leadRepo from '../repositories/leadRepository.js';
import * as identityDecisionRepo from '../repositories/identityDecisionRepository.js';

/**
 * @param {object} input
 * @param {{ actorUserId?: string, entityType: 'company'|'contact'|'lead', action?: string, audit?: boolean }} opts
 */
export async function checkCompanyDuplicates(input, opts = {}) {
  const { actorUserId, audit = false } = opts;
  const reasons = [];
  const candidates = [];

  const nid = input.nationalId != null ? normalizeNationalId(input.nationalId) : null;
  if (nid?.ok) {
    const exact = await companyRepo.findByNationalId(nid.nationalId);
    if (exact) {
      const result = classifyMatch({ nationalId: nid.nationalId }, exact, 'company');
      candidates.push({ candidate: exact, result });
    }
  }

  const nameKey = normalizeCompanyName(input.name || input.companyName || '');
  if (nameKey && candidates.length === 0) {
    const nameMatches = await companyRepo.findPotentialMatchesForLead(nameKey, { limit: 10 });
    for (const row of nameMatches) {
      const result = classifyMatch(input, row, 'company');
      if (result.classification !== MATCH_CLASS.NONE) {
        candidates.push({ candidate: row, result });
      }
    }
  }

  const aggregated = aggregateMatchResults(candidates);

  if (audit && actorUserId) {
    await identityDecisionRepo.recordDecision({
      actorUserId,
      entityType: 'company',
      action: opts.action || 'duplicate_check',
      inputSignals: input,
      matchClassification: aggregated.classification,
      matchReasons: aggregated.reasons,
      candidateIds: aggregated.candidates.map((c) => c.id),
      decision: aggregated.classification === MATCH_CLASS.EXACT ? 'block' : 'review',
    });
  }

  return {
    classification: aggregated.classification,
    reasons: aggregated.reasons,
    score: aggregated.score,
    candidates: aggregated.candidates,
    policy: policyForClassification('company', aggregated.classification),
  };
}

export async function checkLeadDuplicates(input, opts = {}) {
  const { actorUserId, audit = false } = opts;
  const candidates = [];

  const nameKey = normalizeCompanyName(input.companyName || input.name || '');
  if (nameKey) {
    const companies = await companyRepo.findPotentialMatchesForLead(nameKey, { limit: 10 });
    for (const row of companies) {
      const result = classifyMatch(input, row, 'company');
      if (result.classification !== MATCH_CLASS.NONE) {
        candidates.push({ candidate: row, result });
      }
    }
  }

  const mobile = input.mobile != null ? normalizeMobile(input.mobile) : null;
  if (mobile?.ok) {
    const contact = await contactRepo.findByMobileNormalized(mobile.normalized);
    if (contact) {
      const result = classifyMatch({ mobile: mobile.normalized }, contact, 'contact');
      candidates.push({ candidate: contact, result });
    }
  }

  const aggregated = aggregateMatchResults(candidates);

  if (audit && actorUserId) {
    await identityDecisionRepo.recordDecision({
      actorUserId,
      entityType: 'lead',
      action: opts.action || 'duplicate_check',
      inputSignals: input,
      matchClassification: aggregated.classification,
      matchReasons: aggregated.reasons,
      candidateIds: aggregated.candidates.map((c) => c.id),
      decision: 'warn',
    });
  }

  return {
    classification: aggregated.classification,
    reasons: aggregated.reasons,
    score: aggregated.score,
    candidates: aggregated.candidates,
    policy: policyForClassification('lead', aggregated.classification),
  };
}

export async function checkContactDuplicates(input, opts = {}) {
  const { actorUserId, audit = false } = opts;
  const candidates = [];

  const mobile = input.mobile != null ? normalizeMobile(input.mobile) : null;
  if (mobile?.ok) {
    const exact = await contactRepo.findByMobileNormalized(mobile.normalized);
    if (exact) {
      const result = classifyMatch({ mobile: mobile.normalized }, exact, 'contact');
      candidates.push({ candidate: exact, result });
    }
  }

  const nameKey = normalizePersonName(input.fullName || input.name || '');
  if (nameKey && candidates.length === 0) {
    const nameMatches = await contactRepo.searchByName(nameKey, { limit: 10 });
    for (const row of nameMatches) {
      const result = classifyMatch(input, row, 'contact');
      if (result.classification !== MATCH_CLASS.NONE) {
        candidates.push({ candidate: row, result });
      }
    }
  }

  const aggregated = aggregateMatchResults(candidates);

  if (audit && actorUserId) {
    await identityDecisionRepo.recordDecision({
      actorUserId,
      entityType: 'contact',
      action: opts.action || 'duplicate_check',
      inputSignals: input,
      matchClassification: aggregated.classification,
      matchReasons: aggregated.reasons,
      candidateIds: aggregated.candidates.map((c) => c.id),
      decision: aggregated.classification === MATCH_CLASS.EXACT ? 'propose_link' : 'review',
    });
  }

  return {
    classification: aggregated.classification,
    reasons: aggregated.reasons,
    score: aggregated.score,
    candidates: aggregated.candidates,
    policy: policyForClassification('contact', aggregated.classification),
  };
}

function policyForClassification(entityType, classification) {
  if (entityType === 'company') {
    if (classification === MATCH_CLASS.EXACT || classification === MATCH_CLASS.CONFLICT) return 'block';
    if (classification === MATCH_CLASS.PROBABLE || classification === MATCH_CLASS.POSSIBLE) return 'warn';
    return 'allow';
  }
  if (entityType === 'lead') {
    if (classification === MATCH_CLASS.EXACT || classification === MATCH_CLASS.PROBABLE) return 'warn';
    return 'allow';
  }
  if (entityType === 'contact') {
    if (classification === MATCH_CLASS.EXACT) return 'propose_link';
    if (classification === MATCH_CLASS.PROBABLE) return 'warn';
    return 'allow';
  }
  return 'allow';
}

/** Enforce create policy — throws on block. */
export function assertCreatePolicy(entityType, checkResult, { confirmDuplicate = false } = {}) {
  const { policy, classification, candidates } = checkResult;
  if (policy === 'block') {
    throw appError(
      'IDENTITY_DUPLICATE_EXACT',
      'رکورد تکراری با شناسه یکسان یافت شد — ایجاد مجاز نیست.',
      409,
      { classification, candidates },
    );
  }
  if ((policy === 'warn' || policy === 'propose_link') && !confirmDuplicate) {
    throw appError(
      'IDENTITY_DUPLICATE_CANDIDATES',
      'موارد مشابه یافت شد — لطفاً بررسی کنید یا با confirmDuplicate=true ادامه دهید.',
      409,
      { classification, candidates, policy },
    );
  }
}

export default {
  checkCompanyDuplicates,
  checkLeadDuplicates,
  checkContactDuplicates,
  assertCreatePolicy,
  MATCH_CLASS,
};
