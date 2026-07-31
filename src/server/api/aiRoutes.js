import { Router } from 'express';
import { rewriteWithAI, extractAiContent } from '../services/aiService.js';

const DEFAULT_SYSTEM_PROMPT = [
  'تو دستیار CRM سیستم «جریان» در صنعت فولاد هستی.',
  'متن خام کاربر را به یک گزارش تعامل رسمی، مختصر و حرفه‌ای به زبان فارسی بازنویسی کن.',
  'فقط متن بازنویسی‌شده را برگردان؛ بدون توضیح اضافه، بدون علامت نقل‌قول.',
].join(' ');

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
