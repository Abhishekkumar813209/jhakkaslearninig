import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Rect } from "fabric";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import * as pdfjsLib from 'pdfjs-dist';
// Vite-friendly worker URL and Worker
// @ts-ignore
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
// @ts-ignore
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import { Loader2, Upload, Crop, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import Tesseract from 'tesseract.js';

// Configure PDF.js worker for Vite (primary: workerPort, fallback: workerSrc)
if (typeof window !== 'undefined') {
  try {
    const workerInstance = new (PdfWorker as any)();
    (pdfjsLib as any).GlobalWorkerOptions.workerPort = workerInstance;
  } catch (e) {
    console.warn('PDF.js workerPort init failed, falling back to workerSrc', e);
  }
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;
  if (!(pdfjsLib as any).GlobalWorkerOptions.workerSrc) {
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${(pdfjsLib as any).version}/pdf.worker.min.mjs`;
  }
}

interface PDFQuestionExtractorProps {
  onQuestionExtracted: (questionText: string, imageData?: string) => void;
  onClose: () => void;
}

export const PDFQuestionExtractor = ({ onQuestionExtracted, onClose }: PDFQuestionExtractorProps) => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const cropRectRef = useRef<Rect | null>(null);
  const pageCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load PDF
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      toast.error("Please select a valid PDF file");
      return;
    }

    setIsLoading(true);
    setPdfFile(file);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      
      toast.success(`PDF loaded: ${pdf.numPages} pages`);
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error("Failed to load PDF");
    } finally {
      setIsLoading(false);
    }
  };

  // Render PDF page
  const renderPage = async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      
      // Store the page canvas for cropping
      if (pageCanvasRef.current) {
        pageCanvasRef.current.width = canvas.width;
        pageCanvasRef.current.height = canvas.height;
        const pageCtx = pageCanvasRef.current.getContext('2d');
        pageCtx?.drawImage(canvas, 0, 0);
      }

    } catch (error) {
      console.error('Error rendering page:', error);
      toast.error("Failed to render page");
    }
  };

  // Initialize Fabric canvas for cropping
  const initializeCropCanvas = () => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const fabricCanvas = new FabricCanvas(canvasRef.current, {
      selection: false,
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = fabricCanvas;

    // Create crop rectangle
    const cropRect = new Rect({
      left: 50,
      top: 50,
      width: 200,
      height: 100,
      fill: 'rgba(0, 123, 255, 0.1)',
      stroke: '#007bff',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      cornerColor: '#007bff',
      cornerSize: 8,
      transparentCorners: false,
      hasRotatingPoint: false,
    });

    fabricCanvas.add(cropRect);
    cropRectRef.current = cropRect;
    fabricCanvas.setActiveObject(cropRect);
  };

  // Toggle crop mode
  const toggleCropMode = () => {
    setIsCropMode(!isCropMode);
    
    if (!isCropMode) {
      // Entering crop mode
      initializeCropCanvas();
    } else {
      // Exiting crop mode
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
        cropRectRef.current = null;
      }
      renderPage();
    }
  };

  // Extract text from cropped area
  const extractCroppedText = async () => {
    if (!cropRectRef.current || !pageCanvasRef.current) {
      toast.error("No crop area selected");
      return;
    }

    setIsExtracting(true);

    try {
      const cropRect = cropRectRef.current;
      const sourceCanvas = pageCanvasRef.current;
      
      // Create a new canvas for the cropped area
      const croppedCanvas = document.createElement('canvas');
      const ctx = croppedCanvas.getContext('2d');
      
      croppedCanvas.width = cropRect.width! * cropRect.scaleX!;
      croppedCanvas.height = cropRect.height! * cropRect.scaleY!;
      
      // Draw the cropped portion
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

      // Convert to blob for OCR
      const imageDataUrl = croppedCanvas.toDataURL('image/png');
      
      // Extract text using Tesseract
      const result = await Tesseract.recognize(imageDataUrl, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      const extractedText = result.data.text.trim();
      
      if (extractedText) {
        onQuestionExtracted(extractedText, imageDataUrl);
        toast.success("Question extracted successfully!");
      } else {
        toast.warning("No text found in the selected area");
      }

    } catch (error) {
      console.error('Error extracting text:', error);
      toast.error("Failed to extract text");
    } finally {
      setIsExtracting(false);
    }
  };

  // Navigation functions
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const zoomIn = () => {
    setScale(Math.min(scale * 1.2, 3));
  };

  const zoomOut = () => {
    setScale(Math.max(scale / 1.2, 0.5));
  };

  const resetView = () => {
    setScale(1.5);
  };

  // Effects
  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPage();
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    // Create hidden canvas for storing page data
    const hiddenCanvas = document.createElement('canvas');
    pageCanvasRef.current = hiddenCanvas;

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">PDF Question Extractor</h2>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* File Upload */}
        {!pdfFile && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">Upload PDF</h3>
                <p className="text-muted-foreground">Select a PDF file to extract questions from</p>
              </div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="pdf-upload"
              />
              <Button asChild>
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  Choose PDF File
                </label>
              </Button>
            </div>
          </div>
        )}

        {/* PDF Viewer */}
        {pdfFile && (
          <>
            {/* Toolbar */}
            <div className="p-4 border-b flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={zoomOut}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm">{Math.round(scale * 100)}%</span>
                <Button variant="outline" size="sm" onClick={zoomIn}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={resetView}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant={isCropMode ? "default" : "outline"}
                  size="sm"
                  onClick={toggleCropMode}
                >
                  <Crop className="w-4 h-4 mr-1" />
                  {isCropMode ? "Exit Crop" : "Crop Mode"}
                </Button>
                
                {isCropMode && (
                  <Button
                    onClick={extractCroppedText}
                    disabled={isExtracting}
                    size="sm"
                  >
                    {isExtracting ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      "Extract Question"
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Canvas Container */}
            <div className="flex-1 overflow-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="ml-2">Loading PDF...</span>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="border shadow-lg bg-white">
                    <canvas
                      ref={canvasRef}
                      className={`block ${isCropMode ? 'cursor-crosshair' : ''}`}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};