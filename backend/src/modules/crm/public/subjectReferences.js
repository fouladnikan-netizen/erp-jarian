/**
 * Cross-module CRM port: company / raw-lead lookup.
 * Tasks (subject integrity) and sales (order party) must not query CRM tables.
 */
import * as companyRepo from '../infrastructure/companyRepository.js';
import * as leadRepo from '../infrastructure/leadRepository.js';

export function findCompanyById(id, options = {}, client = null) {
  return companyRepo.findById(id, options, client);
}

export function companyExistsActive(id, client = null) {
  return companyRepo.existsActive(id, client);
}

export function findLeadById(id, options = {}, client = null) {
  return leadRepo.findById(id, options, client);
}
