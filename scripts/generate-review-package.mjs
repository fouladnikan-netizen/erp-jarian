#!/usr/bin/env node
/**
 * Generates Docs/review-package/REVIEW_0{1..4}_*.md with full embedded sources.
 * No summarization / no truncation of source files.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'Docs', 'review-package');

function read(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    return `/* MISSING FILE: ${rel} */\n`;
  }
  return fs.readFileSync(abs, 'utf8');
}

function fence(rel, langHint) {
  const ext = path.extname(rel).slice(1);
  const lang = langHint || ({
    js: 'javascript',
    jsx: 'jsx',
    css: 'css',
    json: 'json',
    html: 'html',
    md: 'markdown',
  }[ext] || '');
  const body = read(rel);
  const lines = body.split(/\r?\n/).length;
  const note = lines > 400 ? `\n> **توجه:** این فایل طولانی است (${lines} خط) — در ادامه به‌صورت کامل آمده است.\n` : '';
  return `${note}\n### \`${rel}\`\n\n\`\`\`${lang}\n${body}\n\`\`\`\n`;
}

function fenceMany(rels) {
  return rels.map((r) => fence(r)).join('\n');
}

function treeSrc() {
  const files = [];
  function walk(dir, prefix = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.name !== '.DS_Store' && e.name !== 'node_modules')
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });
    for (const e of entries) {
      const rel = path.join(prefix, e.name);
      if (e.isDirectory()) {
        files.push(`${rel}/`);
        walk(path.join(dir, e.name), rel);
      } else {
        files.push(rel);
      }
    }
  }
  walk(path.join(ROOT, 'src'), 'src');
  return files.join('\n');
}

fs.mkdirSync(OUT, { recursive: true });

