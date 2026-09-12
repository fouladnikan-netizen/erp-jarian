/**
 * Canonical Iranian bank master for Organization Identity (DDL-32 / DDL-34).
 * Codes are CBI 3-digit identifiers used in Iranian IBAN BBAN.
 *
 * accountNumberRule / placeholder / formatter stay unset until a format is
 * verified from a reliable source. Do not invent per-bank regexes.
 */

export const IRAN_BANKS = Object.freeze([
  { code: '017', name: 'بانک ملی ایران', logoAsset: '017.svg' },
  { code: '012', name: 'بانک ملت', logoAsset: '012.svg' },
  { code: '015', name: 'بانک سپه', logoAsset: '015.svg' },
  { code: '018', name: 'بانک تجارت', logoAsset: '018.svg' },
  { code: '019', name: 'بانک صادرات ایران', logoAsset: '019.svg' },
  { code: '016', name: 'بانک کشاورزی', logoAsset: '016.svg' },
  { code: '013', name: 'بانک رفاه کارگران', logoAsset: '013.svg' },
  { code: '014', name: 'بانک مسکن', logoAsset: '014.svg' },
  { code: '011', name: 'بانک صنعت و معدن', logoAsset: '011.svg' },
  { code: '020', name: 'بانک توسعه صادرات ایران', logoAsset: '020.svg' },
  { code: '021', name: 'پست بانک ایران', logoAsset: '021.svg' },
  { code: '022', name: 'بانک توسعه تعاون', logoAsset: '022.svg' },
  { code: '053', name: 'بانک کارآفرین', logoAsset: '053.svg' },
  { code: '054', name: 'بانک پارسیان', logoAsset: '054.svg' },
  { code: '055', name: 'بانک اقتصاد نوین', logoAsset: '055.svg' },
  { code: '056', name: 'بانک سامان', logoAsset: '056.svg' },
  { code: '057', name: 'بانک پاسارگاد', logoAsset: '057.svg' },
  { code: '058', name: 'بانک سرمایه', logoAsset: '058.svg' },
  { code: '059', name: 'بانک سینا', logoAsset: '059.svg' },
  { code: '060', name: 'بانک قرض‌الحسنه مهر ایران', logoAsset: '060.svg' },
  { code: '061', name: 'بانک شهر', logoAsset: '061.svg' },
  { code: '062', name: 'بانک آینده', logoAsset: '062.svg' },
  { code: '064', name: 'بانک گردشگری', logoAsset: '064.svg' },
  { code: '066', name: 'بانک دی', logoAsset: '066.svg' },
  { code: '069', name: 'بانک ایران زمین', logoAsset: '069.svg' },
  { code: '070', name: 'بانک قرض‌الحسنه رسالت', logoAsset: '070.svg' },
  { code: '078', name: 'بانک خاورمیانه', logoAsset: '078.svg' },
]);

const BY_CODE = new Map(IRAN_BANKS.map((bank) => [bank.code, bank]));

export function bankByCode(code) {
  return BY_CODE.get(String(code || '').trim()) || null;
}

export function inferBankCodeFromName(name) {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const hit = IRAN_BANKS.find((bank) => raw === bank.name || raw.includes(bank.name.replace(/^بانک\s+/, '')) || bank.name.includes(raw));
  return hit?.code || '';
}
