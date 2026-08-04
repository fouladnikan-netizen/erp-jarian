# Jarian Architecture Law #004
## Unified List Infrastructure

**وضعیت:** زیرساخت مشترک فهرست کامل شد و در ماژول‌های اصلی فعال است.

**Cursor rule:** [`.cursor/rules/jarian-unified-list.mdc`](../../.cursor/rules/jarian-unified-list.mdc)

---

## قابلیت‌های تکمیل‌شده

### ✓ Resizable Columns

- `src/components/table/ResizableTh.jsx`
- `src/components/table/ResizableColGroup.jsx`
- عرض‌ها از طریق `useListShell` / ترجیحات کاربر نیز ذخیره می‌شوند

### ✓ Excel-style Column Filters

- `src/components/table/ColumnFilterHeader.jsx`
- `src/hooks/useColumnExcelFilters.js`

### ✓ Unified Status Display

- `src/components/module/ListStatusPill.jsx`

### ✓ Multi Column Sorting

- `src/hooks/list/useMultiSort.js`
- `src/components/common/list/MultiSortHeader.jsx`

Asc → Desc → None · Ctrl/Cmd برای مرتب‌سازی چندستونه · نمایش اولویت

### ✓ Shared Pagination

- `src/hooks/list/usePagination.js`
- `src/components/common/list/ListPagination.jsx`

### ✓ Column Management

- `src/hooks/list/useColumnManager.js`
- `src/components/common/list/ColumnManager.jsx`

Show/Hide · Reorder با Drag & Drop · ستون‌های `locked` مخفی نمی‌شوند

### ✓ User Table Preferences

- `src/hooks/list/useListPreferences.js`
- `src/services/listPreferencesService.js`

ذخیره per-user / per-list (`nabz.orders.current.table`, …):

- visible columns · order · widths · sorts · filters · pageSize · viewMode

API: `savePreferences` · `loadPreferences` · `resetPreferences` · `setListPreferencesAdapter` (آینده backend)

### ✓ Export Service

- `src/services/listExportService.js`
- `src/components/common/list/ListExport.jsx`

CSV + Excel (SpreadsheetML) · فقط ستون‌های visible · ترتیب UI · دادهٔ فیلتر/مرتب‌شده

### ✓ Infinite Loading + Virtual Scroll

- `src/hooks/list/useInfiniteLoading.js`
- `src/hooks/list/useVirtualList.js`
- `src/hooks/list/useListDataProvider.js`
- `src/components/common/list/ListVirtualBody.jsx`

| Mode | Status |
|------|--------|
| `client` | ✓ صفحه‌بندی کلاسیک |
| `server` | ✓ صفحه از provider |
| `infinite` | ✓ بارگذاری تدریجی |
| `virtual` | ✓ windowed rows + spacer |

---

## Pipeline

```text
Filter → Sort → Data Provider (client | server | infinite | virtual)
```

---

## Composition

| Layer | Role |
|-------|------|
| `ListColumnHeader` | Multi-sort + Excel filter |
| `ResizableTh` | Resize |
| `ListChrome` | ColumnManager + Export + view mode + reset prefs |
| `useListShell` | Orchestrates preferences, columns, widths, sort, data modes |

Modules only define: **Columns · Rows/Data · Business Actions**.

---

## ماژول‌های متصل‌شده

| Module | List | Preference key |
|--------|------|----------------|
| ✓ نبض | `NabzOrderTable` | `nabz.orders.{tab}.table` |
| ✓ کانون | `KanoonTable` | `kanoon.contacts.{viewKey}.table` |
| ✓ ویترین | `VitrinTable` | `vitrin.products.table` |
| ✓ گاه‌شمار | `OfficialRecordList` | `gahshomar.records.{tab}.table` |

---

## قانون توسعه

1. هیچ فهرست جدیدی خارج از Unified List Infrastructure ساخته نمی‌شود.
2. قابلیت‌های جدید فقط در لایه مشترک (`components/common/list`, `hooks/list`, `services/list*`) توسعه می‌یابند.
3. پیاده‌سازی اختصاصی sort / pagination / filter / resize / status / export / virtual در ماژول ممنوع است.
4. استایل: Jarian CSS + theme tokens — بدون Tailwind / Shadcn.

---

## Related

- [SHARED_UI_INVENTORY.md](./SHARED_UI_INVENTORY.md)
- [FRONTEND_ARCHITECTURE_GUIDELINES.md](./FRONTEND_ARCHITECTURE_GUIDELINES.md)
- [jarian-unified-list.mdc](../../.cursor/rules/jarian-unified-list.mdc)
