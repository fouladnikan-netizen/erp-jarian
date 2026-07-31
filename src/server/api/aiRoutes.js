import { Router } from 'express';
import { rewriteWithAI, extractAiContent } from '../services/aiService.js';

/**
 * استاندارد رسمی بازنویسی «خلاصه نتایج» جریان —
 * دستیار ویراستار ارتباط با مشتری (صنعت فولاد / ERP جریان).
 */
const DEFAULT_SYSTEM_PROMPT = [
  'تو متخصص بازنویسی و ویراستاری ارتباط با مشتری در پروژه ERP جریان هستی.',
  'وظیفه تو: متن خامِ گزارشِ جلسه با مشتری را بگیر و آن را طبق استانداردهای پروژه، بازنویسی کن.',
  '',
  'قوانین سخت‌گیرانه:',
  '- لحن: دوستانه، ساده، صمیمی، حرفه‌ای و مودبانه.',
  '- جملات: کوتاه و روان. از عبارت‌های قلمبه‌سلمبه، اداری و ثقیل (مثل: «مستحضر باشید»، «مشارالیه»، «بدین‌وسیله») اکیداً خودداری کن.',
  '- ساختار: حتماً از بولت‌پوینت استفاده کن تا خوانایی بالا برود.',
  '- شفافیت: توافق‌ها، تعهدات و نکات کلیدی را برجسته کن.',
  '- بخشِ «قدم‌های بعدی»: باید حتماً شامل «مسئول انجام کار» و «تاریخ دقیق» باشد (نه عبارات مبهم مثل به‌زودی). اگر تاریخ در متن خام نبود، بنویس «تاریخ: اعلام‌نشده — تکمیل شود».',
  '- دغدغه‌ها: تمام نگرانی‌های مشتری را حتی اگر هنوز حل نشده‌اند، ثبت کن. اگر دغدغه‌ای نبود، بنویس «دغدغهٔ خاصی مطرح نشد.»',
  '- طول متن: طوری باشد که در ۱۰ تا ۱۵ ثانیه خوانده شود.',
  '- از ایموجی‌های مناسب ✅، 📌 و 💬 به شکل محدود و فقط در عناوین بخش‌ها استفاده کن.',
  '',
  'ساختار خروجی را دقیقاً رعایت کن (بدون توضیح اضافه، بدون علامت نقل‌قول دور کل متن):',
  '**موضوع:** [موضوع جلسه]',
  '**تاریخ:** [تاریخ جلسه؛ اگر نبود بنویس اعلام‌نشده]',
  '',
  '**✅ توافق‌ها و دستاوردها:**',
  '- [نکته]',
  '',
  '**💬 نکات مهم / دغدغه‌های مشتری:**',
  '- [نکته]',
  '',
  '**📌 قدم‌های بعدی:**',
  '- [اقدام] — مسئول: [نام] — تا [تاریخ]',
].join('\n');

const aiRoutes = Router();

/**
 * POST /api/ai/rewrite
 * بدنه: { text: string, systemPrompt?: string }
 * پاسخ: { content: string }
 */
aiRoutes.post('/rewrite', async (req, res) => {
  const { text, systemPrompt } = req.body || {};

  if (typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'فیلد text الزامی است.' });
    return;
  }

  try {
    const completion = await rewriteWithAI(
      text.trim(),
      typeof systemPrompt === 'string' && systemPrompt.trim() ? systemPrompt.trim() : DEFAULT_SYSTEM_PROMPT,
    );
    const content = extractAiContent(completion);

    if (!content) {
      res.status(502).json({ error: 'پاسخ سرویس هوش مصنوعی فاقد محتوا بود.' });
      return;
    }

    res.json({ content });
  } catch (error) {
    console.error('[ai/rewrite]', error.message);
    if (error.code === 'AI_TIMEOUT') {
      res.status(504).json({ error: error.message });
      return;
    }
    res.status(502).json({ error: error.message });
  }
});

export default aiRoutes;
