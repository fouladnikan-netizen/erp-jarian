# جریان — معماری قانون‌مند (Modular Monolith, Phase 2)

> **وضعیت:** فاز ۲ — ۱۴۰۵/۰۶/۲۱ (2026-09-12). روی قانون فاز ۱ ساخته شده؛ آن را برنمی‌گرداند.  
> **این سند بازنویسی Nest/TS نیست.** مرزهای backend را *واقعی* می‌کند؛ URL عمومی عوض نمی‌شود.  
> **مرتبط:** [architecture/README.md](./architecture/README.md) · [architecture/DOMAIN_DECISION_LOG.md](./architecture/DOMAIN_DECISION_LOG.md) · [architecture/ENTITY_DELIVERY_PIPELINE.md](./architecture/ENTITY_DELIVERY_PIPELINE.md) · [architecture/ENTITY_OWNERSHIP.md](./architecture/ENTITY_OWNERSHIP.md) · [architecture/BACKEND_FOUNDATION.md](./architecture/BACKEND_FOUNDATION.md) · [architecture/SSOT.md](./architecture/SSOT.md)

Backend: Express + JavaScript. **Nest / TypeScript rewrite در این فاز ممنوع است.**

---

## ۱. پانزده قانون غیرقابل‌مذاکره

هر قانون یک خانهٔ معماری دارد. اگر قانونی جای یکتا ندارد، وارد `main` نمی‌شود.

| # | قانون | خانهٔ فعلی در همین ریپو |
|---|--------|-------------------------|
| 1 | **یک قابلیت برای هر ماژول** — یک ماژول یک مسئولیت دامنه دارد؛ رجیستری موازی نسازید. | [ENTITY_OWNERSHIP.md](./architecture/ENTITY_OWNERSHIP.md) · جدول نقشهٔ §۲ |
| 2 | **منطق دامنه در کنترلر/روت نیست** — روت فقط HTTP + RBAC + فراخوانی سرویس است. | `backend/src/modules/*/presentation` و shimهای `routes/` نازک؛ قواعد در `modules/*/domain` و `application` |
| 3 | **دسترسی مستقیم به جدول ماژول دیگر ممنوع** — SQL فقط از repository مالک. | `modules/*/infrastructure` · پورت `sales/public/orderProductReferences.js` · [PERSISTENCE_BOUNDARY.md](./architecture/PERSISTENCE_BOUNDARY.md) |
| 4 | **ارتباط بین‌ماژولی فقط از رابط عمومی / پورت / رویداد** — نه store داخلی، نه JOIN پنهان. | FE: `src/modules/*/public` · BE: `backend/src/modules/*/public` · `npm run check:module-boundaries` |
| 5 | **هویت کالا / SKU دقیقاً یک پیاده‌سازی دارد** | `backend/src/modules/catalog/domain/productMaster/productIdentityPolicy.js` — §۳ (shim: `backend/src/domain/productMaster/`) |
| 6 | **CASCADE مخرب روی دادهٔ پایه ممنوع** | §۴ · `modules/catalog/domain/productMaster/deleteGuard.js` |
| 7 | **عملیات مخرب باید audit شود** | `writeAudit` در سرویس‌های Product Master / Company / Order / Lead |
| 8 | **تغییر اسکیما فقط با مهاجرت شماره‌دار** | `backend/src/db/migrations/00N_*.sql` · [BACKEND_FOUNDATION.md](./architecture/BACKEND_FOUNDATION.md) |
| 9 | **اسکریپت ad-hoc تولیدی بدون dry-run ممنوع** | `productBulkImportService` با `DRY_RUN`؛ اسکریپت‌های heal فقط با بررسی صریح |
| 10 | **فرمان تغییردهندهٔ داده داخل تراکنش** | `backend/src/db/pool.js` · `withTransaction()` |
| 11 | **شناسهٔ همبستگی درخواست** — هر پاسخ `X-Request-Id` دارد؛ خطاها هم `requestId` می‌نویسند. | `backend/src/middleware/requestContext.js` · `errorHandler` |
| 12 | **کد خطای کسب‌وکار تایپ‌شده** | `backend/src/lib/errors.js` (`AppError.code`) · شکل `{ error, message, details, requestId }` |
| 13 | **بدون magic string برای مفاهیم کسب‌وکار** | RBAC seed · `orderLifecycle` · `settings/domain/reasonRegistry.js` · Entity Cards |
| 14 | **قاعدهٔ کسب‌وکار تکراری ممنوع** — یک قانون، یک مالک. UI حداکثر آینه است. | [BUSINESS_RULE_OWNERSHIP.md](./architecture/BUSINESS_RULE_OWNERSHIP.md) · §۶ |
| 15 | **بدون خانهٔ معماری یکتا وارد main نشو** | [ENTITY_DELIVERY_PIPELINE.md](./architecture/ENTITY_DELIVERY_PIPELINE.md) |

