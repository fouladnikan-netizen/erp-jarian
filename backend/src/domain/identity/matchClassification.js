/**
 * Identity match classification (DDL-25.3).
 * EXACT | PROBABLE | POSSIBLE | NONE | CONFLICT
 */

import {
  normalizeCompanyName,
  normalizePersonName,
  normalizeMobile,
  normalizeNationalId,
  tokenOverlapSimilarity,
} from './normalize.js';

export const MATCH_CLASS = Object.freeze({
  EXACT: 'EXACT',
  PROBABLE: 'PROBABLE',
  POSSIBLE: 'POSSIBLE',
  NONE: 'NONE',
  CONFLICT: 'CONFLICT',
});

const PROBABLE_THRESHOLD = 0.55;
const POSSIBLE_THRESHOLD = 0.35;

/**
 * @param {object} input signals from caller
 * @param {object|null} candidate existing entity row
 * @param {'company'|'contact'|'lead'} entityKind
 * @returns {{ classification: string, reasons: string[], score?: number }}
 */
export function classifyMatch(input, candidate, entityKind = 'company') {
  const reasons = [];
  if (!candidate) {
    return { classification: MATCH_CLASS.NONE, reasons: ['no_candidate'] };
  }

  const inputNid = input.nationalId != null ? normalizeNationalId(input.nationalId) : null;
  const candidateNid = candidate.nationalId != null
    ? normalizeNationalId(candidate.nationalId)
    : (candidate.national_id != null ? normalizeNationalId(candidate.national_id) : null);

  if (inputNid?.ok && candidateNid?.ok) {
    if (inputNid.nationalId === candidateNid.nationalId) {
      reasons.push('national_id_exact');
      return { classification: MATCH_CLASS.EXACT, reasons, score: 1 };
    }
    reasons.push('national_id_conflict');
    return { classification: MATCH_CLASS.CONFLICT, reasons, score: 0 };
  }

  const inputMobile = input.mobile != null ? normalizeMobile(input.mobile) : null;
  const candidateMobile = candidate.mobileNormalized != null
    ? { ok: true, normalized: candidate.mobileNormalized }
    : (candidate.mobile != null ? normalizeMobile(candidate.mobile) : null);

  if (inputMobile?.ok && candidateMobile?.ok && inputMobile.normalized === candidateMobile.normalized) {
    if (entityKind === 'contact') {
      reasons.push('mobile_exact');
      return { classification: MATCH_CLASS.EXACT, reasons, score: 1 };
    }
    reasons.push('mobile_supporting');
  }

  const nameFn = entityKind === 'contact' ? normalizePersonName : normalizeCompanyName;
  const inputName = nameFn(input.name || input.companyName || input.fullName || '');
  const candidateName = nameFn(candidate.name || candidate.companyName || candidate.fullName || candidate.full_name || '');

  if (inputName && candidateName && inputName === candidateName) {
    reasons.push('name_exact_normalized');
    return { classification: MATCH_CLASS.EXACT, reasons, score: 1 };
  }

  const rawA = input.name || input.companyName || input.fullName || '';
  const rawB = candidate.name || candidate.companyName || candidate.fullName || candidate.full_name || '';
  const score = tokenOverlapSimilarity(rawA, rawB);

  if (score >= PROBABLE_THRESHOLD) {
    reasons.push('name_token_overlap_probable');
    return { classification: MATCH_CLASS.PROBABLE, reasons, score };
  }
  if (score >= POSSIBLE_THRESHOLD) {
    reasons.push('name_token_overlap_possible');
    return { classification: MATCH_CLASS.POSSIBLE, reasons, score };
  }

  return { classification: MATCH_CLASS.NONE, reasons: ['no_strong_signal'], score };
}

/**
 * Pick strongest classification from multiple candidates.
 * @param {Array<{ candidate: object, result: ReturnType<classifyMatch> }>} matches
 */
export function aggregateMatchResults(matches) {
  const order = [MATCH_CLASS.CONFLICT, MATCH_CLASS.EXACT, MATCH_CLASS.PROBABLE, MATCH_CLASS.POSSIBLE, MATCH_CLASS.NONE];
  const ranked = [...matches].sort((a, b) => order.indexOf(a.result.classification) - order.indexOf(b.result.classification));
  const best = ranked[0];
  if (!best) {
    return { classification: MATCH_CLASS.NONE, reasons: ['no_candidates'], candidates: [] };
  }
  return {
    classification: best.result.classification,
    reasons: best.result.reasons,
    score: best.result.score,
    candidates: ranked.slice(0, 10).map((m) => ({
      id: m.candidate.id,
      name: m.candidate.name || m.candidate.companyName || m.candidate.fullName || m.candidate.full_name,
      classification: m.result.classification,
      reasons: m.result.reasons,
      score: m.result.score,
    })),
  };
}

export default { MATCH_CLASS, classifyMatch, aggregateMatchResults };
