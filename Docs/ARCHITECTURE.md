# جریان — معماری قانون‌مند (Modular Monolith, Phase 4)

> **وضعیت:** فاز ۴ — ۱۴۰۵/۰۶/۲۵ (2026-09-16). روی فاز ۳ سوار است؛ قانون فاز ۱ را برنمی‌گرداند.  
> **این سند بازنویسی Nest/TS نیست.** رویداد داخلی in-process است؛ URL عمومی و فرمول SKU عوض نمی‌شود.  
> **مرتبط:** [architecture/README.md](./architecture/README.md) · [architecture/DOMAIN_DECISION_LOG.md](./architecture/DOMAIN_DECISION_LOG.md) · [architecture/ENTITY_DELIVERY_PIPELINE.md](./architecture/ENTITY_DELIVERY_PIPELINE.md) · [architecture/ENTITY_OWNERSHIP.md](./architecture/ENTITY_OWNERSHIP.md) · [architecture/BACKEND_FOUNDATION.md](./architecture/BACKEND_FOUNDATION.md) · [architecture/SSOT.md](./architecture/SSOT.md)

Backend: Express + JavaScript. **Nest / TypeScript rewrite در این فاز ممنوع است** (فقط بک‌لاگ Phase 5+ پس از تثبیت مرزها).

---

## ۱. پانزده قانون غیرقابل‌مذاکره

هر قانون یک خانهٔ معماری دارد. اگر قانونی جای یکتا ندارد، وارد `main` نمی‌شود.

| # | قانون | خانهٔ فعلی در همین ریپو |
|---|--------|-------------------------|
| 1 | **یک قابلیت برای هر ماژول** — یک ماژول یک مسئولیت دامنه دارد؛ رجیستری موازی نسازید. | [ENTITY_OWNERSHIP.md](./architecture/ENTITY_OWNERSHIP.md) · جدول نقشهٔ §۲ |
| 2 | **منطق دامنه در کنترلر/روت نیست** — روت فقط HTTP + RBAC + فراخوانی سرویس است. | `backend/src/modules/*/presentation` و shimهای `routes/` نازک؛ قواعد در `modules/*/domain` و `application` |
| 3 | **دسترسی مستقیم به جدول ماژول دیگر ممنوع** — SQL فقط از repository مالک. | `modules/*/infrastructure` · پورت‌های `sales/public/*` · `crm/public/*` · `tasks/public/*` · [PERSISTENCE_BOUNDARY.md](./architecture/PERSISTENCE_BOUNDARY.md) |
| 4 | **ارتباط بین‌ماژولی فقط از رابط عمومی / پورت / رویداد** — نه store داخلی، نه JOIN پنهان. | FE: `src/modules/*/public` · BE: `backend/src/modules/*/public` · `modules/shared/events` · `npm run check:module-boundaries` |
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

## ۲. Modular Monolith — آنچه فاز ۲ و ۲.۱ جابه‌جا کرد

### مقصد (target bounded contexts)

| دامنه | قابلیت | مالک محصول | Frontend (هنوز فارسی) | Backend Phase 2 |
|-------|---------|------------|------------------------|-----------------|
| **catalog** | taxonomy + schema + UOM + Brand + Product/SKU | شیرازه / ویترین | `src/modules/shirazeh/productMaster`, `vitrin` | **کامل** — `backend/src/modules/catalog/{domain,application,infrastructure,presentation}` |
| **sales** | سفارش، پیش‌فاکتور، درگاه، تدارک، رهسپار، سرانجام | نبض | `src/modules/sales` (canonical) · `src/modules/nabz` shim | **کامل برای Order** — `modules/sales/*` |
| **crm** | شرکت / تماس / تأمین + سرنخ / چرخه | کانون + افق | `kanoon`, `ofogh` | **کامل** — `modules/crm/{domain,application,infrastructure,presentation,public}` |
| **tasks** | فعالیت و وظیفه | پویش | `src/modules/pooyesh` | **کامل** — `modules/tasks/{application,infrastructure,presentation,public}` |
| **correspondence** | دبیرخانه | گاه‌شمار | `src/modules/gahshomar` | **دامنه منتقل شد** — `modules/correspondence` |
| **settings** | هویت سازمان، دلایل لغو، chrome اسناد، RBAC/کاربر | شیرازه | `src/modules/shirazeh` | **دامنه هویت + registry** — `modules/settings` |
| **shared** | CORS/JWT، jsonRecord، قرنطینه AI | — | — | `backend/src/modules/shared` |
| **marketing** | کمپین | موج | `src/modules/mowj` | عمدتاً FE — Phase 5+ |
| **analytics** | داشبورد | آینه | `src/modules/ayeneh` | خواندن از قرارداد عمومی — Phase 5+ |

`src/modules/registry.js` شناسهٔ محصول را نگه می‌دارد. دامنهٔ انگلیسی **نام پوشهٔ backend** است، نه نام منوی کاربر.

### درخت backend

