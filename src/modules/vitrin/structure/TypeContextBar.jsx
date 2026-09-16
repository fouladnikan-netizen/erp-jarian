export default function TypeContextBar({ breadcrumb }) {
  return (
    <div className="vitrin-structure__context">
      <span className="vitrin-structure__context-label">گروه / دسته / نوع</span>
      <p className="vitrin-structure__context-path">{breadcrumb || 'نوع کالا هنوز انتخاب نشده است.'}</p>
    </div>
  );
}
