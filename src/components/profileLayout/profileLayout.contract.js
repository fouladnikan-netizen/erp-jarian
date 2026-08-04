/**
 * Profile layout contract — structural slots for entity profile pages.
 * Visual styling stays in the consuming module CSS (kprofile-*, order-profile-*, …).
 * Do not add appearance rules here.
 *
 * Required section order for NEW profile pages:
 * 1. Header
 * 2. Summary Cards
 * 3. Primary Actions
 * 4. Tabs
 * 5. Timeline (when the entity has events)
 * 6. Related Information
 *
 * @see Docs/architecture/PROFILE_LAYOUT_GUIDELINES.md
 */
export const PROFILE_SECTION = {
  HEADER: 'header',
  SUMMARY: 'summary',
  PRIMARY_ACTIONS: 'primaryActions',
  TABS: 'tabs',
  TIMELINE: 'timeline',
  RELATED: 'related',
};

export const PROFILE_SECTION_ORDER = [
  PROFILE_SECTION.HEADER,
  PROFILE_SECTION.SUMMARY,
  PROFILE_SECTION.PRIMARY_ACTIONS,
  PROFILE_SECTION.TABS,
  PROFILE_SECTION.TIMELINE,
  PROFILE_SECTION.RELATED,
];