/* ═══════════════════════════════ FILE 1 ═══════════════════════════════ */
{
  const md = `# REVIEW_01 — Architecture

تاریخ تولید: ${new Date().toISOString()}
پروژه: ERP-Jaryan (جریان)
نسخه package.json: \`0.2.0\`

---

## 1. مشخصات کلی

| مورد | مقدار |
|---|---|
| نوع پروژه | SPA فرانت‌اند (بدون سرور اختصاصی در این ریپو) |
| فریم‌ورک فرانت | React **19.2.7** (lock) — اعلام شده در package.json به صورت \`^19.1.0\` |
| React DOM | **19.2.7** |
| Routing | react-router-dom **7.18.1** |
| ابزار Build / Dev | Vite **6.4.3** + \`@vitejs/plugin-react\` **4.7.0** |
| زبان | JavaScript (JSX) — **بدون TypeScript** در سورس اصلی |
| Runtime | Node.js **v24.18.0** (محیط تولید مستند) / npm **11.16.0** |
| فریم‌ورک بک‌اند | **وجود ندارد** در این ریپو — داده و منطق در کلاینت (Context + سرویس‌های JS) |
| ماژول سیستم | \`"type": "module"\` (ESM) |

### package.json (کامل)

${fence('package.json')}

### vite.config.js (کامل)

${fence('vite.config.js')}

### index.html (کامل)

${fence('index.html')}

### نقطه ورود

${fence('src/main.jsx')}

---

## 2. ساختار درختی (فرانت)

> بک‌اند جداگانه در این ریپو وجود ندارد. درخت زیر فقط \`src/\` و ریشه پروژه (بدون \`node_modules\`) است.

### ریشه پروژه (منابع مرتبط)

\`\`\`
.
├── package.json
├── package-lock.json
├── vite.config.js
├── index.html
├── public/
├── Assets/
├── Docs/
├── scripts/
├── screenshots/
└── src/
\`\`\`

### درخت کامل \`src/\` (تا سطح فایل)

\`\`\`
${treeSrc()}
\`\`\`

---

## 3. State Management

ابزار: **React Context API** (بدون Redux / Zustand / Recoil).

### Context اصلی سفارشات نبض

${fence('src/modules/nabz/NabzOrdersContext.jsx')}

### Theme Context

${fence('src/theme/ThemeContext.jsx')}

### داده اولیه سفارشات (seed)

${fence('src/modules/nabz/ordersData.js')}

سایر stateها: محلی در کامپوننت‌ها با \`useState\` / \`useMemo\` / \`useRef\` — بدون slice جدا.

---

## 4. Routing

منبع: \`src/App.jsx\`

| مسیر | کامپوننت | Guard / Middleware |
|---|---|---|
| \`/nabz/proforma/preview\` | \`ProformaPreviewPage\` | بدون Auth Guard — خارج از AppLayout |
| \`/nabz/shipping/preview\` | \`ShippingPreviewPage\` | بدون Auth Guard — خارج از AppLayout |
| \`/\` | \`KanoonPage\` | داخل \`AppLayout\` — بدون نقش‌محور |
| \`/vitrin\` | \`VitrinPage\` | داخل \`AppLayout\` |
| \`/ofogh\` | \`OfoqModule\` | داخل \`AppLayout\` |
| \`/nabz\` | \`NabzPage\` | \`NabzOrdersProvider\` (Outlet wrapper) |
| \`/nabz/order/:orderCode\` | \`OrderDetailPage\` | \`NabzOrdersProvider\` |
| سایر \`modules\` از registry | \`ModulePage\` | داخل \`AppLayout\` |
| \`*\` | \`Navigate\` → \`/\` | — |

### کد کامل Routing

${fence('src/App.jsx')}

### رجیستری ماژول‌ها

${fence('src/modules/registry.js')}

---

## 5. ارتباط فرانت با بک‌اند / API Client

**نتیجه ممیزی:** هیچ \`axios\`، \`fetch\` برای API دامنه، interceptor، یا لایه API client در سورس وجود ندارد.
داده‌ها از آرایه‌های در حافظه (\`ordersData\`, \`contactsData\`, \`catalogData\`, …) و Context خوانده/نوشته می‌شوند.
پیش‌نمایش پیش‌فاکتور/حواله از \`localStorage\` استفاده می‌کند (\`proformaPrint.js\` / \`shippingPrint.js\`).

### لایه «چاپ/پیش‌نمایش» مبتنی بر localStorage (نزدیک‌ترین جایگزین API)

${fence('src/modules/nabz/proformaPrint.js')}

${fence('src/modules/nabz/shippingPrint.js')}

---

## 6. متغیرهای محیطی

- فایل \`.env\` / \`.env.*\` در ریشه پروژه **یافت نشد**.
- استفاده از \`import.meta.env\` / \`process.env\` / \`VITE_*\` در سورس اپ **یافت نشد**.
- کلیدهای محیطی اعلام‌شده: **هیچ**.

---

## 7. مراحل هفت‌گانه سفارش (مرجع معماری)

منبع حقیقت: \`src/modules/nabz/config.js\`

| # | id | key | label |
|---|---|---|---|
| 1 | 1 | kavosh | کاوش |
| 2 | 2 | mozene | مظنه |
| 3 | 3 | pishkesh | پیش‌کش |
| 4 | 4 | parvane | ماشه تأمین |
| 5 | 5 | tadarok | تدارک |
| 6 | 7 | rahespar | رهسپار |
| 7 | 8 | saranjam | سرانجام |

> شناسه ۶ (\`tajhiz\` / تجهیز) منسوخ است و در کانبان فعال نیست.

${fence('src/modules/nabz/config.js')}

${fence('src/modules/nabz/phase2Config.js')}
`;
  fs.writeFileSync(path.join(OUT, 'REVIEW_01_ARCHITECTURE.md'), md);
  console.log('Wrote REVIEW_01_ARCHITECTURE.md', md.length);
}

