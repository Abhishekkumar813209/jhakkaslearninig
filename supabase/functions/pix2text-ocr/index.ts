import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.8.0';
import Tesseract from 'https://esm.sh/tesseract.js@5.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageRequest {
  id: string;
  dataUrl: string;
}

interface Pix2TextRequest {
  images: ImageRequest[];
  hfToken?: string;
}

interface Pix2TextResult {
  id: string;
  text: string;
  latex: string;
  confidence: number;
  ocr_method: 'pix2text' | 'tesseract' | 'failed';
  requires_manual_review?: boolean;
  error?: string;
}

// Helper to extract LaTeX from Pix2Text output
function extractLatex(text: string): string {
  const latexMatches = text.match(/\$([^$]+)\$/g);
  if (latexMatches) {
    return latexMatches.map(m => m.replace(/\$/g, '')).join(' ');
  }
  const directLatex = text.match(/\\[a-z]+\{[^}]+\}/gi);
  if (directLatex) {
    return directLatex.join(' ');
  }
  return '';
}

// TIER 1: Pix2Text with retry logic
async function callPix2TextWithRetry(
  hf: HfInference, 
  blob: Blob, 
  imageId: string, 
  maxRetries = 3
): Promise<{ text: string; latex: string; confidence: number } | null> {
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await hf.imageToText({
        data: blob,
        model: 'breezedeus/pix2text-mfd',
      });
      
      const text = response.generated_text || '';
      const latex = extractLatex(text);
      
      console.log(`✅ Pix2Text SUCCESS on attempt ${attempt} for ${imageId}`);
      return { text, latex, confidence: 0.85 };
      
    } catch (error: any) {
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      
      if (error.message?.includes('loading') || error.message?.includes('cold start')) {
        console.warn(`⏳ Model cold start for ${imageId}, retrying in ${delay}ms...`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        console.warn(`⏱️ Rate limit for ${imageId}, backing off ${delay}ms...`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      console.error(`❌ Pix2Text failed for ${imageId} on attempt ${attempt}:`, error.message);
      if (attempt === maxRetries) return null;
    }
  }
  
  return null;
}

// TIER 2: Tesseract fallback
async function fallbackToTesseract(blob: Blob, imageId: string): Promise<{ text: string; confidence: number } | null> {
  try {
    console.log(`🔄 Falling back to Tesseract for ${imageId}...`);
    
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const worker = await Tesseract.createWorker('eng');
    const { data } = await worker.recognize(uint8Array);
    await worker.terminate();
    
    const text = data.text.trim();
    const confidence = data.confidence / 100;
    
    console.log(`✅ Tesseract SUCCESS for ${imageId} (confidence: ${confidence.toFixed(2)})`);
    return { text, confidence };
    
  } catch (error: any) {
    console.error(`❌ Tesseract failed for ${imageId}:`, error.message);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images, hfToken }: Pix2TextRequest = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new Error('No images provided');
    }

    console.log(`🤖 Processing ${images.length} images with 3-tier OCR (Pix2Text → Tesseract → Manual)`);

    const hf = new HfInference(hfToken || Deno.env.get('HUGGING_FACE_ACCESS_TOKEN'));
    const results: Pix2TextResult[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      try {
        // Convert dataUrl to blob
        const base64Data = image.dataUrl.split(',')[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const blob = new Blob([binaryData], { type: 'image/png' });

        // TIER 1: Pix2Text (with retries)
        const pix2textResult = await callPix2TextWithRetry(hf, blob, image.id);
        
        if (pix2textResult) {
          results.push({
            id: image.id,
            text: pix2textResult.text,
            latex: pix2textResult.latex,
            confidence: pix2textResult.confidence,
            ocr_method: 'pix2text'
          });
          console.log(`✅ ${i + 1}/${images.length}: ${image.id} via Pix2Text`);
          
          if (i < images.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 250));
          }
          continue;
        }
        
        // TIER 2: Tesseract fallback
        const tesseractResult = await fallbackToTesseract(blob, image.id);
        
        if (tesseractResult && tesseractResult.text.length > 5) {
          results.push({
            id: image.id,
            text: tesseractResult.text,
            latex: '',
            confidence: tesseractResult.confidence,
            ocr_method: 'tesseract'
          });
          console.log(`✅ ${i + 1}/${images.length}: ${image.id} via Tesseract (fallback)`);
          
          if (i < images.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 250));
          }
          continue;
        }
        
        // TIER 3: Flag for manual review
        results.push({
          id: image.id,
          text: '',
          latex: '',
          confidence: 0,
          ocr_method: 'failed',
          requires_manual_review: true,
          error: 'Both Pix2Text and Tesseract failed. Please add equation manually.'
        });
        console.warn(`⚠️ ${i + 1}/${images.length}: ${image.id} FLAGGED for manual review`);
        
      } catch (error: any) {
        // Catastrophic failure - flag for manual review
        results.push({
          id: image.id,
          text: '',
          latex: '',
          confidence: 0,
          ocr_method: 'failed',
          requires_manual_review: true,
          error: error.message || 'Unexpected OCR error'
        });
      }
      
      if (i < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }

    const successCount = results.filter(r => !r.requires_manual_review).length;
    const manualCount = results.filter(r => r.requires_manual_review).length;
    console.log(`✅ OCR complete: ${successCount}/${images.length} auto-extracted, ${manualCount} need manual review`);

    return new Response(
      JSON.stringify({ results }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Pix2Text OCR function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
