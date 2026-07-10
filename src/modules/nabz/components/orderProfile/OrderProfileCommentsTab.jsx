import { useState } from 'react';
import { getOrderProfileComments } from '../../orderProfileService';

export default function OrderProfileCommentsTab({ order, onAddComment }) {
  const [draft, setDraft] = useState('');
  const comments = getOrderProfileComments(order);

  const handleSubmit = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAddComment(text);
    setDraft('');
  };

  return (
    <div className="order-profile-card order-profile-comments">
      <div className="order-profile-comments__feed" aria-live="polite">
        {comments.length === 0 ? (
          <p className="order-profile-comments__empty">هنوز یادداشتی ثبت نشده است.</p>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="order-profile-comments__bubble">
              <header className="order-profile-comments__bubble-head">
                <div>
                  <strong>{comment.author}</strong>
                  <span className="order-profile-comments__role">{comment.role}</span>
                </div>
                <time className="order-profile-comments__time">{comment.at}</time>
              </header>
              <p className="order-profile-comments__text">{comment.text}</p>
            </article>
          ))
        )}
      </div>

      <form className="order-profile-comments__composer" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="order-profile-comment">یادداشت جدید</label>
        <textarea
          id="order-profile-comment"
          className="order-profile-comments__textarea"
          rows={3}
          placeholder="یادداشت یا پیام داخلی خود را بنویسید..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="order-profile-comments__composer-actions">
          <button type="submit" className="btn btn--primary" disabled={!draft.trim()}>
            ثبت یادداشت
          </button>
        </div>
      </form>
    </div>
  );
}
