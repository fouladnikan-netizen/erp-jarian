# Company Profile Hub — Session Architecture Pack (۱۰ پرامپت)

> **تاریخ:** ۱۴۰۴/۰۵/۱۳ (۴ اوت ۲۰۲۶)  
> **شاخه کاری:** `chore/ui-infrastructure-patch`  
> **مسیر پروفایل:** `/kanoon/contact/:contactId` → `CustomerProfilePage`  
> **هدف این سند:** بستهٔ قابل‌برداشت از آنالیز معماری، تصمیم‌ها، فایل‌های کد، و شرح کامل ۱۰ پرامپت اخیر پروفایل مخاطب (مشتری / تامین‌کننده).

**مرتبط:** [DDL-09 در DOMAIN_DECISION_LOG.md](./DOMAIN_DECISION_LOG.md) · [PROFILE_LAYOUT_GUIDELINES.md](./PROFILE_LAYOUT_GUIDELINES.md) · [SSOT.md](./SSOT.md)

---

## ۱) خلاصهٔ اجرایی — چه ساختیم؟

یک **هاب پروفایل شرکت (Company Profile)** روی همان مسیر کانون، با این اصول:

| اصل | نتیجه |
|-----|--------|
| یک صفحه، دو نقش | مشتری و تامین‌کننده هر دو `/kanoon/contact/:id` — بدون کامپوننت پروفایل جدا |
| لایه‌اوت محبوب کاربر | شبکهٔ ۲۵٪ سایدبار چسبان + ۷۵٪ ستون اصلی (نه هاب تمام‌عرض قبلی) |
| ترکیب‌گر، نه مالک دامنه | صفحه فقط compose می‌کند؛ پویش / گاه‌شمار / نبض مالک منطق خودشان‌اند |
| نوار ثبت سریع سراسری | `MagicInput` بالای تب‌ها — در همهٔ تب‌ها در دسترس |
| تب‌های عملیاتی بر اساس `entityType` | مشتری: سفارشات + فرصت‌ها · تامین‌کننده: سفارشات خرید + استعلام‌ها |
| ریسمان بازگشت | لینک‌های عمیق با `withReturnParams` |

```
┌─────────────────────────────────────────────────────────────┐
│ Topbar: بازگشت هوشمند │ افزودن فرد مرتبط (حقوقی)           │
├──────────────┬──────────────────────────────────────────────┤
│ Sidebar 25%  │ Main 75%                                     │
│ Identity     │ ┌──────────────────────────────────────────┐ │
│ Financial    │ │ MagicInput (پویش — سراسری)               │ │
│ Contacts     │ └──────────────────────────────────────────┘ │
│ Persons      │ ┌──────────────────────────────────────────┐ │
│              │ │ ProfileTabs (تمام‌عرض هم‌تراز نوار بالا) │ │
│              │ └──────────────────────────────────────────┘ │
│              │ Tab panel + ProfileTabSectionHeader (شیشه)   │
└──────────────┴──────────────────────────────────────────────┘
```

---

## ۲) نقشهٔ فایل‌های کلیدی (کد این سشن)

### ۲.۱ صفحه و استایل پروفایل

| فایل | نقش |
|------|-----|
| `src/modules/kanoon/CustomerProfilePage.jsx` | Composition layer — سایدبار، MagicInput، تب‌ها، پنل‌ها |
| `src/modules/kanoon/customerProfile.css` | Glass / timeline / tabs / supply filters |
| `src/modules/kanoon/companyProfileTabs.js` | کنترلر تب مشتری در برابر تامین‌کننده |
| `src/modules/kanoon/buildCompanyTimelineEvents.js` | ساخت فید زمانی از سفارش / تعامل / پرداخت / استعلام |
| `src/modules/kanoon/supplierSupplyBinding.js` | خواندن استعلام و PO از سفارش‌های نبض برای تامین‌کننده |
| `src/modules/kanoon/SupplierSupplyPanels.jsx` | UI تب سفارشات خرید و استعلام‌ها + فیلترها |

### ۲.۲ پویش (Pooyesh)

