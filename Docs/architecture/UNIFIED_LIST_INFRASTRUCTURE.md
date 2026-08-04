# Jarian Architecture Law #004
## Unified List Infrastructure

**وضعیت:** زیرساخت مشترک فهرست کامل شد. **Infinite Loading** استراتژی اجباری بارگذاری فهرست‌های بزرگ است.

**Cursor rule:** [`.cursor/rules/jarian-unified-list.mdc`](../../.cursor/rules/jarian-unified-list.mdc)

---

## قابلیت‌های اجباری (Mandatory)

### ✓ Resizable Columns

- `src/components/table/ResizableTh.jsx`
- `src/components/table/ResizableColGroup.jsx`
- عرض‌ها از طریق `useListShell` / ترجیحات کاربر ذخیره می‌شوند

### ✓ Excel-style Column Filters

- `src/components/table/ColumnFilterHeader.jsx`
- `src/hooks/useColumnExcelFilters.js`

### ✓ Unified Status Display

- `src/components/module/ListStatusPill.jsx`

### ✓ Multi Column Sorting

- `src/hooks/list/useMultiSort.js`
- `src/components/common/list/MultiSortHeader.jsx`

Asc → Desc → None · Ctrl/Cmd برای مرتب‌سازی چندستونه · نمایش اولویت

### ✓ Infinite Loading

- `src/hooks/list/useInfiniteLoading.js`
- `src/hooks/list/useListDataProvider.js`
- `src/components/common/list/ListVirtualBody.jsx` (`InfiniteSentinelRow`)

**قانون:** تمام فهرست‌های بزرگ داده فقط با Infinite Loading بارگذاری می‌شوند.

- بار اول محدود است؛ با رسیدن به انتهای فهرست رکوردهای بعدی بار می‌شوند.
- فیلتر، مرتب‌سازی و تنظیمات ستون همچنان کار می‌کنند.
- `onLoadMore` برای بارگذاری سمت سرور پشتیبانی می‌شود.
- کاربر/ماژول استراتژی رندر را انتخاب نمی‌کنند.

### ✓ Column Management

- `src/hooks/list/useColumnManager.js`
- `src/components/common/list/ColumnManager.jsx`
- دسترسی فقط از منوی More (`⋮`) در سمت چپ Header فهرست — نه دکمهٔ همیشه‌نما

Show/Hide · Reorder با Drag & Drop · ستون‌های `locked` مخفی نمی‌شوند

### ✓ User List Preferences

- `src/hooks/list/useListPreferences.js`
- `src/services/listPreferencesService.js`

فقط:

- visible columns · order · widths · sorts · filters

**ذخیره نمی‌شود:** حالت صفحه‌بندی / infinite / virtual / pageSize به‌عنوان انتخاب کاربر.

---

## Pipeline

```text
Filter
  ↓
Sort
  ↓
Infinite Loading
  ↓
List Rendering
```

---

## Composition

| Layer | Role |
|-------|------|
| `ListColumnHeader` | Multi-sort + Excel filter |
| `ResizableTh` | Resize |
| `ListChrome` | More (`⋮`) → مدیریت ستون‌ها · بازنشانی تنظیمات فهرست (عرض / فیلتر / نمایش) |
| `ListSelectionBar` | شمارنده انتخاب فقط پس از انتخاب سطر — نه تعداد کل در Header |
| `useListShell` | Preferences, columns, widths, sort, infinite data |

Modules only define: **Columns · Rows/Data · Business Actions**.

---

## Out of scope (not user-facing)

| Topic | Policy |
|-------|--------|
| Classic pagination UI | Removed from list chrome |
| Virtual Scroll toggle | Not exposed; may be layered internally later without module API changes |
| Mode selection (`client` / `server` / `infinite` / `virtual`) | Forbidden in UI and preferences |

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
2. Infinite Loading تنها استراتژی بارگذاری فهرست‌های بزرگ است.
3. Header فهرست تعداد کل/موجود/نتایج را نشان نمی‌دهد؛ شمارنده فقط در `ListSelectionBar` و فقط پس از انتخاب سطر.
4. قابلیت‌های جدید فقط در لایه مشترک توسعه می‌یابند.
5. پیاده‌سازی اختصاصی sort / infinite / filter / resize / status در ماژول ممنوع است.
6. انتخاب حالت نمایش (pagination / virtual / …) به UI یا prefs اضافه نمی‌شود.
7. استایل: Jarian CSS + theme tokens — بدون Tailwind / Shadcn.

---

## Related

- [SHARED_UI_INVENTORY.md](./SHARED_UI_INVENTORY.md)
- [FRONTEND_ARCHITECTURE_GUIDELINES.md](./FRONTEND_ARCHITECTURE_GUIDELINES.md)
- [jarian-unified-list.mdc](../../.cursor/rules/jarian-unified-list.mdc)
