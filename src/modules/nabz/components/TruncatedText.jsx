/** Truncates long cell text; full value shown via native title tooltip on hover. */
export default function TruncatedText({ text, className = '', empty = '—' }) {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  const display = trimmed || empty;
  const title = trimmed || undefined;

  return (
    <span className={`nabz-truncated-text${className ? ` ${className}` : ''}`} title={title}>
      {display}
    </span>
  );
}
