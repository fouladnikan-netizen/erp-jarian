/**
 * Iranian province → city master for Organization Identity (DDL-32 / DDL-33).
 * Stable codes internally; Persian names in UI.
 * Do not import Kanoon IRAN_PROVINCES (incomplete, module-internal).
 */

function province(code, name, cities) {
  return Object.freeze({
    code,
    name,
    cities: Object.freeze(cities.map(([cityCode, cityName]) => Object.freeze({
      code: `${code}-${cityCode}`,
      name: cityName,
    }))),
  });
}

export const IRAN_GEO = Object.freeze([
  province('EA', 'آذربایجان شرقی', [['TBZ', 'تبریز'], ['MRG', 'مراغه'], ['MRD', 'مرند'], ['MYN', 'میانه'], ['AHR', 'اهر'], ['SHB', 'شبستر']]),
  province('WA', 'آذربایجان غربی', [['URM', 'ارومیه'], ['KHY', 'خوی'], ['MHB', 'مهاباد'], ['BUK', 'بوکان'], ['MDA', 'میاندوآب'], ['SLM', 'سلماس']]),
  province('ARD', 'اردبیل', [['ARD', 'اردبیل'], ['PAR', 'پارس‌آباد'], ['MSG', 'مشگین‌شهر'], ['KHL', 'خلخال'], ['GRM', 'گرمی']]),
  province('ISF', 'اصفهان', [['ISF', 'اصفهان'], ['KAS', 'کاشان'], ['NJF', 'نجف‌آباد'], ['KHM', 'خمینی‌شهر'], ['SHH', 'شاهین‌شهر'], ['SHZ', 'شهرضا'], ['FLD', 'فولادشهر']]),
  province('ALB', 'البرز', [['KRJ', 'کرج'], ['FRD', 'فردیس'], ['NZR', 'نظرآباد'], ['HSH', 'هشتگرد'], ['MHD', 'محمدشهر'], ['MHD2', 'ماهدشت']]),
  province('ILM', 'ایلام', [['ILM', 'ایلام'], ['DHL', 'دهلران'], ['ABD', 'آبدانان'], ['MHR', 'مهران'], ['EYV', 'ایوان']]),
  province('BSH', 'بوشهر', [['BSH', 'بوشهر'], ['BRZ', 'برازجان'], ['GNA', 'گناوه'], ['KNG', 'کنگان'], ['ASL', 'عسلویه'], ['KHR', 'خورموج']]),
  province('TEH', 'تهران', [['TEH', 'تهران'], ['ISL', 'اسلامشهر'], ['SHR', 'شهریار'], ['REY', 'ری'], ['QDS', 'قدس'], ['MLR', 'ملارد'], ['PKD', 'پاکدشت'], ['VAR', 'ورامین'], ['PRD', 'پردیس'], ['DMV', 'دماوند'], ['RBT', 'رباط‌کریم']]),
  province('CHB', 'چهارمحال و بختیاری', [['SHK', 'شهرکرد'], ['BRJ', 'بروجن'], ['FAR', 'فارسان'], ['LRD', 'لردگان'], ['SAM', 'سامان']]),
  province('SKH', 'خراسان جنوبی', [['BRJ', 'بیرجند'], ['QAY', 'قائن'], ['FRD', 'فردوس'], ['TBS', 'طبس'], ['NHB', 'نهبندان']]),
  province('RKH', 'خراسان رضوی', [['MSH', 'مشهد'], ['NSH', 'نیشابور'], ['SBZ', 'سبزوار'], ['TBH', 'تربت حیدریه'], ['KSH', 'کاشمر'], ['QCH', 'قوچان'], ['GNB', 'گناباد']]),
  province('NKH', 'خراسان شمالی', [['BJN', 'بجنورد'], ['SHV', 'شیروان'], ['ESF', 'اسفراین'], ['ASH', 'آشخانه']]),
  province('KHZ', 'خوزستان', [['AHV', 'اهواز'], ['ABD', 'آبادان'], ['KHM', 'خرمشهر'], ['DZF', 'دزفول'], ['AND', 'اندیمشک'], ['MHS', 'ماهشهر'], ['SHT', 'شوشتر'], ['IZH', 'ایذه'], ['BHB', 'بهبهان']]),
  province('ZJN', 'زنجان', [['ZJN', 'زنجان'], ['ABH', 'ابهر'], ['KHD', 'خرمدره'], ['QYD', 'قیدار']]),
  province('SMN', 'سمنان', [['SMN', 'سمنان'], ['SHR', 'شاهرود'], ['DMG', 'دامغان'], ['GRM', 'گرمسار']]),
  province('SBL', 'سیستان و بلوچستان', [['ZHD', 'زاهدان'], ['ZBL', 'زابل'], ['CHB', 'چابهار'], ['IRN', 'ایرانشهر'], ['KHS', 'خاش'], ['KNK', 'کنارک']]),
  province('FAR', 'فارس', [['SHZ', 'شیراز'], ['MRV', 'مرودشت'], ['JHR', 'جهرم'], ['KAZ', 'کازرون'], ['FSA', 'فسا'], ['LAR', 'لار'], ['DRB', 'داراب']]),
  province('QZV', 'قزوین', [['QZV', 'قزوین'], ['TKS', 'تاکستان'], ['ABK', 'آبیک'], ['MHD', 'محمدیه'], ['ALV', 'الوند']]),
  province('QOM', 'قم', [['QOM', 'قم']]),
  province('KRD', 'کردستان', [['SNJ', 'سنندج'], ['SQZ', 'سقز'], ['MRV', 'مریوان'], ['BAN', 'بانه'], ['QRV', 'قروه']]),
  province('KER', 'کرمان', [['KER', 'کرمان'], ['SIR', 'سیرجان'], ['RFS', 'رفسنجان'], ['JIR', 'جیرفت'], ['BAM', 'بم'], ['ZRN', 'زرند']]),
  province('KSH', 'کرمانشاه', [['KSH', 'کرمانشاه'], ['ISL', 'اسلام‌آباد غرب'], ['SNQ', 'سنقر'], ['KNG', 'کنگاور'], ['JAV', 'جوانرود']]),
  province('KOB', 'کهگیلویه و بویراحمد', [['YAS', 'یاسوج'], ['DGN', 'دوگنبدان'], ['DHD', 'دهدشت']]),
  province('GLS', 'گلستان', [['GRG', 'گرگان'], ['GNB', 'گنبد کاووس'], ['BTK', 'بندر ترکمن'], ['ALI', 'علی‌آباد'], ['KRD', 'کردکوی']]),
  province('GIL', 'گیلان', [['RST', 'رشت'], ['ANZ', 'بندر انزلی'], ['LHJ', 'لاهیجان'], ['LNG', 'لنگرود'], ['AST', 'آستارا'], ['TLS', 'تالش'], ['RUD', 'رودسر']]),
  province('LOR', 'لرستان', [['KHD', 'خرم‌آباد'], ['BRJ', 'بروجرد'], ['DRD', 'دورود'], ['ALG', 'الیگودرز'], ['KHD2', 'کوهدشت']]),
  province('MAZ', 'مازندران', [['SAR', 'ساری'], ['BBL', 'بابل'], ['AML', 'آمل'], ['QAY', 'قائم‌شهر'], ['TNK', 'تنکابن'], ['CHL', 'چالوس'], ['NSH', 'نوشهر'], ['RMS', 'رامسر'], ['BHS', 'بهشهر']]),
  province('MRK', 'مرکزی', [['ARK', 'اراک'], ['SAV', 'ساوه'], ['KHM', 'خمین'], ['MHL', 'محلات'], ['DLJ', 'دلیجان']]),
  province('HRM', 'هرمزگان', [['BND', 'بندرعباس'], ['MNB', 'میناب'], ['QSM', 'قشم'], ['KSH', 'کیش'], ['LNG', 'بندر لنگه'], ['HAJ', 'حاجی‌آباد']]),
  province('HMD', 'همدان', [['HMD', 'همدان'], ['MLY', 'ملایر'], ['NHV', 'نهاوند'], ['TUS', 'تویسرکان'], ['ASD', 'اسدآباد']]),
  province('YZD', 'یزد', [['YZD', 'یزد'], ['MYB', 'میبد'], ['ARD', 'اردکان'], ['MHR', 'مهریز'], ['BAF', 'بافق']]),
]);

