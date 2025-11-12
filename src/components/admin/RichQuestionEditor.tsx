import React, { useRef, useState } from 'react';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { NodeViewProps } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import { Mathematics } from '@tiptap/extension-mathematics';
import 'katex/dist/katex.min.css';

// Helper to parse CSS string to React style object
const parseStyleString = (styleString: string): React.CSSProperties => {
  const styleObj: any = {};
  if (!styleString) return styleObj;
  
  styleString.split(';').forEach(rule => {
    const [key, value] = rule.split(':').map(s => s.trim());
    if (key && value) {
      // Convert CSS property names to camelCase (e.g., margin-left → marginLeft)
      const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      styleObj[camelKey] = value;
    }
  });
  
  return styleObj as React.CSSProperties;
};

// Resize Handle Component for 8-point resizing
const ResizeHandle = ({ position, onMouseDown }: { position: string; onMouseDown: (e: React.MouseEvent, pos: string) => void }) => {
  const positionStyles: Record<string, React.CSSProperties> = {
    'tl': { top: 0, left: 0, cursor: 'nwse-resize', transform: 'translate(-50%, -50%)' },
    'tr': { top: 0, right: 0, cursor: 'nesw-resize', transform: 'translate(50%, -50%)' },
    'bl': { bottom: 0, left: 0, cursor: 'nesw-resize', transform: 'translate(-50%, 50%)' },
    'br': { bottom: 0, right: 0, cursor: 'nwse-resize', transform: 'translate(50%, 50%)' },
    'tc': { top: 0, left: '50%', cursor: 'ns-resize', transform: 'translate(-50%, -50%)' },
    'bc': { bottom: 0, left: '50%', cursor: 'ns-resize', transform: 'translate(-50%, 50%)' },
    'lc': { top: '50%', left: 0, cursor: 'ew-resize', transform: 'translate(-50%, -50%)' },
    'rc': { top: '50%', right: 0, cursor: 'ew-resize', transform: 'translate(50%, -50%)' },
  };

  return (
    <div
      className="absolute w-3 h-3 bg-primary border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
      style={positionStyles[position]}
      onMouseDown={(e) => onMouseDown(e, position)}
    />
  );
};

// Resizable Image Component with 8 resize handles (no drag)
const ResizableImageComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<string>('');
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const isResizingRef = useRef(false);

  // Parse style to get current size
  const parseCurrentStyle = () => {
    const styleObj: Record<string, string> = {};
    const currentStyle = node.attrs.style || '';
    currentStyle.split(';').forEach(rule => {
      const [key, value] = rule.split(':').map(s => s.trim());
      if (key && value) styleObj[key] = value;
    });
    return styleObj;
  };

  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    isResizingRef.current = true;
    setActiveHandle(handle);
    setStartX(e.clientX);
    setStartY(e.clientY);
    
    if (imgRef.current) {
      setStartWidth(imgRef.current.offsetWidth);
      setStartHeight(imgRef.current.offsetHeight);
    }
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingRef.current) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        let newWidth = startWidth;
        let newHeight = startHeight;
        
        switch(activeHandle) {
          case 'br': // Bottom-right
            newWidth = Math.max(100, startWidth + deltaX);
            newHeight = Math.max(100, startHeight + deltaY);
            break;
          case 'bl': // Bottom-left
            newWidth = Math.max(100, startWidth - deltaX);
            newHeight = Math.max(100, startHeight + deltaY);
            break;
          case 'tr': // Top-right
            newWidth = Math.max(100, startWidth + deltaX);
            newHeight = Math.max(100, startHeight - deltaY);
            break;
          case 'tl': // Top-left
            newWidth = Math.max(100, startWidth - deltaX);
            newHeight = Math.max(100, startHeight - deltaY);
            break;
          case 'tc': // Top-center (height only)
            newHeight = Math.max(100, startHeight - deltaY);
            break;
          case 'bc': // Bottom-center (height only)
            newHeight = Math.max(100, startHeight + deltaY);
            break;
          case 'lc': // Left-center (width only)
            newWidth = Math.max(100, startWidth - deltaX);
            break;
          case 'rc': // Right-center (width only)
            newWidth = Math.max(100, startWidth + deltaX);
            break;
        }
        
        const styleObj = parseCurrentStyle();
        styleObj['width'] = `${newWidth}px`;
        styleObj['height'] = `${newHeight}px`;
        
        const newStyle = Object.entries(styleObj)
          .map(([k, v]) => `${k}: ${v}`)
          .join('; ');
        
        updateAttributes({ style: newStyle });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      isResizingRef.current = false;
      setActiveHandle('');
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, activeHandle, startX, startY, startWidth, startHeight, node.attrs.style, updateAttributes]);

  const imgStyle = parseStyleString(node.attrs.style || '');

  return (
    <NodeViewWrapper className="relative inline-block group my-2">
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt || 'Image'}
        style={imgStyle}
        className="max-w-full h-auto"
      />
      {/* 8 Resize Handles */}
      <ResizeHandle position="tl" onMouseDown={handleResizeStart} />
      <ResizeHandle position="tc" onMouseDown={handleResizeStart} />
      <ResizeHandle position="tr" onMouseDown={handleResizeStart} />
      <ResizeHandle position="lc" onMouseDown={handleResizeStart} />
      <ResizeHandle position="rc" onMouseDown={handleResizeStart} />
      <ResizeHandle position="bl" onMouseDown={handleResizeStart} />
      <ResizeHandle position="bc" onMouseDown={handleResizeStart} />
      <ResizeHandle position="br" onMouseDown={handleResizeStart} />
      
      {isResizing && (
        <div className="absolute top-0 left-0 w-full h-full border-2 border-primary pointer-events-none rounded" />
      )}
    </NodeViewWrapper>
  );
};

