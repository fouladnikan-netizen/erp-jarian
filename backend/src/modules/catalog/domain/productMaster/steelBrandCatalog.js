/**
 * Initial carbon-steel Brand registry + Product Type allow-lists.
 * Runtime source of truth is PostgreSQL — do not import this from services,
 * routes, RBAC, or UI. Seed is insert-missing / bind-if-type-exists only.
 *
 * One Brand per mill (not one row per type-prefixed trade name).
 *
 * Operator-abbreviation adjustments (sku_code is /^[A-Za-z][A-Za-z0-9]{1,15}$/):
 * - IMPORT-CN → IMPORTCN (hyphen is not allowed)
 * - کرمانشاه / جهان فولاد غرب → JAHANW (JAHAN is جهان سیرجان)
 * - لوله دقیق کاوه ایرانیان → KAVEHI (KAVEH is کاوه تیکمه‌داش)
 * - کوثر اهواز → KOSAR (distinct from گروه ملی INSIG)
 * - لوله‌سازی اهواز → AHPIPE (distinct from گروه ملی and کوثر اهواز)
 * - ایران اسپیرال → IRSPIRAL (SPIRAL is اسپیرال / کوهپایه)
 * - اسپیرال اصفهان → ISSPIRAL
 * - سلفچگان لوله → SPPC (PARDIS is پردیس سلفچگان)
 * - خلیج فارس لوله → PGPIPE (ATIYEH is آتیه خلیج فارس)
 * - سدید لوله → SADID (AGS is آذر گستر سدید)
 * - سپاهان → SEPAHAN (SEPEHR is فولاد سپهر ایرانیان)
 * - ساوه لوله گالوانیزه / تست آب / تست گاز reuses SAVEH (نورد ساوه)
 * - لوله تست آب also reuses SEPANTA, SEPAHAN, KALUP, QAZVIN
 * - لوله تست گاز reuses SEPAHAN, SAVEH, SEPANTA; adds KEYHAN, YARAN, KACHO
 * - یاران → YARAN (ZANJAN is یاوران زنجان)
 * - کیان پرشیا → KIANP (PERSIAN is پرشین)
 * - تهران شرق → TSHARGH (TEHRAN is فولاد تهران)
 * - لوله جدار چاه reuses KALUP, NEYZAR; adds KIANP, TSHARGH, ATENA
 *
 * Same-mill merges:
 * - صنعت بناب + شاهین بناب → SANAT
 * - اشتهارد + صبا فولاد سمنان → ESHTE (SABA stays with صبا فولاد زاگرس)
 * - ورق/لوله وارداتی چین → IMPORTCN
 * - صبا فولاد منظومه uses MANZOOMEH (no separate abbreviation in the source list)
 *
 * Type alias: ورق سیاه → ورق ساده فولادی
 */

export const TYPE_NAME_ALIASES = Object.freeze({
  'ورق سیاه': 'ورق ساده فولادی',
  'ورق آجدار': 'ورق آجدار فولادی',
});