```text
backend/src/
  modules/
    catalog/           Product Master (Phase 2)
    sales/             Order (Phase 2) + companyOrderReferences port
    crm/               Company / Contact / Lead + subjectReferences + lifecycle port
    correspondence/    domain/correspondence (application still Phase 5+)
    tasks/             Activity + Task (Phase 2.1) + companyActivityReferences port + activity events
    settings/          organizationIdentity + reasonRegistry + documentChrome
    shared/            schemas, CORS/JWT, AI quarantine, **in-process domain events**
  domain/              SHIMS → modules/*/domain
  services/            SHIMS for moved catalog/sales/crm/tasks; live settings/correspondence/auth
  repositories/        SHIMS for moved catalog/sales/crm/tasks; live remaining repos
  routes/              SHIMS for moved catalog/sales/crm/tasks; live remaining routers
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
| `src/modules/nabz/store/useNabzStore.ts` | `src/modules/sales/store/useSalesStore.ts` |
| `src/modules/nabz/public/*` | `src/modules/sales/public/*` |
| `src/modules/nabz/documentOrganization.js` | `src/modules/sales/documentOrganization.js` |
| `src/modules/nabz/NabzOrdersContext.jsx` | `src/modules/sales/SalesOrdersContext.jsx` |
| `backend/src/domain/companyIdentity/*` | `modules/crm/domain/companyIdentity/*` |
| `backend/src/domain/customerLifecycle/*` | `modules/crm/domain/customerLifecycle/*` |
| `backend/src/domain/rawLeadGate.js` | `modules/crm/domain/rawLeadGate.js` |
| `backend/src/services/{company,contact,lead,leadPipeline,identityMatching,companyEnrichment,customerLifecycle}Service.js`, `contactOrchestration.js` | `modules/crm/application/*` |
| `backend/src/repositories/{company,contact,companyContactRelationship,lead,leadPipeline,identityDecision}Repository.js` | `modules/crm/infrastructure/*` |
| `backend/src/routes/{companies,contacts,leads,leadPipelines,identity}.js` | `modules/crm/presentation/*` |
| `backend/src/services/{task,activity,activityType}Service.js` | `modules/tasks/application/*` |
| `backend/src/repositories/{task,activity,activityType}Repository.js` | `modules/tasks/infrastructure/*` |
| `backend/src/routes/{tasks,activities,activityTypes}.js` | `modules/tasks/presentation/*` |
| `backend/src/domain/correspondence/*` | `modules/correspondence/domain/correspondence/*` |
| `backend/src/domain/organizationIdentity/*` | `modules/settings/domain/organizationIdentity/*` |

Shim فقط `export *` / `export { default }` است. منطق جدید را در shim ننویسید.

Cross-module امروز:

- catalog → sales lookup JSON **برداشته شد** از مسیر حذف کالا. Catalog مالک `product_order_usage` است و از رویداد `sales.order.committed` پر می‌شود. `orderProductReferences` فقط hydrate/legacy است.
- sales → crm برای طرف سفارش از `modules/crm/public/subjectReferences.js` و `modules/crm/public/orderParty.js`؛ تقویم جلالی از `modules/crm/public/calendar.js` (نه دامنهٔ خام Linka).
- sales **دیگر** `recomputeCustomerLifecycle` را صدا نمی‌زند — `sales.order.committed` را publish می‌کند.
- tasks **دیگر** lifecycle CRM را import نمی‌کند — `tasks.activity.completed` را publish می‌کند.
- crm → sales/tasks برای **خواندن حقایق** هنوز از پورت‌های `companyOrderReferences` / `companyActivityReferences` (تا CRM projection جدا ساخته شود).
- tasks → crm از `modules/crm/public/subjectReferences.js` (صحت مرجع COMPANY / RAW_LEAD).

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
| `COMPANY_BRAND` در نبض | **منسوخ** — view سازگاری برای اسناد تاریخی بدون snapshot | `src/modules/sales/settings/legacyCompanyBrand.js` (nabz `proformaConfig` re-export) |

اسناد جدید باید از Organization Identity + tagline تنظیمات بخوانند. `COMPANY_BRAND` فقط reprint تاریخی است. UI زنده tagline را از `GET /api/v1/settings/document-chrome` (`documentChromeFacade`) می‌خواند، نه از `COMPANY_BRAND`.

### دلایل لغو / رد

| مفهوم | SSOT | آینه |
|--------|------|------|
| لغو درگاه | `modules/settings/domain/reasonRegistry.js` (`GATEWAY_CANCEL`) | `src/domain/settings/reasonRegistry.js` → sales `reasonRegistryFacade` (API cache) · nabz `gatewayDecisionConfig` shim |
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

## ۷. آنچه فاز ۴ انجام داد + بک‌لاگ بعدی

### Phase 2.1 — انجام شد (مرجع)

- CRM / tasks application+infrastructure+presentation + پورت‌های public.
- فرمول SKU / `productIdentityPolicy` بدون تغییر (DDL-24m).

### Phase 3 — انجام شد (بدون تغییر URL / فرمول SKU)

- ماژول frontend canonical فروش: `src/modules/sales` (store، public facade، document chrome، reason registry، documentOrganization).
- `src/modules/nabz` برای همان سطح‌ها **re-export shim** است (صفحات/کامپوننت‌های نبض جابه‌جا نشدند).
- یک نمونهٔ Zustand: `useSalesStore` ≡ `useNabzStore`. `NabzOrdersContext` فقط facade است؛ SoR سفارش = `GET/PATCH /api/v1/orders`.
- جزئیات سفارش اگر در کش نباشد از `OrderRepository.getOrderById` پر می‌شود (بدون dual-source لیست seed).
- chrome زنده: `GET /api/v1/settings/document-chrome` (`documentChromeFacade`) + Organization Identity. `COMPANY_BRAND` فقط reprint تاریخی.
- علت لغو زنده: `GET /api/v1/settings/reasons?scope=GATEWAY_CANCEL` (`reasonRegistryFacade`). لیست دامنه فقط fallback / mock است.
- hydrate بعد از لاگین chrome + reasons را هم بار می‌کند.

### Phase 4 — انجام شد (رویداد داخلی + read-model نازک)

- Bus in-process: `backend/src/modules/shared/events` (`createEventBus`, `EVENT`, `publishDomainEvent` / `notifyDomainEvent`). Kafka/outbox نیست.
- نام رویدادها در `eventNames.js` (`EVENT_CATALOG`) — جدول §۷.۱.
- جریان ۱: `orderService` بعد از persist، `sales.order.committed` / `sales.order.archived` را notify می‌کند؛ CRM با `lifecycleEventHandlers` همان triggerهای قبلی (`order_create` / `order_successful_purchase`) را recompute می‌کند — بدون import lifecycle از sales.
- جریان ۲: `activityService.completeActivity` رویداد `tasks.activity.completed` را notify می‌کند (import شکستهٔ `./customerLifecycleService` از tasks حذف شد)؛ CRM برای subject=`COMPANY` recompute می‌کند.
- Read-model کاتالوگ: جدول `product_order_usage` (migration `054_`) از رویداد خط سفارش پر می‌شود. `deleteProduct` از این جدول می‌خواند؛ اسکن JSON فروش فقط hydrate/legacy است.
- پورت‌های CRM: `public/calendar.js` (`gregorianToJalali`) و `public/orderParty.js` (`assertOrderPartyIsCompany`). `jarianOrderCode` دیگر دامنهٔ خام Linka را import نمی‌کند.
- URL عمومی و فرمول SKU بدون تغییر. Nest/TS انجام نشد.

### ۷.۱ کاتالوگ رویداد

| Event | Producer | Consumers | Payload (خلاصه) |
|-------|----------|-----------|------------------|
| `sales.order.committed` | `sales` `orderService` create/update | `crm.lifecycle`, `catalog.productUsage` | `orderId`, `orderCode`, `companyId`, `status`, `becameSuccess`, `items[]`, `actorUserId`, `trigger` |
| `sales.order.archived` | `sales` `archiveOrder` | `catalog.productUsage` (no-op؛ ردیف usage می‌ماند — DDL-24n) | `orderId`, `orderCode`, `companyId`, `items[]`, `actorUserId` |
| `tasks.activity.recorded` | `tasks` `createActivity` | — (رزرو projection بعدی) | `activityId`, `subjectType`, `subjectId`, `activityType`, `status`, `actorUserId` |
| `tasks.activity.completed` | `tasks` `completeActivity` | `crm.lifecycle` | همان + `trigger=activity_complete` |

قواعد bus: publish بعد از COMMIT؛ خطای یک handler بقیه و producer را خراب نمی‌کند؛ نام ناشناس `DOMAIN_EVENT_UNKNOWN`.

### Phase 5+ — بک‌لاگ باقی‌مانده

- Projection حقایق سفارش/فعالیت داخل CRM تا `companyOrderReferences` / `companyActivityReferences` هم حذف شوند.
- API جدا برای موج (marketing). Ayeneh فقط از قراردادهای public.
- انتقال `correspondence*` application/routes به `modules/correspondence`.
- انتقال `user` / `rbac` / `persona` / `organization` (درخت) / `auth` به `modules/settings` یا `shared`.
- الزام کد `LEAD_REJECT` روی archive سرنخ.
- جابه‌جایی کامل صفحات UI `nabz/` به `sales/` (هنوز پرریسک؛ shim کافی است).
- ادغام مدل وضعیت سفارش UI ↔ دامنه (هنوز dual-runtime است).
- **Nest/TS فقط *بعد از* تثبیت مرزها — نه به‌جای آن. این فاز آن را انجام نمی‌دهد.**

---

## ۸. آنچه این فاز انجام نمی‌دهد

- جابه‌جایی تمام صفحات/کامپوننت‌های `src/modules/nabz` یا شکستن Express به چند پکیج  
- تبدیل کل backend به Nest/TypeScript (عمداً Phase 5+)  
- حذف `catalogData.js` / `productCode.js`  
- تغییر فرمول SKUهای صادرشده یا URLهای `/api/v1/*`  
- موتور workflow، Kafka، یا ادغام کامل وضعیت سفارش  
- ادعای سبز بودن تست‌های integration بدون Postgres
