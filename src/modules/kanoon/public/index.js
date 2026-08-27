/**
 * Kanoon public barrel — cross-module Company/Contact access.
 */
export {
  CONTACT_RECORD_TYPES,
  LIFECYCLE_STAGES,
  RELATIONSHIP_LIFECYCLE_STAGES,
  listCompanies,
  getCompany,
  findCompany,
  listContactPersons,
  listRelatedPersons,
  useCompanies,
  useCompany,
  useUpdateContactStage,
  useFetchCompanies,
  createCompany,
  createCompanyFromIdentity,
  updateCompany,
  updateCompanyStage,
  fetchCompanies,
  addContactPerson,
  listCompanyDocumentInteractions,
  addCompanyDocumentInteraction,
  updateCompanyDocumentInteraction,
  removeCompanyDocumentInteraction,
  companyFacade,
} from './companyFacade.js';