export const STEEL_BRANDS = Object.freeze([
  Object.freeze({ brandName: 'آذر گستر سدید', legalName: 'شرکت صنایع فولادی آذر گستر سدید', skuCode: 'AGS' }),
  Object.freeze({ brandName: 'کویر کاشان', legalName: 'شرکت تولیدی فولاد سپید فراب کویر', skuCode: 'KAVIR' }),
  Object.freeze({ brandName: 'نوین متین', legalName: 'شرکت نورد فولاد متین', skuCode: 'NMF' }),
  Object.freeze({ brandName: 'آیین صنعت', legalName: 'شرکت آیین صنعت', skuCode: 'AYIN' }),
  Object.freeze({ brandName: 'فولاد یزد احرامیان', legalName: 'شرکت نورد فولاد صنعتی و ساختمانی یزد', skuCode: 'YAZD' }),
  Object.freeze({ brandName: 'آتیه خلیج فارس', legalName: 'شرکت فولاد آتیه خاورمیانه؛ مجتمع فولاد آتیه خلیج فارس', skuCode: 'ATIYEH' }),
  Object.freeze({ brandName: 'ذوب‌آهن اصفهان', legalName: 'شرکت سهامی ذوب‌آهن اصفهان', skuCode: 'ESCO' }),
  Object.freeze({ brandName: 'فولاد خراسان', legalName: 'مجتمع فولاد خراسان', skuCode: 'KSC' }),
  Object.freeze({ brandName: 'راد همدان', legalName: 'ارابه نسیم هگمتانه فولاد راد', skuCode: 'RAD' }),
  Object.freeze({ brandName: 'صنعت بناب', legalName: 'مجتمع فولاد صنعت بناب', skuCode: 'SANAT' }),
  Object.freeze({ brandName: 'ظفر بناب', legalName: 'شرکت فولاد ظفر بناب', skuCode: 'ZAFER' }),
  Object.freeze({ brandName: 'سرمد ابرکوه', legalName: 'صنایع آهن و فولاد سرمد ابرکوه', skuCode: 'SAR' }),
  Object.freeze({ brandName: 'بافق یزد', legalName: 'فولاد بافق یزد', skuCode: 'BAFCO' }),
  Object.freeze({ brandName: 'حدید سیرجان', legalName: 'ذوب‌آهن و تولید میلگرد سیرجان حدید جنوب', skuCode: 'HASJ' }),
  Object.freeze({ brandName: 'جهان سیرجان', legalName: 'مجتمع جهان فولاد سیرجان', skuCode: 'JAHAN' }),
  Object.freeze({ brandName: 'قائم رازی', legalName: 'قایم پروفیل رازی', skuCode: 'QAEM' }),
  Object.freeze({ brandName: 'کاوه تیکمه‌داش', legalName: 'فولاد کاوه تیکمه‌داش', skuCode: 'KAVEH' }),
  Object.freeze({ brandName: 'آذر امین', legalName: 'فولاد آذر امین', skuCode: 'AZAM' }),
  Object.freeze({ brandName: 'امیرکبیر خزر', legalName: 'فولاد امیرکبیر خزر', skuCode: 'AKH' }),
  Object.freeze({ brandName: 'آناهیتا گیلان', legalName: 'فولاد آناهیتا گیلان', skuCode: 'ANAHITA' }),
  Object.freeze({ brandName: 'فایکو', legalName: 'شرکت فولاد البرز ایرانیان', skuCode: 'FAICO' }),
  Object.freeze({ brandName: 'گروه ملی', legalName: 'گروه ملی صنعتی فولاد ایران', skuCode: 'INSIG' }),
  Object.freeze({ brandName: 'کوثر اهواز', legalName: 'فولاد کوثر اهواز', skuCode: 'KOSAR' }),
  Object.freeze({ brandName: 'لوله‌سازی اهواز', legalName: 'گروه ملی صنعتی فولاد ایران – کارخانه لوله‌سازی', skuCode: 'AHPIPE' }),
  Object.freeze({ brandName: 'روهینا جنوب', legalName: 'مجتمع فولاد روهینا جنوب', skuCode: 'ROHINA' }),
  Object.freeze({ brandName: 'کاوه اروند', legalName: 'فولاد کاوه اروند', skuCode: 'KAVAR' }),
  Object.freeze({ brandName: 'پرشین', legalName: 'صنایع فولاد پرشین', skuCode: 'PERSIAN' }),
  Object.freeze({ brandName: 'آریان فولاد', legalName: 'شرکت نورد آریان فولاد', skuCode: 'ARIAN' }),
  Object.freeze({ brandName: 'سیادن ابهر', legalName: 'فولاد سیادن ابهر', skuCode: 'SIADAN' }),
  Object.freeze({ brandName: 'پردیس سلفچگان', legalName: 'صنعت تجارت پردیس آذربایجان', skuCode: 'PARDIS' }),
  Object.freeze({ brandName: 'هیربد', legalName: 'صنایع فولاد هیربد زرندیه', skuCode: 'HIRBOD' }),
  Object.freeze({ brandName: 'درپاد تبریز', legalName: 'کارخانجات گروه صنعتی درپاد تبریز', skuCode: 'DERPAD' }),
  Object.freeze({ brandName: 'شاهرود', legalName: 'فولاد شاهرود', skuCode: 'SHAHROOD' }),
  Object.freeze({ brandName: 'فولاد آذربایجان', legalName: 'فولاد آذربایجان', skuCode: 'MISCO' }),
  Object.freeze({ brandName: 'صبا فولاد زاگرس', legalName: 'صبا فولاد زاگرس', skuCode: 'SABA' }),
  Object.freeze({ brandName: 'فولاد نطنز', legalName: 'فولاد نطنز', skuCode: 'NATANZ' }),
  Object.freeze({ brandName: 'فولاد بردسیر', legalName: 'صنایع فولاد مشیز بردسیر', skuCode: 'BARDESIR' }),
  Object.freeze({ brandName: 'فولاد ارگ تبریز', legalName: 'فولاد ارگ تبریز', skuCode: 'ARG' }),
  Object.freeze({ brandName: 'جهان فولاد غرب', legalName: 'شرکت مجتمع جهان فولاد غرب', skuCode: 'JAHANW' }),
  Object.freeze({ brandName: 'خیام', legalName: 'شرکت فولاد خیام سپهر نیشابور', skuCode: 'KHAYAM' }),
  Object.freeze({ brandName: 'ماهان', legalName: 'شرکت پروفیل صنعت ماهان', skuCode: 'MAHAN' }),
  Object.freeze({ brandName: 'ناب تبریز', legalName: 'شرکت فولاد ناب تبریز', skuCode: 'NAB' }),
  Object.freeze({ brandName: 'کادمیر', legalName: 'کادمیر ترکیه', skuCode: 'TURKEY' }),
  Object.freeze({ brandName: 'شکفته مشهد', legalName: 'گروه صنعتی شکفته', skuCode: 'SHAKHTE' }),
  Object.freeze({ brandName: 'ظهوریان مشهد', legalName: 'شرکت نورد فولاد بارثاوا', skuCode: 'ZOHOURI' }),
  Object.freeze({ brandName: 'اسپیرال', legalName: 'شرکت صنایع فولاد کوهپایه', skuCode: 'SPIRAL' }),
  Object.freeze({ brandName: 'آونگان', legalName: 'شرکت آونگان نوید مرکزی', skuCode: 'AVANGAN' }),
  Object.freeze({ brandName: 'منظومه', legalName: 'شرکت صنایع فولاد منظومه', skuCode: 'MANZOOMEH' }),
  Object.freeze({ brandName: 'صبا فولاد سمنان', legalName: 'مجتمع ذوب و نورد صبا فولاد سمنان', skuCode: 'ESHTE' }),
  Object.freeze({ brandName: 'یاوران زنجان', legalName: 'شرکت نورد یاوران زنجان', skuCode: 'ZANJAN' }),
  Object.freeze({ brandName: 'دهشیر یزد', legalName: 'شرکت فولاد دهشیر یزد', skuCode: 'DEHSHIR' }),
  Object.freeze({ brandName: 'البرز غرب', legalName: 'شرکت مجتمع فولاد البرز غرب', skuCode: 'ALBORZ' }),
  Object.freeze({ brandName: 'فولاد تهران', legalName: 'جویا نورد فولاد تهران', skuCode: 'TEHRAN' }),
  Object.freeze({ brandName: 'فولاد سپهر ایرانیان', legalName: 'شرکت فولاد سپهر ایرانیان', skuCode: 'SEPEHR' }),
  Object.freeze({ brandName: 'فولاد مبارکه', legalName: 'شرکت فولاد مبارکه اصفهان', skuCode: 'MSC' }),
  Object.freeze({ brandName: 'هفت الماس', legalName: 'شرکت صنایع هفت الماس', skuCode: 'HAF' }),
  Object.freeze({ brandName: 'ورق خودرو شهرکرد', legalName: 'شرکت ورق خودرو چهارمحال و بختیاری', skuCode: 'SCVC' }),
  Object.freeze({ brandName: 'تاراز', legalName: 'شرکت فولاد تاراز چهارمحال', skuCode: 'TARAZ' }),
  Object.freeze({ brandName: 'امیرکبیر کاشان', legalName: 'شرکت فولاد امیرکبیر کاشان', skuCode: 'AKS' }),
  Object.freeze({ brandName: 'شهریار تبریز', legalName: 'شرکت فولاد شهریار تبریز', skuCode: 'SHAHRYAR' }),
  Object.freeze({ brandName: 'دشتستان', legalName: 'مجتمع فولاد دشتستان', skuCode: 'DASHT' }),
  Object.freeze({ brandName: 'فولاد غرب آسیا', legalName: 'شرکت فولاد غرب آسیا', skuCode: 'WEST' }),
  Object.freeze({ brandName: 'وارداتی چین', legalName: 'وارداتی چین', skuCode: 'IMPORTCN' }),
  Object.freeze({ brandName: 'فولاد گیلان', legalName: 'مجتمع فولاد گیلان', skuCode: 'GILAN' }),
  Object.freeze({ brandName: 'اکسین اهواز', legalName: 'شرکت فولاد اکسین خوزستان', skuCode: 'OXIN' }),
  Object.freeze({ brandName: 'نورد و تولید قطعات', legalName: 'شرکت نورد و تولید قطعات فولادی', skuCode: 'NTF' }),
  Object.freeze({ brandName: 'فولاد کاویان', legalName: 'شرکت فولاد کاویان', skuCode: 'KAVIAN' }),
  Object.freeze({ brandName: 'فولاد خرم‌آباد', legalName: 'مجتمع فولاد خرم‌آباد', skuCode: 'KHORAM' }),
  Object.freeze({ brandName: 'هاردوکس', legalName: 'هاردوکس سوئد', skuCode: 'HARDOX' }),
  Object.freeze({ brandName: 'NM', legalName: 'NM چین', skuCode: 'NM' }),
  Object.freeze({ brandName: 'آرتا', legalName: 'شرکت سها صنعت آرتا', skuCode: 'ARTA' }),
  Object.freeze({ brandName: 'پاسارگاد', legalName: 'مجتمع فولاد پاسارگاد', skuCode: 'PASARGAD' }),
  Object.freeze({ brandName: 'کاوه ایرانیان', legalName: 'شرکت لوله‌های دقیق کاوه ایرانیان', skuCode: 'KAVEHI' }),
  Object.freeze({ brandName: 'آسین ابهر', legalName: 'مجتمع فولاد و نورد آسین ابهر', skuCode: 'ASIN' }),
  Object.freeze({
    brandName: 'فولاد ملایر',
    legalName: 'مجتمع نورد و فولاد زاگرس ملایر',
    nameLatin: 'Malayer Steel',
    skuCode: 'MALAYER',
  }),
  Object.freeze({
    brandName: 'بستان آباد',
    legalName: 'مجتمع فولاد بستان آباد',
    nameLatin: 'Bostan Abad Steel Complex',
    skuCode: 'BOSTAN',
  }),
  Object.freeze({
    brandName: 'فولاد یزد (احتشامی)',
    legalName: 'شرکت نورد فولاد یزد',
    nameLatin: 'Yazd Steel',
    skuCode: 'EHTESH',
  }),
  Object.freeze({
    brandName: 'فولاد الیگودرز',
    legalName: 'مجتمع نورد فولاد الیگودرز',
    nameLatin: 'Aligudarz Steel',
    skuCode: 'ALIGUDARZ',
  }),
  Object.freeze({
    brandName: 'نورد ساوه',
    legalName: 'کارخانجات نورد و پروفیل ساوه',
    nameLatin: 'Saveh Rolling & Profile Mills',
    skuCode: 'SAVEH',
  }),
  Object.freeze({
    brandName: 'فولاد شمس گلستان',
    legalName: 'مجتمع فولاد شمس گلستان',
    nameLatin: 'Shams Golestan Steel',
    skuCode: 'SHAMS',
  }),
  Object.freeze({
    brandName: 'آلیاژی یزد',
    legalName: 'شرکت فولاد آلیاژی ایران',
    nameLatin: 'IASCO',
    skuCode: 'IASCO',
  }),
  Object.freeze({
    brandName: 'اسفراین',
    legalName: 'مجتمع صنعتی اسفراین',
    nameLatin: 'EIC',
    skuCode: 'EIC',
  }),
  Object.freeze({
    brandName: 'آلیاژی اصفهان',
    legalName: 'شرکت فولاد آلیاژی اصفهان',
    nameLatin: 'IASB',
    skuCode: 'IASB',
  }),
  Object.freeze({
    brandName: 'اوکراین',
    legalName: 'دی‌اس‌اس',
    nameLatin: 'DSS - Dneprospetsstal',
    skuCode: 'DSS',
  }),
  Object.freeze({
    brandName: 'روس',
    legalName: 'کراسنی اوکتیابر / سورستال',
    nameLatin: 'Krasny Oktyabr / Severstal',
    skuCode: 'KRASNY',
  }),
  Object.freeze({
    brandName: 'چینی',
    legalName: 'برندهای چینی',
    nameLatin: 'Chinese Brands',
    skuCode: 'CHINA',
  }),
  Object.freeze({
    brandName: 'ترک',
    legalName: 'اصیل چلیک',
    nameLatin: 'Asil Celik',
    skuCode: 'ASIL',
  }),
  Object.freeze({
    brandName: 'بوهلر',
    legalName: 'بوهلر',
    nameLatin: 'Bohler / Uddeholm',
    skuCode: 'BOHLER',
  }),
  Object.freeze({
    brandName: 'پُلدی',
    legalName: 'کارخانه فولاد پلدی',
    nameLatin: 'Poldi',
    skuCode: 'POLDI',
  }),
  Object.freeze({
    brandName: 'کره‌ای',
    legalName: 'سه‌آ',
    nameLatin: 'SeAH',
    skuCode: 'SEAH',
  }),
  Object.freeze({
    brandName: 'هشترود',
    legalName: 'مجتمع فولاد کاران افق هشترود',
    nameLatin: 'Hashtrood Steel',
    skuCode: 'HASHTROOD',
  }),
  Object.freeze({
    brandName: 'ایران اسپیرال',
    legalName: 'شرکت ایران اسپیرال',
    nameLatin: 'Iran Spiral',
    skuCode: 'IRSPIRAL',
  }),
  Object.freeze({
    brandName: 'کالوپ',
    legalName: 'شرکت کالوپ',
    nameLatin: 'Kalup',
    skuCode: 'KALUP',
  }),
  Object.freeze({
    brandName: 'صفا',
    legalName: 'شرکت نورد و لوله صفا',
    nameLatin: 'Safa Rolling & Pipe',
    skuCode: 'SAFA',
  }),
  Object.freeze({
    brandName: 'سلفچگان',
    legalName: 'شرکت تولید لوله و پوشش سلفچگان',
    nameLatin: 'SPPC',
    skuCode: 'SPPC',
  }),
  Object.freeze({
    brandName: 'خلیج فارس',
    legalName: 'شرکت لوله‌سازی خلیج فارس',
    nameLatin: 'Persian Gulf Pipe',
    skuCode: 'PGPIPE',
  }),
  Object.freeze({
    brandName: 'آریا نورد خلیج فارس',
    legalName: 'شرکت آریا نورد صنعت خلیج فارس',
    nameLatin: 'Arya Navard Persian Gulf',
    skuCode: 'ARYANAV',
  }),
  Object.freeze({
    brandName: 'نیزار',
    legalName: 'شرکت نورد لوله و پوشش نیزار',
    nameLatin: 'Neyzar',
    skuCode: 'NEYZAR',
  }),
  Object.freeze({
    brandName: 'سدید',
    legalName: 'شرکت لوله و تجهیزات سدید',
    nameLatin: 'Sadid Pipe',
    skuCode: 'SADID',
  }),
  Object.freeze({
    brandName: 'اسپیرال اصفهان',
    legalName: 'گروه صنعتی اسپیرال اصفهان',
    nameLatin: 'Isfahan Spiral',
    skuCode: 'ISSPIRAL',
  }),
  Object.freeze({
    brandName: 'سپنتا',
    legalName: 'گروه صنعتی سپنتا / شرکت تولید لوله و پروفیل سپنتا',
    nameLatin: 'Sepanta',
    skuCode: 'SEPANTA',
  }),
  Object.freeze({
    brandName: 'سپاهان',
    legalName: 'گروه صنعتی سپاهان',
    nameLatin: 'Sepahan',
    skuCode: 'SEPAHAN',
  }),
  Object.freeze({
    brandName: 'قزوین',
    legalName: 'نورد و لوله قزوین',
    nameLatin: 'Qazvin Pipe',
    skuCode: 'QAZVIN',
  }),
  Object.freeze({
    brandName: 'کیهان',
    legalName: 'شرکت تولیدی لوله و پروفیل کیهان',
    nameLatin: 'Keyhan Pipe',
    skuCode: 'KEYHAN',
  }),
  Object.freeze({
    brandName: 'یاران',
    legalName: 'شرکت نورد و لوله یاران',
    nameLatin: 'Yaran Pipe',
    skuCode: 'YARAN',
  }),
  Object.freeze({
    brandName: 'کچو',
    legalName: 'گروه تولیدی صنعتی کچو',
    nameLatin: 'Kacho',
    skuCode: 'KACHO',
  }),
  Object.freeze({
    brandName: 'کیان پرشیا',
    legalName: 'شرکت کیان پرشیا',
    nameLatin: 'Kian Persia',
    skuCode: 'KIANP',
  }),
  Object.freeze({
    brandName: 'تهران شرق',
    legalName: 'شرکت نورد و لوله تهران شرق',
    nameLatin: 'Tehran Shargh',
    skuCode: 'TSHARGH',
  }),
  Object.freeze({
    brandName: 'فولاد گستر آتنا',
    legalName: 'شرکت فولاد گستر آتنا',
    nameLatin: 'Foolad Gostar Atena',
    skuCode: 'ATENA',
  }),
]);

