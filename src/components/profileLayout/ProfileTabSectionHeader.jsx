/**
 * Unified glass header for Customer Profile tab panels
 * (title + subtitle + lucide icon badge + optional left action).
 */
export default function ProfileTabSectionHeader({ title, subtitle, Icon, action }) {
  return (
    <header className="kprofile-tab-head kprofile-glass">
      {Icon ? (
        <span className="kprofile-tab-head__badge" aria-hidden="true">
          <Icon size={16} strokeWidth={1.75} />
        </span>
      ) : null}
      <div className="kprofile-tab-head__text">
        <h2 className="kprofile-tab-head__title font-meem">{title}</h2>
        {subtitle ? (
          <p className="kprofile-tab-head__subtitle font-meem">{subtitle}</p>
        ) : null}
      </div>
      {action ? (
        <div className="kprofile-tab-head__action">{action}</div>
      ) : null}
    </header>
  );
}
