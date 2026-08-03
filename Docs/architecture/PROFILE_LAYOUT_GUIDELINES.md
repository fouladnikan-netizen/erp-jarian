# Profile Layout Guidelines (developers)

**Scope:** Every **new** business profile / entity detail page.  
**Do not** restyle existing modules. **Do not** change routes.

## Required section order

1. **Header** — identity title, status, back  
2. **Summary Cards** — KPIs / identity / financial snapshot  
3. **Primary Actions** — main CTAs  
4. **Tabs** — section switcher  
5. **Timeline** — when the entity has events (optional if N/A)  
6. **Related Information** — related orders, people, files, …

## Use shared primitives

```js
import {
  ProfilePageShell,
  ProfileLayout,
  ProfileHeader,
  ProfileSummary,
  ProfilePrimaryActions,
  ProfileTabs,
  EntityTimeline,
  ProfileRelated,
  PROFILE_SECTION_ORDER,
} from '../../components/profileLayout';
```

- Pass **existing or new module CSS classNames** into these components.
- Primitives add **structure + a11y roles only** — no visual theme.
- Prefer `ProfileTabs` over hand-rolled `role="tablist"` for new pages.

## Example (new page)

```jsx
<ProfilePageShell className="module-page my-entity-page" dataModule="my-module">
  <div className="my-entity-topbar">{/* SmartBackButton */}</div>
  <ProfileHeader className="my-entity-header">{/* title + status */}</ProfileHeader>
  <ProfileSummary className="my-entity-summary">{/* cards */}</ProfileSummary>
  <ProfilePrimaryActions className="my-entity-actions">{/* CTAs */}</ProfilePrimaryActions>
  <ProfileTabs
    className="my-entity-tabs"
    tabs={TABS}
    activeId={tab}
    onChange={setTab}
    tabClassName={(t, active) => `my-entity-tabs__btn${active ? ' is-active' : ''}`}
  />
  {tab === 'timeline' && (
    <EntityTimeline className="my-entity-timeline">{/* items */}</EntityTimeline>
  )}
  <ProfileRelated className="my-entity-related">{/* related */}</ProfileRelated>
</ProfilePageShell>
```

## Existing profiles

| Page | Status |
|------|--------|
| Company `CustomerProfilePage` | Uses `ProfilePageShell` + `ProfileTabs`; side-rail layout kept |
| Order `OrderProfileView` / Chrome | **Not migrated** (medium cost) — follow this guide on next Order chrome touch only if zero visual risk |
| Product / Contact drawers | Out of scope for page contract; drawer chrome separate |

## Anti-patterns

- New profile that invents a fourth layout pattern (e.g. only modals for durable work)
- Hardcoding a new return query key other than `returnTo` / `returnName`
- Copy-pasting tablist markup instead of `ProfileTabs`

## Related

- Contract: `src/components/profileLayout/profileLayout.contract.js`
- Future workspace framing: [03-WORKSPACE_STRATEGY.md](./03-WORKSPACE_STRATEGY.md)
