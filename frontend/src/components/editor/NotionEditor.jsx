import { useState, useCallback, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { useEditorExtensions } from './extensions/useEditorExtensions';
import { uploadApi } from '../../api/api';
import { toast } from 'react-hot-toast';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, List, ListOrdered,
  CheckSquare, Heading1, Heading2, Heading3, Quote, Minus, Highlighter,
  Image, Table as TableIcon, ChevronRight, Lightbulb, ArrowLeft, Palette,
  Upload, FileImage, Expand, X, Trash2,
} from 'lucide-react';

const CALLOUT_COLORS = [
  { id: 'blue', label: 'Blue', dot: 'bg-blue-500', bg: 'bg-blue-50', ring: 'hover:ring-2 hover:ring-offset-1 hover:ring-blue-300' },
  { id: 'green', label: 'Green', dot: 'bg-emerald-500', bg: 'bg-emerald-50', ring: 'hover:ring-2 hover:ring-offset-1 hover:ring-emerald-300' },
  { id: 'yellow', label: 'Yellow', dot: 'bg-amber-500', bg: 'bg-amber-50', ring: 'hover:ring-2 hover:ring-offset-1 hover:ring-amber-300' },
  { id: 'red', label: 'Red', dot: 'bg-red-500', bg: 'bg-red-50', ring: 'hover:ring-2 hover:ring-offset-1 hover:ring-red-300' },
  { id: 'purple', label: 'Purple', dot: 'bg-purple-500', bg: 'bg-purple-50', ring: 'hover:ring-2 hover:ring-offset-1 hover:ring-purple-300' },
  { id: 'gray', label: 'Gray', dot: 'bg-surface-500', bg: 'bg-surface-50', ring: 'hover:ring-2 hover:ring-offset-1 hover:ring-surface-300' },
];

const SLASH_CATEGORIES = [
  {
    label: 'Basic blocks',
    items: [
      { id: 'heading1', label: 'Heading 1', icon: Heading1, description: 'Large section heading', command: 'toggleHeading', attrs: { level: 1 } },
      { id: 'heading2', label: 'Heading 2', icon: Heading2, description: 'Medium heading', command: 'toggleHeading', attrs: { level: 2 } },
      { id: 'heading3', label: 'Heading 3', icon: Heading3, description: 'Small heading', command: 'toggleHeading', attrs: { level: 3 } },
      { id: 'bulletList', label: 'Bullet list', icon: List, description: 'Create a bulleted list', command: 'toggleBulletList' },
      { id: 'orderedList', label: 'Numbered list', icon: ListOrdered, description: 'Create a numbered list', command: 'toggleOrderedList' },
      { id: 'taskList', label: 'Task list', icon: CheckSquare, description: 'Add checkboxes', command: 'toggleTaskList' },
      { id: 'blockquote', label: 'Quote', icon: Quote, description: 'Add a blockquote', command: 'toggleBlockquote' },
      { id: 'codeBlock', label: 'Code block', icon: Code, description: 'Add a code snippet', command: 'toggleCodeBlock' },
    ],
  },
  {
    label: 'Media & embeds',
    items: [
      { id: 'image', label: 'Image', icon: Image, description: 'Add an image', command: 'setImage' },
    ],
  },
  {
    label: 'Advanced',
    items: [
      { id: 'callout', label: 'Callout', icon: Lightbulb, description: 'Add a highlighted callout', command: 'toggleCallout' },
      { id: 'details', label: 'Toggle', icon: ChevronRight, description: 'Add a collapsible toggle', command: 'toggleDetails' },
      { id: 'table', label: 'Table', icon: TableIcon, description: 'Add a 3×3 table', command: 'insertTable' },
      { id: 'divider', label: 'Divider', icon: Minus, description: 'Add a horizontal rule', command: 'setHorizontalRule' },
    ],
  },
];

// Flatten for quick lookups
const ALL_SLASH_ITEMS = SLASH_CATEGORIES.flatMap((c) => c.items);

export default function NotionEditor({ content, onChange, placeholder = 'Write something...' }) {
  const { extensions, loading } = useEditorExtensions({ placeholder });

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return <NotionEditorInner content={content} onChange={onChange} placeholder={placeholder} extensions={extensions} />;
}

