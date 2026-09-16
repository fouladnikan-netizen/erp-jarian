/**
 * Correspondence AI rewrite (DDL-23c) — thin wrapper over the existing,
 * already-live Liara/DeepSeek integration (`src/server/services/aiService.js`,
 * mounted at `/api/ai/rewrite` in `backend/src/index.js`). No duplicate
 * provider wiring — same server-only API key, same HTTP call shape.
 *
 * AI is an editor, never an autonomous sender (product rule 5): this
 * function only ever returns rewritten TEXT for human review. It never
 * writes `final_body` or changes `status`.
 */
import { rewriteWithAI, extractAiContent } from '../../../src/server/services/aiService.js';

const CORRESPONDENCE_SYSTEM_PROMPT = [
  'تو دستیار ویراستاری مکاتبات رسمی سازمانی در صنعت فولاد (ERP جریان) هستی.',
  'وظیفه تو: متن خامِ نامه اداری را بگیر و آن را به سبک نامه‌نگاری رسمی فارسی بازنویسی کنی.',
  '',
  'قوانین سخت‌گیرانه:',
  '- لحن: رسمی، محترمانه، اداری، اما روان (نه قلمبه‌سلمبه بیش از حد).',
  '- ساختار نامه رسمی را رعایت کن: با سلام/احترام آغاز شود، بدنه شفاف، و در صورت نیاز جمع‌بندی/درخواست اقدام در پایان.',
  '- هیچ عدد، تاریخ، درصد، مبلغ، شماره سفارش/فاکتور/قرارداد/حساب، نام شرکت یا نام شخصی را حذف، جایگزین یا تغییر نده — این مقادیر باید عیناً و با همان رقم‌نویسی (نه به‌صورت حروف/کلمه) در متن بازنویسی‌شده باقی بمانند. مثال درست: «۱,۰۰۰,۰۰۰ ریال» → «۱,۰۰۰,۰۰۰ ریال». مثال غلط: «۱,۰۰۰,۰۰۰ ریال» → «یک میلیون ریال».',
  '- می‌توانی جملات را بازآرایی، روان‌تر و رسمی‌تر کنی، اما هیچ واقعیت یا تعهد جدیدی اختراع نکن.',
  '- فقط متن نهایی نامه را برگردان — بدون توضیح اضافه، بدون علامت نقل‌قول دور کل متن.',
].join('\n');

/**
 * @param {string} rawText
 * @returns {Promise<string>} rewritten text
 * @throws {Error} with `.code` (AI_TIMEOUT | AI_NETWORK | AI_UPSTREAM) on failure
 */
export async function rewriteCorrespondenceText(rawText) {
  const completion = await rewriteWithAI(rawText, CORRESPONDENCE_SYSTEM_PROMPT);
  const content = extractAiContent(completion);
  if (!content) {
    const err = new Error('پاسخ سرویس هوش مصنوعی فاقد محتوا بود.');
    err.code = 'AI_EMPTY';
    throw err;
  }
  return content;
}

export default { rewriteCorrespondenceText };
