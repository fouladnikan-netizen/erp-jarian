# جریان — معماری قانون‌مند (Modular Monolith, Phase 1)

> **وضعیت:** قانون فاز ۱ — ۱۴۰۵/۰۶/۲۱ (2026-09-12).  
> **این سند بازنویسی کل بک‌اند نیست.** مقصد معماری را قفل می‌کند؛ جابه‌جایی پوشه‌ها فازهای بعدی است.  
> **مرتبط:** [architecture/README.md](./architecture/README.md) · [architecture/DOMAIN_DECISION_LOG.md](./architecture/DOMAIN_DECISION_LOG.md) · [architecture/ENTITY_DELIVERY_PIPELINE.md](./architecture/ENTITY_DELIVERY_PIPELINE.md) · [architecture/ENTITY_OWNERSHIP.md](./architecture/ENTITY_OWNERSHIP.md) · [architecture/BACKEND_FOUNDATION.md](./architecture/BACKEND_FOUNDATION.md)

Backend امروز: Express + JavaScript در `backend/src` با لایهٔ `routes → services → domain → repositories`، Zod، JWT/RBAC، مهاجرت‌های شماره‌دار SQL، و Entity Card در `Docs/architecture/entity-cards/`. **Nest / TypeScript rewrite در این فاز ممنوع است.**

---

## ۱. پانزده قانون غیرقابل‌مذاکره

هر قانون یک خانهٔ معماری دارد. اگر قانونی جای یکتا ندارد، وارد `main` نمی‌شود.

| # | قانون | خانهٔ فعلی در همین ریپو |
|---|--------|-------------------------|
| 1 | **یک قابلیت برای هر ماژول** — یک ماژول یک مسئولیت دامنه دارد؛ رجیستری موازی نسازید. | [ENTITY_OWNERSHIP.md](./architecture/ENTITY_OWNERSHIP.md) · جدول نقشهٔ §۲ همین سند |
| 2 | **منطق دامنه در کنترلر/روت نیست** — روت فقط HTTP + RBAC + فراخوانی سرویس است. | `backend/src/routes/*` نازک؛ قواعد در `backend/src/domain/**` و `backend/src/services/*Service.js` |
| 3 | **دسترسی مستقیم به جدول ماژول دیگر ممنوع** — SQL فقط از repository مالک. | `backend/src/repositories/` · [PERSISTENCE_BOUNDARY.md](./architecture/PERSISTENCE_BOUNDARY.md) |
| 4 | **ارتباط بین‌ماژولی فقط از رابط عمومی / پورت / رویداد** — نه store داخلی، نه JOIN پنهان. | `src/modules/*/public` · `npm run check:module-boundaries` · [jarian-module-boundaries](../.cursor/rules/jarian-module-boundaries.mdc) |
| 5 | **هویت کالا / SKU دقیقاً یک پیاده‌سازی دارد** | `backend/src/domain/productMaster/productIdentityPolicy.js` — §۳ |
| 6 | **CASCADE مخرب روی دادهٔ پایه ممنوع** — حذف گروه/دسته/نوع/برند/واحد/ویژگی نباید فرزندان master را خاموش حذف کند. | §۴ · `backend/src/domain/productMaster/deleteGuard.js` |
| 7 | **عملیات مخرب باید audit شود** — hard-delete اپند-اونلی در `audit_log` قبل از DELETE. | `writeAudit` در سرویس‌های Product Master / Company / Order / Lead |
| 8 | **تغییر اسکیما فقط با مهاجرت شماره‌دار** — فایل اعمال‌شده در prod ویرایش نمی‌شود. | `backend/src/db/migrations/00N_*.sql` · [BACKEND_FOUNDATION.md](./architecture/BACKEND_FOUNDATION.md) |
| 9 | **اسکریپت ad-hoc تولیدی بدون dry-run ممنوع** — هر فرمان تغییردهندهٔ داده باید پیش‌نمایش امن داشته باشد. | الگوی موجود: `productBulkImportService` با `DRY_RUN`؛ اسکریپت‌های heal فقط با بررسی صریح |
| 10 | **فرمان تغییردهندهٔ داده داخل تراکنش** — چند نوشتن = `withTransaction()`. | `backend/src/db/pool.js` |
| 11 | **شناسهٔ همبستگی درخواست** — هر پاسخ `X-Request-Id` دارد. | `backend/src/middleware/requestContext.js` |
| 12 | **کد خطای کسب‌وکار تایپ‌شده** — کلاینت روی `error` کد شاخه می‌زند، نه روی متن پیام. | `backend/src/lib/errors.js` (`AppError.code`) · شکل `{ error, message, details }` |
| 13 | **بدون magic string برای مفاهیم کسب‌وکار** — مرحله، نقش، scope، کد مجوز از ثابت/کاتالوگ. | RBAC seed · `orderLifecycle` · Entity Cards · DDL |
| 14 | **قاعدهٔ کسب‌وکار تکراری ممنوع** — یک قانون، یک مالک. UI حداکثر آینه است. | [BUSINESS_RULE_OWNERSHIP.md](./architecture/BUSINESS_RULE_OWNERSHIP.md) |
| 15 | **بدون خانهٔ معماری یکتا وارد main نشو** — Entity Card + DDL gate برای Tier A/B. | [ENTITY_DELIVERY_PIPELINE.md](./architecture/ENTITY_DELIVERY_PIPELINE.md) |