/**
 * میلگرد کلاف producers (operator order). skuCode is the Brand registry key.
 * Existing mills are reused — do not create a second Brand for the same mill.
 */
export const COIL_REBAR_MILLS = Object.freeze([
  Object.freeze({
    marketName: 'ذوب آهن',
    legalName: 'شرکت سهامی ذوب آهن اصفهان',
    nameLatin: 'ESCO (Esfahan Steel Company)',
    skuCode: 'ESCO',
    existingBrandName: 'ذوب‌آهن اصفهان',
  }),
  Object.freeze({
    marketName: 'کویر کاشان',
    legalName: 'مجتمع فولاد کویر کاشان',
    nameLatin: 'Kavir Steel Complex',
    skuCode: 'KAVIR',
    existingBrandName: 'کویر کاشان',
  }),
  Object.freeze({
    marketName: 'فولاد نطنز',
    legalName: 'مجتمع صنایع فولاد نطنز',
    nameLatin: 'Natanz Steel Complex',
    skuCode: 'NATANZ',
    existingBrandName: 'فولاد نطنز',
  }),
  Object.freeze({
    marketName: 'فولاد ملایر',
    legalName: 'مجتمع نورد و فولاد زاگرس ملایر',
    nameLatin: 'Malayer Steel',
    skuCode: 'MALAYER',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'بستان آباد',
    legalName: 'مجتمع فولاد بستان آباد',
    nameLatin: 'Bostan Abad Steel Complex',
    skuCode: 'BOSTAN',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'فولاد یزد (احتشامی)',
    legalName: 'شرکت نورد فولاد یزد',
    nameLatin: 'Yazd Steel',
    skuCode: 'EHTESH',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'گروه ملی اهواز',
    legalName: 'گروه ملی صنعتی فولاد ایران',
    nameLatin: 'INSIG (Iran National Steel Industrial Group)',
    skuCode: 'INSIG',
    existingBrandName: 'گروه ملی',
  }),
  Object.freeze({
    marketName: 'فولاد الیگودرز',
    legalName: 'مجتمع نورد فولاد الیگودرز',
    nameLatin: 'Aligudarz Steel',
    skuCode: 'ALIGUDARZ',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'کوهپایه',
    legalName: 'صنایع فولاد کوهپایه',
    nameLatin: 'Koohpayeh Steel',
    skuCode: 'SPIRAL',
    existingBrandName: 'اسپیرال',
  }),
  Object.freeze({
    marketName: 'آریان فولاد',
    legalName: 'شرکت نورد آریان فولاد',
    nameLatin: 'Arian Steel',
    skuCode: 'ARIAN',
    existingBrandName: 'آریان فولاد',
  }),
  Object.freeze({
    marketName: 'نورد ساوه',
    legalName: 'کارخانجات نورد و پروفیل ساوه',
    nameLatin: 'Saveh Rolling & Profile Mills',
    skuCode: 'SAVEH',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'فولاد شمس گلستان',
    legalName: 'مجتمع فولاد شمس گلستان',
    nameLatin: 'Shams Golestan Steel',
    skuCode: 'SHAMS',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'پرشین فولاد',
    legalName: 'پرشین فولاد آریا',
    nameLatin: 'Persian Steel',
    skuCode: 'PERSIAN',
    existingBrandName: 'پرشین',
  }),
]);

