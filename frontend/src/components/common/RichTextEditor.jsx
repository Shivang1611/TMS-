import { useEditor, EditorContent } from '@tiptap/react';
import { FloatingMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Underline } from '@tiptap/extension-underline';
import { 
  Heading1, Heading2, Type, Image as ImageIcon, 
  List, ListOrdered, Quote, Code, Table as TableIcon,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Markdown } from 'tiptap-markdown';
import { uploadApi } from '../../api/api';
import toast from 'react-hot-toast';

const MenuBar = ({ editor }) => {
  if (!editor) return null;

  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      
      // We use toast.promise to show a loading state
      const promise = uploadApi.image(formData);
      toast.promise(promise, {
        loading: 'Uploading image...',
        success: 'Image uploaded!',
        error: 'Failed to upload image'
      });
      
      const res = await promise;
      
      if (res.data?.url) {
        editor.chain().focus().setImage({ src: res.data.url }).run();
      }
    } catch (err) {
      console.error('Image upload error:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addImage = () => {
    fileInputRef.current?.click();
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const Button = ({ onClick, isActive, disabled, children, title }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 text-sm font-medium ${
        isActive 
          ? 'bg-primary-100 text-primary-700 shadow-inner ring-1 ring-primary-300' 
          : 'bg-transparent text-surface-500 hover:bg-white hover:text-primary-600 hover:shadow-sm hover:ring-1 hover:ring-surface-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-6 bg-surface-200/80 mx-1.5 rounded-full"></div>;

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-surface-200/80 p-2.5 bg-gradient-to-r from-surface-50 to-white rounded-t-xl">
      <Button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().setParagraph().run()}
        isActive={editor.isActive('paragraph')}
        title="Paragraph"
      >
        <Type className="h-4 w-4" />
      </Button>

      <Divider />

      <Button
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>

      <Divider />

      <Button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Ordered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        title="Code Block"
      >
        <Code className="h-4 w-4" />
      </Button>
      
      <Divider />

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
      />
      <Button onClick={addImage} title="Upload Image" disabled={isUploading}>
        <ImageIcon className={`h-4 w-4 ${isUploading ? 'animate-pulse' : ''}`} />
      </Button>
      <Button onClick={addTable} title="Table">
        <TableIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default function RichTextEditor({ value, onChange }) {
  const safeValue = value || '';
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Underline,
      Markdown,
    ],
    content: safeValue,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'rich-text focus:outline-none min-h-[400px] p-5 text-surface-700 leading-relaxed prose dark:prose-invert prose-sm sm:prose-base max-w-none',
      },
    },
  });

  // Keep content in sync if value prop changes from outside (e.g. form reset)
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const currentHTML = editor.getHTML();
      if (safeValue !== currentHTML) {
        // Prevent resetting cursor if it's just an empty paragraph vs empty string
        if (safeValue === '' && currentHTML === '<p></p>') return;
        editor.commands.setContent(safeValue);
      }
    }
  }, [safeValue, editor]);

  return (
    <div className="border border-surface-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md focus-within:ring-4 focus-within:ring-primary-500/20 focus-within:border-primary-500 transition-all duration-300">
      <MenuBar editor={editor} />
      
      {editor && (
        <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex overflow-hidden bg-white shadow-xl border border-surface-200 rounded-lg divide-x divide-surface-100">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className="p-2 hover:bg-surface-50 text-surface-600 hover:text-primary-600 transition-colors flex flex-col items-center gap-1 min-w-[50px]"
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
            <span className="text-[10px] font-medium">H1</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className="p-2 hover:bg-surface-50 text-surface-600 hover:text-primary-600 transition-colors flex flex-col items-center gap-1 min-w-[50px]"
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
            <span className="text-[10px] font-medium">H2</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className="p-2 hover:bg-surface-50 text-surface-600 hover:text-primary-600 transition-colors flex flex-col items-center gap-1 min-w-[50px]"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
            <span className="text-[10px] font-medium">List</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className="p-2 hover:bg-surface-50 text-surface-600 hover:text-primary-600 transition-colors flex flex-col items-center gap-1 min-w-[50px]"
            title="Code Block"
          >
            <Code className="h-4 w-4" />
            <span className="text-[10px] font-medium">Code</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const fileInput = document.querySelector('input[type="file"][accept="image/*"]');
              if (fileInput) fileInput.click();
            }}
            className="p-2 hover:bg-surface-50 text-surface-600 hover:text-primary-600 transition-colors flex flex-col items-center gap-1 min-w-[50px]"
            title="Upload Image"
          >
            <ImageIcon className="h-4 w-4" />
            <span className="text-[10px] font-medium">Image</span>
          </button>
        </FloatingMenu>
      )}

      <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: '800px' }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