| فایل | نقش |
|------|-----|
| `src/modules/pooyesh/PooyeshInteractionsPanel.jsx` | تب تعاملات + **export** `MagicInput` |
| `src/modules/pooyesh/pooyeshInteractionsBinding.js` | `listCompanyInteractions(company)` |
| `src/modules/pooyesh/pooyesh-panel.css` | استایل پنل پویش |

### ۲.۳ گاه‌شمار / دبیرخانه (Gahshomar lens)

| فایل | نقش |
|------|-----|
| `src/modules/gahshomar/GahshomarDocumentsPanel.jsx` | تب اسناد و مکاتبات (دبیرخانه) |
| `src/modules/gahshomar/correspondenceBinding.js` | `listCompanyCorrespondence` → فعلاً `[]` |
| `src/modules/gahshomar/gahshomar-documents.css` | استایل دبیرخانه |

> **توجه معماری:** مسیر زنده `/gahshomar` هنوز **موتور تعهدات** (`CommitmentEngine`) است، نه SoR نامه‌ها. پنل پروفایل فقط **لنز دبیرخانه** است.

### ۲.۴ ناوبری و لینک موجودیت

| فایل | نقش |
|------|-----|
| `src/components/navigation/SmartBackButton.jsx` | `withReturnParams` / `buildReturnQuery` |
| `src/components/navigation/entityMentions.js` | پارسر کد سفارش / نام شرکت / مسیرها |
| `src/components/navigation/EntityMentionText.jsx` | رندر لینک‌های عمیق در متن |
| `src/components/navigation/entity-mentions.css` | توکن رنگ برند + underline |

### ۲.۵ لایه‌اوت مشترک پروفایل

| فایل | نقش |
|------|-----|
| `src/components/profileLayout/ProfilePageShell.jsx` | پوستهٔ صفحه |
| `src/components/profileLayout/ProfileTabs.jsx` | tablist دسترس‌پذیر |
| `src/components/profileLayout/ProfileTabSectionHeader.jsx` | هدر شیشه‌ای یکسان تب‌ها (+ slot اکشن) |
| `src/components/profileLayout/index.js` | barrel exports |

### ۲.۶ استور و داده

| فایل | نقش |
|------|-----|
| `src/stores/useContactsStore.js` | SSOT شرکت + `addInteraction` (مسیر نوشتن پویش روی Company) |
| `src/modules/kanoon/contactsData.js` | seed مشتری / تامین‌کننده |
| `src/modules/registry.js` | کپی دبیرخانه (بدون تماس/وظیفهٔ CRM) |

### ۲.۷ تست

| فایل | نقش |
|------|-----|
| `src/domain/__tests__/entityMentions.test.js` | نرمال‌سازی کد JR و توکنایز |

---

## ۳) آنالیز معماری دامنه (مرزها)

### ۳.۱ پویش در برابر گاه‌شمار (DDL-09)

| | **پویش** | **گاه‌شمار (دبیرخانه در پروفایل)** |
|--|----------|-------------------------------------|
| مالک UX | تب تعاملات + MagicInput سراسری | تب اسناد و مکاتبات |
| داده امروز | `contact.interactions` از طریق `addInteraction` | هنوز store نامه ندارد → `[]` |
| مجاز | تماس، جلسه، پیگیری، یادداشت فروش، تسک | نامه وارده/صادره، اندیکاتور، PDF، مهلت رسمی |
| ممنوع | نامه رسمی به‌عنوان Activity | تماس و یادداشت فروش |

`CustomerProfilePage` **حالت دامنه ندارد**؛ فقط پنل‌ها را mount می‌کند.

### ۳.۲ مشتری در برابر تامین‌کننده

هر دو `Company` در `useContactsStore` با `entityType`:

- مشتری: سفارش فروش با `order.customerId`
- تامین‌کننده: استعلام/PO با `inquiry.supplierId` / خطوط تدارک — **نه** `customerId`

کنترلر تب: `getCompanyProfileTabs(entityType)` / `resolveCompanyProfileTab`.

### ۳.۳ SSOT و آینده

- Activity SSOT مستقل پویش: **هنوز ساخته نشده** (فیلد روی Company مانده — DDL-09).
- Document SoR دبیرخانه: **هنوز ساخته نشده**.
- `/gahshomar` زنده = projection تعهدات؛ با دبیرخانه قاطی نشود.

