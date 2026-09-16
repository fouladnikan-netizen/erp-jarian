import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkCriticalValuePreservation,
  extractCriticalValues,
} from '../domain/correspondence/criticalValuePreservation.js';

test('no critical values in either text -> ok', () => {
  const result = checkCriticalValuePreservation(
    'سلام خوبی؟ فردا میام دفتر.',
    'با سلام و احترام؛ فردا در دفتر حضور خواهم داشت.',
  );
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
});

test('amount preserved with different digit script / separators -> ok', () => {
  const original = 'مبلغ فاکتور ۱۲,۰۰۰,۰۰۰ ریال است.';
  const rewritten = 'با احترام، مبلغ فاکتور 12,000,000 ریال محاسبه و اعلام می‌گردد.';
  const result = checkCriticalValuePreservation(original, rewritten);
  assert.equal(result.ok, true);
});

test('amount changed -> violation', () => {
  const original = 'مبلغ فاکتور ۱۲,۰۰۰,۰۰۰ ریال است.';
  const rewritten = 'مبلغ فاکتور ۱۵,۰۰۰,۰۰۰ ریال است.';
  const result = checkCriticalValuePreservation(original, rewritten);
  assert.equal(result.ok, false);
  const amountViolation = result.violations.find((v) => v.kind === 'amount');
  assert.ok(amountViolation, 'expected an amount violation');
  assert.deepEqual(amountViolation.missing, ['12000000']);
});

test('amount dropped entirely (missing in rewrite) -> violation', () => {
  const original = 'مبلغ قابل پرداخت ۸,۵۰۰,۰۰۰ ریال می‌باشد.';
  const rewritten = 'مبلغ قابل پرداخت متعاقباً اعلام خواهد شد.';
  const result = checkCriticalValuePreservation(original, rewritten);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.kind === 'amount'));
});

test('jalali date preserved -> ok', () => {
  const original = 'تحویل کالا حداکثر تا تاریخ ۱۴۰۵/۰۴/۲۰ انجام می‌شود.';
  const rewritten = 'خواهشمند است ترتیبی اتخاذ فرمایید تا تحویل کالا حداکثر تا تاریخ 1405/04/20 صورت پذیرد.';
  const result = checkCriticalValuePreservation(original, rewritten);
  assert.equal(result.ok, true);
});

test('date changed -> violation', () => {
  const original = 'مهلت پاسخ تا تاریخ ۱۴۰۵/۰۴/۲۰ است.';
  const rewritten = 'مهلت پاسخ تا تاریخ ۱۴۰۵/۰۵/۰۱ است.';
  const result = checkCriticalValuePreservation(original, rewritten);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.kind === 'date'));
});

test('percentage preserved -> ok, percentage changed -> violation', () => {
  const okResult = checkCriticalValuePreservation(
    'تخفیف ۵ درصد در نظر گرفته شد.',
    'با احترام، تخفیف ۵ درصد برای این سفارش لحاظ گردید.',
  );
  assert.equal(okResult.ok, true);

  const badResult = checkCriticalValuePreservation(
    'تخفیف ۵ درصد در نظر گرفته شد.',
    'تخفیف ۱۰ درصد در نظر گرفته شد.',
  );
  assert.equal(badResult.ok, false);
  assert.ok(badResult.violations.some((v) => v.kind === 'percentage'));
});

test('order/invoice code changed -> violation', () => {
  const original = 'با عطف به شماره سفارش JR-000123 اعلام می‌داریم...';
  const rewritten = 'با عطف به شماره سفارش JR-000999 اعلام می‌داریم...';
  const result = checkCriticalValuePreservation(original, rewritten);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.kind === 'code'));
});

test('order code preserved despite rewording -> ok', () => {
  const original = 'سفارش شماره JR-000123 در حال پردازش است.';
  const rewritten = 'به استحضار می‌رساند سفارش شماره JR-000123 در دست اقدام می‌باشد.';
  const result = checkCriticalValuePreservation(original, rewritten);
  assert.equal(result.ok, true);
});

test('quantity+unit changed -> violation', () => {
  const original = 'مقدار ۲۴ تن میلگرد سفارش داده شد.';
  const rewritten = 'مقدار ۳۰ تن میلگرد سفارش داده شد.';
  const result = checkCriticalValuePreservation(original, rewritten);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.kind === 'quantity'));
});

test('quantity+unit preserved -> ok', () => {
  const original = 'مقدار ۲۴ تن میلگرد آجدار سفارش داده شد.';
  const rewritten = 'مقدار ۲۴ تن میلگرد آجدار طبق قرارداد سفارش داده شده است.';
  const result = checkCriticalValuePreservation(original, rewritten);
  assert.equal(result.ok, true);
});

test('company name preserved -> ok, company name changed -> violation', () => {
  const ok = checkCriticalValuePreservation(
    'این نامه خطاب به شرکت فولاد پارس ارسال می‌شود.',
    'با احترام، این مکاتبه خطاب به شرکت فولاد پارس تنظیم گردیده است.',
  );
  assert.equal(ok.ok, true);

  const bad = checkCriticalValuePreservation(
    'این نامه خطاب به شرکت فولاد پارس ارسال می‌شود.',
    'این نامه خطاب به شرکت فولاد کرمان ارسال می‌شود.',
  );
  assert.equal(bad.ok, false);
  assert.ok(bad.violations.some((v) => v.kind === 'name'));
});

test('purely additive new facts in rewrite do not fail the check', () => {
  const original = 'مبلغ ۱,۰۰۰,۰۰۰ ریال واریز گردید.';
  const rewritten = 'با سلام؛ به استحضار می‌رساند مبلغ ۱,۰۰۰,۰۰۰ ریال واریز گردید و رسید آن ضمیمه است. شماره پیگیری: TRX-999.';
  const result = checkCriticalValuePreservation(original, rewritten);
  assert.equal(result.ok, true);
});

test('multiple simultaneous mutations are all reported', () => {
  const original = 'مبلغ ۲,۰۰۰,۰۰۰ ریال، تخفیف ۱۰ درصد، تاریخ ۱۴۰۵/۰۱/۰۱، سفارش JR-000001.';
  const rewritten = 'مبلغ ۳,۰۰۰,۰۰۰ ریال، تخفیف ۲۰ درصد، تاریخ ۱۴۰۵/۰۲/۰۲، سفارش JR-000002.';
  const result = checkCriticalValuePreservation(original, rewritten);
  assert.equal(result.ok, false);
  const kinds = result.violations.map((v) => v.kind).sort();
  assert.deepEqual(kinds, ['amount', 'code', 'date', 'percentage']);
});

test('HTML-wrapped bodies are compared on plain text content', () => {
  const original = '<p>مبلغ <strong>۵,۰۰۰,۰۰۰</strong> ریال پرداخت شد.</p>';
  const rewritten = '<p>با احترام، مبلغ ۵,۰۰۰,۰۰۰ ریال با موفقیت پرداخت گردید.</p>';
  const result = checkCriticalValuePreservation(original, rewritten);
  assert.equal(result.ok, true);
});

test('extractCriticalValues returns empty arrays for empty input', () => {
  const values = extractCriticalValues('');
  assert.deepEqual(values.amount, []);
  assert.deepEqual(values.date, []);
  assert.deepEqual(values.percentage, []);
  assert.deepEqual(values.code, []);
  assert.deepEqual(values.quantity, []);
  assert.deepEqual(values.name, []);
});