export const COIL_REBAR_BRAND_SKUS = Object.freeze(
  COIL_REBAR_MILLS.map((mill) => mill.skuCode),
);

/**
 * میلگرد آلیاژی producers (operator order). Only یزد احتشامی is reused
 * from the Brand registry; the coil-rebar mill set is not this Type.
 */
export const ALLOY_REBAR_MILLS = Object.freeze([
  Object.freeze({
    marketName: 'آلیاژی یزد',
    legalName: 'شرکت فولاد آلیاژی ایران',
    nameLatin: 'IASCO',
    skuCode: 'IASCO',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'اسفراین',
    legalName: 'مجتمع صنعتی اسفراین',
    nameLatin: 'EIC',
    skuCode: 'EIC',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'آلیاژی اصفهان',
    legalName: 'شرکت فولاد آلیاژی اصفهان',
    nameLatin: 'IASB',
    skuCode: 'IASB',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'یزد (احتشامی)',
    legalName: 'شرکت نورد فولاد یزد',
    nameLatin: 'Yazd Steel',
    skuCode: 'EHTESH',
    existingBrandName: 'فولاد یزد (احتشامی)',
  }),
  Object.freeze({
    marketName: 'اوکراین',
    legalName: 'دی‌اس‌اس',
    nameLatin: 'DSS - Dneprospetsstal',
    skuCode: 'DSS',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'روس',
    legalName: 'کراسنی اوکتیابر / سورستال',
    nameLatin: 'Krasny Oktyabr / Severstal',
    skuCode: 'KRASNY',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'چینی',
    legalName: 'برندهای چینی',
    nameLatin: 'Chinese Brands',
    skuCode: 'CHINA',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'ترک',
    legalName: 'اصیل چلیک',
    nameLatin: 'Asil Celik',
    skuCode: 'ASIL',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'بوهلر',
    legalName: 'بوهلر',
    nameLatin: 'Bohler / Uddeholm',
    skuCode: 'BOHLER',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'پُلدی',
    legalName: 'کارخانه فولاد پلدی',
    nameLatin: 'Poldi',
    skuCode: 'POLDI',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'کره‌ای',
    legalName: 'سه‌آ',
    nameLatin: 'SeAH',
    skuCode: 'SEAH',
    existingBrandName: null,
  }),
]);