این پانزده قانون **جایگزین** قانون‌های موجود نیستند؛ آن‌ها را جمع می‌کنند.

---

## ۲. Modular Monolith — آنچه فاز ۲ جابه‌جا کرد

### مقصد (target bounded contexts)

| دامنه | قابلیت | مالک محصول | Frontend (هنوز فارسی) | Backend Phase 2 |
|-------|---------|------------|------------------------|-----------------|
| **catalog** | taxonomy + schema + UOM + Brand + Product/SKU | شیرازه / ویترین | `src/modules/shirazeh/productMaster`, `vitrin` | **کامل** — `backend/src/modules/catalog/{domain,application,infrastructure,presentation}` |
| **sales** | سفارش، پیش‌فاکتور، درگاه، تدارک، رهسپار، سرانجام | نبض | `src/modules/nabz` | **کامل برای Order** — `modules/sales/*` |
| **crm** | شرکت / تماس / تأمین + سرنخ / چرخه | کانون + افق | `kanoon`, `ofogh` | **دامنه منتقل شد**؛ application/routes هنوز در مسیر قدیمی (Phase 2.1) |
| **tasks** | فعالیت و وظیفه | پویش | `src/modules/pooyesh` | **پوسته + مالکیت** — `modules/tasks` |
| **correspondence** | دبیرخانه | گاه‌شمار | `src/modules/gahshomar` | **دامنه منتقل شد** — `modules/correspondence` |
| **settings** | هویت سازمان، دلایل لغو، chrome اسناد، RBAC/کاربر | شیرازه | `src/modules/shirazeh` | **دامنه هویت + registry** — `modules/settings` |
| **shared** | CORS/JWT، jsonRecord، قرنطینه AI | — | — | `backend/src/modules/shared` |
| **marketing** | کمپین | موج | `src/modules/mowj` | عمدتاً FE — Phase 3+ |
| **analytics** | داشبورد | آینه | `src/modules/ayeneh` | خواندن از قرارداد عمومی — Phase 3+ |

`src/modules/registry.js` شناسهٔ محصول را نگه می‌دارد. دامنهٔ انگلیسی **نام پوشهٔ backend** است، نه نام منوی کاربر.

### درخت backend

```text
backend/src/
  modules/
    catalog/           Product Master (moved)
    sales/             Order (moved)
    crm/               companyIdentity, customerLifecycle, rawLeadGate
    correspondence/    domain/correspondence
    tasks/             ownership shell (activity + task)
    settings/          organizationIdentity + reasonRegistry + documentChrome
    shared/            schemas, CORS/JWT, AI quarantine
  domain/              SHIMS → modules/*/domain
  services/            SHIMS for moved catalog/sales; live CRM/tasks/settings services
  repositories/        SHIMS for moved catalog/sales; live remaining repos
  routes/              SHIMS for moved catalog/sales; live remaining routers
  middleware/          JWT, RBAC, requestId, errors (kernel)
  lib/                 AppError, ids (kernel)
  db/migrations/
```

URL عمومی بدون تغییر: `/api/v1/products`, `/orders`, `/companies`, …  
مسیر جدید تنظیمات (فقط خواندنی): `GET /api/v1/settings/reasons`, `GET /api/v1/settings/document-chrome`.

### نقشهٔ shim (مسیر قدیمی → canonical)

