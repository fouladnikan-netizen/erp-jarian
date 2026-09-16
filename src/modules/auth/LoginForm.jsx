import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Smartphone } from 'lucide-react';

/**
 * Presentational login form — no layout/sidebar dependencies.
 * Parent supplies onSubmit({ mobile, password }) and handles API / redirect.
 */
export default function LoginForm({ onSubmit, loading = false, error = '' }) {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading) return;
    onSubmit?.({ mobile: mobile.trim(), password });
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-field">
        <label className="auth-field__label font-meem" htmlFor="auth-mobile">
          شماره موبایل
        </label>
        <div className="auth-field__control">
          <span className="auth-field__icon" aria-hidden="true">
            <Smartphone size={18} strokeWidth={1.75} />
          </span>
          <input
            id="auth-mobile"
            name="mobile"
            type="tel"
            className="auth-field__input font-yekan"
            autoComplete="tel"
            inputMode="tel"
            dir="ltr"
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            disabled={loading}
            required
          />
        </div>
      </div>

      <div className="auth-field">
        <label className="auth-field__label font-meem" htmlFor="auth-password">
          رمز عبور
        </label>
        <div className="auth-field__control">
          <span className="auth-field__icon" aria-hidden="true">
            <Lock size={18} strokeWidth={1.75} />
          </span>
          <input
            id="auth-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            className="auth-field__input font-yekan"
            autoComplete="current-password"
            dir="rtl"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
            required
          />
          <button
            type="button"
            className="auth-field__reveal"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
            disabled={loading}
          >
            {showPassword ? (
              <EyeOff size={18} strokeWidth={1.75} />
            ) : (
              <Eye size={18} strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {error ? (
        <p className="auth-form__error font-meem" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="auth-submit font-meem"
        disabled={loading}
      >
        {loading ? 'در حال ورود…' : 'ورود به جریان'}
      </button>

      <p className="auth-form__links font-meem">
        <Link to="/forgot-password" className="auth-form__link">
          فراموشی رمز عبور
        </Link>
      </p>
    </form>
  );
}