export const ALLOY_REBAR_BRAND_SKUS = Object.freeze(
  ALLOY_REBAR_MILLS.map((mill) => mill.skuCode),
);

/**
 * میلگرد حرارتی producers (operator order). skuCode is the Brand registry key.
 * Existing mills are reused — do not create a second Brand for the same mill.
 */
export const THERMAL_REBAR_MILLS = Object.freeze([
  Object.freeze({
    marketName: 'ذوب آهن',
    legalName: 'شرکت سهامی ذوب آهن اصفهان',
    nameLatin: 'ESCO',
    skuCode: 'ESCO',
    existingBrandName: 'ذوب‌آهن اصفهان',
  }),
  Object.freeze({
    marketName: 'کویر کاشان',
    legalName: 'مجتمع فولاد کویر کاشان',
    nameLatin: 'Kavir Steel',
    skuCode: 'KAVIR',
    existingBrandName: 'کویر کاشان',
  }),
  Object.freeze({
    marketName: 'نطنز',
    legalName: 'مجتمع صنایع فولاد نطنز',
    nameLatin: 'Natanz Steel Complex',
    skuCode: 'NATANZ',
    existingBrandName: 'فولاد نطنز',
  }),
  Object.freeze({
    marketName: 'خراسان (نیشابور)',
    legalName: 'مجتمع فولاد خراسان',
    nameLatin: 'Khorasan Steel Complex',
    skuCode: 'KSC',
    existingBrandName: 'فولاد خراسان',
  }),
  Object.freeze({
    marketName: 'بستان آباد',
    legalName: 'مجتمع فولاد بستان آباد',
    nameLatin: 'Bostan Abad Steel Complex',
    skuCode: 'BOSTAN',
    existingBrandName: 'بستان آباد',
  }),
  Object.freeze({
    marketName: 'یزد (احتشامی)',
    legalName: 'شرکت نورد فولاد یزد',
    nameLatin: 'Yazd Steel',
    skuCode: 'EHTESH',
    existingBrandName: 'فولاد یزد (احتشامی)',
  }),
  Object.freeze({
    marketName: 'گروه ملی اهواز',
    legalName: 'گروه ملی صنعتی فولاد ایران',
    nameLatin: 'INSIG',
    skuCode: 'INSIG',
    existingBrandName: 'گروه ملی',
  }),
  Object.freeze({
    marketName: 'آریان فولاد',
    legalName: 'شرکت نورد آریان فولاد',
    nameLatin: 'Arian Steel',
    skuCode: 'ARIAN',
    existingBrandName: 'آریان فولاد',
  }),
  Object.freeze({
    marketName: 'پرشین فولاد',
    legalName: 'شرکت پرشین فولاد آریا',
    nameLatin: 'Persian Steel',
    skuCode: 'PERSIAN',
    existingBrandName: 'پرشین',
  }),
  Object.freeze({
    marketName: 'میانه',
    legalName: 'شرکت فولاد آذربایجان',
    nameLatin: 'Miyaneh Steel',
    skuCode: 'MISCO',
    existingBrandName: 'فولاد آذربایجان',
  }),
  Object.freeze({
    marketName: 'ابهر (سیادن)',
    legalName: 'مجتمع فولاد سیادن ابهر',
    nameLatin: 'Siadan Abhar Steel',
    skuCode: 'SIADAN',
    existingBrandName: 'سیادن ابهر',
  }),
  Object.freeze({
    marketName: 'هشترود',
    legalName: 'مجتمع فولاد کاران افق هشترود',
    nameLatin: 'Hashtrood Steel',
    skuCode: 'HASHTROOD',
    existingBrandName: null,
  }),
]);

