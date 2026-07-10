function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function Header({ module }) {
  return (
    <header className="header" role="banner">
      <div className="header__inner">
        <div className="header__page">
          <h1 className="header__title">{module.name}</h1>
          <p className="header__desc">{module.description}</p>
        </div>

        <div className="header__actions">
          <button type="button" className="btn btn--ghost btn--icon" aria-label="اعلان‌ها">
            <BellIcon />
          </button>
        </div>
      </div>
    </header>
  );
}
