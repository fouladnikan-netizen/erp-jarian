import { ENTITY_TYPES, PERSON_TYPES } from './config';

const officialSample = {
  registrationNumber: '642490',
  establishmentDate: '1403/09/09',
  economicCode: '14013998055',
  companyType: 'سهامی خاص',
  registrationRegion: 'تهران',
  latestGazette: '1404/06/15',
  latestCapital: '500,000,000 ریال',
  phone: '02171683000',
  website: 'www.fouladnikan.com',
  address: 'استان تهران، شهرستان تهران، بخش مرکزی، شهر تهران، داوودیه، خیابان شمس تبریزی جنوبی، کوچه غفاری (ک تابان شرقی)، پلاک ۳، طبقه ۳، واحد ۷',
  postalCode: '1549847120',
};

const legalPersonsSample = {
  ceo: 'نگین اخوان',
  signatory: 'محمدرضا محمدی',
};

/**
 * تاریخچه استعلام‌های رسمی (ماشین زمان پاپ‌آپ اطلاعات حقوقی) —
 * هر رکورد یک عکس‌فوری (snapshot) کامل از وضعیت ثبتی شرکت در تاریخ استعلام است.
 * بعداً هر استعلام موفق لینکا یک رکورد جدید به ابتدای این آرایه اضافه می‌کند.
 */
const legalHistorySample = [
  {
    verifiedAt: '1403/09/20',
    nationalId: '14013998055',
    officialSpecs: {
      registrationNumber: '642490',
      establishmentDate: '1403/09/09',
      economicCode: '14013998055',
      latestGazette: '1403/09/09',
      latestCapital: '100,000,000 ریال',
      phone: '02188776655',
      website: '',
      address: 'تهران، سعادت‌آباد، بلوار دریا، خیابان صرافها، پلاک ۵۸، واحد ۲',
      postalCode: '1998764311',
    },
    governance: {
      ceo: { name: 'نگین اخوان', nationalId: '3860129821', validUntil: '1405/09/08' },
      boardMembers: [
        { role: 'رئیس هیئت مدیره', name: 'محمدرضا محمدی', nationalId: '3875509285' },
        { role: 'نایب رئیس هیئت مدیره', name: 'نگین اخوان', nationalId: '3860129821' },
      ],
      boardValidUntil: '1405/09/08',
      signatureRight:
        'حق امضا کلیه اوراق و اسناد بهادار و تعهدآور شرکت با امضا مدیرعامل همراه با مهر شرکت معتبر می‌باشد.',
    },
  },
  {
    verifiedAt: '1402/08/12',
    nationalId: '14013998055',
    officialSpecs: {
      registrationNumber: '642490',
      establishmentDate: '1403/09/09',
      economicCode: '14013998055',
      latestGazette: '1402/08/01',
      latestCapital: '10,000,000 ریال',
      phone: '02177445566',
      website: '',
      address: 'تهران، نارمک، خیابان فرجام شرقی، پلاک ۱۱۲، طبقه ۱',
      postalCode: '1687613341',
    },
    governance: {
      ceo: { name: 'محمدرضا محمدی', nationalId: '3875509285', validUntil: '1403/08/12' },
      boardMembers: [
        { role: 'رئیس هیئت مدیره', name: 'فاطمه سادات وفائی', nationalId: '3931630536' },
        { role: 'عضو هیئت مدیره', name: 'محمدرضا محمدی', nationalId: '3875509285' },
      ],
      boardValidUntil: '1403/08/12',
      signatureRight:
        'حق امضا کلیه اوراق و اسناد تعهدآور شرکت با امضا مشترک رئیس هیئت مدیره و مدیرعامل همراه با مهر شرکت معتبر می‌باشد.',
    },
  },
];

