import { DEFINITIONS_PATHS } from '../config/definitionsMenu';

export const DEFINITIONS_IDENTITY_PATH = DEFINITIONS_PATHS.identity;
export const DEFINITIONS_USERS_ACCESS_PATH = DEFINITIONS_PATHS.legacyUsersAccess;
export const DEFINITIONS_USERS_PATH = DEFINITIONS_PATHS.users;
export const DEFINITIONS_ORGANIZATION_PATH = DEFINITIONS_PATHS.organization;
export const DEFINITIONS_ROLES_PATH = DEFINITIONS_PATHS.rolesPermissions;
export const DEFINITIONS_PERSONAS_PATH = DEFINITIONS_PATHS.personas;

/**
 * @deprecated Horizontal Definitions tabs were replaced by the Settings-style sidebar.
 */
export default function DefinitionsSectionTabs() {
  return null;
}
