import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function StructureAccordion({ title, hint, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className="vitrin-structure__acc"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="vitrin-structure__acc-sum" aria-expanded={open}>
        <span className="vitrin-structure__acc-text">
          <span className="vitrin-structure__acc-title">{title}</span>
          {hint ? <span className="vitrin-structure__acc-hint">{hint}</span> : null}
        </span>
        <ChevronDown className="vitrin-structure__acc-chevron" size={18} aria-hidden="true" />
      </summary>
      <div className="vitrin-structure__acc-body">{children}</div>
    </details>
  );
}
