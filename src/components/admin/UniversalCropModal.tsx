import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Canvas as FabricCanvas, Rect } from 'fabric';
import { Loader2, Upload, ChevronLeft, ChevronRight, Crop, ZoomIn, ZoomOut, Check, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
// @ts-ignore
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
// @ts-ignore
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  try {
    const workerInstance = new (PdfWorker as any)();
    (pdfjsLib as any).GlobalWorkerOptions.workerPort = workerInstance;
  } catch (e) {
    console.warn('PDF.js workerPort init failed, falling back to workerSrc', e);
  }
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;
}

interface UniversalCropModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropComplete: (extractedData: {
    question_text?: string;
    options?: string[];
    imageData?: string;
    raw_text?: string;
  }) => void;
  currentQuestion?: {
    id?: string;
    question_text?: string;
    question_type?: string;
  };
  contextLabel?: string;
  pdfFile?: File | null;
}

export const UniversalCropModal: React.FC<UniversalCropModalProps> = ({
  open,
  onOpenChange,
  onCropComplete,
  currentQuestion,
  contextLabel,
  pdfFile: initialPdfFile,
}) => {
  const [pdfFile, setPdfFile] = useState<File | null>(initialPdfFile || null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const cropRectRef = useRef<Rect | null>(null);
  const pageCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialPdfFile) {
      setPdfFile(initialPdfFile);
      loadPDF(initialPdfFile);
    }
  }, [initialPdfFile]);

  useEffect(() => {
    if (open && pdfFile && !pdfDoc) {
      loadPDF(pdfFile);
    }
  }, [open, pdfFile]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage();
    }
  }, [pdfDoc, currentPage, scale]);

  const loadPDF = async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      toast.error('Please select a valid PDF file');
      return;
    }

    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      
      toast.success(`PDF loaded: ${pdf.numPages} pages`);
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Failed to load PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPage = async () => {
    if (!pdfDoc || !baseCanvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      
      const canvas = baseCanvasRef.current;
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context as any,
        viewport: viewport,
      } as any;

      await page.render(renderContext).promise;
      
      if (pageCanvasRef.current) {
        pageCanvasRef.current.width = canvas.width;
        pageCanvasRef.current.height = canvas.height;
        const pageCtx = pageCanvasRef.current.getContext('2d');
        pageCtx?.drawImage(canvas, 0, 0);
      }

      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = canvas.width;
        overlayCanvasRef.current.height = canvas.height;
      }
    } catch (error) {
      console.error('Error rendering page:', error);
      toast.error('Failed to render page');
    }
  };

  const initializeCropCanvas = () => {
    if (!overlayCanvasRef.current || fabricCanvasRef.current) return;

    if (baseCanvasRef.current) {
      const w = baseCanvasRef.current.width;
      const h = baseCanvasRef.current.height;
      overlayCanvasRef.current.width = w;
      overlayCanvasRef.current.height = h;
    }

    const fabricCanvas = new FabricCanvas(overlayCanvasRef.current as HTMLCanvasElement, {
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: 'transparent',
    } as any);

    fabricCanvasRef.current = fabricCanvas as any;

    const cropRect = new Rect({
      left: 100,
      top: 100,
      width: 400,
      height: 80,
      fill: 'rgba(34, 197, 94, 0.1)',
      stroke: '#22c55e',
      strokeWidth: 3,
      strokeDashArray: [10, 5],
      cornerColor: '#22c55e',
      cornerSize: 14,
      cornerStyle: 'circle',
      transparentCorners: false,
      hasRotatingPoint: false,
      lockRotation: true,
    } as any);

    fabricCanvas.add(cropRect as any);
    cropRectRef.current = cropRect as any;
    (fabricCanvas as any).setActiveObject(cropRect);
    fabricCanvas.requestRenderAll();
  };

  const toggleCropMode = () => {
    const newCropMode = !isCropMode;
    setIsCropMode(newCropMode);
    
    if (newCropMode) {
      initializeCropCanvas();
    } else {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
        cropRectRef.current = null;
      }
    }
  };

  const extractCroppedText = async () => {
    if (!cropRectRef.current || !pageCanvasRef.current) {
      toast.error('No crop area selected');
      return;
    }

    setIsExtracting(true);

    try {
      const cropRect = cropRectRef.current;
      const sourceCanvas = pageCanvasRef.current;
      
      const croppedCanvas = document.createElement('canvas');
      const ctx = croppedCanvas.getContext('2d');
      
      croppedCanvas.width = cropRect.width! * cropRect.scaleX!;
      croppedCanvas.height = cropRect.height! * cropRect.scaleY!;
      
      ctx?.drawImage(
        sourceCanvas,
        cropRect.left!,
        cropRect.top!,
        cropRect.width! * cropRect.scaleX!,
        cropRect.height! * cropRect.scaleY!,
        0,
        0,
        croppedCanvas.width,
        croppedCanvas.height
      );

      // Preprocess image for better OCR
      const preprocessedCanvas = document.createElement('canvas');
      const pCtx = preprocessedCanvas.getContext('2d');
      preprocessedCanvas.width = croppedCanvas.width;
      preprocessedCanvas.height = croppedCanvas.height;
      
      pCtx?.drawImage(croppedCanvas, 0, 0);
      const imageData = pCtx?.getImageData(0, 0, preprocessedCanvas.width, preprocessedCanvas.height);
      
      if (imageData) {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          const enhanced = gray < 128 ? Math.max(0, gray - 30) : Math.min(255, gray + 30);
          data[i] = data[i + 1] = data[i + 2] = enhanced;
        }
        pCtx?.putImageData(imageData, 0, 0);
      }

      const imageDataUrl = preprocessedCanvas.toDataURL('image/png');
      
      const result = await Tesseract.recognize(imageDataUrl, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const extractedContent = result.data.text.trim();
      setExtractedText(extractedContent);

      onCropComplete({
        question_text: extractedContent,
        raw_text: extractedContent,
        imageData: imageDataUrl,
      });

      toast.success('Text extracted successfully!');
      setIsCropMode(false);
      
      // Clean up
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
        cropRectRef.current = null;
      }
    } catch (error) {
      console.error('OCR Error:', error);
      toast.error('Failed to extract text. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPdfFile(file);
      loadPDF(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5 text-primary" />
            Fix Question via PDF Crop
            {contextLabel && <Badge variant="outline">{contextLabel}</Badge>}
          </DialogTitle>
          <DialogDescription>
            Upload a PDF, navigate to the question, and crop the area to extract text
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {!pdfFile ? (
            <Card className="border-2 border-dashed p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Upload PDF</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload the PDF containing the question you want to extract
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Choose PDF File
              </Button>
            </Card>
          ) : (
            <div className="h-full flex flex-col gap-4">
              {/* Controls */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages || isLoading}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(Math.max(0.5, scale - 0.25))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">{Math.round(scale * 100)}%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(Math.min(3, scale + 0.25))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  onClick={toggleCropMode}
                  variant={isCropMode ? "default" : "outline"}
                  size="sm"
                >
                  <Crop className="h-4 w-4 mr-2" />
                  {isCropMode ? 'Exit Crop Mode' : 'Start Cropping'}
                </Button>
              </div>

              {/* PDF Viewer */}
              <ScrollArea className="flex-1 border rounded-md bg-muted/20">
                <div className="relative inline-block">
                  <canvas ref={baseCanvasRef} className="max-w-full" />
                  <canvas 
                    ref={overlayCanvasRef} 
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{ pointerEvents: isCropMode ? 'auto' : 'none' }}
                  />
                  <canvas ref={pageCanvasRef} className="hidden" />
                </div>
              </ScrollArea>

              {/* Extracted Preview */}
              {extractedText && (
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Extracted Text:</strong>
                    <p className="mt-2 text-sm font-mono bg-muted p-2 rounded">
                      {extractedText}
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Current Question Info */}
              {currentQuestion?.question_text && (
                <Alert variant="default">
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Current Question:</strong>
                    <p className="mt-1 text-sm">{currentQuestion.question_text.substring(0, 100)}...</p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {pdfFile && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setPdfFile(null);
                  setPdfDoc(null);
                  setExtractedText('');
                  setIsCropMode(false);
                }}
              >
                Change PDF
              </Button>
              {isCropMode && (
                <Button
                  onClick={extractCroppedText}
                  disabled={isExtracting}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Extract & Apply
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