| مسیر قدیمی | مسیر canonical |
|------------|----------------|
| `backend/src/domain/productMaster/*` | `modules/catalog/domain/productMaster/*` |
| `backend/src/services/product*.js`, `brandService.js`, `uomService.js`, `attributeDefinitionService.js` | `modules/catalog/application/*` |
| `backend/src/repositories/product*.js`, `brandRepository.js`, `uomRepository.js`, `attributeDefinitionRepository.js` | `modules/catalog/infrastructure/*` |
| `backend/src/routes/{products,productTaxonomy,brands,uom,attributeDefinitions}.js` | `modules/catalog/presentation/*` |
| `backend/src/domain/order/*` | `modules/sales/domain/order/*` |
| `backend/src/services/orderService.js` | `modules/sales/application/orderService.js` |
| `backend/src/repositories/orderRepository.js` | `modules/sales/infrastructure/orderRepository.js` |
| `backend/src/routes/orders.js` | `modules/sales/presentation/orders.js` |
| `backend/src/domain/companyIdentity/*` | `modules/crm/domain/companyIdentity/*` |
| `backend/src/domain/customerLifecycle/*` | `modules/crm/domain/customerLifecycle/*` |
| `backend/src/domain/rawLeadGate.js` | `modules/crm/domain/rawLeadGate.js` |
| `backend/src/domain/correspondence/*` | `modules/correspondence/domain/correspondence/*` |
| `backend/src/domain/organizationIdentity/*` | `modules/settings/domain/organizationIdentity/*` |

Shim فقط `export *` / `export { default }` است. منطق جدید را در shim ننویسید.

Cross-module امروز:

- catalog → sales فقط از `modules/sales/public/orderProductReferences.js` (ارجاع کالا روی خط سفارش).
- sales → crm از `modules/crm/domain/rawLeadGate.js` و `companyIdentity` (جلالی). Phase 3 این‌ها را پشت پورت رویداد می‌برد.

---

## ۳. هویت کالا / SKU — یک سیاست، یک پیاده‌سازی

بدون تغییر فرمول نسبت به فاز ۱.

| فرمول | منبع | وضعیت |
|--------|------|--------|
| `GG-CC-TT-VV` هشت‌رقمی | DDL-24(b) | **منسوخ** — دیگر صادر نشود |
| `{groupSku}-{categorySku}-{typeSku}-{identityValue…}` | **DDL-24(m)** | **canonical** |
| `formatProductCode(groupId, subgroupId, serial)` هفت‌رقمی | `src/modules/vitrin/productCode.js` | **shim منجمد** (DDL-24a) |

- هویت = bindingهای `is_identity_relevant` با `value_scope = PRODUCT`.  
- `is_required` به‌تنهایی SKU نمی‌سازد (DDL-46).  
- Brand داخل SKU نیست. SKU بعد از INSERT تغییرناپذیر است.  
- **فرمول دوم اضافه نکنید.**

**پیاده‌سازی canonical:** `backend/src/modules/catalog/domain/productMaster/productIdentityPolicy.js`  
مسیر قدیمی shim است و باید همان exportها را بدهد.

---

## ۴. سیاست CASCADE و حذف دادهٔ پایه

بدون تغییر نسبت به فاز ۱. گارد: `modules/catalog/domain/productMaster/deleteGuard.js`.

حذف سخت فقط بدون وابستهٔ مستقیم (DDL-24n). CASCADE فقط داخل همان aggregate (`product_attribute_values`). هر hard-delete master باید `writeAudit` را داخل همان تراکنش قبل از DELETE بنویسد.

---

## ۵. SSOTهای اضافه‌شده در فاز ۲

### هویت سازمان / برند اسناد

| مفهوم | SSOT | آینه / shim |
|--------|------|-------------|
| نام حقوقی، شناسه ملی، نشانی، لوگو | `GET/PUT /api/v1/organization-identity` · `modules/settings/domain/organizationIdentity` | `organizationIdentityFacade` |
| شعار بازاریابی (tagline) | `modules/settings/domain/documentChrome.js` · `GET /api/v1/settings/document-chrome` | `DOCUMENT_CHROME_TAGLINE` |
| `COMPANY_BRAND` در نبض | **منسوخ** — view سازگاری برای اسناد تاریخی بدون snapshot | `src/modules/nabz/proformaConfig.js` |

