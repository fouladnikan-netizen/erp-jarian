export default function ResizableTh({
  columnKey,
  resizable = true,
  onResizeStart,
  className = '',
  children,
  ...rest
}) {
  return (
    <th
      className={`resizable-th${resizable ? ' resizable-th--resizable' : ''}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      <span className="resizable-th__label">{children}</span>
      {resizable && onResizeStart && (
        <span
          className="resizable-th__handle resizer-handle"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onResizeStart(columnKey, e.clientX);
          }}
          role="separator"
          aria-orientation="vertical"
          aria-label="تغییر عرض ستون"
        />
      )}
    </th>
  );
}