این پانزده قانون **جایگزین** قانون‌های موجود (SSOT کلاینت، مرز ماژول، pipeline موجودیت) نیستند؛ آن‌ها را جمع می‌کنند.

---

## ۲. مقصد Modular Monolith و نقشهٔ پوشه‌های فعلی

فازهای بعد پوشه‌ها را به دامنهٔ انگلیسی جابه‌جا می‌کنند. **الان هیچ ماژولی جابه‌جا نمی‌شود.**

### مقصد (target bounded contexts)

| دامنهٔ مقصد | قابلیت | مالک محصول (فارسی) | پوشهٔ فعلی FE | سطح فعلی Backend |
|-------------|---------|---------------------|---------------|------------------|
| **catalog** | taxonomy + schema + UOM + Brand + Product/SKU | شیرازه (تعاریف) / ویترین (SKU) | `src/modules/shirazeh/productMaster`, `src/modules/vitrin` | `domain/productMaster`, `services/product*`, `*Taxonomy*`, `brand*`, `uom*`, `attribute*` |
| **sales** | سفارش، پیش‌فاکتور، درگاه، تدارک، رهسپار، سرانجام | نبض | `src/modules/nabz` | `routes/orders.js`, `services/orderService.js`, `domain/order` |
| **crm** | شرکت / شخص تماس / تأمین‌کننده | کانون | `src/modules/kanoon` | `routes/companies.js`, `routes/contacts.js` |
| **crm** | سرنخ خام + تختهٔ چرخهٔ مشتری | افق | `src/modules/ofogh` | `routes/leads.js`, `routes/leadPipelines.js` |
| **engagement** | فعالیت و وظیفه (موضوع‌مرجع) | پویش | `src/modules/pooyesh` | `routes/activities.js`, `routes/tasks.js` |
| **marketing** | کمپین، قالب، مخاطب، اجرا | موج | `src/modules/mowj` | هنوز عمدتاً FE + پورت؛ API جدا فاز بعد |
| **correspondence** | دبیرخانه / مکاتبات | گاه‌شمار | `src/modules/gahshomar` | `routes/correspondence.js`, `routes/correspondenceTypes.js` |
| **analytics** | داشبورد مدیریتی | آینه | `src/modules/ayeneh` | خواندن از قراردادهای عمومی؛ بدون SoR موازی |
| **platform** | کاربر، RBAC، درخت سازمان، هویت سازمان، پرسونا | شیرازه | `src/modules/shirazeh` | `routes/auth.js`, `users.js`, `rbac.js`, `organization*.js`, `personas.js`, `identity.js` |

`src/modules/registry.js` شناسهٔ محصول را نگه می‌دارد (`nabz`, `ofogh`, `kanoon`, …). دامنهٔ مقصد **نام پوشهٔ بعدی** است، نه نام منوی کاربر.

### Backend امروز (تک‌اپلیکیشن Express)

```text
backend/src/
  routes/          HTTP + requirePermission
  services/        use-case / orchestration
  domain/          قوانین (order, productMaster, companyIdentity, …)
  repositories/    تنها مسیر SQL
  db/migrations/   001… — یک فایل، یک تراکنش
  middleware/      JWT, RBAC, requestId, errors
```

**نقشهٔ مهاجرت (فقط برنامه — اجرا در فازهای بعد):**

