import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const subject = formData.get('subject') as string;
    const targetClass = formData.get('target_class') as string;
    const targetBoard = formData.get('target_board') as string;

    if (!file || file.type !== 'application/pdf') {
      return new Response(JSON.stringify({ error: 'Invalid PDF file' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing PDF: ${file.name}, Size: ${file.size} bytes`);

    // Upload PDF to storage
    const fileName = `${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('content-pdfs')
      .upload(fileName, file, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload PDF' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from('content-pdfs')
      .getPublicUrl(fileName);

    // Extract text from PDF (simple text extraction)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8');
    let extractedText = '';

    try {
      extractedText = decoder.decode(uint8Array);
      // Basic text extraction - remove binary data
      extractedText = extractedText.replace(/[^\x20-\x7E\n]/g, ' ').trim();
    } catch (e) {
      console.error('Text extraction error:', e);
      extractedText = `[Binary PDF content - ${file.size} bytes]`;
    }

    // Create content source entry
    const { data: sourceData, error: sourceError } = await supabaseClient
      .from('content_sources')
      .insert({
        source_type: 'pdf_upload',
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (sourceError) {
      console.error('Source creation error:', sourceError);
      return new Response(JSON.stringify({ error: 'Failed to create content source' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('PDF extraction successful:', sourceData.id);

    return new Response(JSON.stringify({
      success: true,
      source_id: sourceData.id,
      file_url: publicUrl,
      extracted_text: extractedText.substring(0, 2000), // Preview
      file_size: file.size,
      message: 'PDF uploaded and text extracted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('PDF extraction error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
