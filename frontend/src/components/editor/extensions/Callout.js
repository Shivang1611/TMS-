import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Custom Callout extension — renders a colored callout block similar to Notion.
 * Usage: editor.chain().focus().setCallout({ emoji: '💡', color: 'blue' }).run()
 */
const Callout = Node.create({
  name: 'callout',

  group: 'block',

  content: 'inline*',

  defining: true,

  addAttributes() {
    return {
      emoji: {
        default: '💡',
        parseHTML: (el) => el.getAttribute('data-emoji'),
        renderHTML: (attrs) => ({ 'data-emoji': attrs.emoji }),
      },
      color: {
        default: 'blue',
        parseHTML: (el) => el.getAttribute('data-color'),
        renderHTML: (attrs) => ({ 'data-color': attrs.color }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const colorMap = {
      blue: 'bg-blue-50 border-blue-300',
      green: 'bg-emerald-50 border-emerald-300',
      yellow: 'bg-amber-50 border-amber-300',
      red: 'bg-red-50 border-red-300',
      purple: 'bg-purple-50 border-purple-300',
      gray: 'bg-surface-50 border-surface-300',
    };
    const bgClass = colorMap[HTMLAttributes.color] || colorMap.blue;

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-callout': '',
        class: `flex items-start gap-3 rounded-lg border p-4 my-2 ${bgClass}`,
      }),
      [
        'span',
        {
          class: 'text-lg leading-none mt-0.5 select-none',
          contenteditable: 'false',
        },
        HTMLAttributes.emoji || '💡',
      ],
      [
        'div',
        { class: 'flex-1 min-w-0' },
        0,
      ],
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attrs);
        },
      toggleCallout:
        (attrs) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attrs);
        },
    };
  },
});

export default Callout;
