import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithAuth } from "@/lib/invokeWithAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Loader2, Eye, FileText, CheckCircle2, Search, Filter, Image as ImageIcon, Trash2, Database, Plus, Copy, AlertCircle, ArrowLeft, Edit } from "lucide-react";
import { getDocument } from 'pdfjs-dist';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { LessonPreviewDialog } from "./LessonPreviewDialog";
import { QuestionAnswerInput } from "./QuestionAnswerInput";
import { normalizeChemicalFormula, formatChemicalReaction, preserveChemicalSymbols } from '@/lib/chemistryNotation';
import { normalizeMathNotation, normalizeUnits, preserveMathSymbols } from '@/lib/mathNotation';
import QuestionEditDialog from './QuestionEditDialog';

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
  correct_answer?: any;
  explanation?: string;
}

interface SmartQuestionExtractorProps {
  selectedTopic?: string;
  onQuestionsAdded: (questions: ExtractedQuestion[]) => void;
  // Question Bank Builder integration props
  preloadedQuestions?: ExtractedQuestion[];
  topicId?: string;
  topicName?: string;
  chapterId?: string;
  chapterName?: string;
  subjectName?: string;
  batchId?: string;
  examDomain?: string;
  examName?: string;
  sourceFileName?: string;
  mode?: 'lesson-builder' | 'question-bank' | 'test-builder';
  onBackClick?: () => void;
  // Test Builder mode props
  testId?: string;
  testTitle?: string;
  subject?: string;
  difficulty?: string;
}