/* ═══════════════════════════════ FILE 2 ═══════════════════════════════ */
{
  const stages = [
    {
      n: 1,
      title: 'کاوش (Kavosh)',
      files: [
        'src/modules/nabz/inquiryConfig.js',
        'src/modules/nabz/inquiryService.js',
        'src/modules/nabz/components/QuickInquiryModal.jsx',
        'src/modules/nabz/components/InquiryDraftForm.jsx',
        'src/modules/nabz/components/InquirySavedCard.jsx',
        'src/modules/nabz/components/quickInquiryParts.jsx',
        'src/modules/nabz/components/OrderInquiriesNestedTable.jsx',
        'src/modules/nabz/components/OrderItemsExpandPanel.jsx',
        'src/modules/nabz/suppliers.js',
      ],
    },
    {
      n: 2,
      title: 'مظنه (Mozene / Quoting)',
      files: [
        'src/modules/nabz/quotingConfig.js',
        'src/modules/nabz/quotingService.js',
        'src/modules/nabz/components/QuotingOrderTable.jsx',
        'src/modules/nabz/components/QuotingReadOnlyPanel.jsx',
        'src/modules/nabz/orderEditPermissions.js',
        'src/modules/nabz/components/MoneyInput.jsx',
      ],
    },
    {
      n: 3,
      title: 'پیش‌کش (Pishkesh / Proforma + Gateway)',
      files: [
        'src/modules/nabz/proformaConfig.js',
        'src/modules/nabz/proformaService.js',
        'src/modules/nabz/proformaPrint.js',
        'src/modules/nabz/ProformaPreviewPage.jsx',
        'src/modules/nabz/components/ProformaDocument.jsx',
        'src/modules/nabz/components/ProformaTab.jsx',
        'src/modules/nabz/components/ProformaHeaderActions.jsx',
        'src/modules/nabz/components/ProformaSeal.jsx',
        'src/modules/nabz/components/ProformaRevisionTag.jsx',
        'src/modules/nabz/components/InvoiceDocChrome.jsx',
        'src/modules/nabz/components/orderProfile/OrderProfileGatewayTab.jsx',
        'src/modules/nabz/components/orderProfile/gateway/GatewayPishkeshPanel.jsx',
        'src/modules/nabz/components/orderProfile/gateway/GatewayMorphTable.jsx',
        'src/modules/nabz/components/orderProfile/gateway/GatewayDecisionPanel.jsx',
        'src/modules/nabz/components/orderProfile/gateway/GatewayFinancialSummary.jsx',
        'src/modules/nabz/components/orderProfile/gateway/GatewayHorizontalStepper.jsx',
        'src/modules/nabz/components/orderProfile/gateway/GatewaySelect.jsx',
        'src/modules/nabz/components/orderProfile/gateway/PaymentTermsForm.jsx',
        'src/modules/nabz/components/orderProfile/gateway/DealCelebrationModal.jsx',
        'src/modules/nabz/gatewayDecisionConfig.js',
        'src/modules/nabz/gatewayDecisionService.js',
        'src/modules/nabz/gatewayLifecycleService.js',
        'src/modules/nabz/gatewayService.js',
        'src/modules/nabz/gatewayConfig.js',
        'src/modules/nabz/proforma.css',
      ],
    },
    {
      n: 4,
      title: 'ماشه تأمین (Parvane)',
      files: [
        'src/modules/nabz/parvaneStageService.js',
        'src/modules/nabz/components/orderProfile/operations/ParvaneStagePanel.jsx',
        'src/modules/nabz/phase2Service.js',
      ],
    },
    {
      n: 5,
      title: 'تدارک (Tadarok)',
      files: [
        'src/modules/nabz/tadarokStageConfig.js',
        'src/modules/nabz/tadarokStageService.js',
        'src/modules/nabz/components/orderProfile/operations/TadarokStagePanel.jsx',
        'src/modules/nabz/components/orderProfile/operations/PurchaseOrderModal.jsx',
        'src/modules/nabz/components/orderProfile/operations/PurchaseOrderSlideOver.css',
        'src/modules/nabz/components/orderProfile/operations/SplitLineModal.jsx',
        'src/modules/nabz/components/orderProfile/operations/QcDocumentModal.jsx',
        'src/modules/nabz/components/orderProfile/operations/QcDocumentModal.css',
        'src/modules/nabz/components/orderProfile/operations/QcStatusChip.jsx',
        'src/modules/nabz/qcInspectionConfig.js',
        'src/modules/nabz/components/orderProfile/operations/DeliveryOrderSelectionModal.jsx',
        'src/modules/nabz/deliveryInfoConfig.js',
        'src/modules/nabz/deliveryInfoService.js',
        'src/modules/nabz/components/DeliveryInfoForm.jsx',
        'src/modules/nabz/components/DeliveryLocationModal.jsx',
        'src/modules/nabz/warehouses.js',
      ],
    },
    {
      n: 6,
      title: 'رهسپار (Rahespar)',
      files: [
        'src/modules/nabz/rahseparLoadingService.js',
        'src/modules/nabz/components/orderProfile/operations/RahseparStagePanel.jsx',
        'src/modules/nabz/components/orderProfile/operations/RahseparStagePanel.css',
        'src/modules/nabz/components/orderProfile/operations/RahseparTab.jsx',
        'src/modules/nabz/components/orderProfile/operations/PrintableSooratBar.jsx',
        'src/modules/nabz/components/orderProfile/operations/PrintableSooratBar.css',
        'src/modules/nabz/shippingService.js',
        'src/modules/nabz/shippingConfig.js',
        'src/modules/nabz/shippingPrint.js',
        'src/modules/nabz/ShippingPreviewPage.jsx',
        'src/modules/nabz/components/ShippingDocument.jsx',
        'src/modules/nabz/shipping.css',
        'src/modules/nabz/carriers.js',
      ],
    },
    {
      n: 7,
      title: 'سرانجام (Saranjam) — با جزئیات کامل',
      files: [
        'src/modules/nabz/saranjamSettlementService.js',
        'src/modules/nabz/components/orderProfile/operations/SaranjamStagePanel.jsx',
        'src/modules/nabz/components/orderProfile/operations/SaranjamTab.jsx',
        'src/modules/nabz/components/orderProfile/operations/SaranjamSettlementLayout.jsx',
        'src/modules/nabz/components/orderProfile/operations/SaranjamTab.css',
        'src/modules/nabz/components/orderProfile/operations/printTaxInvoice.js',
        'src/modules/nabz/operationalRecordsService.js',
      ],
    },
  ];

  const sharedShell = [
    'src/modules/nabz/NabzPage.jsx',
    'src/modules/nabz/OrderDetailPage.jsx',
    'src/modules/nabz/orderStageService.js',
    'src/modules/nabz/orderProfileService.js',
    'src/modules/nabz/orderProfileConfig.js',
    'src/modules/nabz/hooks/useOrderPipelineView.js',
    'src/modules/nabz/components/orderProfile/OrderProfileView.jsx',
    'src/modules/nabz/components/orderProfile/OrderProfileChrome.jsx',
    'src/modules/nabz/components/orderProfile/OrderProfileOperationsTab.jsx',
    'src/modules/nabz/components/orderProfile/OrderProfileConfirmDialog.jsx',
    'src/modules/nabz/components/orderProfile/OrderProfileCancelDialog.jsx',
    'src/modules/nabz/components/orderProfile/OrderProfileAttachmentsTab.jsx',
    'src/modules/nabz/components/NabzKanban.jsx',
    'src/modules/nabz/components/NabzOrderTable.jsx',
    'src/modules/nabz/components/NabzToolbar.jsx',
    'src/modules/nabz/components/NabzKpis.jsx',
    'src/modules/nabz/constants.js',
    'src/modules/nabz/dateUtils.js',
    'src/modules/nabz/orderCode.js',
    'src/modules/nabz/numberToPersianWords.js',
    'src/modules/nabz/createOrder.js',
    'src/components/jarian/JarianPresentation.jsx',
    'src/config/JarianUI.config.js',
  ];

  let md = `# REVIEW_02 — Frontend (۷ مرحله سفارش)

تاریخ تولید: ${new Date().toISOString()}

> این فایل کد **کامل** کامپوننت‌ها/سرویس‌های هر مرحله را دارد. هیچ فایلی کوتاه نشده است.
> زبان پروژه JS/JSX است؛ فایل TypeScript/\`.d.ts\` برای مدل‌ها وجود ندارد — شکل داده در سرویس‌ها و seedها تعریف شده.

---

## پوسته مشترک پروفایل سفارش / لیست نبض

${fenceMany(sharedShell)}

---
`;

  for (const stage of stages) {
    md += `\n## مرحله ${stage.n}: ${stage.title}\n\n`;
    md += fenceMany(stage.files);
    md += '\n---\n';
  }

  md += `\n## استایل سراسری ماژول نبض (طولانی)\n\n`;
  md += fence('src/modules/nabz/nabz.css');

  fs.writeFileSync(path.join(OUT, 'REVIEW_02_FRONTEND.md'), md);
  console.log('Wrote REVIEW_02_FRONTEND.md', md.length);
}

