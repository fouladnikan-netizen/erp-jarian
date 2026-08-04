/**
 * Module registry for Jaryan ERP
 */

export const mainModules = [
  {
    id: 'nabz',
    path: '/nabz',
    name: 'نبض',
    subtitle: 'سفارشات',
    description: 'قلب تپنده عملیات؛ مدیریت جریان سفارش از اعلام تا سرانجام',
  },
  {
    id: 'ofogh',
    path: '/ofogh',
    name: 'افق',
    subtitle: 'فرصت‌ها',
    description: 'محل تحقق فرصت‌ها به رابطه‌های عمیق: جایی که با تقویتِ ریشه‌های ارتباط، مسیرِ پیچیده‌ی فروش ساده می‌شود',
  },
  {
    id: 'kanoon',
    path: '/',
    name: 'کانون',
    subtitle: 'مخاطبین',
    description: 'نقطه اتصال و چرخش تمام اشخاص، شرکت‌ها، مشتریان و تأمین‌کنندگان',
  },
  {
    id: 'vitrin',
    path: '/vitrin',
    name: 'ویترین',
    subtitle: 'محصولات',
    description: 'فهرست ساختاریافته‌ی مقاطع فولادی و مرجع اقلام سفارشات',
  },
  {
    id: 'gahshomar',
    path: '/gahshomar',
    name: 'گاه‌شمار',
    subtitle: 'دبیرخانه',
    description: 'مکاتبات رسمی: وارده، صادره، ثبت، پیش‌نویس و بایگانی اسناد سازمانی',
  },
  {
    id: 'kampayn',
    path: '/kampayn',
    name: 'کمپین‌ها',
    subtitle: 'اتوماسیون',
    description: 'موتور قوانین خودکار: شرط، اقدام و اجرای کمپین‌های ارتباطی سازمان',
  },
  {
    id: 'pooyesh',
    path: '/pooyesh',
    name: 'پویش',
    subtitle: 'موتور تعهدات',
    description: 'نمای تجمیعی تعهدات زمان‌دار از نبض، افق و مالی — بدون ثبت دستی رویداد',
  },
  {
    id: 'ayeneh',
    path: '/ayeneh',
    name: 'آینه',
    subtitle: 'داشبورد',
    description: 'نمای کلی عملکرد، نمودارها و شاخص‌های تحلیلی سازمان',
  },
];

export const footerModule = {
  id: 'shirazeh',
  path: '/shirazeh',
  name: 'شیرازه',
  subtitle: 'تنظیمات',
  description: 'پیکربندی سامانه، کاربران، نقش‌ها و تنظیمات سازمانی',
};

export const modules = [...mainModules, footerModule];