export const SmartQuestionExtractor = ({ 
  selectedTopic, 
  onQuestionsAdded,
  preloadedQuestions,
  topicId,
  topicName,
  chapterId,
  chapterName,
  subjectName,
  batchId,
  examDomain,
  examName,
  sourceFileName,
  mode = 'lesson-builder',
  onBackClick,
  testId,
  testTitle,
  subject,
  difficulty
}: SmartQuestionExtractorProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<ExtractedQuestion | null>(null);
  const [previewLesson, setPreviewLesson] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<ExtractedQuestion | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [enableOcr, setEnableOcr] = useState(true);
  const [useMathpix, setUseMathpix] = useState(false);
  const [mathpixApiKey, setMathpixApiKey] = useState('');
  const [mathpixProgress, setMathpixProgress] = useState({ current: 0, total: 0 });
  const [authError, setAuthError] = useState(false);

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

  // Auto-save selectedIds to localStorage with debounce
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('question-extractor-selected');
    return saved ? JSON.parse(saved) : [];
  });
  const [reloadKey, setReloadKey] = useState(0);

  // Save selectedIds whenever it changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('question-extractor-selected', JSON.stringify(selectedIds));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedIds]);

  // Auto-save extractedQuestions whenever it changes (debounced)
  useEffect(() => {
    if (extractedQuestions.length > 0) {
      const timeoutId = setTimeout(() => {
        console.log('📦 Persisting questions to localStorage:', extractedQuestions.length);
        setHasUnsavedChanges(true);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [extractedQuestions, setHasUnsavedChanges]);

  // Initialize with preloaded questions from Question Bank Builder
  useEffect(() => {
    if (mode === 'question-bank' && preloadedQuestions && preloadedQuestions.length > 0) {
      console.log('🔵 Initializing with preloaded questions:', preloadedQuestions.length);
      setExtractedQuestions(preloadedQuestions);
      setSelectedIds(preloadedQuestions.map(q => q.id));
      return;
    }
  }, [preloadedQuestions, mode]);

  // Auto-load questions for selected topic from database
  useEffect(() => {
    const loadTopicQuestions = async () => {
      // Use topicId for question-bank mode, selectedTopic for lesson-builder mode
      const activeTopicId = mode === 'question-bank' ? topicId : selectedTopic;
      
      if (!activeTopicId) {
        setExtractedQuestions([]);
        return;
      }
      
      console.log('🔍 Auto-loading questions for topic:', activeTopicId, 'mode:', mode);
      
      // STEP 1: Clear existing questions immediately
      setExtractedQuestions([]);
      setSelectedIds([]);
      
      // STEP 2: Clear persisted progress to prevent restore of old topic
      clearProgress();
      setHasUnsavedChanges(false);
      
      // STEP 3: Fetch from database
      try {
        setAuthError(false);
        const action = mode === 'question-bank' ? 'get_topic_questions' : 'get_by_topic';
        const data = await invokeWithAuth<any, { success: boolean; questions: any[] }>({
          name: 'topic-questions-api',
          body: {
            action,
            topic_id: activeTopicId
          }
        });
        
        if (data.success && data.questions && data.questions.length > 0) {
          console.log(`✅ Loaded ${data.questions.length} questions from database`);
          
          // Transform DB questions to ExtractedQuestion format
          const transformedQuestions: ExtractedQuestion[] = data.questions.map((q: any, index: number) => {
            // Handle both question_bank and gamified_exercises structures
            const questionData = q.exercise_data || q;
            const questionText = questionData.question || q.question_text || '';
            const questionType = q.exercise_type || q.question_type || 'mcq';
            const options = questionData.options || q.options || [];
            const marks = questionData.marks || q.marks || 1;
            const difficulty = questionData.difficulty || q.difficulty || 'medium';
            const explanation = questionData.explanation || q.explanation || '';
            
            let correctAnswer = questionData.correct_answer ?? q.correct_answer;
            
            // Parse correct_answer if it's still JSONB object (defensive check)
            if (questionType === 'mcq' && typeof correctAnswer === 'object' && correctAnswer !== null) {
              correctAnswer = correctAnswer.value ?? correctAnswer.index ?? 0;
            }
            
            return {
              id: q.id,
              question_number: String(index + 1),
              question_type: questionType,
              question_text: questionText,
              options: options,
              marks: marks,
              difficulty: difficulty,
              correct_answer: correctAnswer,
              explanation: explanation,
              auto_corrected: q.is_approved || false,
              confidence: q.is_approved ? 'high' : 'medium'
            };
          });
          
          setExtractedQuestions(transformedQuestions);
          toast.success(`Loaded ${transformedQuestions.length} questions for this topic`);
        } else {
          console.log('ℹ️ No existing questions found for this topic');
          toast.info('No existing questions for this topic. Upload a PDF to extract questions.');
        }
      } catch (error: any) {
        console.error('❌ Error loading topic questions:', error);
        if (error.code === 401) {
          setAuthError(true);
        } else {
          toast.error('Failed to load existing questions: ' + error.message);
        }
      }
    };
    
    loadTopicQuestions();
  }, [selectedTopic, topicId, mode, reloadKey]);

  // Show restore toast on mount if data exists
  useEffect(() => {
    if (extractedQuestions.length > 0) {
      console.log('✅ Restored questions from localStorage:', extractedQuestions.length);
      toast.success(`Restored ${extractedQuestions.length} questions from previous session`, {
        description: `${selectedIds.length} questions were selected`,
        duration: 5000
      });
    }
  }, []);

  // Debug: Log when component mounts/unmounts
  useEffect(() => {
    console.log('🔵 SmartQuestionExtractor mounted with', extractedQuestions.length, 'questions');
    return () => {
      console.log('🔴 SmartQuestionExtractor unmounting, saved', extractedQuestions.length, 'questions to localStorage');
    };
  }, []);

  // Force save to localStorage when unmounting (tab switch protection)
  useEffect(() => {
    return () => {
      if (extractedQuestions.length > 0) {
        console.log('🔴 Force saving on unmount:', extractedQuestions.length);
        const persistedData = {
          data: extractedQuestions,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem('smart-question-extractor-questions', JSON.stringify(persistedData));
        localStorage.setItem('question-extractor-selected', JSON.stringify(selectedIds));
      }
    };
  }, [extractedQuestions, selectedIds]);

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

  // Copy cURL for debugging
  const copyCurl = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Not authenticated. Please log in first');
        return;
      }

      const curl = `curl -X POST "https://qajmtfcphpncqwcrzphm.supabase.co/functions/v1/topic-questions-api" \\
  -H "Authorization: Bearer ${session.access_token}" \\
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFham10ZmNwaHBuY3F3Y3J6cGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMDM3MTEsImV4cCI6MjA3MzU3OTcxMX0.VzMpGU85jw4OQZmKVYfH3M5NquhV5YMuFGzlzOU6v6s" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"get_by_topic","topic_id":"${selectedTopic || 'YOUR_TOPIC_ID'}"}'`;

      await navigator.clipboard.writeText(curl);
      toast.success('cURL copied! Paste in terminal to debug');
    } catch (error) {
      toast.error('Failed to copy cURL command');
    }
  };

  // Helper: Convert ExtractedQuestion to Lesson for preview
  const convertQuestionToLesson = (q: ExtractedQuestion): any => {
    let gameType = 'mcq';
    let gameData: any = {};
    
    switch(q.question_type) {
      case 'mcq':
        gameType = 'mcq';
        gameData = {
          question: q.question_text,
          options: q.options || [],
          correct_answer: 0, // Can be enhanced with AI detection
          explanation: "Check your textbook for detailed explanation",
          difficulty: q.difficulty,
          marks: q.marks
        };
        break;
        
      case 'match_column':
        gameType = 'match_pairs';
        gameData = {
          pairs: (q.left_column || []).map((left, idx) => ({
            id: `pair_${idx}`,
            left,
            right: q.right_column?.[idx] || ''
          })),
          max_attempts: 10,
          time_limit: 120
        };
        break;

      case 'fill_blank':
        gameType = 'fill_blanks';
        gameData = {
          text: q.question_text,
          blanks_count: q.blanks_count || 1,
          difficulty: q.difficulty || 'medium'
        };
        break;
        
      case 'true_false':
        gameType = 'mcq';
        gameData = {
          question: q.question_text,
          options: ['True', 'False'],
          correct_answer: 0,
          explanation: "Review the concept in your textbook",
          difficulty: q.difficulty || 'easy'
        };
        break;
        
      case 'assertion_reason':
        gameType = 'mcq';
        gameData = {
          question: `Assertion (A): ${q.assertion}\n\nReason (R): ${q.reason}`,
          options: [
            'Both A and R are true, R is correct explanation of A',
            'Both A and R are true, R is not correct explanation of A',
            'A is true, R is false',
            'A is false, R is true'
          ],
          correct_answer: 0,
          explanation: "Analyze both statements carefully",
          difficulty: q.difficulty || 'medium'
        };
        break;
        
      default:
        gameType = 'mcq';
        gameData = {
          question: q.question_text,
          options: q.options || ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
          correct_answer: 0,
          explanation: "Review this topic",
          difficulty: q.difficulty || 'medium'
        };
    }
    
    return {
      id: 'preview',
      topic_id: selectedTopic || 'preview',
      lesson_type: 'game',
      game_type: gameType,
      game_data: gameData,
      content_order: 1,
      estimated_time_minutes: 5,
      xp_reward: q.marks || 1,
      generated_by: 'extractor',
      human_reviewed: false
    };
  };

  // Apply chemistry and math notation normalization
  const applyNotationNormalization = (text: string): string => {
    let normalized = text;
    
    // Preserve Unicode symbols first
    normalized = preserveChemicalSymbols(normalized);
    normalized = preserveMathSymbols(normalized);
    
    // Detect and normalize chemical formulas - common patterns
    const chemPatterns = [
      /H2O/g, /CO2/g, /H2SO4/g, /NaOH/g, /HCl/g, /NH3/g, /CH4/g,
      /Ca\(OH\)2/g, /Mg\(OH\)2/g, /Al2O3/g, /Fe2O3/g, /CaCO3/g
    ];
    
    chemPatterns.forEach(pattern => {
      normalized = normalized.replace(pattern, (match) => normalizeChemicalFormula(match));
    });
    
    // Normalize chemical reactions with arrows
    if (normalized.includes('->') || normalized.includes('→') || normalized.includes('=')) {
      // Split by potential reaction boundaries and format each
      const parts = normalized.split(/\n/);
      normalized = parts.map(line => {
        if ((line.includes('->') || line.includes('→') || /\s=\s/.test(line)) && /[A-Z][a-z]?\d/.test(line)) {
          return formatChemicalReaction(line);
        }
        return line;
      }).join('\n');
    }
    
    // Normalize math notation
    normalized = normalizeMathNotation(normalized);
    normalized = normalizeUnits(normalized);
    
    return normalized;
  };

  // Enhanced text extraction with notation preservation
  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 50); // Limit to 50 pages
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Enhanced text extraction with position tracking
      const pageText = textContent.items.map((item: any, index: number) => {
        if (!item.str) return '';
        
        let text = item.str;
        
        // Detect subscript/superscript based on font size
        const fontSize = item.transform?.[0] || 12;
        const prevItem = textContent.items[index - 1] as any;
        
        if (prevItem && prevItem.transform) {
          const prevFontSize = prevItem.transform[0];
          const sizeRatio = fontSize / prevFontSize;
          
          // Smaller text might be subscript/superscript
          if (sizeRatio < 0.75 && /^\d+$/.test(text)) {
            const yPos = item.transform?.[5] || 0;
            const prevYPos = prevItem.transform[5];
            
            if (yPos < prevYPos - 2) {
              return `_{${text}}`; // Subscript
            } else if (yPos > prevYPos + 2) {
              return `^{${text}}`; // Superscript
            }
          }
        }
        
        return text;
      }).join(' ');
      
      fullText += `\n--- PAGE ${i} ---\n${pageText}\n`;
    }
    
    // Apply notation normalization
    fullText = applyNotationNormalization(fullText);
    
    return fullText;
  };

  // Extract rich content from Word documents with enhanced notation
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
    
    // Run OCR on images if enabled
    const ocrResults: Map<string, string> = new Map();
    const mathpixResults: Map<string, { text: string; latex: string }> = new Map();
    
    if (imageDataUrls.length > 0) {
      // Option 1: High-Accuracy Math OCR (Mathpix)
      if (useMathpix) {
        console.log(`🧮 Running Mathpix OCR on ${imageDataUrls.length} images...`);
        toast.info(`Running high-accuracy math OCR...`, { duration: 10000 });
        
        setMathpixProgress({ current: 0, total: imageDataUrls.length });
        
        // Process in batches of 10 (API rate limit)
        for (let i = 0; i < imageDataUrls.length; i += 10) {
          const batch = imageDataUrls.slice(i, i + 10);
          const batchIds = imageIds.slice(i, i + 10);
          
          setMathpixProgress({ current: i, total: imageDataUrls.length });
          
          try {
            const { data, error } = await supabase.functions.invoke('mathpix-ocr', {
              body: { 
                images: batch.map((url, idx) => ({ id: batchIds[idx], dataUrl: url })),
                apiKey: mathpixApiKey || undefined
              }
            });
            
            if (error) {
              console.error('Mathpix batch error:', error);
              toast.error(`Mathpix API error: ${error.message}. Falling back to basic OCR...`);
              // Fallback to Tesseract for this batch
              for (let j = 0; j < batch.length; j++) {
                try {
                  const { data: { text } } = await Tesseract.recognize(batch[j], 'eng', {
                    logger: () => {}
                  });
                  ocrResults.set(batchIds[j], text.trim());
                } catch (err) {
                  console.warn(`Tesseract fallback failed for ${batchIds[j]}`);
                }
              }
              continue;
            }
            
            data.results.forEach((result: any) => {
              mathpixResults.set(result.id, {
                text: result.text,
                latex: result.latex
              });
              ocrResults.set(result.id, result.text);
            });
            
          } catch (error) {
            console.error('Mathpix batch error:', error);
            toast.error(`Failed to process images ${i+1}-${i+batch.length}`);
          }
          
          // Rate limit delay
          if (i + 10 < imageDataUrls.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        setMathpixProgress({ current: imageDataUrls.length, total: imageDataUrls.length });
        console.log(`✅ Mathpix OCR complete: ${mathpixResults.size}/${imageDataUrls.length}`);
        toast.success(`High-accuracy OCR complete! ${mathpixResults.size} images processed`);
        
      } 
      // Option 2: Basic OCR (Tesseract)
      else if (enableOcr) {
        console.log(`🔍 Running Tesseract OCR on ${imageDataUrls.length} images...`);
        toast.info(`Running OCR on ${imageDataUrls.length} images...`, { duration: 5000 });
        
        for (let i = 0; i < imageDataUrls.length; i += 2) {
          const batch = imageDataUrls.slice(i, i + 2);
          const batchIds = imageIds.slice(i, i + 2);
          
          console.log(`OCR Progress: ${i + 1}-${Math.min(i + batch.length, imageDataUrls.length)}/${imageDataUrls.length}`);
          
          const ocrPromises = batch.map(async (dataUrl, idx) => {
            try {
              const { data: { text } } = await Tesseract.recognize(dataUrl, 'eng', {
                logger: () => {}
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
    }
    
    // Build global imageId -> {url, ocr, latex} map for later figure-to-question mapping
    const __imageIdMap: Record<string, { url: string; ocr?: string; latex?: string }> = {};
    imageIds.forEach((id, idx) => {
      const mathpixData = mathpixResults.get(id);
      __imageIdMap[id] = { 
        url: imageDataUrls[idx], 
        ocr: ocrResults.get(id) || undefined,
        latex: mathpixData?.latex || undefined
      };
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

  // Map figures to questions using position-aware two-pass algorithm
  const mapFiguresToQuestions = (enhanced: string) => {
    const imageIdMap: Record<string, { url: string; ocr?: string }> = (window as any).__imageIdMap || {};
    const imagesByQuestion: Record<string, Array<{ url: string; ocr?: string }>> = {};
    const lines = enhanced.split(/\r?\n/);
    
    const figureRegex = /^\s*\[FIGURE\s+id=(img_\d+)\]\s*$/i;
    const qRegex = /^\s*\[QUESTION_(\d+)\]\s*$/i;
    
    // Constants for proximity thresholds
    const PREV_WITHIN = 8;  // Max lines to look back for a question
    const NEXT_WITHIN = 5;  // Max lines to look forward for a question
    
    // PASS 1: Collect all questions and figures with their line indices
    const questions: Array<{ num: string; index: number }> = [];
    const figures: Array<{ id: string; index: number }> = [];
    
    lines.forEach((line, index) => {
      const qm = line.match(qRegex);
      if (qm) {
        questions.push({ num: qm[1], index });
      }
      const fm = line.match(figureRegex);
      if (fm) {
        figures.push({ id: fm[1], index });
      }
    });
    
    console.log('📊 Pass 1: Collected', { 
      total_questions: questions.length,
      total_figures: figures.length,
      questions: questions.map(q => `Q${q.num}@L${q.index}`).join(', '),
      figures: figures.map(f => `${f.id}@L${f.index}`).join(', ')
    });
    
    // PASS 2: For each figure, find the nearest question
    const linkDecisions: string[] = [];
    let linkedCount = 0;
    const unlinkedFigures: string[] = [];
    
    figures.forEach(fig => {
      const img = imageIdMap[fig.id];
      if (!img) {
        console.warn(`⚠️ Figure ${fig.id} not in imageIdMap`);
        return;
      }
      
      // Find nearest previous question within threshold
      let bestPrev: { num: string; distance: number } | null = null;
      for (let i = questions.length - 1; i >= 0; i--) {
        const q = questions[i];
        if (q.index < fig.index) {
          const distance = fig.index - q.index;
          if (distance <= PREV_WITHIN) {
            bestPrev = { num: q.num, distance };
            break; // Found the closest previous question
          }
        }
      }
      
      // Find nearest next question within threshold
      let bestNext: { num: string; distance: number } | null = null;
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (q.index > fig.index) {
          const distance = q.index - fig.index;
          if (distance <= NEXT_WITHIN) {
            bestNext = { num: q.num, distance };
            break; // Found the closest next question
          }
        }
      }
      
      // Decide which question to link to
      let linkedTo: string | null = null;
      if (bestPrev) {
        linkedTo = bestPrev.num;
        linkDecisions.push(`${fig.id} → Q${linkedTo} (prev, +${bestPrev.distance} lines)`);
      } else if (bestNext) {
        linkedTo = bestNext.num;
        linkDecisions.push(`${fig.id} → Q${linkedTo} (next, -${bestNext.distance} lines)`);
      } else {
        linkDecisions.push(`${fig.id} → UNLINKED (no question within range)`);
        unlinkedFigures.push(fig.id);
      }
      
      // Store in imagesByQuestion using normalized key
      if (linkedTo) {
        imagesByQuestion[linkedTo] = imagesByQuestion[linkedTo] || [];
        imagesByQuestion[linkedTo].push({ url: img.url, ocr: img.ocr });
        linkedCount++;
      }
    });
    
    (window as any).__questionImages = imagesByQuestion;
    
    console.log('🔗 Link decisions:', linkDecisions.join(' | '));
    console.log('🧩 Figure mapping complete:', { 
      questions_with_figures: Object.keys(imagesByQuestion).length, 
      total_figures_linked: linkedCount,
      total_figures_unlinked: unlinkedFigures.length,
      unlinked_ids: unlinkedFigures.join(', '),
      mapping: Object.entries(imagesByQuestion).map(([q, imgs]) => `Q${q}: ${imgs.length} img(s)`).join(', ')
    });
    
    return { imagesByQuestion, linkedCount, totalFigures: figures.length };
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
      const mappingResult = mapFiguresToQuestions(enhancedContent);
      const { linkedCount, totalFigures } = mappingResult;
      
      if (totalFigures > 0) {
        if (linkedCount === 0) {
          toast.message('Figures detected but not linked to any question. OCR text added where possible.');
        } else if (linkedCount < totalFigures) {
          toast.success(`Linked ${linkedCount}/${totalFigures} figures to questions. Some figures remained unlinked; OCR text added where possible.`);
        } else {
          toast.success(`Successfully linked all ${linkedCount} figures to questions!`);
        }
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

      // APPEND instead of REPLACE to allow multi-upload
      setExtractedQuestions(prev => [...prev, ...questionsWithIds]);
      setHasUnsavedChanges(true);
      
      const totalNow = extractedQuestions.length + questionsWithIds.length;
      if (extractedQuestions.length > 0) {
        toast.success(`Added ${data.total_questions} more questions! Total: ${totalNow}`);
      } else {
        toast.success(`Found ${data.total_questions} questions! Select and add answers.`);
      }

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

  const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const questionToDelete = extractedQuestions.find(q => q.id === questionId);
      if (questionToDelete && isUUID(questionToDelete.id)) {
        if (mode === 'question-bank') {
          const { error } = await supabase.from('question_bank').delete().eq('id', questionId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('gamified_exercises').delete().eq('id', questionId);
          if (error) throw error;
        }
      }
      // Update local state with re-numbering
      setExtractedQuestions(prev => {
        const filtered = prev.filter(q => q.id !== questionId);
        return filtered.map((q, idx) => ({ ...q, question_number: String(idx + 1) }));
      });
      setSelectedIds(prev => prev.filter(id => id !== questionId));
      toast.success('Question deleted');
      setReloadKey((k) => k + 1);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete question');
    }
  };

  const handleUpdateAnswer = async (questionId: string, answer: any) => {
    // Update local state immediately for responsiveness
    setExtractedQuestions(prev => prev.map(q => 
      q.id === questionId ? { ...q, correct_answer: answer } : q
    ));
    
    // Update in database if question exists
    try {
      const questionToUpdate = extractedQuestions.find(q => q.id === questionId);
      if (questionToUpdate && isUUID(questionToUpdate.id)) {
        await invokeWithAuth({
          name: 'topic-questions-api',
          body: {
            action: 'update_question_answer',
            question_id: questionId,
            question_type: questionToUpdate.question_type,
            options: questionToUpdate.options || null,
            correct_answer: answer,
            explanation: questionToUpdate.explanation || null
          }
        });
        
        toast.success('Answer saved to database');
        setReloadKey((k) => k + 1);
      }
    } catch (error) {
      console.error('Error updating answer in database:', error);
      toast.error('Failed to save answer to database');
    }
  };

  const handleSaveEditedQuestion = (updatedQuestion: ExtractedQuestion) => {
    setExtractedQuestions(prev =>
      prev.map(q => q.id === updatedQuestion.id ? updatedQuestion : q)
    );
    
    // Also update in database if question exists
    const isDbQuestion = isUUID(updatedQuestion.id);
    if (isDbQuestion) {
      invokeWithAuth({
        name: 'topic-questions-api',
        body: {
          action: 'update_full_question',
          question_id: updatedQuestion.id,
          question_text: updatedQuestion.question_text,
          question_type: updatedQuestion.question_type,
          options: updatedQuestion.options,
          left_column: updatedQuestion.left_column,
          right_column: updatedQuestion.right_column,
          assertion: updatedQuestion.assertion,
          reason: updatedQuestion.reason,
          blanks_count: updatedQuestion.blanks_count,
          marks: updatedQuestion.marks,
          difficulty: updatedQuestion.difficulty,
          correct_answer: updatedQuestion.correct_answer,
          explanation: updatedQuestion.explanation
        }
      })
        .then(() => {
          toast.success('Question updated in database');
          setReloadKey((k) => k + 1);
        })
        .catch((error) => {
          console.error('Error updating question:', error);
          toast.error('Failed to update question in database');
        });
    }
  };

  const validateAnswer = (question: ExtractedQuestion): boolean => {
    const answer = question.correct_answer;
    switch (question.question_type) {
      case 'mcq':
      case 'assertion_reason':
        return typeof answer?.index === 'number' && answer.index >= 0;
      case 'true_false':
        return typeof answer?.value === 'boolean';
      case 'fill_blank':
        return !!answer?.text && answer.text.trim().length > 0;
      case 'match_column':
        return Array.isArray(answer?.pairs) && answer.pairs.length > 0;
      case 'short_answer':
        return true; // Short answer doesn't need validation
      default:
        return false;
    }
  };

  const handleSaveToDatabase = async () => {
    const selected = extractedQuestions.filter(q => selectedIds.includes(q.id));
    if (selected.length === 0) {
      toast.error("Please select at least one question");
      return;
    }

    // For test-builder mode, directly call parent callback
    if (mode === 'test-builder') {
      onQuestionsAdded(selected);
      return;
    }

    // For Question Bank mode, allow saving without answers (admin can fill later)
    if (mode === 'lesson-builder') {
      // Check if all selected questions have valid answers
      const invalidQuestions = selected.filter(q => !validateAnswer(q));
      if (invalidQuestions.length > 0) {
        toast.error(`${invalidQuestions.length} question(s) missing correct answers. Please provide answers for all selected questions.`);
        return;
      }
    }

    try {
      if (mode === 'question-bank') {
        // Save to question_bank table with topic metadata
        const { data: user } = await supabase.auth.getUser();
        
        const questionsToSave = selected.map(q => ({
          topic_id: topicId,
          chapter_id: chapterId,
          subject: subjectName,
          batch_id: batchId,
          exam_domain: examDomain,
          exam_name: examName,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options || null,
          correct_answer: q.correct_answer || null,
          explanation: q.explanation || null,
          marks: q.marks || 1,
          difficulty: q.difficulty || 'medium',
          is_published: false,
          created_by: user.user?.id,
          source_file_name: sourceFileName || 'uploaded'
        }));

        const { data, error } = await supabase
          .from("question_bank")
          .insert(questionsToSave)
          .select();

        if (error) throw error;

        toast.success(`✅ Saved ${data.length} questions to Question Bank!`, {
          description: `Topic: ${topicName} • Chapter: ${chapterName} • Subject: ${subjectName}`
        });
        
        // Clear session after successful save
        clearProgress();
        setExtractedQuestions([]);
        setSelectedIds([]);
        
        // Notify parent component
        onQuestionsAdded(selected);
        
      } else {
        // Lesson Builder mode - use topic-questions-api
        const data = await invokeWithAuth<any, { success: boolean; count: number; mappings_created: number; exercises_created: number }>({
          name: 'topic-questions-api',
          body: {
            action: 'save_extracted_and_link',
            topic_id: selectedTopic,
            subject: 'General',
            chapter_name: null,
            topic_name: selectedTopic || null,
            questions: selected,
          },
        });

        if (!data.success) {
          throw new Error('Failed to save questions');
        }

        toast.success(`✅ Saved ${data.count} questions to database!`, {
          description: `${data.mappings_created} linked to topic, ${data.exercises_created} games created`
        });
        
        // Questions stay in UI for lesson builder
      }
      
    } catch (error: any) {
      console.error('❌ Save error:', error);
      if (error.code === 401) {
        toast.error(error.message || "Please log in to save questions");
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to save questions');
      }
    }
  };

  const handleUploadMore = () => {
    // Don't clear, just allow adding more
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        await handleFileUpload({ target: { files: [file] } } as any);
      }
    };
    input.click();
  };

  const handleAddToGames = () => {
    const selected = extractedQuestions.filter(q => selectedIds.includes(q.id));
    if (selected.length === 0) {
      toast.error("Please select at least one question");
      return;
    }

    // Check if all selected questions have valid answers
    const invalidQuestions = selected.filter(q => !validateAnswer(q));
    if (invalidQuestions.length > 0) {
      toast.error(`${invalidQuestions.length} question(s) missing correct answers. Please provide answers before adding.`);
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
      {/* Auth Error Alert */}
      {authError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Please log in to load or save questions</span>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Debug cURL button - only show when topic selected */}
      {selectedTopic && !authError && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={copyCurl}>
            <Copy className="h-4 w-4 mr-2" />
            Copy cURL (Debug)
          </Button>
        </div>
      )}

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

      {/* Test Builder Mode Alert */}
      {mode === 'test-builder' && testTitle && (
        <Alert className="mb-4 bg-primary/5 border-primary/20">
          <FileText className="h-4 w-4" />
          <AlertTitle>Test Builder Mode</AlertTitle>
          <AlertDescription>
            Adding questions to test: <strong>{testTitle}</strong>
            <br />
            Subject: {subject} | Difficulty: {difficulty}
          </AlertDescription>
        </Alert>
      )}

      {/* Back Navigation for Question Bank Mode */}
      {mode === 'question-bank' && onBackClick && (
        <Button 
          variant="outline" 
          onClick={onBackClick}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Topic Selection
        </Button>
      )}

      {/* Upload Section - hide if in question-bank mode with preloaded questions */}
      {extractedQuestions.length === 0 && !authError && !(mode === 'question-bank' && preloadedQuestions) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload PDF/Word Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Data Persistence Info */}
            {savedProgress && savedProgress.length > 0 && (
              <Alert className="mb-4 bg-blue-50 border-blue-200">
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-sm">
                    💾 You have {savedProgress.length} questions from a previous session
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resumeProgress}
                    className="ml-2"
                  >
                    Restore
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Upload a PDF or Word document containing questions. AI will automatically detect all questions and their types.
              </p>
              
              <div className="space-y-3 mb-4">
                {/* Tesseract OCR Toggle */}
                <div className="flex items-center justify-center gap-2">
                  <Checkbox 
                    id="enable-ocr" 
                    checked={enableOcr}
                    onCheckedChange={(checked) => {
                      setEnableOcr(!!checked);
                      if (checked) setUseMathpix(false);
                    }}
                  />
                  <label htmlFor="enable-ocr" className="text-sm cursor-pointer">
                    Enable basic OCR (free, good for text)
                  </label>
                </div>
                
                {/* Mathpix Toggle */}
                <div className="flex items-center justify-center gap-2">
                  <Checkbox 
                    id="enable-mathpix" 
                    checked={useMathpix}
                    onCheckedChange={(checked) => {
                      setUseMathpix(!!checked);
                      if (checked) setEnableOcr(false);
                    }}
                  />
                  <label htmlFor="enable-mathpix" className="flex items-center gap-2 text-sm cursor-pointer">
                    <span>Enable High-Accuracy Math OCR</span>
                    <Badge variant="secondary" className="text-xs">99% accuracy on equations</Badge>
                    <span className="text-xs text-muted-foreground">
                      (~$0.004/image)
                    </span>
                  </label>
                </div>
                
                {/* Mathpix API Key Input */}
                {useMathpix && (
                  <Input
                    type="password"
                    placeholder="Mathpix API Key (optional - uses default if empty)"
                    value={mathpixApiKey}
                    onChange={(e) => setMathpixApiKey(e.target.value)}
                    className="max-w-md mx-auto"
                  />
                )}
              </div>
              
              <Input
                type="file"
                accept=".pdf,.doc,.docx,image/*"
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

      {/* Mathpix OCR Progress */}
      {useMathpix && mathpixProgress.total > 0 && mathpixProgress.current < mathpixProgress.total && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  🧮 Processing images with Mathpix ({mathpixProgress.current}/{mathpixProgress.total})
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round((mathpixProgress.current / mathpixProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${(mathpixProgress.current / mathpixProgress.total) * 100}%` }}
                />
              </div>
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
                <div className="flex items-center gap-3">
                  <span>Found {extractedQuestions.length} questions • Selected {selectedIds.length}</span>
                  {hasUnsavedChanges && (
                    <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                      💾 Auto-saved
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleUploadMore}>
                    <Plus className="h-4 w-4 mr-1" />
                    Upload More PDFs
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete all extracted questions? This cannot be undone.')) {
                        setExtractedQuestions([]);
                        setSelectedIds([]);
                        clearProgress();
                        toast.success('All questions cleared');
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                  {selectedIds.length > 0 && (
                    <Button variant="default" size="sm" onClick={handleSaveToDatabase}>
                      <Database className="h-4 w-4 mr-1" />
                      {mode === 'test-builder' ? 'Add to Test' : 'Save to Database'} ({selectedIds.length})
                    </Button>
                  )}
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
                    <div className="flex-1 min-w-0">
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
                        {/* Warning badges for incomplete data */}
                        {question.question_type === 'mcq' && (!question.options || question.options.length < 2) && (
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 text-xs">
                            ⚠️ Missing options
                          </Badge>
                        )}
                        {question.question_text.length < 20 && (
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 text-xs">
                            ⚠️ Incomplete text
                          </Badge>
                        )}
                        {question.images && question.images.length > 0 && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            {question.images.length} image{question.images.length > 1 ? 's' : ''}
                            {question.ocr_text?.some(ocr => ocr.includes('\\')) && (
                              <span className="ml-1 text-green-600">• LaTeX</span>
                            )}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Q{question.question_number} • {question.marks || 1} Marks | {question.marks || 1} XP
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteQuestion(question.id);
                      }}
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm line-clamp-3 mb-3">
                    {question.question_text}
                  </p>
                  
                  {/* Correct Answer Input */}
                  <div className="mb-4 border-t pt-3">
                    <QuestionAnswerInput
                      questionType={question.question_type}
                      options={question.options}
                      leftColumn={question.left_column}
                      rightColumn={question.right_column}
                      currentAnswer={question.correct_answer}
                      onChange={(answer) => handleUpdateAnswer(question.id, answer)}
                      blanksCount={question.blanks_count}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingQuestion(question);
                        setShowEditDialog(true);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1" onClick={(e) => e.stopPropagation()}>
                          <Eye className="h-3 w-3 mr-1" />
                          View Full
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Question {question.question_number}</DialogTitle>
                          <DialogDescription>
                            {getQuestionTypeLabel(question.question_type)} • {question.marks || 1} marks • {question.difficulty || 'medium'}
                          </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="max-h-[60vh] overflow-y-auto">
                          <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words p-4">
                            {question.question_text}
                          </div>
                          {question.options && (
                            <div className="mt-4 space-y-2 p-4">
                              <p className="font-semibold text-sm text-muted-foreground mb-2">Options:</p>
                              {question.options.map((opt, idx) => (
                                <div key={idx} className="p-3 border rounded-md bg-muted/30">
                                  <span className="font-semibold">{String.fromCharCode(65 + idx)}.</span> {opt}
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        const lesson = convertQuestionToLesson(question);
                        setPreviewLesson(lesson);
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Bar with Clear Session Option */}
          {selectedIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
              <Card className="shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">{selectedIds.length} selected</span>
                    </div>
                    {mode === 'question-bank' ? (
                      <Button onClick={handleSaveToDatabase} size="lg">
                        <Database className="h-4 w-4 mr-2" />
                        Save to Question Bank ({selectedIds.length})
                      </Button>
                    ) : mode === 'test-builder' ? (
                      <Button onClick={handleSaveToDatabase} size="lg">
                        <Database className="h-4 w-4 mr-2" />
                        Add to Test ({selectedIds.length})
                      </Button>
                    ) : (
                      <Button onClick={handleAddToGames} size="lg">
                        Add to Lesson Builder ({selectedIds.length})
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        clearProgress();
                        setExtractedQuestions([]);
                        setSelectedIds([]);
                        toast.success('Session cleared');
                      }}
                    >
                      Clear Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Lesson Preview Dialog - Student View */}
      <LessonPreviewDialog
        lesson={previewLesson}
        open={!!previewLesson}
        onOpenChange={(open) => !open && setPreviewLesson(null)}
      />

      {/* Preview Dialog - Details View */}
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
                <Badge variant="outline" className="bg-primary/10">
                  {previewQuestion?.marks || 1} Marks | {previewQuestion?.marks || 1} XP
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

      {/* Question Edit Dialog */}
      <QuestionEditDialog
        question={editingQuestion}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={handleSaveEditedQuestion}
      />
    </div>
  );
};