---

## ۴) شرح کامل ۱۰ پرامپت (به‌ترتیب زمانی)

### پرامپت ۱ — جداسازی مالکیت پویش و گاه‌شمار

**درخواست:** تعاملات فقط پویش؛ اسناد فقط دبیرخانه؛ صفحه فقط composition.

**آنالیز:** نشت دامنه — تایم‌لاین تعامل به‌اشتباه با گاه‌شمار یکی انگاشته می‌شد؛ SoR نامه وجود نداشت.

**اقدام:**
- استخراج `PooyeshInteractionsPanel` + `MagicInput`
- `GahshomarDocumentsPanel` + `correspondenceBinding`
- ثبت **DDL-09**
- پاک‌سازی copy رجیستری گاه‌شمار از وظیفه/جلسهٔ CRM

**کد مرجع — binding پویش:**

```js
// src/modules/pooyesh/pooyeshInteractionsBinding.js
export function listCompanyInteractions(company) {
  return Array.isArray(company?.interactions) ? company.interactions : [];
}
```

**کد مرجع — binding دبیرخانه:**

```js
// src/modules/gahshomar/correspondenceBinding.js
export function listCompanyCorrespondence(companyId) {
  if (companyId == null || companyId === '') return [];
  return []; // SoR هنوز نیست — فقط لنز UI
}
```

---

### پرامپت ۲ — Rollback لایه‌اوت + تایم‌لاین وقایع

**درخواست:** برگرداندن چیدمان ۲۵/۷۵ محبوب؛ تب اول = تایم‌لاین وقایع.

**آنالیز:** هاب تمام‌عرض KPI هدر، ارگونومی قبلی را شکسته بود.

**اقدام:**
- بازگردانی `aside.kprofile__side` + `main.kprofile__main`
- حذف `ProfileHubHeader` از مسیر اصلی
- تب پیش‌فرض `timeline` با `buildCompanyTimelineEvents`
- نگه‌داشتن تب‌های دامنه روی همان لایه‌اوت

**رویدادهای فید:** سفارش، پیگیری، پرداخت، صورتحساب/پیش‌فاکتور (و برای تامین‌کننده: استعلام + سفارش خرید).

---

### پرامپت ۳ — نوار ثبت سریع بالای تب‌ها

**درخواست:** `MagicInput` قفل به یک تب نباشد.

**آنالیز:** ثبت فعالیت باید قبل از انتخاب تب در دسترس باشد.

**اقدام:**
- `export function MagicInput` از ماژول پویش
- قرارگیری در `kprofile-quick-activity` **بالای** `ProfileTabs`
- حذف دوباره از داخل تب تعاملات
- نوشتن همچنان `useContactsStore.addInteraction` → به‌روزرسانی فید/تایم‌لاین از همان store

---

### پرامپت ۴ — Commit و Push

**درخواست:** `git add` + commit با پیام مشخص + push.

**نتیجه:** تست‌ها پاس شدند؛ عملیات commit/push به‌خاطر تأیید Smart Mode **قطع/بلاک** شد و در این سشن روی remote نهایی نشد. تغییرات عمدتاً local ماندند.

---

### پرامپت ۵ — حذف تب مشخصات و کارنامه

**درخواست:** فقط تب حذف شود.

**اقدام:** حذف از `PROFILE_TABS` / کنترلر تب؛ `?tab=specs` → `timeline`؛ کامپوننت `SpecsPanel` در فایل مانده ولی mount نمی‌شود.

---

### پرامپت ۶ — عرض تب‌ها = عرض فیلد پویش

**درخواست:** بک‌گراند سفید/شیشه تب‌ها هم‌عرض نوار ثبت.

**اقدام (CSS):**

```css
.kprofile-tabs {
  display: flex;
  width: 100%;
  align-self: stretch;
  /* ... glass tokens ... */
}
.kprofile-tabs__btn {
  flex: 1 1 0;
  justify-content: center;
}
```

---

### پرامپت ۷ — یکسان‌سازی هدر تب‌ها

**درخواست:** همه تب‌ها هدر عنوان + زیرعنوان داخل باکس شیشه مثل سوابق/تعاملات/اسناد.

