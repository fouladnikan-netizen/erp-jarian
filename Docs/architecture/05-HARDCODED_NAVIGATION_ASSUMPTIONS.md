# Hardcoded Navigation Assumptions

> **Inventory only — do not refactor in this phase.**  
> Goal: make magic paths visible so a future navigation rewrite knows what to migrate.

## 1. Module resolution by path prefix

**File:** `src/components/layout/AppLayout.jsx` — `getModuleByPath`

| Assumption | Behavior |
|------------|----------|
| `/` exact | کانون |
| `/kanoon/*` | Forced to کانون even though list route is `/` |
| Other modules | `pathname.startsWith(module.path)` |

**Risk:** New nested routes under a module must share that path prefix or Header title breaks.

---

## 2. Placeholder module allow-list in App.jsx

**File:** `src/App.jsx`

Dedicated routes exclude: `kanoon`, `vitrin`, `nabz`, `ofogh`, `gahshomar`, `kampayn`, `shirazeh`.  
Remaining registry modules (`pooyesh`, `ayeneh`) get generic `ModulePage`.

**Risk:** Forgetting to add a new real module to the exclude filter leaves it as a placeholder shell.

---

## 3. returnTo / returnName query protocol

**File:** `src/components/navigation/SmartBackButton.jsx`

| Helper | Role |
|--------|------|
| `buildReturnQuery(returnTo, returnName)` | Append query |
| `withReturnParams(path, returnTo, returnName)` | Merge into path |
| `SmartBackButton` | Reads query; else `fallbackTo` / `fallbackName` |

**Call sites (non-exhaustive):**

| Location | Notes |
|----------|-------|
| `OfoqLeadModal.jsx` | `buildReturnQuery('/ofoq', 'بورد افق')` — path string `/ofoq` ≠ route `/ofogh` |
| `CommitmentEngine.jsx` | `RETURN_TO = '/gahshomar'`, `RETURN_NAME = 'گاه‌شمار'` |
| `UnifiedJarianCalendar.jsx` | `returnName = 'تقویم سیستم'`, `returnTo = location.pathname` |
| `CustomerProfilePage.jsx` | Order links via `withReturnParams` |
| `OrderDetailPage.jsx` | SmartBack fallback `/nabz` |

**Risk:** Typos in return paths; no single registry of legal return targets.

---

## 4. Cross-module bridges

| Bridge | Mechanism | File |
|--------|-----------|------|
| Ofogh → Nabz create | `createOrderDirect` + `navigate('/nabz/new-order')` | `OfoqLeadModal.jsx` |
| New-order route → drawer | `NabzPage` detects `/nabz/new-order` then `navigate('/nabz', { replace: true })` | `NabzPage.jsx` |
| Calendar dive | `navigate(withReturnParams(item.link, …))` | `CommitmentEngine.jsx` |
| Kanoon → Poyesh | `/pooyesh?contact=&activity=` (stub ignores params) | `columns.js` / table |

---

## 5. Breadcrumbs / back labels

| Location | Assumption |
|----------|------------|
| `orderProfileService.js` | Hardcoded crumb `{ label: 'بازگشت به لیست سفارشات', to: '/nabz' }` |
| `OrderProfileHeader.jsx` | Renders breadcrumb array (orphan header path; live chrome differs) |
| Omni `OmniCommand.jsx` | Static `to: '/ofogh'`, `/nabz/new-order`, `/`, `/gahshomar` |

---

## 6. data-module attributes

Pages set `data-module="kanoon" | …` for CSS scoping. Not used for routing, but couples markup to module id strings.

---

## Migration note (future)

Replace with: module registry metadata (path prefixes, return aliases), typed `ReturnTarget` enum, and workspace backstack — see [06-FUTURE_RECOMMENDATIONS.md](./06-FUTURE_RECOMMENDATIONS.md).
