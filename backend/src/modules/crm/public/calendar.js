/**
 * Calendar helpers needed by other modules (order codes, document dates).
 * Sales must not import CRM domain internals for Jalali conversion.
 */
export { gregorianToJalali } from '../domain/companyIdentity/linkaDisplayFormat.js';
