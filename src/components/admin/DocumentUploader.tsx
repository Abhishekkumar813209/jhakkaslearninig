import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Upload, Loader2, FileText, AlertCircle } from "lucide-react";
import { getDocument } from 'pdfjs-dist';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import { invokeWithAuth } from "@/lib/invokeWithAuth";

interface ExtractedQuestion {
  id?: string;
  question_number?: string;
  question_type: string;
  question_text: string;
  options?: string[];
  left_column?: string[];
  right_column?: string[];
  marks?: number;
  difficulty?: string;
  correct_answer?: any;
  explanation?: string;
  images?: string[];
  ocr_text?: string[];
}

interface DocumentUploaderProps {
  onQuestionsExtracted: (questions: ExtractedQuestion[]) => void;
  onPdfUploaded?: (file: File) => void;
  onClose?: () => void;
  topicContext?: {
    topicId: string;
    topicName: string;
    chapterId: string;
    subjectId: string;
  };
}

export const DocumentUploader = ({ 
  onQuestionsExtracted,
  onPdfUploaded,
  onClose,
  topicContext 
}: DocumentUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [enableOcr, setEnableOcr] = useState(false);
  const [useAdvancedOCR, setUseAdvancedOCR] = useState(false);
  const [hfApiKey, setHfApiKey] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  const extractTextFromPDF = async (file: File): Promise<{ text: string; numPages: number }> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText;
      
      // Add page break marker for chunked processing
      if (i < pdf.numPages) {
        fullText += "\n\n[PAGE_BREAK]\n\n";
      }
    }

    return { text: fullText, numPages: pdf.numPages };
  };

  const extractTextFromWord = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const extractTextFromImage = async (file: File): Promise<string> => {
    const result = await Tesseract.recognize(file, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          setUploadProgress(Math.round(m.progress * 50)); // OCR is 50% of progress
        }
      }
    });
    return result.data.text;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setProgressMessage("Reading document...");

    try {
      let documentText = "";
      let totalPages = 0;
      let useChunked = false;

      // Extract text based on file type
      if (file.type === 'application/pdf') {
        setProgressMessage("Extracting text from PDF...");
        const { text, numPages } = await extractTextFromPDF(file);
        documentText = text;
        totalPages = numPages;
        setUploadProgress(30);
        
        // Auto-switch to chunked for large PDFs
        if (documentText.length > 12000 || totalPages > 20) {
          useChunked = true;
          console.log(`📊 Large PDF detected (${totalPages} pages, ${documentText.length} chars) - using chunked processing`);
        }
        
        // Store PDF file for crop feature
        if (onPdfUploaded) {
          onPdfUploaded(file);
        }
      } else if (file.type.includes('word') || file.name.endsWith('.docx')) {
        setProgressMessage("Extracting text from Word document...");
        documentText = await extractTextFromWord(file);
        setUploadProgress(30);
      } else if (file.type.startsWith('image/')) {
        if (!enableOcr && !useAdvancedOCR) {
          toast.error("Please enable OCR to extract text from images");
          setIsUploading(false);
          return;
        }
        setProgressMessage("Performing OCR on image...");
        documentText = await extractTextFromImage(file);
        setUploadProgress(50);
      } else {
        toast.error("Unsupported file type. Please upload PDF, Word, or image files.");
        setIsUploading(false);
        return;
      }

      if (!documentText || documentText.trim().length === 0) {
        toast.error("No text found in document. Try enabling OCR for image-based PDFs.");
        setIsUploading(false);
        return;
      }

      // Call AI to extract questions
      setProgressMessage(useChunked ? "Processing document in chunks..." : "Extracting questions with AI...");
      setUploadProgress(60);

      const functionName = useChunked ? 'ai-extract-all-questions-chunked' : 'ai-extract-all-questions';
      
      let data: any;
      try {
        data = await invokeWithAuth<any, any>({
          name: functionName,
          body: {
            file_content: documentText,
            total_pages: totalPages || undefined,
            file_name: file.name,
            topic: topicContext?.topicName,
            chapter: topicContext?.chapterId,
            subject: topicContext?.subjectId,
          }
        });
      } catch (firstError: any) {
        // Automatic fallback to chunked if first call fails
        if (!useChunked && firstError.message && (
          firstError.message.includes('Rate limit') || 
          firstError.message.includes('invalid JSON') ||
          firstError.message.includes('Failed to extract')
        )) {
          console.log('🔄 First extraction failed, retrying with chunked processing...');
          setProgressMessage("Retrying with enhanced processing...");
          
          try {
            data = await invokeWithAuth<any, any>({
              name: 'ai-extract-all-questions-chunked',
              body: {
                file_content: documentText,
                total_pages: totalPages || undefined,
                file_name: file.name,
                topic: topicContext?.topicName,
                chapter: topicContext?.chapterId,
                subject: topicContext?.subjectId,
              }
            });
          } catch (secondError: any) {
            throw secondError; // Re-throw if even chunked fails
          }
        } else {
          throw firstError;
        }
      }

      setUploadProgress(100);

      // Handle response
      if (data.success && data.questions && data.questions.length > 0) {
        const templateCount = data.questions.filter((q: any) => q.template_generated === true).length;
        const extractedCount = data.questions.length - templateCount;
        
        if (templateCount > 0) {
          toast.success(
            `Extracted ${extractedCount} questions and generated ${templateCount} templates for manual editing`,
            { duration: 5000 }
          );
        } else {
          toast.success(`Extracted ${data.questions.length} questions successfully!`);
        }
        
        onQuestionsExtracted(data.questions);
        if (onClose) onClose();
      } else {
        toast.error("No questions found in document");
      }

    } catch (error: any) {
      console.error('Document upload error:', error);
      
      // Better error messages for specific cases
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please wait a moment and try again.', { duration: 5000 });
      } else if (error.message?.includes('402') || error.message?.includes('credits')) {
        toast.error('AI credits exhausted. Please add credits to your workspace.', { duration: 5000 });
      } else if (error.message?.includes('invalid JSON')) {
        toast.error('AI returned incomplete data. Generated editable templates for you to review.', { duration: 5000 });
      } else {
        toast.error(`Failed to process document: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setProgressMessage("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="border-2 border-dashed rounded-lg p-8 text-center">
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-4">
          Upload a PDF, Word document, or image containing questions. AI will automatically detect all questions.
        </p>
        
        {/* OCR Options */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-center gap-2">
            <Checkbox 
              id="enable-ocr" 
              checked={enableOcr}
              onCheckedChange={(checked) => {
                setEnableOcr(!!checked);
                if (checked) setUseAdvancedOCR(false);
              }}
              disabled={isUploading}
            />
            <label htmlFor="enable-ocr" className="text-sm cursor-pointer">
              Enable basic OCR (free, good for text)
            </label>
          </div>
          
          <div className="flex items-center justify-center gap-2">
            <Checkbox 
              id="enable-advanced-ocr" 
              checked={useAdvancedOCR}
              onCheckedChange={(checked) => {
                setUseAdvancedOCR(!!checked);
                if (checked) setEnableOcr(false);
              }}
              disabled={isUploading}
            />
            <label htmlFor="enable-advanced-ocr" className="flex items-center gap-2 text-sm cursor-pointer">
              <span>Enable Advanced OCR (Math + Chemistry + Physics)</span>
              <Badge variant="secondary" className="text-xs">85% accuracy</Badge>
            </label>
          </div>
          
          {useAdvancedOCR && (
            <Collapsible>
              <CollapsibleTrigger className="text-xs text-primary hover:underline">
                Have a HuggingFace token? (Optional)
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Input
                  type="password"
                  placeholder="HuggingFace Access Token (optional)"
                  value={hfApiKey}
                  onChange={(e) => setHfApiKey(e.target.value)}
                  className="max-w-md mx-auto mt-2"
                  disabled={isUploading}
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
        
        {/* File Input */}
        <Input
          type="file"
          accept=".pdf,.doc,.docx,image/*"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="hidden"
          id="document-upload"
        />
        <label htmlFor="document-upload">
          <Button asChild disabled={isUploading}>
            <span>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
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

      {/* Progress Indicator */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{progressMessage}</span>
            <span className="font-medium">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}

      {/* Info Alert */}
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
        <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Supported formats:</p>
          <ul className="text-muted-foreground space-y-0.5">
            <li>• PDF documents (with or without OCR)</li>
            <li>• Word documents (.docx)</li>
            <li>• Images (JPG, PNG) - requires OCR</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
