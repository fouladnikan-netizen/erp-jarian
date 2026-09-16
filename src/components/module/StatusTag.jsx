import ListStatusPill from './ListStatusPill';

const TAG_MAP = {
  ambassador: { kind: 'ambassador', label: 'سفیر' },
  trial: { kind: 'trial', label: 'تجربه‌گر' },
  hesitant: { kind: 'hesitant', label: 'مردد' },
  radar: { kind: 'radar', label: 'رصدگر' },
  silent: { kind: 'silent', label: 'خاموش' },
  active: { kind: 'active', label: '' },
  pending: { kind: 'pending', label: '' },
  success: { kind: 'success', label: '' },
  danger: { kind: 'danger', label: '' },
};

/**
 * Back-compat wrapper — renders unified ListStatusPill.
 * Accepts legacy `tag:type` or `tag:type:label` strings.
 */
export default function StatusTag({ value }) {
  if (value == null) return null;
  const raw = String(value);
  if (!raw.startsWith('tag:')) return raw;

  const parts = raw.slice(4).split(':');
  const type = parts[0];
  const customLabel = parts[1] || '';
  const meta = TAG_MAP[type] || { kind: 'active', label: customLabel };

  return (
    <ListStatusPill
      kind={meta.kind}
      label={customLabel || meta.label || type}
    />
  );
}