function NotionEditorInner({ content, onChange, placeholder, extensions }) {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const slashMenuRef = useRef(null);
  const editorRef = useRef(null);
  const [showCalloutColorPicker, setShowCalloutColorPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [selectedImagePos, setSelectedImagePos] = useState(null);
  const [selectedImageSrc, setSelectedImageSrc] = useState(null);
  const [deletingImage, setDeletingImage] = useState(false);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const imageToolbarRef = useRef(null);

  const insertImageSrc = useCallback((src) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.chain().focus().setImage({ src }).run();
  }, []);

  const handleImageFile = useCallback((file) => {
    if (!file) return;

    // Only accept image files
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select an image file (JPEG, PNG, GIF, WebP, SVG)');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    const toastId = toast.loading('Uploading image...');
    setUploadingImage(true);

    // Upload to server for a persistent URL
    const formData = new FormData();
    formData.append('image', file);

    uploadApi.image(formData)
      .then((res) => {
        if (res.success && res.data?.url) {
          insertImageSrc(res.data.url);
          toast.success('Image uploaded', { id: toastId });
        }
        setUploadingImage(false);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Failed to upload image', { id: toastId });
        setUploadingImage(false);
      });
  }, [insertImageSrc]);

  const handleImageFilePick = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    // Reset so the same file can be picked again
    e.target.value = '';
  }, [handleImageFile]);

  const handleDropNode = useCallback((view, sourcePos, targetPos) => {
    if (sourcePos === targetPos) return;
    const { state } = view;
    const node = state.doc.nodeAt(sourcePos);
    if (!node) return;

    const nodeSize = node.nodeSize;
    const from = sourcePos;
    const to = sourcePos + nodeSize;

    let insertAt = targetPos;
    if (targetPos > sourcePos) {
      insertAt = targetPos - nodeSize;
    }
    if (insertAt < 0) insertAt = 0;

    // Compose delete + insert in a single transaction
    const tr = state.tr.delete(from, to);
    tr.insert(insertAt, node);
    view.dispatch(tr);
  }, []);

  const editor = useEditor({
    extensions: extensions || [],
    content: content || '<p></p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html === '<p></p>' ? '' : html);
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm max-w-none focus:outline-none min-h-[120px] px-4 py-3 relative',
      },
      handleClick: (view, pos, event) => {
        // Detect clicks on image nodes
        const target = event.target;
        if (target.tagName === 'IMG' && target.closest('.ProseMirror')) {
          // Find the image node at this position
          const resolvedPos = view.state.doc.resolve(pos);
          const node = resolvedPos.nodeAfter;
          if (node && node.type.name === 'image') {
            const imgSrc = node.attrs.src;
            // Only show delete button for server-uploaded images (not external URLs or data URIs)
            if (imgSrc && imgSrc.startsWith('/uploads/')) {
              setSelectedImagePos(pos);
              setSelectedImageSrc(imgSrc);
            } else {
              setSelectedImagePos(null);
              setSelectedImageSrc(null);
            }
            return false; // Let the editor handle the click normally
          }
        }
        // Click outside image — clear selection
        setSelectedImagePos(null);
        setSelectedImageSrc(null);
        return false;
      },
      handleKeyDown: (view, event) => {
        if (event.key === '/' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
          const { selection } = view.state;
          const { $from } = selection;
          const textBefore = view.state.doc.textBetween(Math.max(0, $from.pos - 1), $from.pos);
          if (textBefore === '/' || textBefore === '') {
            setTimeout(() => {
              setSlashQuery('');
              setShowSlashMenu(true);
            }, 10);
          }
        }
        if (event.key === 'Escape' && showSlashMenu) {
          setShowSlashMenu(false);
          setShowCalloutColorPicker(false);
          return true;
        }
        if (event.key === 'Enter' && showSlashMenu && !showCalloutColorPicker) {
          const filtered = filterItems(slashQuery);
          if (filtered.length > 0) {
            executeCommand(filtered[0].id);
            return true;
          }
        }
        return false;
      },
    },
  });
  editorRef.current = editor;

  // Update slash query when typing
  useEffect(() => {
    if (!showSlashMenu || !editor) return;
    const handler = () => {
      const { view } = editor;
      const { selection } = view.state;
      const { $from } = selection;
      const textBefore = view.state.doc.textBetween(Math.max(0, $from.pos - 10), $from.pos);
      const slashIdx = textBefore.lastIndexOf('/');
      if (slashIdx === -1) {
        setShowSlashMenu(false);
        setShowCalloutColorPicker(false);
        return;
      }
      const query = textBefore.slice(slashIdx + 1).replace(/\s/g, '');
      setSlashQuery(query);
    };
    editor.on('selectionUpdate', handler);
    editor.on('update', handler);
    return () => {
      editor.off('selectionUpdate', handler);
      editor.off('update', handler);
    };
  }, [showSlashMenu, editor]);

  // Close slash menu on outside click
  useEffect(() => {
    if (!showSlashMenu) return;
    const close = (e) => {
      if (slashMenuRef.current && !slashMenuRef.current.contains(e.target)) {
        setShowSlashMenu(false);
        setShowCalloutColorPicker(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showSlashMenu]);

  const removeSlashText = useCallback(() => {
    if (!editor) return;
    const { view } = editor;
    const { state } = view;
    const { tr, selection } = state;
    const { $from } = selection;
    const textBefore = state.doc.textBetween(Math.max(0, $from.pos - 10), $from.pos);
    const slashIdx = textBefore.lastIndexOf('/');
    if (slashIdx !== -1) {
      const from = $from.pos - (textBefore.length - slashIdx);
      const to = $from.pos;
      view.dispatch(tr.deleteRange(from, to));
    }
  }, [editor]);

  const filterItems = useCallback((query) => {
    if (!query) return ALL_SLASH_ITEMS;
    const q = query.toLowerCase();
    return ALL_SLASH_ITEMS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    );
  }, []);

  const filterCategoryItems = useCallback((items, query) => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    );
  }, []);

  const executeCommand = useCallback((id) => {
    if (!editor) return;
    const item = ALL_SLASH_ITEMS.find((i) => i.id === id);
    if (!item) return;

    removeSlashText();

    // Execute the command
    if (item.command === 'setImage') {
      removeSlashText();
      setShowSlashMenu(false);
      setSlashQuery('');
      fileInputRef.current?.click();
      return;
    }
    if (item.command === 'insertTable') {
      removeSlashText();
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      setShowSlashMenu(false);
      setSlashQuery('');
      return;
    }
    if (item.command === 'toggleCallout') {
      setShowCalloutColorPicker(true);
      return;
    }
    if (item.command === 'toggleDetails') {
      removeSlashText();
      editor.chain().focus().setDetails().run();
      setShowSlashMenu(false);
      setSlashQuery('');
      return;
    }

    removeSlashText();
    editor.chain().focus()[item.command](...(item.attrs ? [item.attrs] : [])).run();
    setShowSlashMenu(false);
    setSlashQuery('');
  }, [editor]);

  // Wire drag handle callback via editor storage
  useEffect(() => {
    if (editor) {
      editor.storage.dragHandlePlugin.handleDrop = handleDropNode;
    }
  }, [editor, handleDropNode]);

  // Close image toolbar when clicking outside
  useEffect(() => {
    if (!selectedImagePos) return;
    const close = (e) => {
      if (imageToolbarRef.current && !imageToolbarRef.current.contains(e.target)) {
        setSelectedImagePos(null);
        setSelectedImageSrc(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [selectedImagePos]);

  const handleDeleteImage = useCallback(async () => {
    if (!editor || !selectedImageSrc || !selectedImagePos) return;

    setDeletingImage(true);

    try {
      // Delete from server
      await uploadApi.deleteImage(selectedImageSrc);
    } catch (err) {
      // If it's a 404 (file already gone), still remove from editor
      if (err.response?.status !== 404) {
        toast.error('Failed to delete image from server');
        setDeletingImage(false);
        return;
      }
    }

    // Remove the image node from the editor
    editor.chain().focus().deleteRange({ from: selectedImagePos, to: selectedImagePos + 1 }).run();
    setSelectedImagePos(null);
    setSelectedImageSrc(null);
    setDeletingImage(false);
    toast.success('Image deleted');
  }, [editor, selectedImagePos, selectedImageSrc]);

  // Close slash menu when editor loses focus
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      setTimeout(() => {
        if (!editor.isFocused) {
          setShowSlashMenu(false);
          setShowCalloutColorPicker(false);
        }
      }, 200);
    };
    editor.on('blur', handler);
    return () => editor.off('blur', handler);
  }, [editor]);

  const handleCalloutColorSelect = useCallback((color) => {
    if (!editor) return;
    removeSlashText();
    editor.chain().focus().toggleCallout({ color }).run();
    setShowCalloutColorPicker(false);
    setShowSlashMenu(false);
    setSlashQuery('');
  }, [editor, removeSlashText]);

  // Drag-and-drop handlers for image files
  const handleDragOver = useCallback((e) => {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  }, [handleImageFile]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxSrc) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [lightboxSrc]);

  if (!editor) return null;

  const filteredItems = filterItems(slashQuery);

  return (
    <div className="relative" ref={editorRef}>

      {/* Top toolbar */}
      <div className="flex items-center gap-0.5 border-b border-surface-100 px-3 py-1.5 overflow-x-auto">
        <ToolbarButton icon={Bold} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolbarButton icon={Italic} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolbarButton icon={UnderlineIcon} active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
        <div className="mx-1 h-5 w-px bg-surface-200 shrink-0" />

        <ToolbarButton icon={List} active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolbarButton icon={ListOrdered} active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <ToolbarButton icon={CheckSquare} active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} />
        <div className="mx-1 h-5 w-px bg-surface-200 shrink-0" />

        <ToolbarButton icon={Quote} active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
        <ToolbarButton icon={Code} active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
        <ToolbarButton icon={TableIcon} active={editor.isActive('table')} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        <div className="mx-1 h-5 w-px bg-surface-200 shrink-0" />

        <ToolbarButton icon={Lightbulb} active={editor.isActive('callout')} onClick={() => editor.chain().focus().toggleCallout().run()} />
        <ToolbarButton icon={Minus} onClick={() => editor.chain().focus().setHorizontalRule().run()} />
      </div>

      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        onChange={handleImageFilePick}
        className="hidden"
      />

      {/* Editor content with drag-drop zone */}
      <div
        ref={dropZoneRef}
        className="relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drop indicator overlay */}
        {dragOver && (
          <div className="absolute inset-0 z-40 flex items-center justify-center rounded-lg border-2 border-dashed border-primary-400 bg-primary-50/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-primary-600">
              <FileImage className="h-8 w-8" />
              <p className="text-sm font-medium">Drop image to insert</p>
              <p className="text-xs text-primary-500">JPEG, PNG, GIF, WebP, SVG — max 5MB</p>
            </div>
          </div>
        )}
        <EditorContent editor={editor} className="min-h-[120px]" />

        {/* Image delete toolbar — floating above selected image */}
        {selectedImagePos && selectedImageSrc && (
          <div
            ref={imageToolbarRef}
            className="absolute z-50 flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1.5 shadow-lg animate-fade-in"
            style={(() => {
              try {
                const coords = editor.view.coordsAtPos(selectedImagePos);
                const editorRect = editor.view.dom.getBoundingClientRect();
                return {
                  top: Math.max(2, coords.top - editorRect.top - 40),
                  left: coords.left - editorRect.left,
                };
              } catch {
                return { top: 0, left: 0 };
              }
            })()}
            onMouseDown={(e) => e.preventDefault()}
          >
            <span className="text-[10px] font-medium text-surface-400 mr-1">Image</span>
            <div className="mx-1 h-4 w-px bg-surface-200" />
            <button
              type="button"
              onClick={() => setLightboxSrc(selectedImageSrc)}
              className="rounded p-1 text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
              title="Preview"
            >
              <Expand className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDeleteImage}
              disabled={deletingImage}
              className="rounded p-1 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Delete image"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

      </div>

      {/* Lightbox for full-size image */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <button
              type="button"
              onClick={() => setLightboxSrc(null)}
              className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md hover:bg-surface-50 transition-colors"
            >
              <X className="h-4 w-4 text-surface-600" />
            </button>
            <img
              src={lightboxSrc}
              alt="Full size preview"
              className="max-h-[85vh] max-w-[85vw] rounded-xl shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Slash command menu */}
      {showSlashMenu && !showCalloutColorPicker && filteredItems.length > 0 && (
        <div
          ref={slashMenuRef}
          className="absolute left-4 top-16 z-50 w-72 max-h-80 overflow-y-auto rounded-xl border border-surface-200 bg-white p-1.5 shadow-xl animate-fade-in"
        >
          {SLASH_CATEGORIES.map((category) => {
            const catItems = filterCategoryItems(category.items, slashQuery);
            if (catItems.length === 0) return null;
            return (
              <div key={category.label}>
                <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                  {category.label}
                </p>
                {catItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent editor blur
                        e.stopPropagation();
                      }}
                      onClick={() => executeCommand(item.id)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-surface-700 hover:bg-surface-100 transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-100 text-surface-500 shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-surface-900">{item.label}</p>
                        <p className="text-xs text-surface-400 truncate">{item.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Callout color picker */}
      {showSlashMenu && showCalloutColorPicker && (
        <div
          ref={slashMenuRef}
          className="absolute left-4 top-16 z-50 w-64 rounded-xl border border-surface-200 bg-white p-2 shadow-xl animate-fade-in"
        >
          <div className="flex items-center gap-2 px-2 pb-2 border-b border-surface-100 mb-2">
            <button
              type="button"
              onClick={() => setShowCalloutColorPicker(false)}
              className="flex items-center gap-1 text-xs text-surface-500 hover:text-surface-700 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <div className="flex items-center gap-1.5 text-xs font-medium text-surface-600">
              <Palette className="h-3.5 w-3.5" />
              Pick a color
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {CALLOUT_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => handleCalloutColorSelect(color.id)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] ${color.bg} ${color.ring}`}
              >
                <span className={`h-4 w-4 rounded-full ${color.dot} shrink-0`} />
                <span className="text-sm font-medium text-surface-800">{color.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ icon: Icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors shrink-0 ${
        active
          ? 'bg-primary-100 text-primary-700'
          : 'text-surface-400 hover:bg-surface-100 hover:text-surface-700'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}


