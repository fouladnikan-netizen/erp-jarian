import { useMemo, useRef, useState } from 'react';
import { CRM_MENTION_OPTIONS } from '../../../orderCrmConfig';

function renderBodyWithMentions(body) {
  const parts = body.split(/(@[\u0600-\u06FFa-zA-Z]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={`${part}-${index}`} className="order-crm-mention">
          {part}
        </span>
      );
    }
    return part;
  });
}

export function CrmActivityBody({ body }) {
  return <p className="order-crm-timeline__body">{renderBodyWithMentions(body)}</p>;
}

export default function MentionTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
}) {
  const textareaRef = useRef(null);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(-1);

  const mentionOptions = useMemo(() => {
    if (mentionQuery === null) return [];
    const query = mentionQuery.toLowerCase();
    return CRM_MENTION_OPTIONS.filter((option) => (
      option.handle.toLowerCase().includes(query)
      || option.roleLabel.toLowerCase().includes(query)
    ));
  }, [mentionQuery]);

  const updateMentionState = (text, cursorPos) => {
    const beforeCursor = text.slice(0, cursorPos);
    const atMatch = beforeCursor.match(/@([\u0600-\u06FFa-zA-Z]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionIndex(cursorPos - atMatch[0].length);
      return;
    }
    setMentionQuery(null);
    setMentionIndex(-1);
  };

  const handleChange = (event) => {
    onChange(event.target.value);
    updateMentionState(event.target.value, event.target.selectionStart);
  };

  const insertMention = (handle) => {
    const textarea = textareaRef.current;
    if (!textarea || mentionIndex < 0) return;

    const before = value.slice(0, mentionIndex);
    const after = value.slice(textarea.selectionStart);
    const mention = `@${handle} `;
    const nextValue = `${before}${mention}${after}`;
    onChange(nextValue);
    setMentionQuery(null);
    setMentionIndex(-1);

    requestAnimationFrame(() => {
      const pos = before.length + mention.length;
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="order-crm-mention-field">
      <textarea
        ref={textareaRef}
        id={id}
        className="order-crm-mention-field__textarea"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyUp={(event) => updateMentionState(event.target.value, event.target.selectionStart)}
        onClick={(event) => updateMentionState(event.target.value, event.target.selectionStart)}
      />
      {mentionOptions.length > 0 && (
        <ul className="order-crm-mention-field__menu" role="listbox">
          {mentionOptions.map((option) => (
            <li key={option.handle}>
              <button
                type="button"
                className="order-crm-mention-field__option"
                onMouseDown={(event) => {
                  event.preventDefault();
                  insertMention(option.handle);
                }}
              >
                <span className="order-crm-mention-field__role">{option.roleLabel}</span>
                <span className="order-crm-mention-field__handle">@{option.handle}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
