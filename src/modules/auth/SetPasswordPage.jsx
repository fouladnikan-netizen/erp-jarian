import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import AuthShell from './AuthShell';
import { AuthRepository } from '../../api/repositories/AuthRepository';
import './auth.css';

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = String(params.get('token') || '').trim();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(Boolean(token));
  const [valid, setValid] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setChecking(false);
      setValid(false);
      setError('پیوند تعیین رمز نامعتبر است.');
      return undefined;
    }
    setChecking(true);
    AuthRepository.peekInvitation(token)
      .then(() => {
        if (!cancelled) {
          setValid(true);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setValid(false);
          setError(err?.message || 'پیوند تعیین رمز نامعتبر یا منقضی است.');
        }
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || !valid) return;
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
      await AuthRepository.setPassword({ token, password });
      setDone(true);
    } catch (err) {
      setError(err?.message || 'ثبت رمز عبور ناموفق بود.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="تعیین رمز عبور">
      {checking ? (
        <p className="auth-form__hint font-meem">در حال بررسی پیوند…</p>
      ) : null}

      {done ? (
        <div className="auth-form">
          <p className="auth-form__success font-meem">رمز عبور ثبت شد. اکنون می‌توانید وارد شوید.</p>
          <button type="button" className="auth-submit font-meem" onClick={() => navigate('/login')}>
            ورود به جریان
          </button>
        </div>
      ) : null}

      {!checking && !done && valid ? (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <p className="auth-form__hint font-meem">رمز عبور حساب جریان را تعیین کنید.</p>
          <div className="auth-field">
            <label className="auth-field__label font-meem" htmlFor="set-password">رمز عبور</label>
            <div className="auth-field__control">
              <span className="auth-field__icon" aria-hidden="true">
                <Lock size={18} strokeWidth={1.75} />
              </span>
              <input
                id="set-password"
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
            <label className="auth-field__label font-meem" htmlFor="set-confirm">تکرار رمز عبور</label>
            <div className="auth-field__control">
              <span className="auth-field__icon" aria-hidden="true">
                <Lock size={18} strokeWidth={1.75} />
              </span>
              <input
                id="set-confirm"
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

      {!checking && !done && !valid ? (
        <div className="auth-form">
          {error ? <p className="auth-form__error font-meem" role="alert">{error}</p> : null}
          <p className="auth-form__links font-meem">
            <Link to="/login" className="auth-form__link">بازگشت به ورود</Link>
          </p>
        </div>
      ) : null}
    </AuthShell>
  );
}