/* ═══════════════════════════════ FILE 3 ═══════════════════════════════ */
{
  const md = `# REVIEW_03 — Backend / Database / Domain Logic

تاریخ تولید: ${new Date().toISOString()}

---

## 1. وضعیت بک‌اند و دیتابیس

**این ریپو بک‌اند مستقل، Migration، Prisma/ORM، SQL، یا کالکشن Mongo ندارد.**

| مورد | وضعیت |
|---|---|
| Schema DB / Prisma / Entity | وجود ندارد |
| REST/GraphQL Endpoint | وجود ندارد |
| Auth سرور | وجود ندارد |
| آپلود فایل به سرور | وجود ندارد (شبیه‌سازی کلاینتی) |

مدل داده به‌صورت objectهای JavaScript در حافظه مرورگر نگه داشته می‌شود (\`NabzOrdersContext\` + seed \`ordersData.js\`).

---

## 2. مدل داده منطقی (معادل Schema متنی)

### موجودیت Order (سفارش)

فیلدهای اصلی مشاهده‌شده در \`ordersData.js\` / سرویس‌ها:

| فیلد | نوع منطقی | توضیح |
|---|---|---|
| id | number | کلید داخلی |
| code | string | کد سفارش نمایشی |
| customerId | number | FK منطقی به مشتری |
| customer | string | نام نمایشی |
| assignee | string | کارشناس |
| orderType | string | نوع سفارش |
| saleType | string | رسمی / غیر رسمی |
| isOfficial | boolean | پرچم رسمی (جدید) |
| stageId | number | مرحله جاری (۱..۸ بدون ۶) |
| status | string | current / success / failed |
| items[] | array | اقلام |
| quoting | object | حاشیه سود |
| proforma | object | نسخه‌های پیش‌فاکتور |
| gatewayDecision | object | تعیین تکلیف |
| tadarokLines | array | خطوط تدارک |
| rahsepar | object | بارگیری/تخصیص |
| saranjam | object | تسویه/بایگانی |
| events[] | array | لاگ رویداد |
| attachments[] | array | پیوست‌ها (شبیه‌سازی) |
| qcInspections | object | کنترل کیفیت |

### روابط متنی (ERD متنی)

- Customer **۱—N** Order
- Order **۱—N** OrderItem
- OrderItem **۱—N** Inquiry
- Order **۱—N** ProformaVersion
- Order **۱—N** TadarokLine / PurchaseOrder
- Order **۱—N** LoadItem state (rahsepar.lineStates)
- Order **۱—N** Event
- Order **۱—N** Attachment (client mock)
- Order **۱—۱** GatewayDecision / SaranjamSettlement (منطقی)

### Seed کامل سفارشات

${fence('src/modules/nabz/ordersData.js')}

### مشتریان / تامین‌کنندگان (داده مرجع کلاینت)

${fence('src/modules/nabz/customers.js')}

${fence('src/modules/nabz/suppliers.js')}

---

## 3. Endpointهای API

**هیچ Endpoint HTTP سروری در این پروژه تعریف نشده است.**

نزدیک‌ترین «قراردادها»:

1. مسیرهای React Router (مستند در REVIEW_01)
2. \`postMessage\` بین پنجره پیش‌فاکتور و opener (\`PROFORMA_SEND_MESSAGE_TYPE\` / \`PROFORMA_SIGNED_MESSAGE_TYPE\`)
3. کلیدهای \`localStorage\` برای payload پیش‌نمایش

### نمونه «قرارداد» postMessage پیش‌فاکتور

\`\`\`javascript
// Request (از ProformaPreviewPage به opener)
{
  type: 'nabz-proforma-signed', // یا nabz-proforma-send
  orderId: number,
  versionId: string,
  documentNumber: string,
  attachment?: { name, type, size, note },
  channel?: 'email' | 'sms' | 'whatsapp',
  signed?: boolean
}
\`\`\`

Response: ندارد (side-effect روی state opener).

---

## 4. منطق محاسباتی (کلاینت)

### نقل‌قول / سود / مالیات — \`quotingService.js\` (کامل)

${fence('src/modules/nabz/quotingService.js')}

خلاصه فرمول‌ها (مرجع؛ کد بالا منبع حقیقت است):

- رسمی Base: \`(quote + profit) / 1.1\`
- غیررسمی Base: \`quote + profit\` سپس \`× 1.10\` داخل فی
- VAT رسمی exclusive: \`round(subtotal * 0.1)\`
- جمع کل: \`subtotal + vatAmount\`

### تسویه سرانجام / تراز / انحراف — \`saranjamSettlementService.js\` (کامل)

${fence('src/modules/nabz/saranjamSettlementService.js')}

### سرانجام UI + فرمول‌های محلی (مثلاً VAT_RATE در تب فاکتور)

${fence('src/modules/nabz/components/orderProfile/operations/SaranjamTab.jsx')}

${fence('src/modules/nabz/components/orderProfile/operations/SaranjamSettlementLayout.jsx')}

${fence('src/modules/nabz/components/orderProfile/operations/SaranjamStagePanel.jsx')}

### پیش‌فاکتور

${fence('src/modules/nabz/proformaService.js')}

### رهسپار / وزن باسکول

${fence('src/modules/nabz/rahseparLoadingService.js')}

### تدارک

${fence('src/modules/nabz/tadarokStageService.js')}

### ماشه تأمین

${fence('src/modules/nabz/parvaneStageService.js')}

### فاز عملیاتی

${fence('src/modules/nabz/phase2Service.js')}

---

## 5. State Machine مراحل هفت‌گانه

${fence('src/modules/nabz/orderStageService.js')}

${fence('src/modules/nabz/gatewayLifecycleService.js')}

${fence('src/modules/nabz/gatewayDecisionService.js')}

${fence('src/modules/nabz/orderProfileService.js')}

${fence('src/modules/nabz/config.js')}

${fence('src/modules/nabz/phase2Config.js')}

انتقال‌های کلیدی (منطقی):

1. کاوش → مظنه: تکمیل استعلام‌ها
2. مظنه → پیش‌کش: تکمیل حاشیه سود
3. پیش‌کش → ماشه تأمین: صدور+مهر پیش‌فاکتور و تعیین تکلیف موفق
4. ماشه تأمین → تدارک: تأیید دستور خرید
5. تدارک → رهسپار: خرید/QC/آمادگی ارسال
6. رهسپار → سرانجام: نهایی‌سازی بارگیری
7. سرانجام: تأیید مالی و بایگانی

مجوز ویرایش حاشیه سود: \`orderEditPermissions.js\`

${fence('src/modules/nabz/orderEditPermissions.js')}

---

## 6. احراز هویت و سطوح دسترسی

**Auth سرور / JWT / Role matrix سروری وجود ندارد.**

مجوزهای کلاینتی محدود:

${fence('src/modules/nabz/orderEditPermissions.js')}

${fence('src/modules/nabz/constants.js')}

\`CURRENT_USER\` ثابت رشته‌ای در constants است — لاگین واقعی پیاده نشده.

---

## 7. مدیریت فایل‌های پیوست

پیاده‌سازی کلاینتی/شبیه‌سازی در پروفایل سفارش و سرانجام:

${fence('src/modules/nabz/components/orderProfile/OrderProfileAttachmentsTab.jsx')}

${fence('src/modules/nabz/operationalRecordsService.js')}

بخش آپلود فیش/فاکتور در \`SaranjamTab.jsx\` (بالا کامل آمده) و سرویس settlement.

آپلود واقعی به object-storage/API: **پیاده‌سازی نشده**.
`;
  fs.writeFileSync(path.join(OUT, 'REVIEW_03_BACKEND_DB.md'), md);
  console.log('Wrote REVIEW_03_BACKEND_DB.md', md.length);
}