export const THERMAL_REBAR_BRAND_SKUS = Object.freeze(
  THERMAL_REBAR_MILLS.map((mill) => mill.skuCode),
);

/**
 * لوله اسپیرال producers (operator order). Distinct mills — do not reuse
 * SPIRAL (اسپیرال / کوهپایه), PARDIS (پردیس سلفچگان), AGS (آذر گستر سدید),
 * or ATIYEH (آتیه خلیج فارس).
 */
export const SPIRAL_PIPE_MILLS = Object.freeze([
  Object.freeze({
    marketName: 'ایران اسپیرال',
    legalName: 'شرکت ایران اسپیرال',
    nameLatin: 'Iran Spiral',
    skuCode: 'IRSPIRAL',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'کالوپ',
    legalName: 'شرکت کالوپ',
    nameLatin: 'Kalup',
    skuCode: 'KALUP',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'صفا',
    legalName: 'شرکت نورد و لوله صفا',
    nameLatin: 'Safa Rolling & Pipe',
    skuCode: 'SAFA',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'سلفچگان',
    legalName: 'شرکت تولید لوله و پوشش سلفچگان',
    nameLatin: 'SPPC',
    skuCode: 'SPPC',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'خلیج فارس',
    legalName: 'شرکت لوله‌سازی خلیج فارس',
    nameLatin: 'Persian Gulf Pipe',
    skuCode: 'PGPIPE',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'آریا نورد خلیج فارس',
    legalName: 'شرکت آریا نورد صنعت خلیج فارس',
    nameLatin: 'Arya Navard Persian Gulf',
    skuCode: 'ARYANAV',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'نیزار',
    legalName: 'شرکت نورد لوله و پوشش نیزار',
    nameLatin: 'Neyzar',
    skuCode: 'NEYZAR',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'سدید',
    legalName: 'شرکت لوله و تجهیزات سدید',
    nameLatin: 'Sadid Pipe',
    skuCode: 'SADID',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'اسپیرال اصفهان',
    legalName: 'گروه صنعتی اسپیرال اصفهان',
    nameLatin: 'Isfahan Spiral',
    skuCode: 'ISSPIRAL',
    existingBrandName: null,
  }),
]);