**اقدام:** `ProfileTabSectionHeader` مشترک؛ اعمال روی سفارشات، فرصت‌ها، صورت‌حساب، پویش، دبیرخانه، تایم‌لاین، و تب‌های تامین.

```jsx
// src/components/profileLayout/ProfileTabSectionHeader.jsx
export default function ProfileTabSectionHeader({ title, subtitle, Icon, action }) {
  return (
    <header className="kprofile-tab-head kprofile-glass">
      {Icon ? <span className="kprofile-tab-head__badge"><Icon size={16} /></span> : null}
      <div className="kprofile-tab-head__text">
        <h2 className="kprofile-tab-head__title font-meem">{title}</h2>
        {subtitle ? <p className="kprofile-tab-head__subtitle font-meem">{subtitle}</p> : null}
      </div>
      {action ? <div className="kprofile-tab-head__action">{action}</div> : null}
    </header>
  );
}
```

---

### پرامپت ۸ — دکمه ثبت سفارش جدید داخل هدر (چپ)

**درخواست:** داخل باکس هدر، منتهاالیه چپ.

**اقدام:** پاس `action={<Link … ثبت سفارش جدید />}` به هدر؛ `margin-inline-start: auto` در RTL دکمه را چپ می‌چسباند.

---

### پرامپت ۹ — دیپ‌لینک موجودیت‌ها در تایم‌لاین

**درخواست:** کد سفارش / نام شرکت / مسیرها قابل کلیک؛ حفظ ریسمان بازگشت.

**آنالیز:** بدون `withReturnParams` کاربر از کانون → نبض می‌رود و دکمه بازگشت هوشمند نقطهٔ قبلی را گم می‌کند.

**اقدام:**
- پارسر `tokenizeEntityMentions` (الگوی `JR…`، نام شرکت، `/nabz/order/…`, `/kanoon/contact/…`)
- `EntityMentionText` با `withReturnParams(path, returnTo, returnName)`
- `returnTo` نمونه: `/kanoon/contact/${id}?tab=timeline`
- اعمال در تایم‌لاین وقایع و فید پویش

```js
// نمونه مسیر سفارش
export function orderDeepLinkPath(code) {
  const normalized = normalizeOrderCode(code);
  if (!normalized) return null;
  return `/nabz/order/${encodeURIComponent(normalized)}`;
}
```

---

### پرامپت ۱۰ — پروفایل تامین‌کننده (همان لایه‌اوت)

**درخواست:** وحدت UI؛ فقط تب‌های عملیاتی عوض شوند.

**اقدام:**
- `companyProfileTabs.js` — کنترلر مشترک
- مشتری: سفارشات + فرصت‌ها
- تامین‌کننده: سفارشات خرید + استعلام‌ها (فیلتر: تاریخ، سفارش هدف، قیمت، نوع تامین، شرح)
- `supplierSupplyBinding` از سفارش‌های نبض می‌خواند
- تایم‌لاین تامین‌کننده رویداد استعلام/PO می‌گیرد

```js
export function getCompanyProfileTabs(entityType) {
  return entityType === ENTITY_TYPES.SUPPLIER
    ? SUPPLIER_PROFILE_TABS
    : CUSTOMER_PROFILE_TABS;
}
```

---

## ۵) ماتریس تب‌ها (وضعیت نهایی)

| id | برچسب | مشتری | تامین‌کننده | پنل |
|----|--------|-------|-------------|-----|
| `timeline` | سوابق و وقایع | ✓ | ✓ | `EventsTimelinePanel` |
| `orders` | سفارشات | ✓ | — | `OrdersPanel` |
| `opportunities` | فرصت‌ها | ✓ | — | Coming soon (افق) |
| `purchases` | سفارشات خرید | — | ✓ | `SupplierPurchaseOrdersPanel` |
| `inquiries` | استعلام‌ها | — | ✓ | `SupplierInquiriesPanel` |
| `interactions` | تعاملات | ✓ | ✓ | `PooyeshInteractionsPanel` |
| `documents` | اسناد و مکاتبات | ✓ | ✓ | `GahshomarDocumentsPanel` |
| `financial` | صورت‌حساب مالی | ✓ | ✓ | Coming soon |