/** ارکان رسمی شرکت (آخرین آگهی روزنامه رسمی) — مصرف پاپ‌آپ اطلاعات حقوقی پروفایل */
const governanceSample = {
  ceo: { name: 'نگین اخوان', nationalId: '3860129821', validUntil: '1405/09/08' },
  boardMembers: [
    { role: 'رئیس هیئت مدیره', name: 'محمدرضا محمدی', nationalId: '3875509285' },
    { role: 'نایب رئیس هیئت مدیره', name: 'نگین اخوان', nationalId: '3860129821' },
    { role: 'عضو هیئت مدیره', name: 'فاطمه سادات وفائی', nationalId: '3931630536' },
  ],
  boardValidUntil: '1405/09/08',
  signatureRight:
    'حق امضا تمامی اوراق و اسناد بهادار و تعهدآور شرکت از قبیل چک، سفته، بروات، قراردادهای عقود اسلامی و همچنین تمامی نامه‌های عادی و اداری با امضا رئیس هیئت مدیره همراه با مهر شرکت معتبر می‌باشد.',
};

function daysAgo(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function withMeta(contact, { createdDays, activityDays, analytics, isActive = true }) {
  return {
    isActive,
    createdAt: daysAgo(createdDays),
    lastActivityAt: activityDays != null ? daysAgo(activityDays) : null,
    analytics,
    ...contact,
  };
}

const rawContacts = [
  {
    id: 1,
    entityType: ENTITY_TYPES.CUSTOMER,
    personType: PERSON_TYPES.LEGAL,
    companyName: 'فولاد پارس',
    nationalId: '14013998055',
    province: 'خوزستان',
    activityDomain: 'صنایع فولادی',
    behavioralStatus: 'ambassador',
    /** کابین مالی پروفایل — سقف اعتبار و مانده حساب (ریال) */
    financial: { creditLimitRial: 20_000_000_000, accountBalanceRial: 6_050_000_000 },
    assignee: { name: 'علی رضایی', role: 'شوالیه' },
    fullAddress: 'اهواز، کیانپارس، خیابان صنعت، پلاک ۱۲',
    officialSpecs: { ...officialSample },
    legalPersons: { ...legalPersonsSample },
    governance: { ...governanceSample },
    legalVerifiedAt: '1405/04/28',
    legalHistory: legalHistorySample,
    /** Last-used delivery fields for Nabz smart pre-fill (Smart Dispatch). */
    lastUsedDeliveryInfo: {
      needsShipping: true,
      unloadAddress: 'اهواز، کیانپارس، خیابان صنعت، پلاک ۱۲ — محل تخلیه انبار مرکزی',
      postalCode: '6135933456',
      recipientName: 'علی رضایی',
      recipientPhone: '09121112233',
      shippingNotes: 'تحویل فقط در ساعات اداری؛ هماهنگی قبلی با نگهبانی',
      updatedAt: daysAgo(5),
    },
    relatedPersons: [
      {
        id: 'rp-1-1',
        companyId: 1,
        fullName: 'علی رضایی',
        mobile: '09121112233',
        gender: 'male',
        jobPosition: 'مدیر خرید',
        email: 'ali.rezaei@fouladpars.local',
        isPrimary: true,
      },
      {
        id: 'rp-1-2',
        companyId: 1,
        fullName: 'سارا موسوی',
        mobile: '09354445566',
        gender: 'female',
        jobPosition: 'مدیر مالی',
        email: 'sara@fouladpars.local',
        isPrimary: false,
      },
    ],
    interactions: [
      { id: 'POY-1404-015', date: '۱۴۰۴/۰۱/۱۵', type: 'فروش', summary: 'تأیید سفارش میلگرد ۱۴' },
      { id: 'POY-1404-010', date: '۱۴۰۴/۰۱/۱۰', type: 'جلسه حضوری', summary: 'بررسی قرارداد سالانه' },
    ],
    relatedOrders: [
      { id: 'JR050112001', title: 'میلگرد ۱۴', stage: 'مظنه', amount: '۴٬۸۵۰٬۰۰۰٬۰۰۰', registeredAt: '۱۴۰۴/۰۱/۱۲' },
      { id: 'JR050109004', title: 'ورق ۸mm', stage: 'پیش‌کش', amount: '۱٬۲۰۰٬۰۰۰٬۰۰۰', registeredAt: '۱۴۰۴/۰۱/۰۹' },
    ],
  },
  {
    id: 2,
    entityType: ENTITY_TYPES.CUSTOMER,
    personType: PERSON_TYPES.LEGAL,
    companyName: 'صنایع فلزی کرمان',
    nationalId: '10202345678',
    province: 'کرمان',
    activityDomain: 'سازه فلزی',
    behavioralStatus: 'hesitant',
    assignee: { name: 'حسین کریمی', role: 'شوالیه' },
    officialSpecs: {},
    legalPersons: {},
    relatedPersons: [
      {
        id: 'rp-2-1',
        companyId: 2,
        fullName: 'محمد رضایی',
        mobile: '09133445566',
        gender: 'male',
        jobPosition: 'کارشناس فروش',
        email: '',
        isPrimary: true,
      },
    ],
    interactions: [{ id: 'POY-1404-012', date: '۱۴۰۴/۰۱/۱۲', type: 'پیگیری', summary: 'استعلام قیمت تیرآهن' }],
    relatedOrders: [],
    accountBalanceRial: 8_400_000_000,
    financial: { creditLimitRial: 10_000_000_000, accountBalanceRial: 8_400_000_000 },
  },
  {
    id: 3,
    entityType: ENTITY_TYPES.CUSTOMER,
    personType: PERSON_TYPES.NATURAL,
    personName: 'علی رضایی',
    mobile: '09121234567',
    province: 'تهران',
    activityDomain: 'بازرگانی آهن و فولاد',
    behavioralStatus: 'active',
    financial: { creditLimitRial: 5_000_000_000, accountBalanceRial: 0 },
    assignee: { name: 'مریم احمدی', role: 'شوالیه' },
    relatedPersons: [],
    interactions: [{ id: 'POY-1404-014', date: '۱۴۰۴/۰۱/۱۴', type: 'پیگیری', summary: 'ارسال لیست قیمت' }],
    relatedOrders: [
      { id: 'JR050109004', title: 'ورق ۶mm', stage: 'پیش‌کش', amount: '۱٬۲۰۰٬۰۰۰٬۰۰۰', registeredAt: '۱۴۰۴/۰۱/۰۸' },
    ],
  },
  {
    id: 4,
    entityType: ENTITY_TYPES.CUSTOMER,
    personType: PERSON_TYPES.NATURAL,
    personName: 'مریم احمدی',
    mobile: '09351234567',
    province: 'اصفهان',
    activityDomain: 'ساختمان‌سازی',
    behavioralStatus: 'silent',
    assignee: { name: 'رضا نوری', role: 'شوالیه' },
    relatedPersons: [],
    interactions: [],
    relatedOrders: [],
  },
  {
    id: 5,
    entityType: ENTITY_TYPES.SUPPLIER,
    personType: PERSON_TYPES.LEGAL,
    companyName: 'ذوب آهن اصفهان',
    ownerName: 'حسین کریمی',
    nationalId: '10303456789',
    productGroups: [
      { group: 'میلگرد', subgroup: 'میلگرد آجدار' },
      { group: 'ورق', subgroup: 'ورق سیاه' },
    ],
    capabilityTags: [
      {
        id: 'subgroup-1-1',
        label: 'میلگرد آجدار',
        type: 'catalog',
        source: 'catalog',
        kind: 'subgroup',
        groupId: 1,
        subgroupId: 1,
      },
      {
        id: 'subgroup-2-1',
        label: 'ورق سیاه',
        type: 'catalog',
        source: 'catalog',
        kind: 'subgroup',
        groupId: 2,
        subgroupId: 1,
      },
    ],
    landline: '03112345678',
    supplierType: 'تولیدکننده',
    behavioralStatus: 'active',
    assignee: { name: 'فاطمه رحیمی', role: 'کاشف' },
    fullAddress: 'اصفهان، شهرک صنعتی محمودآباد',
    officialSpecs: { ...officialSample, registrationRegion: 'اصفهان' },
    legalPersons: { ceo: 'حسین کریمی', signatory: 'فاطمه رحیمی' },
    relatedPersons: [
      {
        id: 'rp-5-1',
        companyId: 5,
        fullName: 'رضا نوری',
        mobile: '09131234567',
        gender: 'male',
        jobPosition: 'انباردار',
        email: '',
        isPrimary: true,
      },
    ],
    interactions: [{ id: 'POY-1404-013', date: '۱۴۰۴/۰۱/۱۳', type: 'پیگیری', summary: 'هماهنگی تحویل بار' }],
    relatedOrders: [],
  },
  {
    id: 6,
    entityType: ENTITY_TYPES.SUPPLIER,
    personType: PERSON_TYPES.LEGAL,
    companyName: 'فولاد مبارکه',
    ownerName: 'رضا نوری',
    nationalId: '10404567890',
    productGroups: [
      { group: 'ورق', subgroup: 'ورق گالوانیزه' },
      { group: 'ورق', subgroup: 'ورق روغنی (سرد)' },
    ],
    capabilityTags: [
      {
        id: 'subgroup-2-2',
        label: 'ورق گالوانیزه',
        type: 'catalog',
        source: 'catalog',
        kind: 'subgroup',
        groupId: 2,
        subgroupId: 2,
      },
      {
        id: 'custom-st52-seed',
        label: 'ST52',
        type: 'custom',
        source: 'supplier_input',
      },
    ],
    landline: '03133445566',
    supplierType: 'تولیدکننده',
    behavioralStatus: 'ambassador',
    assignee: { name: 'امیر صادقی', role: 'کاشف' },
    officialSpecs: {},
    legalPersons: {},
    relatedPersons: [],
    interactions: [],
    relatedOrders: [],
  },
  {
    id: 7,
    entityType: ENTITY_TYPES.SUPPLIER,
    personType: PERSON_TYPES.NATURAL,
    personName: 'سارا موسوی',
    mobile: '09151234567',
    productGroups: [{ group: 'لوله', subgroup: 'لوله مانیسمان' }],
    capabilityTags: [
      {
        id: 'subgroup-3-1',
        label: 'لوله مانیسمان',
        type: 'catalog',
        source: 'catalog',
        kind: 'subgroup',
        groupId: 3,
        subgroupId: 1,
      },
    ],
    landline: '02144556677',
    supplierType: 'واسطه‌گر',
    behavioralStatus: 'trial',
    assignee: { name: 'سارا موسوی', role: 'کاشف' },
    relatedPersons: [],
    interactions: [{ id: 'POY-1404-008', date: '۱۴۰۴/۰۱/۰۸', type: 'جلسه حضوری', summary: 'معرفی محصولات جدید' }],
    relatedOrders: [],
  },
  {
    id: 8,
    entityType: ENTITY_TYPES.CUSTOMER,
    personType: PERSON_TYPES.LEGAL,
    companyName: 'بازرگانی آذر',
    nationalId: '10505678901',
    province: 'آذربایجان شرقی',
    activityDomain: 'بازرگانی آهن و فولاد',
    behavioralStatus: 'stagnant',
    assignee: { name: 'سارا موسوی', role: 'شوالیه' },
    officialSpecs: {},
    legalPersons: {},
    relatedPersons: [],
    interactions: [{ id: 'POY-1403-1020', date: '۱۴۰۳/۱۰/۲۰', type: 'پیگیری', summary: 'آخرین پیگیری' }],
    relatedOrders: [],
  },
];

const metaById = {
  1: { createdDays: 420, activityDays: 3, analytics: { interactionValue: '۲.۵ میلیارد تومان', openOrders: 2 } },
  2: { createdDays: 180, activityDays: 12, analytics: { interactionValue: '۸۵۰ میلیون تومان', openOrders: 0 } },
  3: { createdDays: 90, activityDays: 5, analytics: { interactionValue: '۱.۲ میلیارد تومان', openOrders: 1 } },
  4: { createdDays: 240, activityDays: 75, analytics: { interactionValue: '۳۲۰ میلیون تومان', openOrders: 0 }, isActive: false },
  5: { createdDays: 730, activityDays: 7, analytics: { supplyVolume: '۴.۸ میلیارد تومان', openInquiries: 3 } },
  6: { createdDays: 1100, activityDays: 45, analytics: { supplyVolume: '۹.۲ میلیارد تومان', openInquiries: 1 } },
  7: { createdDays: 60, activityDays: 14, analytics: { supplyVolume: '۶۵۰ میلیون تومان', openInquiries: 2 } },
  8: { createdDays: 300, activityDays: 120, analytics: { interactionValue: '۱۵۰ میلیون تومان', openOrders: 0 } },
};

export const initialContacts = rawContacts.map((c) => withMeta(c, metaById[c.id]));