1. Phase 1 (همین PR) — قانون + SSOT هویت کالا + ایمنی حذف master.  
2. Phase 2 — ماژول‌های backend را *منطقی* جدا کنید (`backend/src/modules/catalog|sales|crm/…`) بدون تغییر URL عمومی.  
3. Phase 3 — رویدادهای داخلی برای cross-context؛ بدون JOIN مخفی به جدول بیگانه.  
4. Phase 4 — در صورت نیاز Nest/TS *پس از* تثبیت مرزها، نه قبل از آن.

---

## ۳. هویت کالا / SKU — یک سیاست، یک پیاده‌سازی

### انتخاب فرمول (اگر چند فرمول در تاریخچه هست)

| فرمول | منبع | وضعیت |
|--------|------|--------|
| `GG-CC-TT-VV` هشت‌رقمی | DDL-24(b) | **منسوخ** — دیگر صادر نشود |
| `{groupSku}-{categorySku}-{typeSku}-{identityValue…}` | **DDL-24(m)** | **canonical** |
| `formatProductCode(groupId, subgroupId, serial)` هفت‌رقمی | `src/modules/vitrin/productCode.js` | **shim منجمد** برای import همزمان نبض (`catalogData.js` / DDL-24a). هویت زنده نیست. |

**انتخاب فاز ۱:** DDL-24(m) + DDL-46.

- قطعهٔ هویت = فقط bindingهای `is_identity_relevant` با `value_scope = PRODUCT`، به ترتیب `sort_order`.  
- `is_required` به‌تنهایی هویت/SKU نمی‌سازد (DDL-46؛ DDL-24p منسوخ شد).  
- Brand داخل SKU نیست.  
- SKU بعد از INSERT تغییرناپذیر است (`SKU_IMMUTABLE`).  
- `canonical_identity_key` = `productTypeId::code=normalized|…` از همان مجموعهٔ هویت — نه از نام نمایشی.

**پیاده‌سازی canonical:** `backend/src/domain/productMaster/productIdentityPolicy.js`

مسیرهای create / update / bulk-import باید همین سیاست را صدا بزنند. `skuGenerator.js` و `skuCode.js` فقط helper هستند و به سیاست delegate می‌کنند. فرانت‌اند SKU زنده تولید نمی‌کند.

---

## ۴. سیاست CASCADE و حذف دادهٔ پایه

حذف سخت (hard-delete) فقط وقتی مجاز است که وابستهٔ *مستقیم* نباشد (DDL-24n). غیرفعال‌سازی برای گرهٔ درحال‌استفاده باقی است.

| جدول master | FK به والد | ON DELETE | حذف اپلیکیشن |
|-------------|------------|-----------|--------------|
| `product_groups` | — | — | مسدود با وجود دسته |
| `product_categories` | `product_groups` | **بدون CASCADE** (NO ACTION) | مسدود با وجود نوع |
| `product_types` | `product_categories` | **بدون CASCADE** | مسدود با وجود کالا (حتی INACTIVE) |
| `products` | `product_types` / `brands` / `uom_registry` | **بدون CASCADE** | مسدود با ارجاع سفارش (`payload.items`، از جمله بایگانی) |
| `brands` / `uom_registry` / `attribute_definitions` | — | فرزندان master بدون CASCADE | `deleteGuard.throwInUse` |

**CASCADE مجاز:** فقط ردیف‌های *مالکیت‌شده داخل همان aggregate* — مثلاً `product_attribute_values` و `product_allowed_attribute_values` با `ON DELETE CASCADE` از `products`، بعد از عبور از گارد سفارش. این حذف کالا است، نه حذف خاموشِ master دیگر.

**CASCADE ممنوع روی master:** `product_groups` / `product_categories` / `product_types` / `brands` / `uom_registry` / `attribute_definitions` نباید با CASCADE یکدیگر را پاک کنند. گارد در `deleteGuard.js` و تست مهاجرت این را قفل می‌کند.

Company / Order / Raw Lead در v1 hard-delete نیستند (`deleted_at`). CASCADE روی `user_roles` یا `role_permissions` دادهٔ کاتالوگ کالا نیست.

هر hard-delete master باید `writeAudit` را *داخل همان تراکنش* قبل از DELETE بنویسد.

---

## ۵. آنچه این فاز انجام نمی‌دهد

- جابه‌جایی `src/modules/nabz` به `sales/` یا شکستن Express به چند پکیج  
- تبدیل کل backend به Nest/TypeScript  
- حذف `catalogData.js` / `productCode.js` (هنوز import همزمان نبض)  
- تغییر فرمول SKUهای صادرشدهٔ موجود  
- موتور workflow یا ادغام مدل وضعیت سفارش