export const SPIRAL_PIPE_BRAND_SKUS = Object.freeze(
  SPIRAL_PIPE_MILLS.map((mill) => mill.skuCode),
);

/**
 * لوله گالوانیزه mills (operator order). ساوه reuses SAVEH (نورد ساوه).
 */
export const GALVANIZED_PIPE_MILLS = Object.freeze([
  Object.freeze({
    marketName: 'سپنتا',
    legalName: 'گروه صنعتی سپنتا / شرکت تولید لوله و پروفیل سپنتا',
    nameLatin: 'Sepanta',
    skuCode: 'SEPANTA',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'ساوه',
    legalName: 'شرکت نورد و پروفیل ساوه',
    nameLatin: 'Saveh',
    skuCode: 'SAVEH',
    existingBrandName: 'نورد ساوه',
  }),
  Object.freeze({
    marketName: 'سپاهان',
    legalName: 'گروه صنعتی سپاهان',
    nameLatin: 'Sepahan',
    skuCode: 'SEPAHAN',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'قزوین',
    legalName: 'نورد و لوله قزوین',
    nameLatin: 'Qazvin Pipe',
    skuCode: 'QAZVIN',
    existingBrandName: null,
  }),
]);

export const GALVANIZED_PIPE_BRAND_SKUS = Object.freeze(
  GALVANIZED_PIPE_MILLS.map((mill) => mill.skuCode),
);

/**
 * لوله تست آب mills (operator order). All five reuse existing mill Brands.
 */
export const WATER_TEST_PIPE_MILLS = Object.freeze([
  Object.freeze({
    marketName: 'ساوه',
    legalName: 'شرکت نورد و پروفیل ساوه',
    nameLatin: 'Saveh',
    skuCode: 'SAVEH',
    existingBrandName: 'نورد ساوه',
  }),
  Object.freeze({
    marketName: 'سپنتا',
    legalName: 'شرکت لوله و پروفیل سپنتا',
    nameLatin: 'Sepanta',
    skuCode: 'SEPANTA',
    existingBrandName: 'سپنتا',
  }),
  Object.freeze({
    marketName: 'سپاهان',
    legalName: 'گروه صنعتی سپاهان',
    nameLatin: 'Sepahan',
    skuCode: 'SEPAHAN',
    existingBrandName: 'سپاهان',
  }),
  Object.freeze({
    marketName: 'کالوپ',
    legalName: 'شرکت کالوپ',
    nameLatin: 'Kalup',
    skuCode: 'KALUP',
    existingBrandName: 'کالوپ',
  }),
  Object.freeze({
    marketName: 'قزوین',
    legalName: 'نورد و لوله قزوین',
    nameLatin: 'Qazvin Pipe',
    skuCode: 'QAZVIN',
    existingBrandName: 'قزوین',
  }),
]);

export const WATER_TEST_PIPE_BRAND_SKUS = Object.freeze(
  WATER_TEST_PIPE_MILLS.map((mill) => mill.skuCode),
);

/**
 * لوله تست گاز mills (operator order). سپاهان / ساوه / سپنتا reuse existing mill Brands.
 */
export const GAS_TEST_PIPE_MILLS = Object.freeze([
  Object.freeze({
    marketName: 'سپاهان',
    legalName: 'گروه صنعتی سپاهان',
    nameLatin: 'Sepahan',
    skuCode: 'SEPAHAN',
    existingBrandName: 'سپاهان',
  }),
  Object.freeze({
    marketName: 'ساوه',
    legalName: 'شرکت نورد و پروفیل ساوه',
    nameLatin: 'Saveh',
    skuCode: 'SAVEH',
    existingBrandName: 'نورد ساوه',
  }),
  Object.freeze({
    marketName: 'سپنتا',
    legalName: 'گروه صنعتی سپنتا',
    nameLatin: 'Sepanta',
    skuCode: 'SEPANTA',
    existingBrandName: 'سپنتا',
  }),
  Object.freeze({
    marketName: 'کیهان',
    legalName: 'شرکت تولیدی لوله و پروفیل کیهان',
    nameLatin: 'Keyhan Pipe',
    skuCode: 'KEYHAN',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'یاران',
    legalName: 'شرکت نورد و لوله یاران',
    nameLatin: 'Yaran Pipe',
    skuCode: 'YARAN',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'کچو',
    legalName: 'گروه تولیدی صنعتی کچو',
    nameLatin: 'Kacho',
    skuCode: 'KACHO',
    existingBrandName: null,
  }),
]);

export const GAS_TEST_PIPE_BRAND_SKUS = Object.freeze(
  GAS_TEST_PIPE_MILLS.map((mill) => mill.skuCode),
);

/**
 * لوله جدار چاه mills (operator order). کالوپ and نیزار reuse existing mill Brands.
 */
