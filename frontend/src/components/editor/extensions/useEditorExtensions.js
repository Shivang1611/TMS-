import { useState, useEffect } from 'react';
import { Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { Image as TipTapImage } from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { Gapcursor } from '@tiptap/extension-gapcursor';
import Callout from './Callout';
import { createDragHandlePlugin } from './DragHandle';

// ─── Drag handle extension (static wrapper) ──────────────────────────────

const DragHandleExtension = Extension.create({
  name: 'dragHandlePlugin',
  addProseMirrorPlugins() {
    return [createDragHandlePlugin((view, sourcePos, targetPos) => {
      this.editor.storage.dragHandlePlugin?.handleDrop?.(view, sourcePos, targetPos);
    })];
  },
  addStorage() {
    return { handleDrop: null };
  },
});

// ─── Hook ────────────────────────────────────────────────────────────────

export function useEditorExtensions({ placeholder }) {
  const [extensions, setExtensions] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadExtensions() {
      // Basic extensions — bundled inline with this hook (small)
      const basic = [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          codeBlock: false,
          horizontalRule: true,
        }),
        Underline,
        Highlight,
        TipTapImage.configure({
          inline: false,
          allowBase64: true,
        }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Gapcursor,
        Callout,
        DragHandleExtension,
        Placeholder.configure({ placeholder }),
      ];

      // Heavy extensions — loaded via dynamic import (separate chunks)
      const [
        { default: CodeBlockLowlight },
        { createLowlight, common },
        { Table },
        { TableRow },
        { TableCell },
        { TableHeader },
        { Details },
        { DetailsContent },
        { DetailsSummary },
      ] = await Promise.all([
        import('@tiptap/extension-code-block-lowlight'),
        import('lowlight'),
        import('@tiptap/extension-table'),
        import('@tiptap/extension-table-row'),
        import('@tiptap/extension-table-cell'),
        import('@tiptap/extension-table-header'),
        import('@tiptap/extension-details'),
        import('@tiptap/extension-details-content'),
        import('@tiptap/extension-details-summary'),
      ]);

      if (cancelled) return;

      const lowlight = createLowlight(common);

      const heavy = [
        CodeBlockLowlight.configure({ lowlight }),
        Table.configure({ resizable: true, allowTableNodeSelection: false }),
        TableRow,
        TableCell,
        TableHeader,
        Details,
        DetailsContent,
        DetailsSummary,
      ];

      setExtensions([...basic, ...heavy]);
    }

    loadExtensions();

    return () => { cancelled = true; };
  }, [placeholder]);

  return { extensions, loading: extensions === null };
}
