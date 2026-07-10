const TAG_MAP = {
  ambassador: { className: 'tag--ambassador', label: 'سفیر' },
  trial: { className: 'tag--trial', label: 'تجربه‌گر' },
  hesitant: { className: 'tag--hesitant', label: 'مردد' },
  radar: { className: 'tag--radar', label: 'رصدگر' },
  silent: { className: 'tag--silent', label: 'خاموش' },
  active: { className: 'tag--active', label: '' },
  pending: { className: 'tag--pending', label: '' },
  success: { className: 'tag--success', label: '' },
  danger: { className: 'tag--danger', label: '' },
};

export default function StatusTag({ value }) {
  if (!value.startsWith('tag:')) return value;

  const parts = value.slice(4).split(':');
  const type = parts[0];
  const customLabel = parts[1] || '';
  const meta = TAG_MAP[type] || { className: 'tag--active', label: customLabel };

  return (
    <span className={`tag ${meta.className}`}>
      {customLabel || meta.label}
    </span>
  );
}
