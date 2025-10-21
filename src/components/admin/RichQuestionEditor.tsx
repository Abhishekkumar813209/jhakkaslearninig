import React, { useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import { Mathematics } from '@tiptap/extension-mathematics';
import 'katex/dist/katex.min.css';
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
  FunctionSquare,
  Radical,
  Divide,
  ArrowRight
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
  // Step 1: Remove ALL style blocks (Word's CSS definitions)
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Step 2: Remove ALL script blocks (security)
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Step 3: Remove ALL HTML comments (including Word's conditional comments)
  html = html.replace(/<!--[\s\S]*?-->/gi, '');
  
  // Step 4: Remove MathML and Office Math tags
  html = html.replace(/<math[^>]*>[\s\S]*?<\/math>/gi, '');
  html = html.replace(/<\/?m:[^>]*>/gi, '');
  
  // Step 5: Remove ALL Office-specific namespace tags (o:, w:, v:, x:, p:)
  html = html.replace(/<\/?[owmvxp]:[^>]*>/gi, '');
  
  // Step 6: Remove ALL class and style attributes
  html = html.replace(/\s*class="[^"]*"/gi, '');
  html = html.replace(/\s*style="[^"]*"/gi, '');
  
  // Step 7: Strip ALL remaining HTML tags (keep only text content)
  html = html.replace(/<[^>]+>/g, ' ');
  
  // Step 8: Decode HTML entities
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  html = tempDiv.textContent || tempDiv.innerText || html;
  
  // Step 9: Normalize whitespace (multiple spaces → single space)
  html = html.replace(/\s+/g, ' ').trim();
  
  return html;
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
      Mathematics.configure({
        katexOptions: {
          throwOnError: false,
          displayMode: false,
          trust: true,
          strict: false,
          output: 'html'
        }
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

        const html = clipboardData.getData('text/html');
        const text = clipboardData.getData('text/plain');

        // PRIORITY 1: Check for LaTeX math from Word/Excel
        if (html && (html.includes('mml:math') || html.includes('<math'))) {
          const mathMLRegex = /<math[^>]*>(.*?)<\/math>/gi;
          let extractedLaTeX = '';
          
          let match;
          while ((match = mathMLRegex.exec(html)) !== null) {
            let mathContent = match[1];
            mathContent = mathContent.replace(/<msqrt>(.*?)<\/msqrt>/gi, '\\sqrt{$1}');
            mathContent = mathContent.replace(/<mfrac><mrow>(.*?)<\/mrow><mrow>(.*?)<\/mrow><\/mfrac>/gi, '\\frac{$1}{$2}');
            mathContent = mathContent.replace(/<msup><mrow>(.*?)<\/mrow><mrow>(.*?)<\/mrow><\/msup>/gi, '$1^{$2}');
            mathContent = mathContent.replace(/<msub><mrow>(.*?)<\/mrow><mrow>(.*?)<\/mrow><\/msub>/gi, '$1_{$2}');
            mathContent = mathContent.replace(/<mover><mrow>(.*?)<\/mrow><mo>→<\/mo><\/mover>/gi, '\\vec{$1}');
            mathContent = mathContent.replace(/<[^>]+>/g, '');
            extractedLaTeX += mathContent;
          }
          
          if (extractedLaTeX) {
            editor?.commands.insertContent(`$${extractedLaTeX}$`);
            toast.success('✅ Math pasted from Word/Excel! Rendering as LaTeX');
            return true;
          }
        }

        // PRIORITY 2: Plain LaTeX text
        if (text && (text.includes('\\') || text.includes('$'))) {
          editor?.commands.insertContent(text);
          toast.success('✅ LaTeX pasted!');
          return true;
        }

        // PRIORITY 3: Regular HTML/text
        if (html) {
          let cleanedHTML = cleanPastedHTML(html);
          let extractedText = convertUnicodeToNotation(cleanedHTML);
          editor?.commands.insertContent(extractedText);
          toast.success('✅ Text pasted and cleaned');
          return true;
        }

        if (text) {
          const convertedText = convertUnicodeToNotation(text);
          editor?.commands.insertContent(convertedText);
          if (text !== convertedText) {
            toast.success('Unicode converted to notation');
          }
          return true;
        }

        return false;
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
            editor.chain().focus().insertContent('$\\sqrt{}$').run();
            setTimeout(() => {
              const pos = editor.state.selection.from - 2;
              editor.commands.setTextSelection(pos);
            }, 10);
          }}
          className="h-8 px-2 text-xs"
          title="Insert Square Root"
        >
          <Radical className="h-4 w-4 mr-1" />
          √
        </Button>

        <Button
          type="button"
          variant="ghost"
          size={compact ? "sm" : "default"}
          onClick={() => {
            editor.chain().focus().insertContent('$\\frac{}{}$').run();
            setTimeout(() => {
              const pos = editor.state.selection.from - 4;
              editor.commands.setTextSelection(pos);
            }, 10);
          }}
          className="h-8 px-2 text-xs"
          title="Insert Fraction"
        >
          <Divide className="h-4 w-4 mr-1" />
          a/b
        </Button>

        <Button
          type="button"
          variant="ghost"
          size={compact ? "sm" : "default"}
          onClick={() => {
            editor.chain().focus().insertContent('$\\vec{}$').run();
            setTimeout(() => {
              const pos = editor.state.selection.from - 2;
              editor.commands.setTextSelection(pos);
            }, 10);
          }}
          className="h-8 px-2 text-xs"
          title="Insert Vector"
        >
          <ArrowRight className="h-4 w-4 mr-1" />
          →
        </Button>

        <Button
          type="button"
          variant="ghost"
          size={compact ? "sm" : "default"}
          onClick={() => {
            editor.chain().focus().insertContent('$^{}$').run();
            setTimeout(() => {
              const pos = editor.state.selection.from - 2;
              editor.commands.setTextSelection(pos);
            }, 10);
          }}
          className="h-8 px-2 text-xs"
          title="Superscript"
        >
          x²
        </Button>

        <Button
          type="button"
          variant="ghost"
          size={compact ? "sm" : "default"}
          onClick={() => {
            editor.chain().focus().insertContent('$_{}$').run();
            setTimeout(() => {
              const pos = editor.state.selection.from - 2;
              editor.commands.setTextSelection(pos);
            }, 10);
          }}
          className="h-8 px-2 text-xs"
          title="Subscript"
        >
          H₂
        </Button>
        
        <div className="w-px h-8 bg-border mx-1" />
        
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
        💡 <strong>Math Support:</strong> Type{' '}
        <kbd className="px-1 py-0.5 bg-background border rounded text-xs">$x^2$</kbd> for inline,{' '}
        <kbd className="px-1 py-0.5 bg-background border rounded text-xs">$$...$$</kbd> for block math.
        <br />
        Quick buttons: √ (root), / (fraction), → (vector), x² (power), H₂ (subscript)
        <br />
        ✨ <strong>Paste from Word/Excel equation editor fully supported!</strong>
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
