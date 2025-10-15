import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Loader2, Eye, FileText, CheckCircle2, Search, Filter, Image as ImageIcon } from "lucide-react";
import { getDocument } from 'pdfjs-dist';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import { useFormPersistence } from "@/hooks/useFormPersistence";

interface ExtractedQuestion {
  id: string;
  question_number: string;
  question_type: 'mcq' | 'match_column' | 'assertion_reason' | 'fill_blank' | 'true_false' | 'short_answer';
  question_text: string;
  options?: string[];
  left_column?: string[];
  right_column?: string[];
  assertion?: string;
  reason?: string;
  blanks_count?: number;
  marks?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  auto_corrected?: boolean;
  confidence?: 'high' | 'medium' | 'low';
  images?: string[];
  ocr_text?: string[];
  edited?: boolean;
}

interface SmartQuestionExtractorProps {
  selectedTopic?: string;
  onQuestionsAdded: (questions: ExtractedQuestion[]) => void;
}

export const SmartQuestionExtractor = ({ selectedTopic, onQuestionsAdded }: SmartQuestionExtractorProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewQuestion, setPreviewQuestion] = useState<ExtractedQuestion | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [enableOcr, setEnableOcr] = useState(true);

  // Persist extracted questions across page refreshes
  const {
    data: extractedQuestions,
    setData: setExtractedQuestions,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    showResumeDialog,
    resumeProgress,
    startFresh,
    clearProgress,
    savedProgress
  } = useFormPersistence<ExtractedQuestion[]>(
    'smart-question-extractor-questions',
    [],
    24 // 24 hours expiry
  );

  // Helper: Extract only digits from question number (handles "54.", "Q54", "54)" etc.)
  const getNormalizedQNumber = (qn: any, fallback: number): string => {
    const str = (qn ?? '').toString();
    const match = str.match(/\d+/);
    return match ? match[0] : String(fallback);
  };

  // Helper: Dedupe images by URL
  const dedupeByUrl = <T extends { url?: string }>(arr: T[]): T[] => {
    const seen = new Set<string>();
    return arr.filter(item => {
      const key = item.url || JSON.stringify(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // Enhanced text extraction for better structure preservation
  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 50); // Limit to 50 pages
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Preserve layout structure
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += `\n--- PAGE ${i} ---\n${pageText}\n`;
    }
    
    return fullText;
  };

  // Extract rich content from Word documents (HTML + images + OCR)
  const extractTextFromWord = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    
    const imageDataUrls: string[] = [];
    const imageIds: string[] = [];
    
    // Convert DOCX to HTML with embedded images
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        convertImage: mammoth.images.imgElement((image) => {
          return image.read("base64").then((imageBuffer) => {
            const dataUrl = `data:${image.contentType};base64,${imageBuffer}`;
            const imageId = `img_${imageDataUrls.length + 1}`;
            imageDataUrls.push(dataUrl);
            imageIds.push(imageId);
            return {
              src: dataUrl,
              'data-image-id': imageId
            };
          });
        })
      }
    );
    
    const html = result.value;
    
    // Run OCR on images if enabled (max 2 concurrent)
    const ocrResults: Map<string, string> = new Map();
    if (enableOcr && imageDataUrls.length > 0) {
      console.log(`🔍 Running OCR on ${imageDataUrls.length} images...`);
      toast.info(`Running OCR on ${imageDataUrls.length} images...`, { duration: 5000 });
      
      for (let i = 0; i < imageDataUrls.length; i += 2) {
        const batch = imageDataUrls.slice(i, i + 2);
        const batchIds = imageIds.slice(i, i + 2);
        
        console.log(`OCR Progress: ${i + 1}-${Math.min(i + batch.length, imageDataUrls.length)}/${imageDataUrls.length}`);
        
        const ocrPromises = batch.map(async (dataUrl, idx) => {
          try {
            const { data: { text } } = await Tesseract.recognize(dataUrl, 'eng', {
              logger: () => {} // Suppress verbose logs
            });
            return { id: batchIds[idx], text: text.trim() };
          } catch (error) {
            console.warn(`OCR failed for image ${batchIds[idx]}:`, error);
            return { id: batchIds[idx], text: '' };
          }
        });
        
        const results = await Promise.all(ocrPromises);
        results.forEach(({ id, text }) => {
          if (text) ocrResults.set(id, text);
        });
      }
      
      console.log(`✅ OCR complete: ${ocrResults.size}/${imageDataUrls.length} images processed`);
    }
    
    // Build global imageId -> {url, ocr} map for later figure-to-question mapping
    const __imageIdMap: Record<string, { url: string; ocr?: string }> = {};
    imageIds.forEach((id, idx) => {
      __imageIdMap[id] = { url: imageDataUrls[idx], ocr: ocrResults.get(id) || undefined };
    });
    (window as any).__imageIdMap = __imageIdMap;

    // Convert HTML to structured text
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    let structuredText = '';
    let currentQuestionNumber = '';
    const imagesByQuestion: Record<string, Array<{ url: string; ocr?: string }>> = {};
    
    const processNode = (node: Node, indent: string = ''): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      
      if (node.nodeType !== Node.ELEMENT_NODE) return '';
      
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      
      // Handle lists with proper numbering
      if (tagName === 'ol' || tagName === 'ul') {
        const listType = element.getAttribute('type') || '1';
        const children = Array.from(element.children);
        
        return children.map((child, idx) => {
          const num = idx + 1;
          let marker = '';
          
          if (tagName === 'ol') {
            if (listType === 'a') marker = `${String.fromCharCode(97 + idx)}) `;
            else if (listType === 'A') marker = `${String.fromCharCode(65 + idx)}) `;
            else if (listType === 'i') marker = `(${toRoman(num).toLowerCase()}) `;
            else if (listType === 'I') marker = `(${toRoman(num)}) `;
            else marker = `${num}. `;
          } else {
            marker = '• ';
          }
          
          return indent + marker + processNode(child, indent + '  ').trim();
        }).join('\n');
      }
      
      if (tagName === 'li') {
        return Array.from(element.childNodes).map(child => processNode(child, indent)).join('');
      }
      
      // Handle superscript and subscript
      if (tagName === 'sup') {
        return `^{${element.textContent}}`;
      }
      if (tagName === 'sub') {
        return `_{${element.textContent}}`;
      }
      
      // Handle images
      if (tagName === 'img') {
        const imageId = element.getAttribute('data-image-id') || '';
        const ocr = ocrResults.get(imageId);
        let imageText = `\n[FIGURE id=${imageId}]\n`;
        if (ocr) {
          imageText += `[IMAGE_OCR id=${imageId}]: ${ocr}\n`;
        }
        return imageText;
      }
      
      // Handle tables
      if (tagName === 'table') {
        const rows = Array.from(element.querySelectorAll('tr'));
        return '\n' + rows.map(row => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          return cells.map(cell => cell.textContent?.trim() || '').join(' | ');
        }).join('\n') + '\n';
      }
      
      // Handle paragraphs and divs
      if (tagName === 'p' || tagName === 'div') {
        const content = Array.from(element.childNodes).map(child => processNode(child, indent)).join('');
        return content + '\n';
      }
      
      // Handle headings
      if (tagName.match(/^h[1-6]$/)) {
        return '\n\n' + element.textContent + '\n\n';
      }
      
      // Default: process children
      return Array.from(element.childNodes).map(child => processNode(child, indent)).join('');
    };
    
    const toRoman = (num: number): string => {
      const romanNumerals: [number, string][] = [
        [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
      ];
      let result = '';
      for (const [value, numeral] of romanNumerals) {
        while (num >= value) {
          result += numeral;
          num -= value;
        }
      }
      return result;
    };
    
    structuredText = processNode(doc.body);
    
    // Figure-to-question mapping will be built after enhancing text using markers
    return structuredText;
  };

  // Normalize text for better processing
  const normalizeText = (text: string): string => {
    let normalized = text;
    
    // Convert CRLF to LF
    normalized = normalized.replace(/\r\n/g, '\n');
    
    // Convert non-breaking spaces to regular spaces
    normalized = normalized.replace(/\u00A0/g, ' ');
    
    // Collapse multiple spaces (but keep newlines)
    normalized = normalized.replace(/ {2,}/g, ' ');
    
    // Collapse excessive newlines (max 2 consecutive)
    normalized = normalized.replace(/\n{3,}/g, '\n\n');
    
    return normalized;
  };

  // Add structure markers to help AI detect question types
  const enhanceTextForAI = (text: string): string => {
    let enhanced = normalizeText(text);
    
    // === QUESTION NUMBERING DETECTION (Multiple Strategies) ===
    
    // Strategy 1: Number followed by separator on same line (e.g., "1. ", "Q1:", "Question 1-")
    enhanced = enhanced.replace(/(?:^|\n)\s*(?:Q(?:uestion)?\s*)?(\d+)\s*[.)\-:|]\s+(?=\S)/gmi, '\n\n[QUESTION_$1]\n');
    
    // Strategy 2: Number standing alone on its own line (common in DOCX)
    enhanced = enhanced.replace(/(?:^|\n)\s*(?:Q(?:uestion)?\s*)?(\d+)\s*(?:\n|$)/gmi, '\n[QUESTION_$1]\n');
    
    // Strategy 3: "Q1" / "Question 1" variants without separator
    enhanced = enhanced.replace(/(?:^|\n)\s*(?:Q(?:uestion)\s+)(\d+)(?=\s+[A-Z])/gmi, '\n\n[QUESTION_$1]\n');
    
    // === TYPE MARKERS ===
    
    // Mark assertion-reason questions (tolerant of spacing and separators)
    enhanced = enhanced.replace(/Assertion\s*\(?\s*A\s*\)?\s*[:\-–]\s*/gi, '\n[ASSERTION_REASON]\nAssertion (A): ');
    enhanced = enhanced.replace(/Reason\s*\(?\s*R\s*\)?\s*[:\-–]\s*/gi, 'Reason (R): ');
    
    // Mark match column questions
    enhanced = enhanced.replace(/Match\s+(?:the\s+)?(?:column|columns|following)/gi, (match) => `\n[MATCH_COLUMN]\n${match}`);
    
    // Mark fill in the blanks (2+ underscores or dashes)
    enhanced = enhanced.replace(/^(.*(_{2,}|—{2,}|-{5,}).*)$/gm, '[FILL_BLANK]$1');
    
    // Mark true/false questions
    enhanced = enhanced.replace(/(True\s*\/\s*False|T\s*\/\s*F)/gi, (match) => `[TRUE_FALSE]${match}`);
    
    return enhanced;
  };

  // Map figures to questions using [QUESTION_n] markers present in enhanced content
  const mapFiguresToQuestions = (enhanced: string) => {
    const imageIdMap: Record<string, { url: string; ocr?: string }> = (window as any).__imageIdMap || {};
    const imagesByQuestion: Record<string, Array<{ url: string; ocr?: string }>> = {};
    const lines = enhanced.split(/\r?\n/);
    let currentQ = '';
    const figureRegex = /^\s*\[FIGURE\s+id=(img_\d+)\]\s*$/i;
    const qRegex = /^\s*\[QUESTION_(\d+)\]\s*$/i;
    for (const raw of lines) {
      const line = raw.trim();
      const qm = line.match(qRegex);
      if (qm) { currentQ = qm[1]; continue; }
      const fm = line.match(figureRegex);
      if (fm && currentQ) {
        const id = fm[1];
        const img = imageIdMap[id];
        if (img) {
          imagesByQuestion[currentQ] = imagesByQuestion[currentQ] || [];
          imagesByQuestion[currentQ].push({ url: img.url, ocr: img.ocr });
        }
      }
    }
    (window as any).__questionImages = imagesByQuestion;
    const totalFigures = Object.values(imagesByQuestion).reduce((a, arr) => a + arr.length, 0);
    console.log('🧩 Figure mapping complete', { questions_with_figures: Object.keys(imagesByQuestion).length, total_figures: totalFigures });
    return imagesByQuestion;
  };

  // Basic OCR parser for match-the-column when AI leaves columns empty
  const parseColumnsFromOCR = (ocr_text: string[] = []) => {
    const joined = ocr_text.join('\n').replace(/\u00A0/g, ' ').trim();
    if (!joined) return null;
    // Try explicit headings first
    const headingMatch = joined.match(/Column\s*I[\s\S]*?Column\s*II[\s\S]*/i);
    let left: string[] = [], right: string[] = [];
    if (headingMatch) {
      const [_, afterI] = joined.split(/Column\s*I\s*/i);
      const [leftPart, rightPart] = afterI.split(/Column\s*II\s*/i);
      left = leftPart?.split(/\n|\r/).map(s => s.trim()).filter(Boolean) || [];
      right = rightPart?.split(/\n|\r/).map(s => s.trim()).filter(Boolean) || [];
    } else {
      // Heuristic: lines starting with A./B./C. etc to left, (i)/(ii)/i. etc to right
      const lines = joined.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      left = lines.filter(l => /^[A-Da-d][).\-\s]/.test(l)).map(l => l.replace(/^[A-Da-d][).\-\s]/, '').trim());
      right = lines.filter(l => /^(?:\(?i{1,3}\)?|\(?v?i{0,3}\)?|\(?x\)?)[).\-\s]/i.test(l) || /^\(?[ivxlcdm]+\)?[).\-\s]/i.test(l))
                   .map(l => l.replace(/^\(?[ivxlcdm]+\)?[).\-\s]/i, '').trim());
      // Fallback split by table-like pipes
      if (left.length === 0 && right.length === 0) {
        const pipeLines = lines.filter(l => l.includes('|'));
        pipeLines.forEach(l => {
          const [lft, rgt] = l.split('|');
          if (lft && rgt) {
            left.push(lft.trim());
            right.push(rgt.trim());
          }
        });
      }
    }
    if (left.length >= 2 && right.length >= 2) return { left, right };
    return null;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a PDF or Word document");
      return;
    }

    setIsUploading(true);
    setIsExtracting(true);

    try {
      let fileContent = '';

      // Extract text based on file type
      if (file.type === 'application/pdf') {
        toast.info("Extracting text from PDF with advanced parsing...", { duration: 3000 });
        fileContent = await extractTextFromPDF(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
        toast.info("Extracting text from Word document...", { duration: 3000 });
        fileContent = await extractTextFromWord(file);
      } else {
        throw new Error('Unsupported file type');
      }

      // Enhance text with structure markers
      const enhancedContent = enhanceTextForAI(fileContent);

      const markerCounts = {
        question_markers: (enhancedContent.match(/\[QUESTION_/g) || []).length,
        assertion_markers: (enhancedContent.match(/\[ASSERTION_REASON\]/g) || []).length,
        match_markers: (enhancedContent.match(/\[MATCH_COLUMN\]/g) || []).length,
        fill_blank_markers: (enhancedContent.match(/\[FILL_BLANK\]/g) || []).length,
        true_false_markers: (enhancedContent.match(/\[TRUE_FALSE\]/g) || []).length
      };

      console.log('📄 Document Analysis:', {
        original_length: fileContent.length,
        enhanced_length: enhancedContent.length,
        first_300_chars: enhancedContent.substring(0, 300),
        ...markerCounts
      });

      // Warning if marker detection seems low
      if (markerCounts.question_markers < 10) {
        console.warn('⚠️ Low question markers detected. Document formatting may be unusual. Trying tolerant parsing...');
        toast.info("Document formatting detected. Using advanced parsing...", { duration: 3000 });
      }

      // Map figures to questions before invoking AI
      const imgMap = mapFiguresToQuestions(enhancedContent);
      const hasFigures = Object.keys((window as any).__imageIdMap || {}).length > 0;
      const mappedCount = Object.values(imgMap || {}).reduce((a: number, arr: any[]) => a + arr.length, 0);
      if (hasFigures && mappedCount === 0) {
        toast.message('Figures detected but not linked to any question. We will still include OCR text where possible.');
      }

      // Call AI extraction edge function
      const { data, error } = await supabase.functions.invoke('ai-extract-all-questions', {
        body: {
          file_content: enhancedContent,
          subject: 'General',
          chapter: '',
          topic: ''
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Extraction failed');
      }

      // Map images to questions using normalized numbers and fallback figure tokens
      const imageIdMap: Record<string, { url: string; ocr?: string }> = (window as any).__imageIdMap || {};
      const qImagesMap = (window as any).__questionImages || {};
      
      const questionsWithIds = data.questions.map((q: any, index: number) => {
        const normalizedNum = getNormalizedQNumber(q.question_number, index + 1);

        // Source A: mapping built from [QUESTION_x] and [FIGURE id=img_x]
        const byNumber = qImagesMap[normalizedNum] || [];

        // Source B: figure tokens present inside this question's text (if AI preserved them)
        const tokenMatches = Array.from((q.question_text || '').matchAll(/\[FIGURE\s+id=(img_\d+)\]/gi));
        const byTokens = tokenMatches
          .map((m) => m[1])
          .map((id) => imageIdMap[id])
          .filter(Boolean);

        // Merge + dedupe
        const mergedImages = dedupeByUrl([...(byNumber || []), ...(byTokens || [])]);

        const base: any = {
          ...q,
          question_number: normalizedNum,
          id: `q-${Date.now()}-${index}`,
          auto_corrected: q.auto_corrected || false,
          images: mergedImages.map((img) => img.url),
          ocr_text: mergedImages.map((img) => img.ocr).filter(Boolean),
        };

        // OCR fallback for match_column
        if (
          base.question_type === 'match_column' &&
          (!base.left_column || base.left_column.length === 0 || !base.right_column || base.right_column.length === 0) &&
          base.ocr_text && base.ocr_text.length > 0
        ) {
          const parsed = parseColumnsFromOCR(base.ocr_text);
          if (parsed) {
            base.left_column = parsed.left;
            base.right_column = parsed.right;
            base.auto_corrected = true;
          }
        }

        // Debug logging for specific questions
        if (['3', '54'].includes(normalizedNum)) {
          console.log('Image mapping debug', {
            qn: q.question_number,
            normalizedNum,
            byNumber,
            byTokens,
            mergedImagesCount: mergedImages.length,
          });
        }

        return base;
      });

      setExtractedQuestions(questionsWithIds);
      setHasUnsavedChanges(true);
      toast.success(`Found ${data.total_questions} questions! Select the ones you want to add.`);

    } catch (error) {
      console.error('Extraction error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to extract questions');
    } finally {
      setIsUploading(false);
      setIsExtracting(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(qid => qid !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const filtered = getFilteredQuestions();
    setSelectedIds(filtered.map(q => q.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const getFilteredQuestions = () => {
    let filtered = extractedQuestions;

    if (filterType !== 'all') {
      filtered = filtered.filter(q => q.question_type === filterType);
    }

    if (searchText) {
      filtered = filtered.filter(q => 
        q.question_text.toLowerCase().includes(searchText.toLowerCase()) ||
        q.question_number.includes(searchText)
      );
    }

    return filtered;
  };

  const handleAddToGames = () => {
    const selected = extractedQuestions.filter(q => selectedIds.includes(q.id));
    if (selected.length === 0) {
      toast.error("Please select at least one question");
      return;
    }

    onQuestionsAdded(selected);
    toast.success(`Adding ${selected.length} questions to lesson builder...`);
    
    // Clear selection and saved progress after successful addition
    setSelectedIds([]);
    clearProgress();
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'mcq': 'Multiple Choice',
      'match_column': 'Match Column',
      'assertion_reason': 'Assertion-Reason',
      'fill_blank': 'Fill in Blanks',
      'true_false': 'True/False',
      'short_answer': 'Short Answer'
    };
    return labels[type] || type;
  };

  const getQuestionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'mcq': 'bg-blue-500',
      'match_column': 'bg-purple-500',
      'assertion_reason': 'bg-orange-500',
      'fill_blank': 'bg-green-500',
      'true_false': 'bg-yellow-500',
      'short_answer': 'bg-pink-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  const getDifficultyColor = (difficulty?: string) => {
    const colors: Record<string, string> = {
      'easy': 'text-green-600',
      'medium': 'text-yellow-600',
      'hard': 'text-red-600'
    };
    return colors[difficulty || 'medium'] || 'text-gray-600';
  };

  const filteredQuestions = getFilteredQuestions();

  return (
    <div className="space-y-4">
      {/* Resume Dialog */}
      {showResumeDialog && (
        <Dialog open={showResumeDialog} onOpenChange={(open) => !open && startFresh()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resume Previous Work?</DialogTitle>
              <DialogDescription>
                You have {savedProgress?.length || 0} previously extracted questions. 
                Would you like to resume or start fresh?
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={startFresh}>
                Start Fresh
              </Button>
              <Button onClick={resumeProgress}>
                Resume ({savedProgress?.length || 0} questions)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Upload Section */}
      {extractedQuestions.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload PDF/Word Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Upload a PDF or Word document containing questions. AI will automatically detect all questions and their types.
              </p>
              
              <div className="flex items-center justify-center gap-2 mb-4">
                <Checkbox 
                  id="enable-ocr" 
                  checked={enableOcr}
                  onCheckedChange={(checked) => setEnableOcr(!!checked)}
                />
                <label htmlFor="enable-ocr" className="text-sm cursor-pointer">
                  Enable OCR for images (extracts text from figures and tables)
                </label>
              </div>
              
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button asChild disabled={isUploading}>
                  <span>
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose File
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extraction Progress */}
      {isExtracting && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <div>
                <p className="font-medium">AI is analyzing your document...</p>
                <p className="text-sm text-muted-foreground">This may take a minute for large files</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Grid */}
      {extractedQuestions.length > 0 && (
        <>
          {/* Filter Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="flex-1"
                  />
                </div>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types ({extractedQuestions.length})</SelectItem>
                    <SelectItem value="mcq">Multiple Choice</SelectItem>
                    <SelectItem value="match_column">Match Column</SelectItem>
                    <SelectItem value="assertion_reason">Assertion-Reason</SelectItem>
                    <SelectItem value="fill_blank">Fill in Blanks</SelectItem>
                    <SelectItem value="true_false">True/False</SelectItem>
                    <SelectItem value="short_answer">Short Answer</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All ({filteredQuestions.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>Found {extractedQuestions.length} questions • Selected {selectedIds.length}</span>
                <div className="flex gap-3 text-xs">
                  <span className="text-blue-600">
                    ✓ {extractedQuestions.filter(q => q.auto_corrected).length} auto-corrected
                  </span>
                  <span className="text-green-600">
                    ✓ {extractedQuestions.filter(q => !q.auto_corrected).length} accurate
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredQuestions.map((question) => (
              <Card 
                key={question.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedIds.includes(question.id) ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
                }`}
                onClick={() => toggleSelection(question.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Checkbox 
                      checked={selectedIds.includes(question.id)}
                      onCheckedChange={() => toggleSelection(question.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={getQuestionTypeColor(question.question_type)}>
                          {getQuestionTypeLabel(question.question_type)}
                        </Badge>
                        {question.difficulty && (
                          <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                            {question.difficulty}
                          </Badge>
                        )}
                        {question.auto_corrected && (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            ✓ Auto-corrected
                          </Badge>
                        )}
                        {(question as any).edited && (
                          <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">
                            Edited
                          </Badge>
                        )}
                        {question.confidence && question.confidence !== 'high' && (
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 text-xs">
                            {question.confidence} confidence
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Q{question.question_number} • {question.marks || 1} mark(s)
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm line-clamp-3 mb-3">
                    {question.question_text}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewQuestion(question);
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Bar */}
          {selectedIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
              <Card className="shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">{selectedIds.length} selected</span>
                    </div>
                    <Button onClick={handleAddToGames} size="lg">
                      Add to Lesson Builder ({selectedIds.length})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewQuestion} onOpenChange={() => setPreviewQuestion(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Question {previewQuestion?.question_number} Preview
            </DialogTitle>
            <DialogDescription>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge className={getQuestionTypeColor(previewQuestion?.question_type || '')}>
                  {getQuestionTypeLabel(previewQuestion?.question_type || '')}
                </Badge>
                {previewQuestion?.difficulty && (
                  <Badge variant="outline" className={getDifficultyColor(previewQuestion.difficulty)}>
                    {previewQuestion.difficulty}
                  </Badge>
                )}
                <Badge variant="outline">
                  {previewQuestion?.marks || 1} mark(s)
                </Badge>
                {previewQuestion?.auto_corrected && (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    ✓ Type Auto-corrected by AI
                  </Badge>
                )}
                {previewQuestion?.confidence && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                    {previewQuestion.confidence} confidence
                  </Badge>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Question:</h4>
              <p className="text-sm whitespace-pre-wrap">
                {previewQuestion?.question_type === 'mcq' && previewQuestion?.options && previewQuestion.options.length > 0
                  ? previewQuestion.question_text.split(/\n[a-d]\)/).filter(Boolean)[0].trim()
                  : previewQuestion?.question_text
                }
              </p>
            </div>

            {previewQuestion?.options && previewQuestion.options.length > 0 && previewQuestion?.question_type !== 'match_column' && (
              <div>
                <h4 className="font-medium mb-2">Options:</h4>
                <ul className="space-y-1">
                  {previewQuestion.options.map((opt, idx) => (
                    <li key={idx} className="text-sm pl-4">{opt}</li>
                  ))}
                </ul>
              </div>
            )}

            {previewQuestion?.left_column && previewQuestion?.right_column && (
              <div>
                <h4 className="font-medium mb-2">Matching Items:</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium mb-1">Column I:</p>
                    <ul className="space-y-1">
                      {previewQuestion.left_column.map((item, idx) => (
                        <li key={idx} className="text-sm">• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1">Column II:</p>
                    <ul className="space-y-1">
                      {previewQuestion.right_column.map((item, idx) => (
                        <li key={idx} className="text-sm">• {item}</li>
                      ))}
                    </ul>
                  </div>
               </div>
               {previewQuestion?.question_type === 'match_column' && previewQuestion?.options && previewQuestion.options.length > 0 && (
                 <div className="mt-3">
                   <h4 className="font-medium mb-2">Options:</h4>
                   <ul className="space-y-1">
                     {previewQuestion.options.map((opt, idx) => (
                       <li key={idx} className="text-sm pl-4">{opt}</li>
                     ))}
                   </ul>
                 </div>
               )}
              </div>
            )}


            {previewQuestion?.images && previewQuestion.images.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Figures & Diagrams ({previewQuestion.images.length})
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {previewQuestion.images.map((imgUrl, idx) => (
                    <div key={idx} className="border rounded-lg p-2">
                      <img 
                        src={imgUrl} 
                        alt={`Figure ${idx + 1}`}
                        className="max-w-full h-auto rounded mb-2"
                      />
                      {previewQuestion.ocr_text?.[idx] && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            Extracted text from figure
                          </summary>
                          <p className="text-xs mt-1 p-2 bg-gray-50 rounded">
                            {previewQuestion.ocr_text[idx]}
                          </p>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <details className="mt-4">
              <summary className="text-sm cursor-pointer">Quick Edit</summary>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs font-medium">Question Text</label>
                  <Textarea value={previewQuestion?.question_text || ''} onChange={(e) => setPreviewQuestion(prev => prev ? { ...prev, question_text: e.target.value, edited: true } : prev)} />
                </div>
                {previewQuestion?.question_type === 'mcq' && (
                  <div>
                    <label className="text-xs font-medium">Options (one per line)</label>
                    <Textarea value={(previewQuestion?.options || []).join('\n')} onChange={(e) => setPreviewQuestion(prev => prev ? { ...prev, options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean), edited: true } : prev)} />
                  </div>
                )}
                {previewQuestion?.question_type === 'match_column' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium">Column I (one per line)</label>
                      <Textarea value={(previewQuestion?.left_column || []).join('\n')} onChange={(e) => setPreviewQuestion(prev => prev ? { ...prev, left_column: e.target.value.split('\n').map(s => s.trim()).filter(Boolean), edited: true } : prev)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Column II (one per line)</label>
                      <Textarea value={(previewQuestion?.right_column || []).join('\n')} onChange={(e) => setPreviewQuestion(prev => prev ? { ...prev, right_column: e.target.value.split('\n').map(s => s.trim()).filter(Boolean), edited: true } : prev)} />
                    </div>
                  </div>
                )}
                {previewQuestion?.question_type === 'assertion_reason' && (
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="text-xs font-medium">Assertion</label>
                      <Textarea value={previewQuestion?.assertion || ''} onChange={(e) => setPreviewQuestion(prev => prev ? { ...prev, assertion: e.target.value, edited: true } : prev)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Reason</label>
                      <Textarea value={previewQuestion?.reason || ''} onChange={(e) => setPreviewQuestion(prev => prev ? { ...prev, reason: e.target.value, edited: true } : prev)} />
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPreviewQuestion(null)}>Close</Button>
                  <Button size="sm" onClick={() => {
                    if (!previewQuestion) return;
                    setExtractedQuestions(prev => prev.map(q => q.id === previewQuestion.id ? { ...previewQuestion } : q));
                    toast.success('Question updated');
                  }}>Save</Button>
                </div>
              </div>
            </details>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
