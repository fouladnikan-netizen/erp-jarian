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
      {children}
      {resizable && onResizeStart && (
        <span
          className="resizable-th__handle"
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
