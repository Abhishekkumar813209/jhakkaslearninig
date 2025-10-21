import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Table as TableIcon,
  Subscript,
  Superscript,
  Undo,
  Redo
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichQuestionEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

export const RichQuestionEditor: React.FC<RichQuestionEditorProps> = ({
  content,
  onChange,
  placeholder = 'Enter text...',
  className,
  compact = false
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] p-3',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const MenuButton = ({ 
    onClick, 
    isActive, 
    icon: Icon, 
    title 
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    icon: any; 
    title: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size={compact ? "sm" : "default"}
      onClick={onClick}
      className={cn(
        "h-8 w-8 p-0",
        isActive && "bg-accent text-accent-foreground"
      )}
      title={title}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <div className={cn("border rounded-md bg-background", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          icon={Bold}
          title="Bold (Ctrl+B)"
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          icon={Italic}
          title="Italic (Ctrl+I)"
        />
        
        <div className="w-px h-8 bg-border mx-1" />
        
        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          icon={List}
          title="Bullet List"
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          icon={ListOrdered}
          title="Numbered List"
        />
        
        <div className="w-px h-8 bg-border mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size={compact ? "sm" : "default"}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className="h-8 px-2 text-xs"
          title="Insert Table"
        >
          <TableIcon className="h-4 w-4 mr-1" />
          Table
        </Button>
        
        <div className="w-px h-8 bg-border mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size={compact ? "sm" : "default"}
          onClick={() => {
            const text = prompt('Enter subscript text (e.g., H₂O → H_2 O):');
            if (text) editor.chain().focus().insertContent(`<sub>${text}</sub>`).run();
          }}
          className="h-8 px-2 text-xs"
          title="Subscript"
        >
          <Subscript className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size={compact ? "sm" : "default"}
          onClick={() => {
            const text = prompt('Enter superscript text (e.g., x² → x^2):');
            if (text) editor.chain().focus().insertContent(`<sup>${text}</sup>`).run();
          }}
          className="h-8 px-2 text-xs"
          title="Superscript"
        >
          <Superscript className="h-4 w-4" />
        </Button>
        
        <div className="flex-1" />
        
        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          icon={Undo}
          title="Undo (Ctrl+Z)"
        />
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          icon={Redo}
          title="Redo (Ctrl+Y)"
        />
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="min-h-[80px]" />
      
      {/* Helper text */}
      <div className="px-3 py-1 text-xs text-muted-foreground bg-muted/20 border-t">
        💡 Use <kbd className="px-1 py-0.5 bg-background border rounded text-xs">_</kbd> for subscript, <kbd className="px-1 py-0.5 bg-background border rounded text-xs">^</kbd> for superscript in plain text
      </div>
    </div>
  );
};
