const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const TENS = ['', 'ده', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const HUNDREDS = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const SCALES = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

function convertUnder1000(value) {
  const n = value % 1000;
  if (n === 0) return '';

  const parts = [];
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;

  if (hundreds) parts.push(HUNDREDS[hundreds]);

  if (remainder >= 10 && remainder < 20) {
    parts.push(TEENS[remainder - 10]);
  } else {
    const tens = Math.floor(remainder / 10);
    const ones = remainder % 10;
    if (tens) parts.push(TENS[tens]);
    if (ones) parts.push(ONES[ones]);
  }

  return parts.join(' و ');
}

export function numberToPersianWords(amount) {
  let n = Math.round(Math.abs(Number(amount) || 0));
  if (n === 0) return 'صفر';

  const groups = [];
  let scale = 0;

  while (n > 0) {
    const chunk = n % 1000;
    if (chunk > 0) {
      const words = convertUnder1000(chunk);
      groups.unshift(SCALES[scale] ? `${words} ${SCALES[scale]}` : words);
    }
    n = Math.floor(n / 1000);
    scale += 1;
  }

  return groups.join(' و ');
}

export function formatAmountRialWords(amount) {
  return `${numberToPersianWords(amount)} ریال`;
}