// Custom Image extension with resize handles
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: 'width: 100%; height: auto; display: block; margin: 0.5rem 0;',
        parseHTML: element => element.style.cssText,
        renderHTML: attributes => {
          return {
            style: attributes.style || 'width: 100%; height: auto; display: block; margin: 0.5rem 0;'
          };
        }
      }
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  }
});
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
import { ImageInsertDialog } from './ImageInsertDialog';

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
  // Step 0: Preserve mathematical notation BEFORE stripping HTML
  const preservedSymbols: Record<string, string> = {};
  let preserveIndex = 0;
  
  // Preserve arrow-prefix vectors (→r, →i, →j, →k)
  html = html.replace(/→\s*([A-Za-z])/g, (_match, letter) => {
    const token = `__VECARROW_${preserveIndex++}__`;
    preservedSymbols[token] = `→${letter}`;
    return token;
  });
  
  // Preserve √ with numbers (e.g., √14)
  html = html.replace(/√(\d+)/g, (_match, num) => {
    const token = `__SQRT_${preserveIndex++}__`;
    preservedSymbols[token] = `√${num}`;
    return token;
  });
  
  // Preserve standalone √ (e.g., in "1/√")
  html = html.replace(/√/g, (_match) => {
    const token = `__SQRT_${preserveIndex++}__`;
    preservedSymbols[token] = '√';
    return token;
  });
  
  // Preserve HTML entity for radical (&radic;)
  html = html.replace(/&radic;/gi, (_match) => {
    const token = `__SQRT_${preserveIndex++}__`;
    preservedSymbols[token] = '√';
    return token;
  });
  
  // Preserve fractions (e.g., 2/7, -3/7, a_1/a_2)
  html = html.replace(/([a-zA-Z0-9_\-]+)\/([a-zA-Z0-9_\-]+)/g, (_match, num, den) => {
    const token = `__FRAC_${preserveIndex++}__`;
    preservedSymbols[token] = `${num}/${den}`;
    return token;
  });
  
  // Preserve subscripts (e.g., a_1, b_2, c_3)
  html = html.replace(/([a-zA-Z])_([a-zA-Z0-9]+)/g, (_match, base, sub) => {
    const token = `__SUB_${preserveIndex++}__`;
    preservedSymbols[token] = `${base}_${sub}`;
    return token;
  });
  
  // Preserve superscripts (e.g., a^2, x^3)
  html = html.replace(/([a-zA-Z0-9_]+)\^([a-zA-Z0-9\+\-]+)/g, (_match, base, sup) => {
    const token = `__SUP_${preserveIndex++}__`;
    preservedSymbols[token] = `${base}^${sup}`;
    return token;
  });
  
  // Preserve equality signs in equations
  html = html.replace(/=/g, (_match) => {
    const token = `__EQ_${preserveIndex++}__`;
    preservedSymbols[token] = '=';
    return token;
  });
  
  // Preserve plus signs
  html = html.replace(/\+/g, (_match) => {
    const token = `__PLUS_${preserveIndex++}__`;
    preservedSymbols[token] = '+';
    return token;
  });
  
  // Step 1: Remove ALL style blocks (Word's CSS definitions)
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Step 1.5: Remove CSS comment blocks (Word garbage like /* Font Definitions */)
  html = html.replace(/\/\*[\s\S]*?\*\//g, '');
  
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
  
  // Step 10: Restore preserved symbols
  Object.entries(preservedSymbols).forEach(([token, value]) => {
    html = html.replace(new RegExp(token, 'g'), value);
  });
  
  return html;
};

