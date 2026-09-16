/**
 * @deprecated Import from `./interactionFacade` instead.
 * Compatibility shim for the DDL-09 facade rollout.
 */
export {
  listCompanyInteractions,
  createCompanyInteraction,
  addCompanyInteraction,
  updateCompanyInteraction,
  removeCompanyInteraction,
  interactionFacade as pooyeshInteractionFacade,
  interactionFacade as default,
} from './interactionFacade';
