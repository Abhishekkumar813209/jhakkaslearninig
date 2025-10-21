import React, { useRef, useState } from 'react';
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
  Loader2,
  FunctionSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MathFormulaHelper } from './MathFormulaHelper';

// Unicode to notation converter
const UNICODE_SUBSCRIPTS: Record<string, string> = {
  '₀': '_0', '₁': '_1', '₂': '_2', '₃': '_3', '₄': '_4',
  '₅': '_5', '₆': '_6', '₇': '_7', '₈': '_8', '₉': '_9',
  'ₐ': '_a', 'ₑ': '_e', 'ₒ': '_o', 'ₓ': '_x', 'ₕ': '_h',
  'ₖ': '_k', 'ₗ': '_l', 'ₘ': '_m', 'ₙ': '_n', 'ₚ': '_p',
  'ₛ': '_s', 'ₜ': '_t'
};

const UNICODE_SUPERSCRIPTS: Record<string, string> = {
  '⁰': '^0', '¹': '^1', '²': '^2', '³': '^3', '⁴': '^4',
  '⁵': '^5', '⁶': '^6', '⁷': '^7', '⁸': '^8', '⁹': '^9',
  '⁺': '^+', '⁻': '^-', '⁼': '^=', '⁽': '^(', '⁾': '^)',
  'ⁿ': '^n', 'ⁱ': '^i'
};

const convertUnicodeToNotation = (text: string): string => {
  let result = text;
  
  // Convert subscripts
  Object.entries(UNICODE_SUBSCRIPTS).forEach(([unicode, notation]) => {
    result = result.split(unicode).join(notation);
  });
  
  // Convert superscripts
  Object.entries(UNICODE_SUPERSCRIPTS).forEach(([unicode, notation]) => {
    result = result.split(unicode).join(notation);
  });
  
  return result;
};

const cleanPastedHTML = (html: string): string => {
  // Remove Word's conditional comments
  html = html.replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, '');
  
  // Remove Word's XML namespaces
  html = html.replace(/<\/?[ovwxp]:[^>]*>/gi, '');
  
  // Remove empty paragraphs and spans
  html = html.replace(/<p[^>]*>\s*<\/p>/gi, '');
  html = html.replace(/<span[^>]*>\s*<\/span>/gi, '');
  
  // Replace multiple spaces with single space
  html = html.replace(/\s+/g, ' ');
  
  // Remove line breaks within inline content
  html = html.replace(/\s*<br[^>]*>\s*/gi, ' ');
  
  return html.trim();
};

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
  const [uploading, setUploading] = useState(false);
  const [showMathHelper, setShowMathHelper] = useState(false);
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
      handlePaste: (view, event, slice) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        // Get both HTML and plain text
        const html = clipboardData.getData('text/html');
        const text = clipboardData.getData('text/plain');

        // If there's HTML (from Word, browsers, etc.)
        if (html) {
          // Clean the HTML
          let cleanedHTML = cleanPastedHTML(html);
          
          // Extract text content from cleaned HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = cleanedHTML;
          let extractedText = tempDiv.textContent || tempDiv.innerText || '';
          
          // Convert Unicode subscripts/superscripts
          const originalText = extractedText;
          extractedText = convertUnicodeToNotation(extractedText);
          
          // Insert as plain text (no complex HTML structure)
          editor?.commands.insertContent(extractedText);
          
          if (originalText !== extractedText) {
            toast.success('Pasted! Unicode subscripts/superscripts converted to _ and ^ notation');
          }
          return true; // Prevent default paste
        }

        // If only plain text (Ctrl+Shift+V or from simple sources)
        if (text) {
          const convertedText = convertUnicodeToNotation(text);
          editor?.commands.insertContent(convertedText);
          
          if (text !== convertedText) {
            toast.success('Unicode subscripts/superscripts converted to _ and ^ notation');
          }
          return true;
        }

        return false; // Allow default behavior if no special handling needed
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

  const handleMathInsert = (formula: string) => {
    if (editor) {
      editor.chain().focus().insertContent(formula).run();
      toast.success('Formula inserted!');
    }
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
        
        <Button
          type="button"
          variant="ghost"
          size={compact ? "sm" : "default"}
          onClick={() => setShowMathHelper(true)}
          className="h-8 px-2 text-xs bg-primary/10 hover:bg-primary/20"
          title="Math Formula Helper"
        >
          <FunctionSquare className="h-4 w-4 mr-1" />
          Math
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
        💡 Use <kbd className="px-1 py-0.5 bg-background border rounded text-xs">_</kbd> for subscript, <kbd className="px-1 py-0.5 bg-background border rounded text-xs">^</kbd> for superscript. 
        <strong className="ml-1">✨ Paste from Word supported!</strong> Unicode auto-converts.
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 ml-2 text-xs"
          onClick={() => setShowMathHelper(true)}
        >
          Need help? Use Math Helper
        </Button>
      </div>

      {/* Math Formula Helper Dialog */}
      <MathFormulaHelper
        open={showMathHelper}
        onOpenChange={setShowMathHelper}
        onInsert={handleMathInsert}
      />
    </div>
  );
};