export const moduleData = {
  kanoon: {
    kpis: [
      { label: 'کل مخاطبین', value: '۱٬۲۴۸', trend: '+۱۲٪', trendDir: 'up', variant: 'accent' },
      { label: 'مشتریان فعال', value: '۳۴۶', trend: '+۵٪', trendDir: 'up' },
      { label: 'سفیران', value: '۸۹', trend: '+۳', trendDir: 'up' },
      { label: 'خاموش / راکد', value: '۴۲', trend: '-۲', trendDir: 'down', variant: 'danger' },
    ],
    filters: ['همه', 'رصدگر', 'مردد', 'تجربه‌گر', 'سفیر', 'خاموش'],
    searchPlaceholder: 'جستجو در مخاطبین...',
    primaryAction: 'ثبت مخاطب جدید',
    secondaryActions: ['خروجی اکسل', 'فیلتر پیشرفته'],
    tableTitle: 'فهرست مخاطبین',
    columns: ['نام / شرکت', 'نوع', 'وضعیت', 'مسئول', 'آخرین تماس'],
    rows: [
      { cells: ['فولاد پارس', 'مشتری', 'tag:ambassador', 'شوالیه: علی رضایی', '۱۴۰۴/۰۱/۱۵'], id: 1 },
      { cells: ['ذوب آهن اصفهان', 'تأمین‌کننده', 'tag:trial', 'کاشف: مریم احمدی', '۱۴۰۴/۰۱/۱۴'], id: 2 },
      { cells: ['صنایع فلزی کرمان', 'مشتری', 'tag:hesitant', 'شوالیه: حسین کریمی', '۱۴۰۴/۰۱/۱۲'], id: 3 },
      { cells: ['بازرگانی آذر', 'مشتری', 'tag:radar', 'شوالیه: سارا موسوی', '۱۴۰۴/۰۱/۱۰'], id: 4 },
      { cells: ['فولاد مبارکه', 'تأمین‌کننده', 'tag:ambassador', 'کاشف: رضا نوری', '۱۴۰۴/۰۱/۰۸'], id: 5 },
    ],
  },
  ofogh: {
    kpis: [
      { label: 'فرصت‌های باز', value: '۳۲', trend: '+۶', trendDir: 'up', variant: 'accent' },
      { label: 'ارزش خط لوله', value: '۱۸٫۵ م', trend: '+۸٪', trendDir: 'up' },
      { label: 'نرخ تبدیل', value: '۲۴٪', trend: '+۲٪', trendDir: 'up' },
      { label: 'از دست رفته', value: '۵', trend: '-۱', trendDir: 'down', variant: 'danger' },
    ],
    filters: ['همه', 'جدید', 'در مذاکره', 'پیشنهاد', 'بسته شده'],
    searchPlaceholder: 'جستجو در فرصت‌ها...',
    primaryAction: 'ثبت فرصت جدید',
    secondaryActions: ['نمای کانبان', 'خروجی'],
    tableTitle: 'فهرست فرصت‌های فروش',
    columns: ['عنوان', 'مشتری', 'مرحله', 'ارزش (ریال)', 'احتمال'],
    rows: [
      { cells: ['تأمین ورق ۱۰mm', 'فولاد پارس', 'tag:pending:پیشنهاد', '۶٬۵۰۰٬۰۰۰٬۰۰۰', '۷۰٪'], id: 1 },
      { cells: ['قرارداد سالانه', 'صنایع فلزی کرمان', 'tag:active:مذاکره', '۱۲٬۰۰۰٬۰۰۰٬۰۰۰', '۵۵٪'], id: 2 },
      { cells: ['پروژه سوله صنعتی', 'بازرگانی آذر', 'tag:success:بسته شده', '۳٬۲۰۰٬۰۰۰٬۰۰۰', '۱۰۰٪'], id: 3 },
    ],
  },
  nabz: {
    kpis: [
      { label: 'سفارشات جاری', value: '۵۷', trend: '+۸', trendDir: 'up', variant: 'accent' },
      { label: 'در فاز کاوش', value: '۸', trend: 'کانبان', trendDir: 'up' },
      { label: 'در فاز مظنه', value: '۶', trend: 'کانبان', trendDir: 'up' },
      { label: 'در فاز پیش‌کش', value: '۵', trend: 'کانبان', trendDir: 'up' },
    ],
    filters: ['همه مراحل', 'کاوش', 'عملیات', 'مظنه', 'پیش‌کش', 'تحقق'],
    searchPlaceholder: 'جستجو در سفارشات...',
    primaryAction: 'ثبت سفارش جدید',
    secondaryActions: ['نمای کانبان', 'خروجی اکسل'],
    tableTitle: 'فهرست سفارشات',
    columns: ['شماره', 'مشتری', 'محصول', 'مرحله کانبان', 'مبلغ (ریال)'],
    rows: [
      { cells: ['NBZ-۱۴۰۴-۰۴۲', 'فولاد پارس', 'میلگرد ۱۴', 'tag:active:مظنه', '۴٬۸۵۰٬۰۰۰٬۰۰۰'], id: 1 },
      { cells: ['NBZ-۱۴۰۴-۰۳۸', 'صنایع فلزی کرمان', 'تیرآهن ۱۶', 'tag:pending:پیش‌کش', '۲٬۱۲۰٬۰۰۰٬۰۰۰'], id: 2 },
      { cells: ['NBZ-۱۴۰۴-۰۳۵', 'ذوب آهن اصفهان', 'ورق 6mm', 'tag:success:تحقق', '۸٬۴۰۰٬۰۰۰٬۰۰۰'], id: 3 },
      { cells: ['NBZ-۱۴۰۴-۰۳۱', 'بازرگانی آذر', 'نبشی ۵', 'tag:active:عملیات', '۱٬۹۵۰٬۰۰۰٬۰۰۰'], id: 4 },
      { cells: ['NBZ-۱۴۰۴-۰۲۸', 'فولاد مبارکه', 'لوله ۸', 'tag:pending:کاوش', '۳٬۶۰۰٬۰۰۰٬۰۰۰'], id: 5 },
    ],
  },
  vitrin: {
    kpis: [
      { label: 'کل محصولات', value: '۱۴۸', trend: '+۴', trendDir: 'up', variant: 'accent' },
      { label: 'فعال در فروش', value: '۱۲۶', trend: '۸۵٪', trendDir: 'up' },
      { label: 'کم‌موجودی', value: '۱۲', trend: 'هشدار', trendDir: 'down', variant: 'danger' },
      { label: 'دسته‌بندی‌ها', value: '۱۸', trend: 'ثابت', trendDir: 'up' },
    ],
    filters: ['همه', 'فولادی', 'غیرفولادی', 'خدمات', 'غیرفعال'],
    searchPlaceholder: 'جستجو در محصولات...',
    primaryAction: 'افزودن محصول',
    secondaryActions: ['واردات گروهی', 'خروجی'],
    tableTitle: 'کاتالوگ محصولات',
    columns: ['کد', 'نام محصول', 'دسته', 'قیمت پایه', 'وضعیت'],
    rows: [
      { cells: ['PRD-۰۰۱', 'میلگرد A3 — ۱۴', 'فولادی', '۴۵٬۰۰۰', 'tag:active:فعال'], id: 1 },
      { cells: ['PRD-۰۰۲', 'تیرآهن IPE ۱۶', 'فولادی', '۸۲٬۰۰۰', 'tag:active:فعال'], id: 2 },
      { cells: ['PRD-۰۰۳', 'ورق سیاه ۶mm', 'فولادی', '۳۸٬۵۰۰', 'tag:pending:کم‌موجود'], id: 3 },
    ],
  },
  /* Secretariat ModulePage fallback data (landing uses GahshomarPage) */
  gahshomar: {
    kpis: [
      { label: 'نامه‌های امروز', value: '۷', trend: '۳ ورودی', trendDir: 'up', variant: 'accent' },
      { label: 'در انتظار پاسخ', value: '۱۱', trend: 'پیگیری', trendDir: 'up' },
      { label: 'پیش‌نویس صادره', value: '۴', trend: '۲ نزدیک', trendDir: 'up', variant: 'danger' },
      { label: 'با پیوست', value: '۹', trend: 'ثابت', trendDir: 'up' },
    ],
    filters: ['همه', 'وارده', 'صادره', 'پیش‌نویس', 'بایگانی'],
    searchPlaceholder: 'جستجو در مکاتبات رسمی...',
    primaryAction: 'ثبت نامه وارده',
    secondaryActions: ['پیش‌نویس صادره', 'گزارش دبیرخانه'],
    tableTitle: 'فهرست مکاتبات رسمی (دبیرخانه)',
    columns: ['موضوع', 'شماره', 'تاریخ', 'طرف مقابل', 'وضعیت'],
    rows: [
      { cells: ['درخواست استعلام قیمت', '۱۴۰۴/۱۲۳', '۱۴۰۴/۰۱/۱۸', 'فولاد پارس', 'tag:pending:ثبت‌شده'], id: 1 },
      { cells: ['اعلامیه قرارداد', '۱۴۰۴/۱۲۸', '۱۴۰۴/۰۱/۱۶', 'صنایع فلزی کرمان', 'tag:active:ثبت‌شده'], id: 2 },
      { cells: ['پاسخ استعلام', '—', '۱۴۰۴/۰۱/۱۹', 'فولاد پارس', 'tag:success:پیش‌نویس'], id: 3 },
    ],
  },
  /* Unused by landing (CommitmentEngine); kept for registry completeness */
  pooyesh: {
    kpis: [
      { label: 'تعهدات امروز', value: '۱۲', trend: '+۲', trendDir: 'up', variant: 'accent' },
      { label: 'پیگیری‌ها', value: '۶', trend: '۲ انجام', trendDir: 'up' },
      { label: 'تسویه‌ها', value: '۴', trend: '۱ باقی', trendDir: 'up' },
      { label: 'تاخیر', value: '۳', trend: '-۱', trendDir: 'down', variant: 'danger' },
    ],
    filters: ['همه', 'پیگیری', 'مالی', 'لجستیک', 'قرارداد'],
    searchPlaceholder: 'جستجو در تعهدات...',
    primaryAction: 'مشاهده امروز',
    secondaryActions: ['فیلتر اولویت', 'خروجی'],
    tableTitle: 'فهرست تعهدات',
    columns: ['عنوان', 'نوع', 'مربوط به', 'تاریخ', 'اولویت'],
    rows: [
      { cells: ['پیگیری پیش‌فاکتور', 'پیگیری', 'فولاد پارس', '۱۴۰۴/۰۱/۱۵', 'tag:pending:باز'], id: 1 },
      { cells: ['تسویه سفارش', 'مالی', 'صنایع فلزی کرمان', '۱۴۰۴/۰۱/۱۶', 'tag:active:نزدیک'], id: 2 },
      { cells: ['بارگیری', 'لجستیک', 'ذوب آهن اصفهان', '۱۴۰۴/۰۱/۱۷', 'tag:success:انجام'], id: 3 },
    ],
  },
  ayeneh: {
    kpis: [
      { label: 'فروش ماه جاری', value: '۴۲٫۸ م', trend: '+۱۵٪', trendDir: 'up', variant: 'accent' },
      { label: 'حاشیه سود', value: '۱۲٫۳٪', trend: '+۰٫۸٪', trendDir: 'up' },
      { label: 'نرخ تحقق هدف', value: '۸۷٪', trend: 'ماه جاری', trendDir: 'up' },
      { label: 'شکایت مشتری', value: '۲', trend: '-۱', trendDir: 'down', variant: 'danger' },
    ],
    filters: ['فروش', 'مشتریان', 'عملیات', 'مالی'],
    searchPlaceholder: 'جستجو در گزارش‌ها...',
    primaryAction: 'ساخت گزارش',
    secondaryActions: ['خروجی PDF', 'اشتراک‌گذاری'],
    tableTitle: 'گزارش‌های تحلیلی',
    columns: ['گزارش', 'بازه', 'آخرین بروزرسانی', 'مسئول'],
    rows: [
      { cells: ['عملکرد فروش ماهانه', 'فروردین ۱۴۰۴', '۱۴۰۴/۰۱/۱۵', 'مدیر فروش'], id: 1 },
      { cells: ['تحلیل خط لوله', 'فصل جاری', '۱۴۰۴/۰۱/۱۴', 'تیم CRM'], id: 2 },
      { cells: ['شاخص رضایت مشتری', 'سه‌ماهه', '۱۴۰۴/۰۱/۱۰', 'پشتیبانی'], id: 3 },
    ],
  },
  shirazeh: {
    kpis: [
      { label: 'کاربران فعال', value: '۲۴', trend: '+۲', trendDir: 'up', variant: 'accent' },
      { label: 'نقش‌های تعریف‌شده', value: '۸', trend: 'ثابت', trendDir: 'up' },
      { label: 'یکپارچه‌سازی‌ها', value: '۵', trend: '۱ جدید', trendDir: 'up' },
      { label: 'هشدار امنیتی', value: '۰', trend: 'ایمن', trendDir: 'up' },
    ],
    filters: ['همه', 'کاربران', 'نقش‌ها', 'یکپارچه‌سازی', 'ظاهر'],
    searchPlaceholder: 'جستجو در تنظیمات...',
    primaryAction: 'افزودن کاربر',
    secondaryActions: ['پشتیبان‌گیری', 'لاگ سیستم'],
    tableTitle: 'تنظیمات سامانه',
    columns: ['بخش', 'توضیح', 'آخرین تغییر', 'وضعیت'],
    rows: [
      { cells: ['کاربران و نقش‌ها', 'مدیریت دسترسی تیم', '۱۴۰۴/۰۱/۱۲', 'tag:active:فعال'], id: 1 },
      { cells: ['برندینگ سازمانی', 'لوگو و رنگ‌های سامانه', '۱۴۰۴/۰۱/۰۵', 'tag:active:فعال'], id: 2 },
      { cells: ['اتصال پیامک', 'سرویس اطلاع‌رسانی', '۱۴۰۳/۱۲/۲۰', 'tag:pending:در انتظار'], id: 3 },
    ],
  },
};
