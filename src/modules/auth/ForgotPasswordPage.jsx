import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Lock, Smartphone } from 'lucide-react';
import AuthShell from './AuthShell';
import { AuthRepository } from '../../api/repositories/AuthRepository';
import { normalizeUserMobile, toAsciiDigits } from '../../domain/userAccount/normalize';
import './auth.css';

const STEPS = {
  MOBILE: 'mobile',
  OTP: 'otp',
  PASSWORD: 'password',
  DONE: 'done',
};

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.MOBILE);
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizedMobile = useMemo(() => normalizeUserMobile(mobile), [mobile]);

  const handleRequest = async (event) => {
    event.preventDefault();
    if (loading) return;
    if (!normalizedMobile.ok) {
      setError('شماره موبایل نامعتبر است.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await AuthRepository.requestPasswordReset(normalizedMobile.mobile);
      setStep(STEPS.OTP);
    } catch (err) {
      setError(err?.message || 'ارسال کد تأیید ناموفق بود.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    if (loading) return;
    const otp = toAsciiDigits(code).replace(/\D/g, '');
    if (otp.length !== 6) {
      setError('کد تأیید باید ۶ رقم باشد.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await AuthRepository.verifyPasswordResetOtp({
        mobile: normalizedMobile.mobile,
        code: otp,
      });
      setResetToken(result.resetToken);
      setStep(STEPS.PASSWORD);
    } catch (err) {
      setError(err?.message || 'کد تأیید نامعتبر است.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (event) => {
    event.preventDefault();
    if (loading) return;
    if (password.length < 8) {
      setError('رمز عبور باید حداقل ۸ نویسه باشد.');
      return;
    }
    if (password !== confirm) {
      setError('تکرار رمز عبور مطابقت ندارد.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await AuthRepository.setPassword({ token: resetToken, password });
      setStep(STEPS.DONE);
    } catch (err) {
      setError(err?.message || 'ثبت رمز عبور ناموفق بود.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="بازیابی رمز عبور">
      {step === STEPS.MOBILE ? (
        <form className="auth-form" onSubmit={handleRequest} noValidate>
          <p className="auth-form__hint font-meem">شماره موبایل سازمانی خود را وارد کنید.</p>
          <div className="auth-field">
            <label className="auth-field__label font-meem" htmlFor="forgot-mobile">شماره موبایل</label>
            <div className="auth-field__control">
              <span className="auth-field__icon" aria-hidden="true">
                <Smartphone size={18} strokeWidth={1.75} />
              </span>
              <input
                id="forgot-mobile"
                type="tel"
                className="auth-field__input font-yekan"
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>
          {error ? <p className="auth-form__error font-meem" role="alert">{error}</p> : null}
          <button type="submit" className="auth-submit font-meem" disabled={loading}>
            {loading ? 'در حال ارسال…' : 'ارسال کد تأیید'}
          </button>
          <p className="auth-form__links font-meem">
            <Link to="/login" className="auth-form__link">بازگشت به ورود</Link>
          </p>
        </form>
      ) : null}

      {step === STEPS.OTP ? (
        <form className="auth-form" onSubmit={handleVerify} noValidate>
          <p className="auth-form__hint font-meem">اگر این شماره در سامانه باشد، پیامک ارسال می‌شود. کد را وارد کنید.</p>
          <div className="auth-field">
            <label className="auth-field__label font-meem" htmlFor="forgot-otp">کد تأیید</label>
            <div className="auth-field__control">
              <span className="auth-field__icon" aria-hidden="true">
                <KeyRound size={18} strokeWidth={1.75} />
              </span>
              <input
                id="forgot-otp"
                type="text"
                className="auth-field__input font-yekan"
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>
          {error ? <p className="auth-form__error font-meem" role="alert">{error}</p> : null}
          <button type="submit" className="auth-submit font-meem" disabled={loading}>
            {loading ? 'در حال بررسی…' : 'ادامه'}
          </button>
        </form>
      ) : null}

      {step === STEPS.PASSWORD ? (
        <form className="auth-form" onSubmit={handleSetPassword} noValidate>
          <p className="auth-form__hint font-meem">رمز عبور جدید را تعیین کنید.</p>
          <div className="auth-field">
            <label className="auth-field__label font-meem" htmlFor="forgot-password">رمز عبور جدید</label>
            <div className="auth-field__control">
              <span className="auth-field__icon" aria-hidden="true">
                <Lock size={18} strokeWidth={1.75} />
              </span>
              <input
                id="forgot-password"
                type="password"
                className="auth-field__input font-yekan"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>
          <div className="auth-field">
            <label className="auth-field__label font-meem" htmlFor="forgot-confirm">تکرار رمز عبور</label>
            <div className="auth-field__control">
              <span className="auth-field__icon" aria-hidden="true">
                <Lock size={18} strokeWidth={1.75} />
              </span>
              <input
                id="forgot-confirm"
                type="password"
                className="auth-field__input font-yekan"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>
          {error ? <p className="auth-form__error font-meem" role="alert">{error}</p> : null}
          <button type="submit" className="auth-submit font-meem" disabled={loading}>
            {loading ? 'در حال ذخیره…' : 'ثبت رمز عبور'}
          </button>
        </form>
      ) : null}

      {step === STEPS.DONE ? (
        <div className="auth-form">
          <p className="auth-form__success font-meem">رمز عبور به‌روز شد. اکنون می‌توانید وارد شوید.</p>
          <button type="button" className="auth-submit font-meem" onClick={() => navigate('/login')}>
            ورود به جریان
          </button>
        </div>
      ) : null}
    </AuthShell>
  );
}
