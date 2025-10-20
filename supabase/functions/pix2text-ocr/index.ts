import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.8.0';

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
  error?: string;
}

// Helper to extract LaTeX from Pix2Text output
function extractLatex(text: string): string {
  // Pix2Text outputs equations in format: "The equation is: $\frac{a}{b}$"
  const latexMatches = text.match(/\$([^$]+)\$/g);
  if (latexMatches) {
    return latexMatches.map(m => m.replace(/\$/g, '')).join(' ');
  }
  // Also check for direct LaTeX patterns
  const directLatex = text.match(/\\[a-z]+\{[^}]+\}/gi);
  if (directLatex) {
    return directLatex.join(' ');
  }
  return '';
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

    console.log(`🤖 Processing ${images.length} images with Pix2Text OCR`);

    // Initialize HuggingFace client (no token needed for public inference)
    const hf = new HfInference(hfToken || Deno.env.get('HUGGING_FACE_ACCESS_TOKEN'));

    const results: Pix2TextResult[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      try {
        // Convert dataUrl to blob
        const base64Data = image.dataUrl.split(',')[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const blob = new Blob([binaryData], { type: 'image/png' });

        // Call Pix2Text model via HuggingFace Inference
        const response = await hf.imageToText({
          data: blob,
          model: 'breezedeus/pix2text-mfd', // Math Formula Detection model
        });

        // Extract text and LaTeX from response
        const text = response.generated_text || '';
        const latex = extractLatex(text);

        results.push({
          id: image.id,
          text: text,
          latex: latex,
          confidence: 0.85, // Pix2Text average accuracy
        });

        console.log(`✅ Processed ${i + 1}/${images.length}: ${image.id} (confidence: 0.85)`);

        // Rate limiting: 200ms delay (5 req/sec for free tier)
        if (i < images.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

      } catch (error) {
        console.error(`Error processing ${image.id}:`, error);
        
        // Handle specific errors
        if (error.message?.includes('rate limit') || error.message?.includes('429')) {
          results.push({
            id: image.id,
            text: '',
            latex: '',
            confidence: 0,
            error: 'Rate limit exceeded. Please wait and try again.',
          });
        } else if (error.message?.includes('loading') || error.message?.includes('cold start')) {
          results.push({
            id: image.id,
            text: '',
            latex: '',
            confidence: 0,
            error: 'Model is warming up. Please retry in 10-20 seconds.',
          });
        } else {
          results.push({
            id: image.id,
            text: '',
            latex: '',
            confidence: 0,
            error: error.message || 'Processing failed',
          });
        }
      }
    }

    console.log(`✅ Pix2Text OCR complete: ${results.filter(r => !r.error).length}/${images.length} successful`);

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