// Helper to clean Word/Excel plain text (non-HTML paste that still has Word garbage)
const cleanWordPlainText = (text: string): string => {
  let cleaned = text;
  
  // Remove HTML/CSS comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove &lt;!-- style HTML entities
  cleaned = cleaned.replace(/&lt;!--[\s\S]*?--&gt;/g, '');
  
  // Remove @font-face blocks
  cleaned = cleaned.replace(/@font-face\s*\{[^}]*\}/gi, '');
  
  // Remove mso-* properties and other inline CSS
  cleaned = cleaned.replace(/mso-[a-z-]+:[^;]+;?/gi, '');
  cleaned = cleaned.replace(/font-family:[^;]+;?/gi, '');
  cleaned = cleaned.replace(/font-size:[^;]+;?/gi, '');
  
  // Remove leftover CSS rule blocks {...}
  cleaned = cleaned.replace(/\{[^{}]*mso[^{}]*\}/gi, '');
  cleaned = cleaned.replace(/\{[^{}]*font-family[^{}]*\}/gi, '');
  
  // Remove MsoNormal and WordSection class references
  cleaned = cleaned.replace(/MsoNormal/gi, '');
  cleaned = cleaned.replace(/WordSection\d+/gi, '');
  
  // Remove "Font Definitions" title
  cleaned = cleaned.replace(/Font Definitions/gi, '');
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
};

// Helper to convert [img:...] tokens to <img> HTML tags
// Format: [img:URL:width:align:padding]
const convertImageTokensToHTML = (text: string): string => {
  if (!text) return text;
  
  return text.replace(/\[img:([^\]]+)\]/g, (_, params) => {
    const parts = params.split(':').map(p => p.trim());
    
    // Pop from end to handle URLs with colons: padding, align, width
    const padding = (parts.length > 3 ? parts.pop() : '0') || '0';
    const align = (parts.length > 2 ? parts.pop() : 'center') || 'center';
    const width = (parts.length > 1 ? parts.pop() : '100%') || '100%';
    const url = parts.join(':');
    
    // Static positioning with alignment
    const alignmentStyle =
      align === 'center' ? 'margin-left: auto; margin-right: auto;' :
      align === 'right'  ? 'margin-left: auto; margin-right: 0;'    :
                          'margin-left: 0; margin-right: auto;';
    
    const paddingValue = parseInt(padding) || 0;
    const style = `width: ${width}; height: auto; display: block; ${alignmentStyle} padding-left: ${paddingValue}px; padding-right: ${paddingValue}px; margin-top: 0.5rem; margin-bottom: 0.5rem;`;
    
    return `<img src="${url}" alt="Question image" style="${style}" />`;
  });
};

interface RichQuestionEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  forcePlainPaste?: boolean; // Force plain text paste (no styling)
  smartMathPaste?: boolean; // Enable smart math conversions on plain paste
}

