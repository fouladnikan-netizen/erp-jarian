import OfoqPipelineBoard from './OfoqPipelineBoard';
import './ofoq-pipeline.css';

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/**
 * افق — پایپ‌لاین کانبان چرخه حیات مخاطبین.
 * دیتابیس جدا ندارد؛ لایه نمایشی روی مخاطبین کانون است (useContactsStore).
 */
export default function OfoqModule() {
  const handleAddLead = () => {
    // TODO: به مودال «ثبت مخاطب جدید» کانون (ContactModal) وصل می‌شود.
  };

  return (
    <div className="module-page ofoq-page ofoq-pipeline" data-module="ofogh" dir="rtl">
      <header className="ofoq-pipeline__topbar">
        <div className="ofoq-pipeline__heading">
          <h1 className="ofoq-pipeline__title">پایپ‌لاین افق</h1>
          <p className="ofoq-pipeline__subtitle">
            چرخه حیات مخاطبین کانون — کارت‌ها را بین مراحل بکشید و رها کنید
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary ofoq-pipeline__add-lead"
          onClick={handleAddLead}
        >
          <PlusIcon />
          ثبت سرنخ جدید
        </button>
      </header>

      <OfoqPipelineBoard />
    </div>
  );
}
