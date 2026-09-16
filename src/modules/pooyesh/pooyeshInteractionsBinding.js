/**
 * @deprecated Use `interactionFacade` — kept as a thin re-export so
 * older imports keep resolving during the DDL-09 facade rollout.
 */
export {
  listCompanyInteractions,
  createCompanyInteraction,
  addCompanyInteraction,
  updateCompanyInteraction,
  removeCompanyInteraction,
  interactionFacade as default,
} from './interactionFacade';