export const RichQuestionEditor: React.FC<RichQuestionEditorProps> = ({
  content,
  onChange,
  placeholder = 'Enter text...',
  className,
  compact = false,
  forcePlainPaste = false,
  smartMathPaste = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [showMathHelper, setShowMathHelper] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
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
          output: 'html',
          fleqn: false,
          macros: {
            "\\vec": "\\overrightarrow{#1}"
          }
        }
      }),
      CustomImage.configure({
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
    content: convertImageTokensToHTML(content),
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

        console.log('📋 Paste Debug:', {
          hasHTML: !!html,
          hasText: !!text,
          textPreview: text?.substring(0, 100),
          htmlPreview: html?.substring(0, 200)
        });

        // Check for image tokens first and convert to real images
        const tokenMatch = text?.match(/\[img:[^\]]+\]/);
        if (tokenMatch) {
          event.preventDefault();
          const token = tokenMatch[0];
          handleImageInsert(token);
          return true;
        }

        // FORCE PLAIN TEXT PASTE (Question Bank mode)
        if (forcePlainPaste) {
          event.preventDefault();
          
          // Get plain text, fallback to cleaned HTML if needed
          let plainText = text || '';
          if (!plainText && html) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cleanPastedHTML(html);
            plainText = tempDiv.textContent || '';
          }
          
          // Aggressively strip ALL Word/Excel/Office garbage
          let cleaned = plainText
            // Remove encoded HTML comments
            .replace(/&lt;!--[\s\S]*?--&gt;/gi, '')
            // Remove real HTML comments
            .replace(/<!--[\s\S]*?-->/gi, '')
            // Remove CSS comments (/* Font Definitions */ etc.)
            .replace(/\/\*[\s\S]*?\*\//g, '')
            // Remove @font-face blocks
            .replace(/@font-face\s*\{[\s\S]*?\}/gi, '')
            // Remove mso-* properties
            .replace(/mso-[a-z-]+:[^;]+;?/gi, '')
            // Remove font-family, font-size inline styles
            .replace(/font-family:[^;]+;?/gi, '')
            .replace(/font-size:[^;]+;?/gi, '')
            // Remove CSS rule blocks
            .replace(/\{[^{}]*\}/g, '')
            // Remove class names like MsoNormal, WordSection
            .replace(/MsoNormal/gi, '')
            .replace(/WordSection\d+/gi, '')
            .replace(/Font Definitions/gi, '')
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim();
          
          // Optional: Smart math paste (minimal conversions)
          if (smartMathPaste && cleaned) {
            cleaned = cleaned
              .replace(/√(\d+)/g, '$\\sqrt{$1}$')
              .replace(/([-−]?\d+)\/√(\d+)/g, '$\\frac{$1}{\\sqrt{$2}}$');
          }
          
          // Escape HTML entities to prevent interpretation
          const escapeHtml = (str: string) => str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          
          // Insert as safe plain text
          editor?.commands.insertContent(escapeHtml(cleaned));
          
          console.log('✅ FORCE PLAIN PASTE:', {
            original: plainText.substring(0, 100),
            cleaned: cleaned.substring(0, 100)
          });
          
          toast.success('✅ Plain text pasted (no styling)');
          return true;
        }

        // PRIORITY -1: Algebraic equations with equality chains
        // Matches: (x-1)/2=(1-y)/3=(2z-1)/12, x/2=y/3=z/4, etc.
        if (text && /[a-zA-Z0-9_()\s+\-]+\/[a-zA-Z0-9_()\s+\-]+=/.test(text)) {
          // This is a multi-part equation - preserve exactly as typed
          // Let renderMath handle the fraction rendering later
          editor?.commands.insertContent(text);
          toast.success('✅ Equation pasted! Will render on display.');
          console.log('✅ Algebraic equation preserved:', text);
          return true;
        }

        // PRIORITY 0: Direct detection of fractions with √ (Excel/plain text)
        if (text && /[-−]?\d+\/√\d+/.test(text)) {
          // Convert immediately to LaTeX for proper rendering
          const latexConverted = text
            .split(',')
            .map(expr => {
              const trimmed = expr.trim();
              // Match: -1/√14 → $\frac{-1}{\sqrt{14}}$
              return trimmed.replace(/([-−]?\d+)\/√(\d+)/g, '$\\frac{$1}{\\sqrt{$2}}$');
            })
            .join(', ');
          
          editor?.commands.insertContent(latexConverted);
          toast.success('✅ Fraction with √ pasted as LaTeX!');
          console.log('✅ Converted:', text, '→', latexConverted);
          return true;
        }

        // PRIORITY 0.3: Unicode combining marks (vectors with ⃗ and hats with ̂)
        // Must come BEFORE Office Math to catch these specific cases
        if (text && (/[\u20D7]/.test(text) || /[\u0302]/.test(text))) {
          // Normalize combining marks to renderable notation
          const normalized = text
            .replace(/([A-Za-z])\s*[\u20D7]/g, '→$1')  // r⃗ → →r
            .replace(/([ijkIJK])\s*[\u0302]/g, '\\hat{$1}');  // î → \hat{i}
          editor?.commands.insertContent(normalized);
          toast.success('✅ Vector/hat notation preserved!');
          console.log('✅ Combining marks converted:', text, '→', normalized);
          return true;
        }

        // PRIORITY 0.5: Office Math detection (Word/Excel equations)
        // Detect Office Math markup before it gets destroyed by cleanPastedHTML
        if (html && (/<m:|m:oMath|oMath/i.test(html) || html.includes('EquationNative'))) {
          const temp = document.createElement('div');
          temp.innerHTML = html;
          const textOnly = convertUnicodeToNotation(temp.textContent || '');
          editor?.commands.insertContent(textOnly);
          toast.success('✅ Equation pasted from Word! Preserved as text for rendering.');
          console.log('✅ Office Math preserved:', textOnly);
          return true;
        }

        // PRIORITY 1: Enhanced MathML detection (include msqrt and &radic;)
        if (html && (html.includes('mml:math') || html.includes('<math') || html.includes('msqrt') || html.includes('&radic;'))) {
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

        // PRIORITY 3: Text with √ symbols
        if (text && text.includes('√')) {
          // Convert √14 → $\sqrt{14}$
          const latexText = text.replace(/√(\d+)/g, '$\\sqrt{$1}$');
          editor?.commands.insertContent(latexText);
          toast.success('✅ √ converted to LaTeX!');
          return true;
        }
        
        // PRIORITY 3.5: Plain math-like text (fractions/subscripts/superscripts/±/vectors) → keep as text, skip HTML cleaning
        if (text && (
          /[a-zA-Z]_[a-zA-Z0-9]/.test(text) ||
          /\^/.test(text) ||
          /±/.test(text) ||
          /→[A-Za-z]/.test(text) ||
          /[-−]?[a-zA-Z0-9_()]+\/[a-zA-Z0-9_()]+/.test(text)
        )) {
          const converted = convertUnicodeToNotation(text);
          editor?.commands.insertContent(converted);
          toast.success('✅ Math text pasted!');
          return true;
        }

        // PRIORITY 3.8: Word/Excel plain text with garbage (detect before generic fallback)
        if (text && (/(MsoNormal|mso-|@font-face|WordSection|Font Definitions|&lt;!--|<!--)/i.test(text))) {
          let cleaned = cleanWordPlainText(text);
          
          // Preserve math: √14 → $\sqrt{14}$, -1/√14 → $\frac{-1}{\sqrt{14}}$
          cleaned = cleaned.replace(/√(\d+)/g, '$\\sqrt{$1}$');
          cleaned = cleaned.replace(/([-−]?\d+)\/√(\d+)/g, '$\\frac{$1}{\\sqrt{$2}}$');
          
          // Convert Unicode to notation
          cleaned = convertUnicodeToNotation(cleaned);
          
          editor?.commands.insertContent(cleaned);
          toast.success('✅ Word/Excel paste cleaned!');
          console.log('✅ Word garbage removed:', text.substring(0, 100), '→', cleaned);
          return true;
        }
        
        // PRIORITY 4: Regular HTML/text
        if (html) {
          let cleanedHTML = cleanPastedHTML(html); // Now preserves √ and removes CSS comments!
          
          // Double-check: if √ still present, convert to LaTeX
          if (cleanedHTML.includes('√')) {
            cleanedHTML = cleanedHTML.replace(/√(\d+)/g, '$\\sqrt{$1}$');
            cleanedHTML = cleanedHTML.replace(/([-−]?\d+)\/√(\d+)/g, '$\\frac{$1}{\\sqrt{$2}}$');
          }
          
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

  // Watch for external content changes and preprocess tokens
  React.useEffect(() => {
    if (!editor) return;
    
    // Get current editor HTML
    const currentHTML = editor.getHTML();
    
    // Preprocess incoming content: convert [img:...] tokens to <img> tags
    const preprocessedContent = convertImageTokensToHTML(content);
    
    // Only update if content actually changed (avoid infinite loops)
    // Normalize for comparison (strip extra whitespace)
    const normalize = (html: string) => html.replace(/\s+/g, ' ').trim();
    
    if (normalize(currentHTML) !== normalize(preprocessedContent)) {
      // Update editor content without triggering onChange
      editor.commands.setContent(preprocessedContent, { emitUpdate: false });
    }
  }, [content, editor]);

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
    setShowImageDialog(true);
  };

  const handleImageInsert = (imageToken: string) => {
    if (!editor) return;
    
    // Parse token: [img:URL:width:align:padding]
    // Pop from end to handle URLs with colons (https://)
    const inner = imageToken.slice(5, -1); // Remove [img: and ]
    const parts = inner.split(':');
    
    if (parts.length < 1) {
      toast.error('Invalid image token format');
      return;
    }
    
    const padding = (parts.length > 3 ? parts.pop() : '0')?.trim() || '0';
    const align = (parts.length > 2 ? parts.pop() : 'center')?.trim() || 'center';
    const width = (parts.length > 1 ? parts.pop() : '100%')?.trim() || '100%';
    const url = parts.join(':').trim();
    
    // Build CSS style string
    const alignmentStyle = align === 'center' ? 'margin-left: auto; margin-right: auto;' 
                         : align === 'right' ? 'margin-left: auto; margin-right: 0;'
                         : 'margin-left: 0; margin-right: auto;';
    
    const styleString = `width: ${width}; height: auto; display: block; ${alignmentStyle} padding-left: ${Number(padding) || 0}px; padding-right: ${Number(padding) || 0}px; margin: 0.5rem 0;`;
    
    // Insert HTML image with style attribute
    const imageHTML = `<img src="${url}" alt="Question image" style="${styleString}" />`;
    editor.chain().focus().insertContent(imageHTML).run();
    setShowImageDialog(false);
    
    toast.success('Image inserted!');
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
      <ImageInsertDialog
        open={showImageDialog}
        onClose={() => setShowImageDialog(false)}
        onInsert={handleImageInsert}
      />
      
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
          className="h-8 px-2 text-xs"
          title="Insert Image with Controls"
        >
          <ImageIcon className="h-4 w-4 mr-1" />
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

      {/* Editor - with positioning context for absolute positioning */}
      <EditorContent 
        editor={editor} 
        className="min-h-[80px] [&_.ProseMirror]:relative [&_.ProseMirror]:min-h-[500px] [&_.ProseMirror]:p-4"
      />
      
      {/* Helper text */}
      <div className="px-3 py-1 text-xs text-muted-foreground bg-muted/20 border-t space-y-1">
        <div>
          💡 <strong>Math Support:</strong> Use <kbd className="px-1 py-0.5 bg-muted rounded">$...$</kbd> for inline math, <kbd className="px-1 py-0.5 bg-muted rounded">$$...$$</kbd> for block
        </div>
        <div className="text-[10px] opacity-80">
          Examples: <code>$x^2$</code> → x², <code>$\sqrt{'{14}'}$</code> → √14 with vinculum, <code>$\frac{'{a}'}{'{b}'}$</code> → fraction
        </div>
        <div className="text-[10px] opacity-80">
          ✨ <strong>Paste from Excel/Word:</strong> Math expressions like -1/√14 auto-convert to LaTeX!
        </div>
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
