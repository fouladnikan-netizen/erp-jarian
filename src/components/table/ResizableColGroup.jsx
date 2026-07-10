export default function ResizableColGroup({ columns, widths }) {
  return (
    <colgroup>
      {columns.map((col) => (
        <col key={col.key} style={{ width: widths[col.key] }} />
      ))}
    </colgroup>
  );
}
