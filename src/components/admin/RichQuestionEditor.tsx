import React, { useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
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
  Redo,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md my-2',
        },
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

  const handleImageUpload = async (file: File) => {
    if (!editor) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Create bucket if it doesn't exist (will fail silently if it exists)
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === 'question-images');
      
      if (!bucketExists) {
        await supabase.storage.createBucket('question-images', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
        });
      }

      // Upload to Supabase Storage
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { data, error } = await supabase.storage
        .from('question-images')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('question-images')
        .getPublicUrl(data.path);

      // Insert image into editor
      editor.chain().focus().setImage({ src: publicUrl }).run();
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
        }}
        className="hidden"
      />
      
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
          onClick={handleImageButtonClick}
          disabled={uploading}
          className="h-8 px-2 text-xs"
          title="Insert Image"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4 mr-1" />
          )}
          Image
        </Button>
        
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
