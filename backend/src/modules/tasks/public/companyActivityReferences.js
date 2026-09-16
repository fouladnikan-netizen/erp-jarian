/**
 * CRM-facing port: completed/open activities on a Company subject.
 * CRM must not query `activities` SQL directly (rule 3).
 */
import * as activityRepo from '../infrastructure/activityRepository.js';

export function listActivitiesForCompanySubject(companyId, { limit = 200 } = {}, client = null) {
  return activityRepo.list({
    subjectType: 'COMPANY',
    subjectId: String(companyId),
    limit,
  }, client);
}
