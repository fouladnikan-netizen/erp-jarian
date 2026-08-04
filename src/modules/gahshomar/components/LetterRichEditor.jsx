import { useEffect, useMemo, useState } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignRight,
  AlignCenter,
  AlignLeft,
  AlignJustify,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  Sparkles,
  Loader2,
  Type,
} from 'lucide-react';
import { polishLetterText } from '../officialRecordFacade';
import { ensureLetterHtml } from '../services/letterHtml';
import '../gahshomar-page.css';

const FONT_SIZES = [
  { label: 'کوچک', value: '12px' },
  { label: 'عادی', value: '14px' },
  { label: 'متوسط', value: '16px' },
  { label: 'بزرگ', value: '18px' },
];

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize) => ({ chain }) => (
        chain().setMark('textStyle', { fontSize }).run()
      ),
      unsetFontSize: () => ({ chain }) => (
        chain().setMark('textStyle', { fontSize: null }).run()
      ),
    };
  },
});

function ToolbarButton({ active, disabled, onClick, label, children }) {
  return (
    <button
      type="button"
      className={`gahshomar-rte__tool${active ? ' is-active' : ''}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

/**
 * TipTap RTL letter body editor with AI polish.
 * Stores HTML. AI may only rewrite body content.
 */
export default function LetterRichEditor({
  value = '',
  onChange,
  disabled = false,
  readOnly = false,
  label = 'متن نامه',
  placeholder = 'متن نامه را بنویسید…',
  contentKey = null,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editable = !disabled && !readOnly;

  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      code: false,
      horizontalRule: false,
    }),
    Underline,
    TextStyle,
    FontSize,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['right', 'center', 'left', 'justify'],
      defaultAlignment: 'right',
    }),
    Placeholder.configure({ placeholder }),
  ], [placeholder]);

  const editor = useEditor({
    extensions,
    content: ensureLetterHtml(value),
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'gahshomar-rte__content font-meem',
        dir: 'rtl',
        lang: 'fa',
      },
      transformPastedHTML(html) {
        return String(html || '')
          .replace(/style="[^"]*"/gi, '')
          .replace(/class="[^"]*"/gi, '')
          .replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, '');
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange?.(current.getHTML());
    },
  }, [extensions]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    const next = ensureLetterHtml(value);
    editor.commands.setContent(next, { emitUpdate: false });
    // contentKey forces reload when a subject template (or hydrate) replaces body.
    // Do not depend on `value` — typing would reset the caret.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, contentKey]);

  const handlePolish = async () => {
    if (!editor || !editable || busy) return;
    const html = editor.getHTML();
    const plain = String(html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim();
    if (!plain) {
      setError('ابتدا متن نامه را وارد کنید.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const polished = await polishLetterText(html);
      const next = ensureLetterHtml(polished);
      editor.commands.setContent(next, { emitUpdate: false });
      onChange?.(editor.getHTML());
    } catch {
      setError('بهبود متن موقتاً در دسترس نیست.');
    } finally {
      setBusy(false);
    }
  };

  if (!editor) return null;

  return (
    <div className={`gahshomar-modal__field gahshomar-rte${readOnly ? ' is-readonly' : ''}`}>
      <div className="gahshomar-rte__label-row">
        <span className="font-meem">{label}</span>
        {editable ? (
          <button
            type="button"
            className="gahshomar-rte__ai-btn font-meem"
            onClick={handlePolish}
            disabled={busy}
            aria-label="بهبود متن با هوش مصنوعی"
            title="بهبود نگارش اداری"
          >
            {busy ? (
              <Loader2 size={15} strokeWidth={1.75} className="gahshomar-ai-textarea__spin" />
            ) : (
              <Sparkles size={15} strokeWidth={1.75} />
            )}
            بهبود با هوش مصنوعی
          </button>
        ) : null}
      </div>

      {editable ? (
        <div className="gahshomar-rte__toolbar" role="toolbar" aria-label="ابزار ویرایش نامه">
          <ToolbarButton
            label="ضخیم"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={15} strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton
            label="مورب"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={15} strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton
            label="زیرخط"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon size={15} strokeWidth={1.75} />
          </ToolbarButton>
          <span className="gahshomar-rte__sep" aria-hidden="true" />
          <ToolbarButton
            label="راست‌چین"
            active={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <AlignRight size={15} strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton
            label="وسط‌چین"
            active={editor.isActive({ textAlign: 'center' })}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <AlignCenter size={15} strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton
            label="چپ‌چین"
            active={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <AlignLeft size={15} strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton
            label="تراز دوطرفه"
            active={editor.isActive({ textAlign: 'justify' })}
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          >
            <AlignJustify size={15} strokeWidth={1.75} />
          </ToolbarButton>
          <span className="gahshomar-rte__sep" aria-hidden="true" />
          <ToolbarButton
            label="فهرست گلوله‌ای"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List size={15} strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton
            label="فهرست شماره‌دار"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={15} strokeWidth={1.75} />
          </ToolbarButton>
          <span className="gahshomar-rte__sep" aria-hidden="true" />
          <label className="gahshomar-rte__size font-meem" title="اندازه قلم">
            <Type size={14} strokeWidth={1.75} aria-hidden="true" />
            <select
              className="gahshomar-rte__size-select font-meem"
              defaultValue="14px"
              onChange={(event) => {
                const size = event.target.value;
                if (size) editor.chain().focus().setFontSize(size).run();
                else editor.chain().focus().unsetFontSize().run();
              }}
            >
              {FONT_SIZES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <span className="gahshomar-rte__sep" aria-hidden="true" />
          <ToolbarButton
            label="بازگردانی"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 size={15} strokeWidth={1.75} />
          </ToolbarButton>
          <ToolbarButton
            label="انجام دوباره"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 size={15} strokeWidth={1.75} />
          </ToolbarButton>
        </div>
      ) : null}

      <div className="gahshomar-rte__shell">
        <EditorContent editor={editor} />
      </div>
      {error ? <span className="gahshomar-modal__error font-meem">{error}</span> : null}
    </div>
  );
}
