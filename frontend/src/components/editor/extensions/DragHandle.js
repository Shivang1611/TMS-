import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * DragHandle plugin — renders a grip icon next to each block node on hover,
 * allowing users to drag-and-drop to reorder blocks.
 */
const DragHandlePluginKey = new PluginKey('dragHandle');

function createDragHandlePlugin(handleDrop) {
  return new Plugin({
    key: DragHandlePluginKey,

    props: {
      decorations(state) {
        const { doc } = state;
        const decorations = [];

        doc.forEach((node, pos) => {
          if (node.type.isBlock) {
            const deco = Decoration.widget(pos, () => {
              const wrapper = document.createElement('span');
              wrapper.className =
                'drag-handle absolute -left-7 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-6 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity duration-150 rounded hover:bg-surface-100';
              wrapper.setAttribute('draggable', 'true');
              wrapper.setAttribute('data-drag-handle', 'true');
              wrapper.setAttribute('data-block-pos', String(pos));
              wrapper.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="text-surface-400">
                  <circle cx="5" cy="3" r="1.5" fill="currentColor"/>
                  <circle cx="9" cy="3" r="1.5" fill="currentColor"/>
                  <circle cx="5" cy="7" r="1.5" fill="currentColor"/>
                  <circle cx="9" cy="7" r="1.5" fill="currentColor"/>
                  <circle cx="5" cy="11" r="1.5" fill="currentColor"/>
                  <circle cx="9" cy="11" r="1.5" fill="currentColor"/>
                </svg>
              `;

              wrapper.addEventListener('dragstart', (e) => {
                e.dataTransfer?.setData('text/plain', String(pos));
                e.dataTransfer.effectAllowed = 'move';
                wrapper.classList.add('opacity-50');
              });

              wrapper.addEventListener('dragend', () => {
                wrapper.classList.remove('opacity-50');
                document.querySelectorAll('[data-drop-target]').forEach((el) => {
                  el.style.boxShadow = '';
                  el.removeAttribute('data-drop-target');
                });
              });

              return wrapper;
            }, { side: -1, key: `drag-${pos}` });

            decorations.push(deco);
          }
        });

        return DecorationSet.create(doc, decorations);
      },

      handleDOMEvents: {
        dragover: (view, event) => {
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
          document.querySelectorAll('[data-drop-target]').forEach((el) => {
            el.style.boxShadow = '';
            el.removeAttribute('data-drop-target');
          });
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (pos) {
            const targetBlock = view.nodeDOM(pos.pos);
            if (targetBlock && targetBlock.nodeType === 1 && !targetBlock.hasAttribute('data-drag-handle')) {
              targetBlock.style.boxShadow = 'inset 0 2px 0 0 #3b82f6';
              targetBlock.setAttribute('data-drop-target', 'true');
            }
          }
        },

        dragleave: () => {
          document.querySelectorAll('[data-drop-target]').forEach((el) => {
            el.style.boxShadow = '';
            el.removeAttribute('data-drop-target');
          });
        },

        drop: (view, event) => {
          event.preventDefault();
          document.querySelectorAll('[data-drop-target]').forEach((el) => {
            el.style.boxShadow = '';
            el.removeAttribute('data-drop-target');
          });

          const sourcePosStr = event.dataTransfer?.getData('text/plain');
          if (!sourcePosStr) return false;
          const sourcePos = parseInt(sourcePosStr, 10);
          if (isNaN(sourcePos)) return false;

          const dropPos = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (!dropPos) return false;

          const $drop = view.state.doc.resolve(dropPos.pos);
          const targetPos = $drop.before(Math.max(1, $drop.depth));
          if (targetPos < 0) return false;

          handleDrop(view, sourcePos, targetPos);
          return true;
        },
      },
    },
  });
}

export { DragHandlePluginKey, createDragHandlePlugin };
