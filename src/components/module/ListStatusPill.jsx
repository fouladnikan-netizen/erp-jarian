/**
 * Unified list status pill — one visual language for all module list status columns.
 */

import './list-status-pill.css';

const KIND_CLASS = {
  pending: 'list-status-pill--pending',
  success: 'list-status-pill--success',
  danger: 'list-status-pill--danger',
  failed: 'list-status-pill--danger',
  warning: 'list-status-pill--warning',
  info: 'list-status-pill--info',
  stage: 'list-status-pill--stage',
  active: 'list-status-pill--active',
  inactive: 'list-status-pill--inactive',
  draft: 'list-status-pill--pending',
  issued: 'list-status-pill--success',
  received: 'list-status-pill--info',
  archived: 'list-status-pill--inactive',
  ambassador: 'list-status-pill--success',
  trial: 'list-status-pill--info',
  hesitant: 'list-status-pill--warning',
  radar: 'list-status-pill--stage',
  silent: 'list-status-pill--inactive',
  kavosh: 'list-status-pill--warning',
  mozene: 'list-status-pill--info',
  pishkesh: 'list-status-pill--success',
  revision: 'list-status-pill--warning',
  'needs-supply': 'list-status-pill--warning',
  'in-progress': 'list-status-pill--warning',
};

export default function ListStatusPill({ kind = 'pending', label = '', className = '' }) {
  const tone = KIND_CLASS[kind] || KIND_CLASS.pending;
  const text = String(label || '').trim() || '—';
  return (
    <span className={`list-status-pill font-meem ${tone}${className ? ` ${className}` : ''}`}>
      <span className="list-status-pill__dot" aria-hidden="true" />
      {text}
    </span>
  );
}
