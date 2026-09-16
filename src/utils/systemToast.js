/**
 * توست سراسری خارج از درخت ری‌اکت — برای پیام‌هایی که باید از ناوبری بین ماژول‌ها
 * جان سالم به در ببرند (مثل پل طلایی افق → نبض).
 * رنگ‌ها فقط از Theme Tokens via CSS class (RFC-001).
 */
import '../styles/system-toast.css';

export function showSystemToast(message, { duration = 2800 } = {}) {
  const toast = document.createElement('div');
  toast.setAttribute('role', 'status');
  toast.dir = 'rtl';
  toast.className = 'jarian-system-toast';

  const badge = document.createElement('span');
  badge.setAttribute('aria-hidden', 'true');
  badge.className = 'jarian-system-toast__badge';
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
