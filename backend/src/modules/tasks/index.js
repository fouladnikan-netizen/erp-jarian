/**
 * tasks — پویش (Activity + Task). Distinct aggregates (DDL-15 / DDL-16).
 * Application / infrastructure / presentation live here (Phase 2.1).
 * Public HTTP paths unchanged: /api/v1/tasks, activities, activity-types.
 */
export { MODULE_ID, PRODUCT_OWNER, HTTP_BASE } from './ownership.js';
export { listActivitiesForCompanySubject } from './public/companyActivityReferences.js';
export { default as taskRoutes } from './presentation/tasks.js';
export { default as activityRoutes } from './presentation/activities.js';
export { default as activityTypeRoutes } from './presentation/activityTypes.js';
