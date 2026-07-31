import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LIARA_AI_ENDPOINT = 'https://ai.liara.ir/api/6a6c7a4da522823f9b2ff6aa/v1/chat/completions';
const AI_MODEL = 'deepseek/deepseek-chat-v3.1';
/** لیارا گاهی کند پاسخ می‌دهد؛ بعد از این مهلت درخواست لغو می‌شود. */
const REQUEST_TIMEOUT_MS = 20000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY_FILE = path.resolve(__dirname, '../../../Assets/API/API key.rtf');

let cachedApiKey = null;

/**
 * کلید API فقط سمت سرور خوانده می‌شود و هرگز به کلاینت نمی‌رسد.
 * اولویت با متغیر محیطی است (روش استاندارد دیپلوی روی لیارا)؛
 * در غیر این صورت از فایل محلی Assets/API خوانده می‌شود.
 * فایل RTF است، بنابراین توکن JWT از میان مارک‌آپ استخراج می‌شود.
 */
function loadApiKey() {
  if (cachedApiKey) return cachedApiKey;

  if (process.env.LIARA_AI_KEY) {
    cachedApiKey = process.env.LIARA_AI_KEY.trim();
    return cachedApiKey;
  }

  let raw;
  try {
    raw = readFileSync(API_KEY_FILE, 'utf8');
  } catch (error) {
    throw new Error(
      `کلید API یافت نشد — نه LIARA_AI_KEY تنظیم شده و نه فایل ${API_KEY_FILE} در دسترس است. (${error.message})`,
    );
  }

  const jwtMatch = raw.match(/[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/);
  if (!jwtMatch) {
    throw new Error('محتوای فایل کلید API قابل استخراج نیست (توکن JWT پیدا نشد).');
  }

  cachedApiKey = jwtMatch[0];
  return cachedApiKey;
}

/**
 * فراخوانی مدل DeepSeek روی زیرساخت هوش مصنوعی لیارا.
 * @returns {Promise<object>} پاسخ کامل chat/completions
 */
export async function rewriteWithAI(text, systemPrompt, { timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const apiKey = loadApiKey();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(LIARA_AI_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
      }),
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('پاسخ سرویس هوش مصنوعی در مهلت مقرر دریافت نشد.');
      timeoutError.code = 'AI_TIMEOUT';
      throw timeoutError;
    }
    const networkError = new Error(`اتصال به سرویس هوش مصنوعی لیارا برقرار نشد: ${error.message}`);
    networkError.code = 'AI_NETWORK';
    throw networkError;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const upstreamError = new Error(
      `سرویس هوش مصنوعی با خطا پاسخ داد (HTTP ${response.status}): ${body.slice(0, 300)}`,
    );
    upstreamError.code = 'AI_UPSTREAM';
    upstreamError.status = response.status;
    throw upstreamError;
  }

  return response.json();
}

/** استخراج متن نهایی از پاسخ chat/completions */
export function extractAiContent(completion) {
  return completion?.choices?.[0]?.message?.content ?? null;
}
