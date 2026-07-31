/**
 * توست سراسری خارج از درخت ری‌اکت — برای پیام‌هایی که باید از ناوبری بین ماژول‌ها
 * جان سالم به در ببرند (مثل پل طلایی افق → نبض).
 * تم قرمز/نقره‌ای جریان: پیل گلاسی سفید-نقره‌ای با تیک قرمز براق. استایل inline است
 * تا به CSS هیچ ماژولی وابسته نباشد.
 */
export function showSystemToast(message, { duration = 2800 } = {}) {
  const toast = document.createElement('div');
  toast.setAttribute('role', 'status');
  toast.dir = 'rtl';
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '9999',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.65rem 1.1rem',
    borderRadius: '14px',
    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(241, 245, 249, 0.94) 100%)',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    color: '#1e293b',
    fontFamily: 'inherit',
    fontSize: '0.82rem',
    fontWeight: '700',
    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    pointerEvents: 'none',
  });

  const badge = document.createElement('span');
  badge.setAttribute('aria-hidden', 'true');
  Object.assign(badge.style, {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.35rem',
    height: '1.35rem',
    borderRadius: '50%',
    flexShrink: '0',
    color: '#fff',
    background: 'linear-gradient(140deg, #ef5350 0%, #e53935 60%, #c62828 100%)',
    boxShadow: '0 4px 10px rgba(229, 57, 53, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
  });
  badge.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  toast.appendChild(badge);
  toast.appendChild(document.createTextNode(message));
  document.body.appendChild(toast);

  const fade = [
    { opacity: 0, transform: 'translateX(-50%) translateY(8px)' },
    { opacity: 1, transform: 'translateX(-50%) translateY(0)' },
  ];
  toast.animate(fade, { duration: 180, easing: 'ease-out' });

  setTimeout(() => {
    const out = toast.animate([...fade].reverse(), { duration: 220, easing: 'ease-in' });
    out.onfinish = () => toast.remove();
  }, duration);
}