export const WELL_CASING_PIPE_MILLS = Object.freeze([
  Object.freeze({
    marketName: 'کالوپ',
    legalName: 'شرکت کالوپ',
    nameLatin: 'Kalup',
    skuCode: 'KALUP',
    existingBrandName: 'کالوپ',
  }),
  Object.freeze({
    marketName: 'کیان پرشیا',
    legalName: 'شرکت کیان پرشیا',
    nameLatin: 'Kian Persia',
    skuCode: 'KIANP',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'تهران شرق',
    legalName: 'شرکت نورد و لوله تهران شرق',
    nameLatin: 'Tehran Shargh',
    skuCode: 'TSHARGH',
    existingBrandName: null,
  }),
  Object.freeze({
    marketName: 'نیزار',
    legalName: 'شرکت نورد لوله و پوشش نیزار',
    nameLatin: 'Neyzar',
    skuCode: 'NEYZAR',
    existingBrandName: 'نیزار',
  }),
  Object.freeze({
    marketName: 'فولاد گستر آتنا',
    legalName: 'شرکت فولاد گستر آتنا',
    nameLatin: 'Foolad Gostar Atena',
    skuCode: 'ATENA',
    existingBrandName: null,
  }),
]);

export const WELL_CASING_PIPE_BRAND_SKUS = Object.freeze(
  WELL_CASING_PIPE_MILLS.map((mill) => mill.skuCode),
);

/** Canonical Product Type name → brand sku_code list (unique, spreadsheet order). */
export const TYPE_BRAND_SKUS = Object.freeze({
  'میلگرد ساده': Object.freeze(['AGS', 'KAVIR', 'NMF', 'AYIN', 'YAZD', 'ATIYEH']),
  'میلگرد آجدار': Object.freeze([
    'ESCO', 'KSC', 'RAD', 'SANAT', 'ZAFER', 'SAR', 'BAFCO', 'HASJ', 'JAHAN', 'QAEM',
    'KAVIR', 'KAVEH', 'AZAM', 'AKH', 'ANAHITA', 'FAICO', 'INSIG', 'ROHINA', 'ATIYEH',
    'KAVAR', 'PERSIAN', 'ARIAN', 'SIADAN', 'PARDIS', 'HIRBOD', 'DERPAD', 'SHAHROOD',
    'MISCO', 'KOSAR', 'SABA', 'NATANZ', 'YAZD', 'BARDESIR', 'ARG',
  ]),
  'تیرآهن IPE': Object.freeze([
    'ESCO', 'FAICO', 'KOSAR', 'JAHANW', 'KHAYAM', 'YAZD', 'ZAFER', 'MAHAN', 'NAB', 'ARIAN',
  ]),
  'تیرآهن هاش': Object.freeze(['ESCO', 'TURKEY']),
  'نبشی': Object.freeze([
    'SHAKHTE', 'NAB', 'ARIAN', 'ZOHOURI', 'SPIRAL', 'AVANGAN', 'MANZOOMEH', 'ESHTE', 'ZANJAN', 'DEHSHIR',
  ]),
  'ناودانی': Object.freeze([
    'NAB', 'SHAKHTE', 'ESHTE', 'ALBORZ', 'ARIAN', 'SPIRAL', 'MAHAN', 'TEHRAN', 'FAICO', 'MANZOOMEH', 'SEPEHR',
  ]),
  'ورق گالوانیزه': Object.freeze(['MSC', 'HAF', 'SCVC', 'TARAZ', 'AKS', 'SHAHRYAR', 'DASHT']),
  'ورق روغنی': Object.freeze(['MSC', 'HAF', 'WEST', 'IMPORTCN']),
  'ورق گالوانیزه رنگی': Object.freeze(['MSC', 'HAF', 'SCVC']),
  'ورق آجدار': Object.freeze(['MSC', 'GILAN']),
  'ورق اسید شویی': Object.freeze(['MSC', 'WEST']),
  'ورق ساده فولادی': Object.freeze(['MSC', 'OXIN', 'NTF', 'KAVIAN', 'KHORAM', 'GILAN']),
  'ورق A283': Object.freeze(['MSC', 'OXIN', 'NTF', 'KAVIAN', 'KHORAM', 'GILAN']),
  'ورق A36': Object.freeze(['MSC', 'OXIN', 'NTF', 'KAVIAN', 'KHORAM', 'GILAN']),
  'ورق Ck45': Object.freeze(['OXIN', 'NTF']),
  'ورق ST52': Object.freeze(['MSC', 'OXIN', 'KAVIAN', 'KHORAM']),
  'ورق A516': Object.freeze(['MSC', 'OXIN', 'KAVIAN', 'KHORAM']),
  'ورق ضد سایش': Object.freeze(['HARDOX', 'NM']),
  'لوله مانیسمان': Object.freeze(['ARTA', 'AHPIPE', 'PASARGAD', 'KAVEHI', 'ASIN', 'IMPORTCN']),
  'لوله اسپیرال': SPIRAL_PIPE_BRAND_SKUS,
  'لوله گالوانیزه': GALVANIZED_PIPE_BRAND_SKUS,
  'لوله تست آب': WATER_TEST_PIPE_BRAND_SKUS,
  'لوله تست گاز': GAS_TEST_PIPE_BRAND_SKUS,
  'لوله جدار چاه': WELL_CASING_PIPE_BRAND_SKUS,
  'میلگرد کلاف': COIL_REBAR_BRAND_SKUS,
  'میلگرد آلیاژی': ALLOY_REBAR_BRAND_SKUS,
  'میلگرد حرارتی': THERMAL_REBAR_BRAND_SKUS,
});