/* ═══════════════════════════════ FILE 4 ═══════════════════════════════ */
{
  // TODO scan
  const todoHits = [];
  function scanTodos(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist' || e.name === 'Assets' || e.name === '.tools') continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) scanTodos(abs);
      else if (/\.(js|jsx|css|html|md)$/.test(e.name)) {
        const text = fs.readFileSync(abs, 'utf8');
        const lines = text.split(/\r?\n/);
        lines.forEach((line, i) => {
          if (/\b(TODO|FIXME|HACK|XXX)\b/.test(line)) {
            todoHits.push({
              file: path.relative(ROOT, abs),
              line: i + 1,
              text: line.trim(),
            });
          }
        });
      }
    }
  }
  scanTodos(ROOT);

  const todoTable = todoHits.length
    ? todoHits.map((h) => `| \`${h.file}\` | ${h.line} | \`${h.text.replace(/\|/g, '\\|')}\` |`).join('\n')
    : '| — | — | هیچ TODO/FIXME/HACK در سورس (خارج از Assets/node_modules) یافت نشد |';

  const md = `# REVIEW_04 — Design Quality / Lint / Tests

تاریخ تولید: ${new Date().toISOString()}

---

## 1. Design System

### توکن‌های CSS (\`variables.css\`) — کامل

${fence('src/styles/variables.css')}

### استایل سراسری

${fence('src/styles/index.css')}

${fence('src/styles/fonts.css')}

${fence('src/styles/layout.css')}

${fence('src/styles/components.css')}

### پروتکل جداول جریان (Jarian UI 2.0)

${fence('src/styles/jarian-ui.css')}

${fence('src/config/JarianUI.config.js')}

${fence('src/components/jarian/JarianPresentation.jsx')}

### Theme Context

${fence('src/theme/ThemeContext.jsx')}

پالت کلیدی (از variables / Jarian):

- Primary / Teal خانواده: \`#0d9488\`, \`#0ad1ba\`
- Glossy Red اکشن: \`#E53935\`
- Header جدول: \`#E8FAF7\`
- متن توضیحات کالا: \`#757575\`
- Zebra: \`#ffffff\` / \`rgba(243,244,246,0.85)\`

تایپوگرافی فارسی:

- \`Vazirmatn\` (متن/اعداد جدول)
- \`Meem\` (اسناد پیش‌فاکتور)
- \`Yekan Bakh\` (اعداد در برخی اسناد)

---

## 2. پیاده‌سازی RTL

- \`index.html\` / layout با \`direction: rtl\` در CSS ماژول‌ها
- کلاس‌های \`font-meem\` / \`font-yekan\` / \`font-vazir\`
- بدون کتابخانه \`stylis-plugin-rtl\` یا \`rtl-css-js\` — RTL دستی با CSS و \`dir\` روی سکشن‌ها

نمونه از layout:

${fence('src/styles/layout.css')}

${fence('src/components/layout/AppLayout.jsx')}

---

## 3. کامپوننت‌های مشترک UI — کد کامل

${fenceMany([
  'src/components/module/ModulePage.jsx',
  'src/components/module/DataTable.jsx',
  'src/components/module/KpiCard.jsx',
  'src/components/module/StatusTag.jsx',
  'src/components/module/ActionsBar.jsx',
  'src/components/layout/Header.jsx',
  'src/components/layout/Sidebar.jsx',
  'src/components/layout/ModuleIcons.jsx',
  'src/components/table/ResizableColGroup.jsx',
  'src/components/table/ResizableTh.jsx',
  'src/hooks/useResizableColumns.js',
  'src/components/jarian/JarianPresentation.jsx',
])}

دیالوگ‌های تأیید نبض:

${fence('src/modules/nabz/components/orderProfile/OrderProfileConfirmDialog.jsx')}

${fence('src/modules/nabz/components/orderProfile/OrderProfileCancelDialog.jsx')}

---

## 4. فرمت اعداد فارسی / تاریخ جلالی / پول — کد کامل

${fence('src/modules/nabz/dateUtils.js')}

${fence('src/modules/nabz/orderCode.js')}

${fence('src/modules/nabz/numberToPersianWords.js')}

${fence('src/modules/nabz/components/MoneyInput.jsx')}

${fence('src/modules/nabz/components/JalaliDatePicker.jsx')}

${fence('src/config/JarianUI.config.js')}

---

## 5. خروجی Lint

دستور اجراشده:

\`\`\`bash
npm run lint
# → Missing script: "lint"

npx eslint .
# → ESLint 10.8.0 — eslint.config.* یافت نشد
\`\`\`

**نتیجه:** اسکریپت lint و فایل پیکربندی ESLint در پروژه تعریف نشده است. خروجی خطا/هشدار lint قابل استخراج نیست (ابزار پیکربندی نشده).

اسکریپت‌های موجود در package.json: \`dev\`, \`build\`, \`preview\`, \`start\`.

---

## 6. فهرست TODO / FIXME / HACK

| فایل | خط | متن |
|---|---|---|
${todoTable}

---

## 7. وضعیت تست‌ها

- فایل \`*.test.*\` / \`*.spec.*\` / پوشه \`__tests__\`: **یافت نشد**
- فریم‌ورک تست (Jest/Vitest/Playwright) در dependencies: **وجود ندارد**
- نتیجه اجرا: قابل اجرا نیست (تستی تعریف نشده)

---

## 8. انطباق با استاندارد هویت بصری (یادداشت ممیزی)

- قانون جداول در \`.cursor/rules/jarian-unified-presentation.mdc\` و \`JarianUI.config.js\` هم‌راستا است.
- بعضی صفحات سند (پیش‌فاکتور) از فونت Meem و استایل اختصاصی \`proforma.css\` استفاده می‌کنند.
- رنگ‌آمیزی سلول‌های بدنه جدول برخلاف قانون ۲.۰ در برخی کلاس‌های قدیمی gateway ممکن است هنوز اثر بگذارد — نیاز به ممیزی بصری جدا.
`;

  fs.writeFileSync(path.join(OUT, 'REVIEW_04_DESIGN_QUALITY.md'), md);
  console.log('Wrote REVIEW_04_DESIGN_QUALITY.md', md.length);
}

console.log('Done →', OUT);
for (const f of fs.readdirSync(OUT)) {
  const st = fs.statSync(path.join(OUT, f));
  console.log(f, (st.size / 1024).toFixed(1) + ' KB');
}
