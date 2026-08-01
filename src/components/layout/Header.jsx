import { useState } from 'react';
import { useTheme, THEMES } from '../../theme/ThemeContext';
import UnifiedJarianCalendar from '../calendar/UnifiedJarianCalendar';

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 14.3A8.5 8.5 0 0 1 9.7 3a7 7 0 1 0 11.3 11.3z" />
    </svg>
  );
}

export default function Header({ module }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === THEMES.DARK;
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  return (
    <header className="header" role="banner">
      <div className="header__inner">
        <div className="header__page">
          <h1 className="header__title">{module.name}</h1>
          <p className="header__desc">{module.description}</p>
        </div>

        <div className="header__actions">
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            aria-label={isDark ? 'فعال‌سازی حالت روز' : 'فعال‌سازی حالت شب'}
            aria-pressed={isDark}
            title={isDark ? 'حالت روز' : 'حالت شب'}
            onClick={toggleTheme}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            aria-label="تقویم یکپارچه جریان"
            aria-pressed={isCalendarOpen}
            title="تقویم یکپارچه جریان"
            onClick={() => setIsCalendarOpen(true)}
          >
            <CalendarIcon />
          </button>
          <button type="button" className="btn btn--ghost btn--icon" aria-label="اعلان‌ها">
            <BellIcon />
          </button>
        </div>
      </div>

      {isCalendarOpen ? (
        <UnifiedJarianCalendar open onClose={() => setIsCalendarOpen(false)} />
      ) : null}
    </header>
  );
}
