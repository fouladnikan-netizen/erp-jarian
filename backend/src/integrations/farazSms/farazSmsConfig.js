/**
 * Faraz / IPPanel SMS credentials — ENV only, never frontend.
 */

export function loadFarazSmsConfig() {
  const apiKey = String(process.env.FARAZ_SMS_API_KEY || '').trim();
  const sender = String(process.env.FARAZ_SMS_SENDER || '').trim();
  const baseUrl = String(process.env.FARAZ_SMS_BASE_URL || 'https://api2.ippanel.com').replace(/\/+$/, '');
  const invitePattern = String(process.env.FARAZ_SMS_PATTERN_INVITE || '').trim();
  const otpPattern = String(process.env.FARAZ_SMS_PATTERN_OTP || '').trim();
  const nodeEnv = String(process.env.NODE_ENV || 'development');
  const modeOverride = String(process.env.FARAZ_SMS_MODE || '').trim().toLowerCase();
  const isProduction = nodeEnv === 'production';
  const useLive = modeOverride === 'live'
    || (isProduction && Boolean(apiKey) && modeOverride !== 'mock');
  return {
    apiKey: apiKey || null,
    sender: sender || null,
    baseUrl,
    invitePattern: invitePattern || null,
    otpPattern: otpPattern || null,
    isProduction,
    useLive,
  };
}
