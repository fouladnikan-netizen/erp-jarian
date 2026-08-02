import { useState } from 'react';
import { Eye, EyeOff, Lock, User } from 'lucide-react';

/**
 * Presentational login form — no layout/sidebar dependencies.
 * Parent supplies onSubmit({ username, password }) and handles API / redirect.
 */
export default function LoginForm({ onSubmit, loading = false, error = '' }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading) return;
    onSubmit?.({ username: username.trim(), password });
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-field">
        <label className="auth-field__label font-meem" htmlFor="auth-username">
          شناسه کاربری
        </label>
        <div className="auth-field__control">
          <span className="auth-field__icon" aria-hidden="true">
            <User size={18} strokeWidth={1.75} />
          </span>
          <input
            id="auth-username"
            name="username"
            type="text"
            className="auth-field__input font-yekan"
            autoComplete="username"
            inputMode="text"
            dir="rtl"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
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
    </form>
  );
}