export const IRAN_PROVINCES = Object.freeze(IRAN_GEO.map((item) => item.name));

const BY_CODE = new Map(IRAN_GEO.map((item) => [item.code, item]));
const BY_NAME = new Map(IRAN_GEO.map((item) => [item.name, item]));

export function provinceByCode(code) {
  return BY_CODE.get(String(code || '').trim()) || null;
}

export function provinceByName(name) {
  return BY_NAME.get(String(name || '').trim()) || null;
}

export function resolveProvince(codeOrName) {
  return provinceByCode(codeOrName) || provinceByName(codeOrName);
}

export function cityByCode(province, cityCode) {
  const p = typeof province === 'string' ? resolveProvince(province) : province;
  if (!p) return null;
  return p.cities.find((city) => city.code === String(cityCode || '').trim()) || null;
}

export function cityByName(province, cityName) {
  const p = typeof province === 'string' ? resolveProvince(province) : province;
  if (!p) return null;
  return p.cities.find((city) => city.name === String(cityName || '').trim()) || null;
}

export function citiesForProvinceCode(provinceCode, currentCityCode = '', currentCityName = '') {
  const p = resolveProvince(provinceCode);
  const list = p ? [...p.cities] : [];
  const code = String(currentCityCode || '').trim();
  const name = String(currentCityName || '').trim();
  if (code && !list.some((city) => city.code === code)) {
    list.unshift({ code, name: name || code });
  } else if (name && !list.some((city) => city.name === name)) {
    list.unshift({ code: code || name, name });
  }
  return list;
}

/** @deprecated name-based helper for legacy rows */
export function citiesForProvince(province, currentCity = '') {
  return citiesForProvinceCode(province, '', currentCity).map((city) => city.name);
}

export function isKnownProvince(province) {
  return Boolean(resolveProvince(province));
}

export function cityBelongsToProvince(province, city) {
  const name = String(city || '').trim();
  if (!name) return true;
  const p = resolveProvince(province);
  if (!p) return false;
  return p.cities.some((item) => item.name === name || item.code === name);
}

export function cityBelongsToProvinceCode(provinceCode, cityCode, cityName) {
  const p = resolveProvince(provinceCode);
  if (!p) return !cityCode && !cityName;
  if (!cityCode && !cityName) return true;
  return p.cities.some((item) => (
    (cityCode && item.code === cityCode) || (cityName && item.name === cityName)
  ));
}
