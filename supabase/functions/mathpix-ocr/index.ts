import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageRequest {
  id: string;
  dataUrl: string;
}

interface MathpixRequest {
  images: ImageRequest[];
  apiKey?: string;
  customAppId?: string;
}

interface MathpixResponse {
  text: string;
  latex_simplified?: string;
  confidence: number;
  is_printed?: boolean;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images, apiKey, customAppId }: MathpixRequest = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new Error('No images provided');
    }

    // Use custom API key if provided, otherwise use default from secrets
    const appId = customAppId || Deno.env.get('MATHPIX_APP_ID');
    const appKey = apiKey || Deno.env.get('MATHPIX_APP_KEY');

    if (!appId || !appKey) {
      throw new Error('Mathpix API credentials not configured. Please provide your API key or contact admin.');
    }

    console.log(`🧮 Processing ${images.length} images with Mathpix OCR`);

    // Process images (respecting rate limits: 10 req/sec)
    const results = [];
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      try {
        // Call Mathpix OCR API
        const response = await fetch('https://api.mathpix.com/v3/text', {
          method: 'POST',
          headers: {
            'app_id': appId,
            'app_key': appKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            src: image.dataUrl,
            formats: ['text', 'latex_simplified'],
            data_options: {
              include_asciimath: true,
              include_latex: true,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Mathpix API error for image ${image.id}:`, errorText);
          
          if (response.status === 401) {
            throw new Error('Invalid Mathpix API credentials. Please check your API key.');
          } else if (response.status === 429) {
            throw new Error('Mathpix rate limit exceeded. Please wait and try again.');
          }
          
          results.push({
            id: image.id,
            text: '',
            latex: '',
            confidence: 0,
            error: `API error: ${response.status}`,
          });
          continue;
        }

        const data: MathpixResponse = await response.json();
        
        results.push({
          id: image.id,
          text: data.text || '',
          latex: data.latex_simplified || '',
          confidence: data.confidence || 0,
          is_printed: data.is_printed ?? true,
        });

        console.log(`✅ Processed ${i + 1}/${images.length}: ${image.id} (confidence: ${data.confidence})`);

        // Rate limiting: 100ms delay between requests (10 req/sec)
        if (i < images.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error(`Error processing image ${image.id}:`, error);
        results.push({
          id: image.id,
          text: '',
          latex: '',
          confidence: 0,
          error: error.message,
        });
      }
    }

    console.log(`✅ Mathpix OCR complete: ${results.filter(r => !r.error).length}/${images.length} successful`);

    return new Response(
      JSON.stringify({ results }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Mathpix OCR function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
