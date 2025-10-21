import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Rect } from "fabric";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import * as pdfjsLib from 'pdfjs-dist';
// Vite-friendly worker URL and Worker
// @ts-ignore
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
// @ts-ignore
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import { Loader2, Upload, Crop, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, Check, Maximize, Square, Minimize2, Map, CheckCircle2, Scissors } from "lucide-react";
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
  editMode?: {
    questionId: string;
    currentQuestion: any;
    pdfFile: File;
    pageNumber?: number;
  };
}

export const PDFQuestionExtractor = ({ onQuestionExtracted, onClose, editMode }: PDFQuestionExtractorProps) => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);
  const [extractedCount, setExtractedCount] = useState(0);
  const [justExtracted, setJustExtracted] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const cropRectRef = useRef<Rect | null>(null);
  const pageCanvasRef = useRef<HTMLCanvasElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
      width: 320,
      height: 56,
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

    // Click-to-place crop box functionality
    fabricCanvas.on('mouse:down', (event: any) => {
      if (!event.pointer || !cropRect) return;
      
      // Only reposition if clicking on empty canvas (not on the crop rectangle)
      const target = event.target;
      if (target && target === cropRect) return;
      
      // Get click coordinates
      const clickX = event.pointer.x;
      const clickY = event.pointer.y;
      
      // Get crop box dimensions (considering scale)
      const cropWidth = (cropRect.width || 280) * (cropRect.scaleX || 1);
      const cropHeight = (cropRect.height || 160) * (cropRect.scaleY || 1);
      
      // Calculate new position (centered on click)
      let newLeft = clickX - cropWidth / 2;
      let newTop = clickY - cropHeight / 2;
      
      // Boundary checks
      const canvasWidth = fabricCanvas.width || 0;
      const canvasHeight = fabricCanvas.height || 0;
      
      newLeft = Math.max(0, Math.min(newLeft, canvasWidth - cropWidth));
      newTop = Math.max(0, Math.min(newTop, canvasHeight - cropHeight));
      
      // Position the crop box
      cropRect.set({ left: newLeft, top: newTop });
      fabricCanvas.setActiveObject(cropRect);
      fabricCanvas.requestRenderAll();
      
      // Auto-scroll to new crop position
      scrollToCropRect();
    });

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
    setJustExtracted(false);
    
    if (!isCropMode) {
      // Entering crop mode
      initializeCropCanvas();
      setShowMinimap(true);
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
      setShowMinimap(false);
      renderPage();
    }
  };

  // Preset crop sizes
  const applyCropPreset = (size: 'small' | 'medium' | 'large') => {
    if (!cropRectRef.current || !fabricCanvasRef.current) return;
    
    const sizes = {
      small: { width: 180, height: 100 },
      medium: { width: 280, height: 160 },
      large: { width: 400, height: 240 }
    };
    
    const { width, height } = sizes[size];
    cropRectRef.current.set({ width, height, scaleX: 1, scaleY: 1 });
    fabricCanvasRef.current.setActiveObject(cropRectRef.current);
    fabricCanvasRef.current.requestRenderAll();
    toast.success(`Crop size set to ${size}`);
  };

  // Keyboard controls
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isCropMode || !cropRectRef.current || !fabricCanvasRef.current) return;
    
    const step = e.shiftKey ? 50 : 10;
    const cropRect = cropRectRef.current;
    
    switch(e.key) {
      case 'ArrowUp':
        e.preventDefault();
        cropRect.set({ top: Math.max(0, (cropRect.top || 0) - step) });
        break;
      case 'ArrowDown':
        e.preventDefault();
        cropRect.set({ top: Math.min(baseCanvasRef.current!.height - (cropRect.height || 0), (cropRect.top || 0) + step) });
        break;
      case 'ArrowLeft':
        e.preventDefault();
        cropRect.set({ left: Math.max(0, (cropRect.left || 0) - step) });
        break;
      case 'ArrowRight':
        e.preventDefault();
        cropRect.set({ left: Math.min(baseCanvasRef.current!.width - (cropRect.width || 0), (cropRect.left || 0) + step) });
        break;
      case 'Enter':
        e.preventDefault();
        extractCroppedText();
        return;
      default:
        return;
    }
    
    fabricCanvasRef.current.requestRenderAll();
    scrollToCropRect();
  };

  // Auto-scroll to crop rectangle
  const scrollToCropRect = () => {
    if (!cropRectRef.current || !scrollContainerRef.current || !baseCanvasRef.current) return;
    
    const cropRect = cropRectRef.current;
    const container = scrollContainerRef.current;
    const canvas = baseCanvasRef.current;
    
    const cropCenterY = (cropRect.top || 0) + ((cropRect.height || 0) * (cropRect.scaleY || 1)) / 2;
    const containerHeight = container.clientHeight;
    
    // Scroll to center the crop rectangle
    const targetScroll = cropCenterY - containerHeight / 2;
    container.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth'
    });
  };

  // Render minimap
  const renderMinimap = () => {
    if (!minimapCanvasRef.current || !baseCanvasRef.current || !scrollContainerRef.current) return;
    
    const miniCanvas = minimapCanvasRef.current;
    const baseCanvas = baseCanvasRef.current;
    const ctx = miniCanvas.getContext('2d');
    if (!ctx) return;
    
    const minimapScale = 0.15; // Minimap scale
    miniCanvas.width = baseCanvas.width * minimapScale;
    miniCanvas.height = baseCanvas.height * minimapScale;
    
    // Draw PDF page thumbnail
    ctx.drawImage(baseCanvas, 0, 0, miniCanvas.width, miniCanvas.height);
    
    // Draw viewport indicator
    const container = scrollContainerRef.current;
    const viewportHeight = container.clientHeight;
    const scrollTop = container.scrollTop;
    const totalHeight = baseCanvas.height;
    
    const viewportY = (scrollTop / totalHeight) * miniCanvas.height;
    const viewportH = (viewportHeight / totalHeight) * miniCanvas.height;
    
    ctx.strokeStyle = '#1E90FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, viewportY, miniCanvas.width, viewportH);
    ctx.fillStyle = 'rgba(30, 144, 255, 0.2)';
    ctx.fillRect(0, viewportY, miniCanvas.width, viewportH);
    
    // Draw crop rectangle on minimap
    if (cropRectRef.current) {
      const cropRect = cropRectRef.current;
      const cropX = (cropRect.left || 0) * minimapScale;
      const cropY = (cropRect.top || 0) * minimapScale;
      const cropW = (cropRect.width || 0) * (cropRect.scaleX || 1) * minimapScale;
      const cropH = (cropRect.height || 0) * (cropRect.scaleY || 1) * minimapScale;
      
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(cropX, cropY, cropW, cropH);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
      ctx.fillRect(cropX, cropY, cropW, cropH);
    }
  };

  // Start cropping another question
  const cropAnotherQuestion = () => {
    // Save current scroll position
    const currentScrollTop = scrollContainerRef.current?.scrollTop || 0;
    
    setJustExtracted(false);
    setIsCropMode(true);
    initializeCropCanvas();
    
    // Restore scroll position after canvas initialization
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = currentScrollTop;
      }
    }, 100);
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
      
      // Post-process to fix common OCR mistakes and normalize option formats
      extractedText = extractedText
        .replace(/[@]/g, '(a)')              // Replace @ symbol with (a)
        .replace(/[©¢çÇ]/g, '(c)')          // Replace copyright, cent, cedilla symbols with (c)
        .replace(/[®™]/g, '(b)')             // Replace registered, trademark with (b)
        .replace(/\s¢\s/g, ' (c) ')          // Standalone cent symbol to (c)
        .replace(/\sç\s/gi, ' (c) ')         // Standalone c with cedilla to (c)
        .replace(/\(\(([abcd])\)\)/gi, '($1)')  // Fix ((a)) to (a)
        .replace(/\(\(([abcd])\)/gi, '($1)')   // Fix ((a) to (a)
        .replace(/([abcd])\)\)/gi, '($1)')     // Fix a)) to (a)
        .replace(/\b([abcd])\)/gi, '($1)')     // Normalize a) to (a)
        .replace(/\b([abcd])\./gi, '($1)')     // Normalize a. to (a)
        .replace(/\b([ABCD])\)/g, (match, p1) => `(${p1.toLowerCase()})`)  // Normalize A) to (a)
        .replace(/\b([ABCD])\./g, (match, p1) => `(${p1.toLowerCase()})`)  // Normalize A. to (a)
        .replace(/\b[8B]D\b/g, 'BD')          // Fix 8D to BD
        .replace(/\b0\b/g, 'O')               // Fix 0 to O (letter)
        .replace(/\s+/g, ' ')                 // Normalize spaces
        .replace(/\n\s*\n/g, '\n');           // Remove extra line breaks

      // Separate question from options (supports multiple formats: (a), a), A), a.)
      // First normalize all formats to (a) format
      const normalizedText = extractedText
        .replace(/\b([abcd])\)/gi, '($1)')     // a) -> (a)
        .replace(/\b([abcd])\./gi, '($1)')     // a. -> (a)
        .replace(/\b([ABCD])\)/g, (match, p1) => `(${p1.toLowerCase()})`)  // A) -> (a)
        .replace(/\b([ABCD])\./g, (match, p1) => `(${p1.toLowerCase()})`);  // A. -> (a)
      
      const markerIndex = normalizedText.search(/\([a-d]\)/i);
      let questionText = markerIndex > 0 ? normalizedText.slice(0, markerIndex).trim() : '';
      
      // Remove question numbers and common prefixes from question text
      if (questionText) {
        questionText = questionText
          .replace(/^Q\d+[.:)\s]+/i, '')           // Remove Q3., Q1:, Q2) etc.
          .replace(/^\d+[.:)\s]+/, '')             // Remove 3., 1:, 2) etc.
          .replace(/^Question\s*\d+[.:)\s]*/i, '') // Remove Question 3:, Question 1. etc.
          .replace(/^\([A-Za-z]+\)\s*/, '')        // Remove subject tags like (Biology), (Physics)
          .replace(/\(\s*$/, '')                   // Remove trailing opening bracket with spaces
          .replace(/\(+\s*$/, '')                  // Remove multiple trailing opening brackets
          .trim();
      }
      
      const optionSection = markerIndex >= 0 ? normalizedText.slice(markerIndex) : normalizedText;
      const optionMatches = Array.from(optionSection.matchAll(/\(([abcd])\)\s*([\s\S]*?)(?=\s*\([abcd]\)\s*|$)/gi));
      
      const optionMap: Record<string, string> = {};
      for (const m of optionMatches) {
        const letter = m[1].toLowerCase();
        let text = m[2].trim()
          .replace(/^[,.:;\-]+/, '')           // Remove leading punctuation
          .replace(/[\(\)]+$/, '')             // Remove trailing brackets (incomplete or extra)
          .replace(/[\(\)]{2,}/g, '')          // Remove multiple consecutive brackets
          .replace(/\(\s*$/, '')               // Remove trailing opening bracket with spaces
          .replace(/^\s*\)/, '')               // Remove leading closing bracket
          .trim();
        if (text) optionMap[letter] = text;
      }
      
      const ordered = ['a','b','c','d'];
      const options: string[] = ordered
        .map((l) => optionMap[l])
        .filter((v): v is string => Boolean(v));
      
      // Fallback: if no options were detected, try line-based parsing with multiple format support
      if (options.length === 0) {
        const lines = normalizedText.split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          const partMatches = Array.from(line.matchAll(/\(([abcd])\)\s*(.+?)(?=(\s*\([abcd]\)\s*)|$)/gi));
          if (partMatches.length > 0) {
            for (const pm of partMatches) {
              const t = pm[2].trim();
              if (t) options.push(t);
            }
          } else {
            questionText = questionText ? questionText + ' ' + line : line;
          }
        }
      }
      
      if (questionText || options.length > 0) {
        onQuestionExtracted(questionText || extractedText, options.length > 0 ? options : undefined, imageDataUrl);
        setExtractedCount(prev => prev + 1);
        setJustExtracted(true);
        toast.success(`Question #${extractedCount + 1} extracted successfully!`);
        
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
    setExtractedCount(0);
    setJustExtracted(false);
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

  // Keyboard event listener
  useEffect(() => {
    if (isCropMode) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isCropMode]);

  // Render minimap when crop moves or scrolls
  useEffect(() => {
    if (showMinimap && isCropMode) {
      const interval = setInterval(renderMinimap, 100);
      return () => clearInterval(interval);
    }
  }, [showMinimap, isCropMode]);

  // Auto-scroll on crop mode entry
  useEffect(() => {
    if (isCropMode && cropRectRef.current) {
      setTimeout(scrollToCropRect, 100);
    }
  }, [isCropMode]);

  return (
    <div className={editMode ? "h-full" : "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"}>
      <Card className={editMode ? "w-full h-full flex flex-col" : "w-full max-w-6xl h-[90vh] flex flex-col"}>
        {/* Header - only show if not in edit mode (header is in dialog) */}
        {!editMode && (
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">PDF Question Extractor</h2>
              {extractedCount > 0 && (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  <Check className="w-3 h-3 mr-1" />
                  {extractedCount} Extracted
                </Badge>
              )}
            </div>
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
        )}

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

              <div className="flex items-center space-x-2 flex-wrap gap-2">
                {!isCropMode && !justExtracted && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={toggleCropMode}
                  >
                    <Crop className="w-4 h-4 mr-1" />
                    Start Cropping
                  </Button>
                )}
                
                {isCropMode && (
                  <>
                    <div className="flex items-center gap-2 border-r pr-2">
                      <span className="text-xs text-muted-foreground">Preset:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyCropPreset('small')}
                        title="Small crop (180x100)"
                      >
                        <Minimize2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyCropPreset('medium')}
                        title="Medium crop (280x160)"
                      >
                        <Square className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyCropPreset('large')}
                        title="Large crop (400x240)"
                      >
                        <Maximize className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleCropMode}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={extractCroppedText}
                      disabled={isExtracting}
                      size="sm"
                      variant="default"
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Extract (Enter)
                        </>
                      )}
                    </Button>
                  </>
                )}

                {justExtracted && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={cropAnotherQuestion}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Crop className="w-4 h-4 mr-1" />
                    Crop Another Question
                  </Button>
                )}
              </div>
            </div>

            {/* Canvas Container with Minimap */}
            <div className="flex-1 flex gap-2 overflow-hidden">
              <div className="flex-1 overflow-auto p-4" ref={scrollContainerRef}>
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
                      
                      {/* Keyboard hints */}
                      {isCropMode && (
                        <div className="absolute bottom-4 right-4 bg-black/80 text-white text-xs p-3 rounded-lg space-y-1 z-50">
                          <div className="font-semibold mb-1">Keyboard Shortcuts:</div>
                          <div>↑↓←→ : Move crop (10px)</div>
                          <div>Shift + ↑↓←→ : Move crop (50px)</div>
                          <div>Enter : Extract question</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Minimap */}
              {showMinimap && isCropMode && (
                <div className="w-32 p-2 border-l flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Navigator</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMinimap(false)}
                      className="h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  </div>
                  <div className="border rounded overflow-hidden bg-muted">
                    <canvas 
                      ref={minimapCanvasRef} 
                      className="w-full h-auto cursor-pointer"
                      onClick={(e) => {
                        if (!scrollContainerRef.current || !baseCanvasRef.current || !minimapCanvasRef.current) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const y = e.clientY - rect.top;
                        const clickScale = baseCanvasRef.current.height / minimapCanvasRef.current.height;
                        const targetY = y * clickScale;
                        scrollContainerRef.current.scrollTo({
                          top: targetY - scrollContainerRef.current.clientHeight / 2,
                          behavior: 'smooth'
                        });
                      }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    Click to jump
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