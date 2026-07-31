/**
 * توست سراسری خارج از درخت ری‌اکت — برای پیام‌هایی که باید از ناوبری بین ماژول‌ها
 * جان سالم به در ببرند (مثل پل طلایی افق → نبض). استایل inline است تا به CSS هیچ ماژولی وابسته نباشد.
 */
export function showSystemToast(message, { duration = 2800 } = {}) {
  const toast = document.createElement('div');
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '9999',
    padding: '0.7rem 1.3rem',
    borderRadius: '14px',
    background: 'rgba(15, 23, 42, 0.9)',
    color: '#fff',
    fontFamily: 'inherit',
    fontSize: '0.82rem',
    fontWeight: '600',
    direction: 'rtl',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.35)',
    backdropFilter: 'blur(8px)',
    pointerEvents: 'none',
  });
  document.body.appendChild(toast);

  const fade = [{ opacity: 0, transform: 'translateX(-50%) translateY(8px)' }, { opacity: 1, transform: 'translateX(-50%) translateY(0)' }];
  toast.animate(fade, { duration: 180, easing: 'ease-out' });

  setTimeout(() => {
    const out = toast.animate([...fade].reverse(), { duration: 220, easing: 'ease-in' });
    out.onfinish = () => toast.remove();
  }, duration);
}
