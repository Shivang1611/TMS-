import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { useEffect, useRef, useState, useMemo } from 'react';
import { 
  Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3,
  Table as TableIcon, Trash2, Link as LinkIcon, Palette
} from 'lucide-react';

export default function NoteEditor({ initialContent, onSave, readOnly = false }) {
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef(null);

  const extensions = useMemo(() => [
    StarterKit,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    TextStyle,
    Color,
  ], []);

  const editor = useEditor({
    extensions,
    content: initialContent || '',
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[250px] sm:min-h-[400px] h-full cursor-text',
      },
    },
    onUpdate: ({ editor }) => {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      setIsSaving(true);
      // Debounce save (2 seconds)
      saveTimeoutRef.current = setTimeout(async () => {
        const json = editor.getJSON();
        const text = editor.getText();
        await onSave({ content: json, contentText: text });
        setIsSaving(false);
      }, 2000);
    },
  }, []); // Empty dependency array so editor is not recreated unless unmounted

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {!readOnly && (
        <div className="bg-surface-50 border-b border-surface-200 px-2 sm:px-3 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
          <MenuButton 
            onClick={() => editor.chain().focus().toggleBold().run()} 
            active={editor.isActive('bold')}
            icon={Bold}
            title="Bold"
          />
          <MenuButton 
            onClick={() => editor.chain().focus().toggleItalic().run()} 
            active={editor.isActive('italic')}
            icon={Italic}
            title="Italic"
          />
          <div className="w-px h-5 bg-surface-300 mx-1 shrink-0" />
          <MenuButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
            active={editor.isActive('heading', { level: 1 })}
            icon={Heading1}
            title="Heading 1"
          />
          <MenuButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
            active={editor.isActive('heading', { level: 2 })}
            icon={Heading2}
            title="Heading 2"
          />
          <MenuButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} 
            active={editor.isActive('heading', { level: 3 })}
            icon={Heading3}
            title="Heading 3"
          />
          <div className="w-px h-5 bg-surface-300 mx-1 shrink-0" />
          <div className="relative flex items-center group shrink-0">
            <MenuButton icon={Palette} title="Text Color" />
            <input 
              type="color" 
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
              onInput={(e) => editor.chain().focus().setColor(e.target.value).run()}
              value={editor.getAttributes('textStyle').color || '#000000'}
            />
          </div>
          <div className="w-px h-5 bg-surface-300 mx-1 shrink-0" />
          <MenuButton 
            onClick={() => editor.chain().focus().toggleBulletList().run()} 
            active={editor.isActive('bulletList')}
            icon={List}
            title="Bullet List"
          />
          <MenuButton 
            onClick={() => editor.chain().focus().toggleOrderedList().run()} 
            active={editor.isActive('orderedList')}
            icon={ListOrdered}
            title="Numbered List"
          />
          <div className="w-px h-5 bg-surface-300 mx-1 shrink-0" />
          <MenuButton 
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} 
            icon={TableIcon}
            title="Insert Table"
          />
          {editor.isActive('table') && (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="px-2 py-1 text-xs text-surface-600 hover:bg-surface-200 rounded shrink-0">Add Col Before</button>
              <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="px-2 py-1 text-xs text-surface-600 hover:bg-surface-200 rounded shrink-0">Add Col After</button>
              <button onClick={() => editor.chain().focus().deleteColumn().run()} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded shrink-0">Del Col</button>
              <button onClick={() => editor.chain().focus().addRowBefore().run()} className="px-2 py-1 text-xs text-surface-600 hover:bg-surface-200 rounded shrink-0">Add Row Before</button>
              <button onClick={() => editor.chain().focus().addRowAfter().run()} className="px-2 py-1 text-xs text-surface-600 hover:bg-surface-200 rounded shrink-0">Add Row After</button>
              <button onClick={() => editor.chain().focus().deleteRow().run()} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded shrink-0">Del Row</button>
              <button onClick={() => editor.chain().focus().deleteTable().run()} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded flex items-center shrink-0"><Trash2 className="h-3 w-3 mr-1"/> Table</button>
            </div>
          )}

          <div className="ml-auto text-xs text-surface-400 font-medium pl-2 shrink-0">
            {isSaving ? 'Saving...' : 'Saved'}
          </div>
        </div>
      )}
      
      <div 
        className="p-3 sm:p-6 flex-1 overflow-y-auto prose dark:prose-invert prose-sm sm:prose-base max-w-none bg-white cursor-text"
        onClick={() => {
          if (editor && !editor.isFocused) {
            editor.commands.focus('end');
          }
        }}
      >
        <EditorContent editor={editor} className="h-full min-h-[250px]" />
      </div>
    </div>
  );
}

function MenuButton({ onClick, active, icon: Icon, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-1.5 sm:p-2 rounded-lg transition-colors shrink-0 ${
        active 
          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' 
          : 'text-surface-600 hover:bg-surface-200 hover:text-surface-900'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
