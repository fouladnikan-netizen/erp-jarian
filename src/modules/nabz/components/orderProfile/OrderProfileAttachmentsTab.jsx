import { useRef, useState } from 'react';
import { getOrderProfileAttachments } from '../../orderProfileService';

function AttachmentIcon({ type }) {
  if (type === 'image') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    );
  }
  if (type === 'pdf') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h5" />
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M13 2v7h7" />
    </svg>
  );
}

export default function OrderProfileAttachmentsTab({ order, onUpload }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const attachments = getOrderProfileAttachments(order);

  const handleFiles = (fileList) => {
    if (!fileList?.length) return;
    Array.from(fileList).forEach((file) => onUpload(file));
  };

  return (
    <div className="order-profile-card order-profile-attachments">
      <div
        className={`order-profile-attachments__dropzone${dragOver ? ' order-profile-attachments__dropzone--active' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          handleFiles(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="آپلود فایل جدید"
      >
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <p className="order-profile-attachments__drop-title">فایل را اینجا رها کنید یا کلیک کنید</p>
        <p className="order-profile-attachments__drop-hint">فیش واریزی، تاییدیه پیش‌فاکتور، تصویر باسکول و...</p>
      </div>

      {attachments.length > 0 && (
        <div className="order-profile-attachments__grid">
          {attachments.map((file) => (
            <article key={file.id} className="order-profile-attachments__card">
              <div className="order-profile-attachments__icon">
                <AttachmentIcon type={file.type} />
              </div>
              <h3 className="order-profile-attachments__name">{file.name}</h3>
              <p className="order-profile-attachments__meta">
                {file.size}
                {' · '}
                {file.uploadedAt}
              </p>
              <p className="order-profile-attachments__by">{file.uploadedBy}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
