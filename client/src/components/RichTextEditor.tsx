import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link as LinkIcon, Unlink, Heading1, Heading2, Heading3,
  Quote, Minus, Undo, Redo, Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useCallback, useState } from 'react';

interface RichTextEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

function MenuBar({ editor }: { editor: Editor | null }) {
  const [linkUrl, setLinkUrl] = useState('');
  
  if (!editor) return null;

  const setLink = useCallback(() => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    setLinkUrl('');
  }, [editor, linkUrl]);

  const unsetLink = useCallback(() => {
    editor.chain().focus().unsetLink().run();
  }, [editor]);

  const handleFontSizeChange = (size: string) => {
    const sizes: Record<string, string> = {
      'small': '0.875em',
      'normal': '1em',
      'large': '1.25em',
      'xlarge': '1.5em',
    };
    
    if (editor.isActive('textStyle')) {
      editor.chain().focus().unsetAllMarks().run();
    }
    
    editor.chain().focus()
      .setMark('textStyle', { fontSize: sizes[size] })
      .run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
      <div className="flex items-center gap-0.5">
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
          data-testid="button-bold"
        >
          <Bold className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
          data-testid="button-italic"
        >
          <Italic className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('underline')}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Underline"
          data-testid="button-underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('strike')}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          aria-label="Strikethrough"
          data-testid="button-strike"
        >
          <Strikethrough className="w-4 h-4" />
        </Toggle>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-0.5">
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 1 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          aria-label="Heading 1"
          data-testid="button-h1"
        >
          <Heading1 className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="Heading 2"
          data-testid="button-h2"
        >
          <Heading2 className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 3 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          aria-label="Heading 3"
          data-testid="button-h3"
        >
          <Heading3 className="w-4 h-4" />
        </Toggle>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-0.5">
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'left' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
          aria-label="Align Left"
          data-testid="button-align-left"
        >
          <AlignLeft className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'center' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
          aria-label="Align Center"
          data-testid="button-align-center"
        >
          <AlignCenter className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'right' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
          aria-label="Align Right"
          data-testid="button-align-right"
        >
          <AlignRight className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'justify' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('justify').run()}
          aria-label="Justify"
          data-testid="button-align-justify"
        >
          <AlignJustify className="w-4 h-4" />
        </Toggle>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-0.5">
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet List"
          data-testid="button-bullet-list"
        >
          <List className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Ordered List"
          data-testid="button-ordered-list"
        >
          <ListOrdered className="w-4 h-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('blockquote')}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          aria-label="Blockquote"
          data-testid="button-blockquote"
        >
          <Quote className="w-4 h-4" />
        </Toggle>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          data-testid="button-horizontal-rule"
        >
          <Minus className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-0.5">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant={editor.isActive('link') ? 'secondary' : 'ghost'}
              data-testid="button-link"
            >
              <LinkIcon className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Insert Link</p>
              <Input
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                data-testid="input-link-url"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={setLink} data-testid="button-confirm-link">
                  Insert
                </Button>
                {editor.isActive('link') && (
                  <Button size="sm" variant="outline" onClick={unsetLink} data-testid="button-remove-link">
                    <Unlink className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-0.5">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          data-testid="button-undo"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          data-testid="button-redo"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function RichTextEditor({
  content = '',
  onChange,
  placeholder = '开始输入内容...',
  className = '',
  minHeight = '200px',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  return (
    <div className={`border rounded-md overflow-hidden bg-background ${className}`}>
      <MenuBar editor={editor} />
      <EditorContent 
        editor={editor} 
        className="prose prose-sm dark:prose-invert max-w-none"
        style={{ minHeight }}
      />
      <style>{`
        .ProseMirror {
          padding: 1rem;
          min-height: ${minHeight};
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
        .ProseMirror h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 1rem 0 0.5rem;
        }
        .ProseMirror h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.875rem 0 0.5rem;
        }
        .ProseMirror h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0.75rem 0 0.5rem;
        }
        .ProseMirror p {
          margin: 0.5rem 0;
        }
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .ProseMirror blockquote {
          border-left: 3px solid hsl(var(--border));
          padding-left: 1rem;
          margin: 0.5rem 0;
          color: hsl(var(--muted-foreground));
        }
        .ProseMirror hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 1rem 0;
        }
        .ProseMirror a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