اسناد جدید باید از Organization Identity + tagline تنظیمات بخوانند. `COMPANY_BRAND` فقط reprint تاریخی است.

### دلایل لغو / رد

| مفهوم | SSOT | آینه |
|--------|------|------|
| لغو درگاه | `modules/settings/domain/reasonRegistry.js` (`GATEWAY_CANCEL`) | `src/domain/settings/reasonRegistry.js` → `gatewayDecisionConfig.js` |
| رد سرنخ | همان registry (`LEAD_REJECT`) — کاتالوگ اولیه؛ متن آزاد lead archive هنوز پذیرفته می‌شود | Phase 2.1: الزام کد |

`GET /api/v1/settings/reasons?scope=GATEWAY_CANCEL`

### JSONB / Zod

`z.record(z.string(), z.any())` روی Order / Company / Product برداشته شد.

- Order payload: کلیدهای شناخته‌شده + `.passthrough()` (سند چاق نبض).  
- Company payload: `linkaIdentity` + `.passthrough()`؛ `relatedPersons` شیء نام‌دار.  
- Product: `attributeValueRecord` / `weightCoefficientRecord`.  
- Escape hatch مستند: `modules/shared/schemas/jsonRecord.js`.

---

## ۶. سخت‌سازی پلتفرم (فاز ۲)

| مورد | رفتار |
|------|--------|
| CORS | development/test: `origin: true`. غیر dev: allow-list از `CORS_ORIGINS` ∪ `APP_PUBLIC_URL`. |
| JWT | production بدون `JWT_SECRET` غیرپیش‌فرض boot نمی‌شود. انقضای production پیش‌فرض `8h`. |
| Request ID | هدر `X-Request-Id`؛ در `logError` و بدنهٔ خطا. |
| AI glue | `src/server/api/aiRoutes.js` قرنطینه است — فقط از `modules/shared/ai/legacyAiGateway.js`. در production پیش‌فرض خاموش مگر `AI_ROUTES_ENABLED=1`. Correspondence AI مسیر جدا و authenticated است. |

---

## ۷. بک‌لاگ Phase 2.1 / 3 / 4 (عمداً معوق)

### Phase 2.1 — تکمیل جابه‌جایی بدون تغییر رفتار

- انتقال `companyService` / `contactService` / `lead*` / `identityMatching` به `modules/crm/{application,infrastructure,presentation}`.
- انتقال `taskService` / `activity*` به `modules/tasks`.
- انتقال `correspondence*` application/routes به `modules/correspondence`.
- انتقال `user` / `rbac` / `persona` / `organization` (درخت) / `auth` به `modules/settings` یا `shared` (auth cross-cutting).
- الزام کد `LEAD_REJECT` روی archive سرنخ.
- حذف تدریجی خواندن `COMPANY_BRAND` از UI زنده.
- جابه‌جایی پوشهٔ frontend (`nabz` → `sales`) پشت facade — پرریسک؛ فعلاً نه.

### Phase 3 — مرز سخت بین‌ماژول

- رویداد داخلی به‌جای `orderProductReferences` و JOIN/اسکن `orders.payload.items`.
- پورت CRM برای `gregorianToJalali` / national-id gates به‌جای import دامنهٔ خام.
- API جدا برای موج (marketing).
- Ayeneh فقط از قراردادهای public می‌خواند.

### Phase 4

- Nest/TS فقط *بعد از* تثبیت مرزها — نه به‌جای آن.
- ادغام مدل وضعیت سفارش UI ↔ دامنه (هنوز dual-runtime است).

---

## ۸. آنچه این فاز انجام نمی‌دهد

- جابه‌جایی `src/modules/nabz` به `sales/` یا شکستن Express به چند پکیج  
- تبدیل کل backend به Nest/TypeScript  
- حذف `catalogData.js` / `productCode.js`  
- تغییر فرمول SKUهای صادرشده  
- موتور workflow یا ادغام کامل وضعیت سفارش  
- ادعای سبز بودن تست‌های integration بدون Postgres