مپینگ legacy: `orders` روی تامین‌کننده → `purchases`؛ `opportunities` → `inquiries`؛ `specs` → `timeline`.

---

## ۶) جریان داده (ساده)

```
[کاربر در پروفایل]
        │
        ├─ MagicInput ──addInteraction──► useContactsStore.contacts[].interactions
        │                                      │
        │                                      ├─► تب تعاملات (پویش)
        │                                      └─► تب سوابق (timeline builder)
        │
        ├─ تب سفارشات (مشتری) ──filter customerId──► useNabzOrders
        │
        ├─ تب خرید/استعلام (تامین) ──supplierId در inquiry/PO──► useNabzOrders
        │
        └─ لینک JR… / شرکت ──withReturnParams──► نبض یا کانون + SmartBack
```

---

## ۷) قواعد UI که در این سشن قفل شدند

1. Glassmorphism با توکن‌های تم (`--glass-bg`, `--glass-border`, …) — بدون بلوک سنگین ad-hoc.
2. تایپوگرافی: **Meem** متن فارسی، **Yekan Bakh** (`font-yekan`) اعداد و کدها.
3. فقط `lucide-react` برای آیکن — بدون ایموجی UI.
4. هدر تب یکسان: آیکن + عنوان + زیرعنوان (+ اکشن اختیاری چپ).
5. عرض نوار تب = عرض نوار ثبت پویش (`width: 100%`).
6. صفحه پروفایل **مالک state دامنه نیست**.

---

## ۸) کارهای باز / بدهی آگاهانه

| موضوع | وضعیت |
|--------|--------|
| Commit/push این بسته روی remote | در سشن بلاک شد — نیاز به تأیید کاربر |
| Activity SSOT مستقل پویش | آینده (DDL-09) |
| Persist مکاتبات دبیرخانه | آینده؛ فعلاً empty binding |
| جدا کردن CommitmentEngine از برندینگ دبیرخانه در `/gahshomar` | هنوز تعهدات است |
| فرصت‌ها / صورت‌حساب مالی | Coming soon |
| `SpecsPanel` بدون تب | کد مانده، mount نیست |

---

## ۹) چک‌لیست تست دستی پیشنهادی

1. باز کردن مشتری حقوقی → سایدبار + MagicInput + ۶ تب مشتری.
2. ثبت فعالیت از نوار بالا → ظاهر شدن در سوابق و تعاملات.
3. کلیک روی کد `JR…` در تایم‌لاین → نبض + «بازگشت به پروفایل».
4. تب سفارشات → دکمه ثبت سفارش داخل هدر چپ.
5. سوییچ به تامین‌کننده (مثلاً id=5) → تب‌های خرید/استعلام + فیلترها.
6. تب اسناد → empty دبیرخانه (بدون متن تماس/پیگیری).

---

## ۱۰) ایندکس کپی سریع برای برداشتن

اگر فقط فایل‌های «قلب» این سشن را می‌خواهید آرشیو کنید:

```
Docs/architecture/COMPANY_PROFILE_HUB_SESSION_PACK.md   ← همین سند
Docs/architecture/DOMAIN_DECISION_LOG.md                 ← DDL-09

src/modules/kanoon/CustomerProfilePage.jsx
src/modules/kanoon/customerProfile.css
src/modules/kanoon/companyProfileTabs.js
src/modules/kanoon/buildCompanyTimelineEvents.js
src/modules/kanoon/supplierSupplyBinding.js
src/modules/kanoon/SupplierSupplyPanels.jsx

src/modules/pooyesh/**
src/modules/gahshomar/**

src/components/profileLayout/ProfileTabSectionHeader.jsx
src/components/profileLayout/ProfileTabs.jsx
src/components/navigation/entityMentions.js
src/components/navigation/EntityMentionText.jsx
src/components/navigation/entity-mentions.css
src/components/navigation/SmartBackButton.jsx

src/stores/useContactsStore.js
src/domain/__tests__/entityMentions.test.js
```

---

*پایان بستهٔ معماری سشن پروفایل مخاطب — برای handoff به تیم / PO / آرشیو شخصی.*
