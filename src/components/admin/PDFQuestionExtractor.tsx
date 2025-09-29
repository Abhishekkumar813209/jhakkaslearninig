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
  onQuestionExtracted: (questionText: string, options?: string[], imageData?: string) => void;
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
  
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
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
      
      // Keep an offscreen copy for cropping
      if (pageCanvasRef.current) {
        pageCanvasRef.current.width = canvas.width;
        pageCanvasRef.current.height = canvas.height;
        const pageCtx = pageCanvasRef.current.getContext('2d');
        pageCtx?.drawImage(canvas, 0, 0);
      }

      // Sync overlay canvas size with base canvas
      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = canvas.width;
        overlayCanvasRef.current.height = canvas.height;
        try {
          (fabricCanvasRef.current as any)?.setDimensions?.({ width: canvas.width, height: canvas.height });
          (fabricCanvasRef.current as any)?.renderAll?.();

          const wrapper = ((fabricCanvasRef.current as any)?.upperCanvasEl?.parentElement) as HTMLElement | null;
          if (wrapper) {
            wrapper.style.width = `${canvas.width}px`;
            wrapper.style.height = `${canvas.height}px`;
            wrapper.style.position = 'absolute';
            wrapper.style.top = '0';
            wrapper.style.left = '0';
            wrapper.style.zIndex = '30';
            wrapper.style.pointerEvents = 'auto';
          }
        } catch {}
      }

    } catch (error) {
      console.error('Error rendering page:', error);
      toast.error("Failed to render page");
    }
  };

  // Initialize Fabric canvas for cropping
  const initializeCropCanvas = () => {
    if (!overlayCanvasRef.current || fabricCanvasRef.current) return;

    // Match overlay size with base canvas and force overlaying style
    if (baseCanvasRef.current) {
      const w = baseCanvasRef.current.width;
      const h = baseCanvasRef.current.height;
      overlayCanvasRef.current.width = w;
      overlayCanvasRef.current.height = h;
      // CSS size to match device pixels
      overlayCanvasRef.current.style.width = `${w}px`;
      overlayCanvasRef.current.style.height = `${h}px`;
    }
    overlayCanvasRef.current.style.position = 'absolute';
    overlayCanvasRef.current.style.top = '0';
    overlayCanvasRef.current.style.left = '0';
    overlayCanvasRef.current.style.zIndex = '20';
    overlayCanvasRef.current.style.pointerEvents = 'auto';

    const fabricCanvas = new FabricCanvas(overlayCanvasRef.current as HTMLCanvasElement, {
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: 'transparent',
      hoverCursor: 'move',
      defaultCursor: 'default'
    } as any);

    fabricCanvasRef.current = fabricCanvas as any;

    // Ensure Fabric wrapper overlays the PDF canvas
    const wrapper = ((fabricCanvas as any).upperCanvasEl?.parentElement || (overlayCanvasRef.current?.parentElement)) as HTMLElement | null;
    if (wrapper) {
      if (baseCanvasRef.current) {
        const w = baseCanvasRef.current.width;
        const h = baseCanvasRef.current.height;
        wrapper.style.width = `${w}px`;
        wrapper.style.height = `${h}px`;
      }
      wrapper.style.position = 'absolute';
      wrapper.style.top = '0';
      wrapper.style.left = '0';
      wrapper.style.zIndex = '30';
      wrapper.style.pointerEvents = 'auto';
    }


    // Create crop rectangle
    const cropRect = new Rect({
      left: 100,
      top: 100,
      width: 220,
      height: 140,
      fill: 'rgba(30, 144, 255, 0.12)',
      stroke: '#1E90FF',
      strokeWidth: 2,
      strokeDashArray: [8, 4],
      cornerColor: '#1E90FF',
      cornerSize: 12,
      cornerStyle: 'circle',
      transparentCorners: false,
      borderColor: '#1E90FF',
      borderDashArray: [8, 4],
      hasRotatingPoint: false,
      lockRotation: true,
      hasBorders: true,
      hasControls: true,
      selectable: true,
      evented: true,
      objectCaching: false,
      lockScalingFlip: true,
    } as any);

    (cropRect as any).bringToFront?.();
    fabricCanvas.add(cropRect as any);
    cropRectRef.current = cropRect as any;
    (fabricCanvas as any).setActiveObject(cropRect);

    // Enable object manipulation and re-render
    fabricCanvas.on('selection:created', () => {
      (fabricCanvas as any).requestRenderAll?.();
    });

    fabricCanvas.on('object:modified', () => {
      (fabricCanvas as any).requestRenderAll?.();
    });

    fabricCanvas.requestRenderAll();
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
      // Clear overlay canvas
      if (overlayCanvasRef.current) {
        const octx = overlayCanvasRef.current.getContext('2d');
        if (octx) {
          octx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
        }
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

      // Preprocess image for better OCR
      const preprocessedCanvas = document.createElement('canvas');
      const pCtx = preprocessedCanvas.getContext('2d');
      preprocessedCanvas.width = croppedCanvas.width;
      preprocessedCanvas.height = croppedCanvas.height;
      
      // Draw with higher contrast and sharpening
      pCtx?.drawImage(croppedCanvas, 0, 0);
      const imageData = pCtx?.getImageData(0, 0, preprocessedCanvas.width, preprocessedCanvas.height);
      
      if (imageData) {
        // Apply contrast enhancement
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale and enhance contrast
          const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          const enhanced = gray < 128 ? Math.max(0, gray - 30) : Math.min(255, gray + 30);
          data[i] = data[i + 1] = data[i + 2] = enhanced;
        }
        pCtx?.putImageData(imageData, 0, 0);
      }

      // Convert to blob for OCR
      const imageDataUrl = preprocessedCanvas.toDataURL('image/png');
      
      // Extract text using Tesseract with improved settings
      const result = await Tesseract.recognize(imageDataUrl, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      let extractedText = result.data.text.trim();
      
      // Post-process to fix common OCR mistakes for options
      extractedText = extractedText
        .replace(/[@©®™]/g, '(a)')  // Replace symbols with (a)
        .replace(/\b[bc]\)/g, (match) => `(${match[0]})`)  // Fix b) c) to (b) (c)
        .replace(/\bd\)/g, '(d)')  // Fix d) to (d)
        .replace(/\s+/g, ' ')  // Normalize spaces
        .replace(/\n\s*\n/g, '\n');  // Remove extra line breaks

      // Separate question from options
      const lines = extractedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      let questionText = '';
      const options: string[] = [];
      
      for (const line of lines) {
        // Check if line contains options pattern
        const optionMatch = line.match(/\(([abcd])\)\s*(.+)/i);
        if (optionMatch) {
          options.push(optionMatch[2].trim());
        } else {
          // Add to question text if it's not an option
          if (questionText) {
            questionText += ' ' + line;
          } else {
            questionText = line;
          }
        }
      }
      
      if (questionText || options.length > 0) {
        onQuestionExtracted(questionText || extractedText, options.length > 0 ? options : undefined, imageDataUrl);
        toast.success("Question extracted successfully! Click 'Crop Mode' to select another area.");
        
        // Reset crop mode to allow selecting new area but keep PDF open
        setIsCropMode(false);
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
          cropRectRef.current = null;
        }
        // Clear overlay canvas
        if (overlayCanvasRef.current) {
          const octx = overlayCanvasRef.current.getContext('2d');
          if (octx) {
            octx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
          }
        }
        // Keep the PDF rendered and ready for next extraction
        renderPage();
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

  const selectNewPDF = () => {
    setPdfFile(null);
    setPdfDoc(null);
    setCurrentPage(1);
    setTotalPages(0);
    setScale(1.5);
    setIsCropMode(false);
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
      fabricCanvasRef.current = null;
      cropRectRef.current = null;
    }
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
          <div className="flex items-center space-x-2">
            {pdfFile && (
              <Button variant="outline" onClick={selectNewPDF}>
                Select New PDF
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
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
                  <div className="relative border shadow-lg bg-white inline-block">
                    {/* Base PDF canvas */}
                    <canvas ref={baseCanvasRef} className="block" />
                    {/* Overlay crop canvas */}
                    <canvas
                      ref={overlayCanvasRef}
                      className={`absolute inset-0 ${isCropMode ? 'cursor-grab' : 'pointer-events-none'}`}
                      style={{ 
                        background: 'transparent',
                        zIndex: isCropMode ? 10 : -1,
                        pointerEvents: isCropMode ? 'auto' : 'none'
                      }}
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