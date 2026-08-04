# Shared UI Inventory

> **Status:** Inventory of reusable UI — **do not create new primitives** in this phase.  
> **Related:** [FRONTEND_ARCHITECTURE_GUIDELINES.md](./FRONTEND_ARCHITECTURE_GUIDELINES.md), [PROFILE_LAYOUT_GUIDELINES.md](./PROFILE_LAYOUT_GUIDELINES.md), `jarian-unified-presentation.mdc`

---

## Existing (by category)

### Shell / layout

| Primitive | Location | Notes |
|-----------|----------|-------|
| AppLayout / Header / Sidebar | `components/layout/` | ERP chrome |
| ModulePage / KpiCard / ActionsBar / StatusTag | `components/module/` | Placeholder + light module chrome |
| SmartBackButton | `components/navigation/` | Return navigation |
| OmniCommand | `components/omni/` | Command palette |

### Tables

| Primitive | Location | Notes |
|-----------|----------|-------|
| jarian-table protocol | `styles/jarian-ui.css` + `JarianUI.config.js` | Money/product/supplier cells |
| JarianMoney / ProductCell / Supplier | `components/jarian/JarianPresentation.jsx` | Presentation API |
| DataTable | `components/module/DataTable.jsx` | Generic table wrapper |
| ResizableColGroup / ResizableTh | `components/table/` | Column resize |
| ColumnFilterHeader / useColumnExcelFilters | `components/table/`, `hooks/` | Excel-style filters |
| ListStatusPill | `components/module/ListStatusPill.jsx` | Unified list status |
| MultiSortHeader / useMultiSort | `components/common/list/`, `hooks/list/` | Multi-column sort — Law #004 |
| ListPagination / usePagination | `components/common/list/`, `hooks/list/` | Shared pagination — Law #004 |
| ListColumnHeader | `components/common/list/` | Sort + filter composition |
| ColumnManager / useColumnManager | `components/common/list/`, `hooks/list/` | Show/hide + DnD reorder |
| useListPreferences / listPreferencesService | `hooks/list/`, `services/` | Per-user per-list prefs |
| ListExport / listExportService | `components/common/list/`, `services/` | CSV + Excel export |
| useVirtualList / useInfiniteLoading / useListDataProvider | `hooks/list/` | Virtual + infinite modes |
| ListChrome / useListShell | `components/common/list/`, `hooks/list/` | Full list orchestration |

See [UNIFIED_LIST_INFRASTRUCTURE.md](./UNIFIED_LIST_INFRASTRUCTURE.md) (Architecture Law #004).

### Profiles / timeline

| Primitive | Location | Notes |
|-----------|----------|-------|
| ProfilePageShell / Tabs / Header / … | `components/profileLayout/` | **Company profile adopted**; Order not yet |
| EntityTimeline | `profileLayout/` | Structural |
| ActivityDrawer / Timeline / Item | `components/activity/` | Activity UI kit |

### Domain-adjacent shared UI

| Primitive | Location | Notes |
|-----------|----------|-------|
| ContactPerson Modal/Card/Section | `components/contactPerson/` | SSOT UI |
| Customer completion banner/dialog/gate | `components/customerCompletion/` | Policy UI |

### Notifications

| Primitive | Location | Notes |
|-----------|----------|-------|
| NotificationContainer / GlobalGlassToast | `components/notifications/` | Engine-backed |
| systemToast | `utils/systemToast.js` | **Second** toast path (DOM) |

### Calendar (feature under components)

| Primitive | Location | Notes |
|-----------|----------|-------|
| CalendarPage / UnifiedJarianCalendar / CommitmentEngine | `components/calendar/` | Product feature — not a primitive kit |

### Buttons / cards / modals / drawers / forms

| Category | Shared kit? | Reality today |
|----------|-------------|---------------|
| **Buttons** | No design-system Button package | Ad-hoc module CSS / native buttons |
| **Cards** | Partial (`KpiCard`, completion cards) | No generic Card primitive |
| **Modals** | **Missing** shared Modal | Many `*Modal.jsx` per module |
| **Drawers** | **Missing** shared Drawer | Many `*Drawer.jsx` per module |
| **Forms** | **Missing** Form/Field kit | Local `FormField`, store forms, no RHF/Formik |
| **Dialogs** | Sparse (`*Dialog`) | Confirm patterns duplicated |

---

## Missing shared primitives (gaps)

Priority for a **future** UI kit (not building now):

1. **Modal** (focus trap, ESC, glass token surface)  
2. **Drawer / SlideOver**  
3. **FormField** (label, error, RTL) + optional form composition  
4. **Button** variants (primary/ghost/danger) on tokens  
5. **Card** surface (non-dashboard abuse caution)  
6. **Unified toast API** (collapse systemToast vs NotificationEngine)  
7. Order profile on **profileLayout** slots  

---

## Explicit non-goals

No new components, no consolidating toast systems, no visual redesign in this phase.
