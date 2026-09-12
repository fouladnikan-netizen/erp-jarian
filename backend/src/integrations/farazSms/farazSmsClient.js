/**
 * Faraz SMS adapter (DDL-41).
 * Live path talks to IPPanel. Missing credentials → in-memory mock (non-production).
 * Message bodies with OTP / invitation URLs are never written to logs.
 */

import { loadFarazSmsConfig } from './farazSmsConfig.js';
import { toFarazRecipient } from '../../domain/userAccount/loginIdentifier.js';

const mockInbox = [];

export function clearMockSmsInbox() {
  mockInbox.length = 0;
}

export function getMockSmsInbox() {
  return mockInbox.slice();
}

function recordMock({ purpose, mobile, text, meta }) {
  mockInbox.push({
    purpose,
    mobile,
    text,
    meta: meta || {},
    sentAt: new Date().toISOString(),
  });
}

async function postJson(url, apiKey, payload, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `AccessKey ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
}

async function sendLive({ recipient, sender, message, pattern, variables, cfg }) {
  if (pattern) {
    return postJson(`${cfg.baseUrl}/api/v1/sms/pattern/normal/send`, cfg.apiKey, {
      code: pattern,
      sender,
      recipient,
      variable: variables || {},
    });
  }
  return postJson(`${cfg.baseUrl}/api/v1/sms/send/webservice/single`, cfg.apiKey, {
    recipient: [recipient],
    sender,
    message,
  });
}

export async function sendSms({ purpose, mobile, text, pattern, variables }) {
  const cfg = loadFarazSmsConfig();
  const recipient = toFarazRecipient(mobile);
  if (!cfg.useLive) {
    recordMock({ purpose, mobile, text, meta: { pattern: pattern || null, variables: variables || {} } });
    return { ok: true, channel: 'mock' };
  }
  if (!cfg.apiKey || !cfg.sender) {
    return { ok: false, channel: 'faraz', error: 'SMS_PROVIDER_UNAVAILABLE' };
  }
  try {
    const result = await sendLive({
      recipient,
      sender: cfg.sender,
      message: text,
      pattern: pattern || null,
      variables,
      cfg,
    });
    if (!result.ok) {
      return { ok: false, channel: 'faraz', error: 'SMS_SEND_FAILED' };
    }
    return { ok: true, channel: 'faraz' };
  } catch {
    return { ok: false, channel: 'faraz', error: 'SMS_SEND_FAILED' };
  }
}

export async function sendInvitationSms({ mobile, url }) {
  const cfg = loadFarazSmsConfig();
  const text = `دعوت به جریان\nبرای تعیین رمز عبور این پیوند را باز کنید:\n${url}`;
  return sendSms({
    purpose: 'INVITATION',
    mobile,
    text,
    pattern: cfg.invitePattern,
    variables: cfg.invitePattern ? { link: url } : undefined,
  });
}

export async function sendOtpSms({ mobile, code }) {
  const cfg = loadFarazSmsConfig();
  const text = `کد تأیید جریان: ${code}\nاین کد تا ۱۰ دقیقه معتبر است.`;
  return sendSms({
    purpose: 'OTP',
    mobile,
    text,
    pattern: cfg.otpPattern,
    variables: cfg.otpPattern ? { code } : undefined,
  });
}
