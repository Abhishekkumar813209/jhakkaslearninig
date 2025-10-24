import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Initialize Supabase client for database queries
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    let systemPrompt = `You are a helpful AI database assistant for an educational LMS platform with DIRECT ACCESS to the Supabase database.

You can execute SQL queries using the query_database tool to:
- Count rows: SELECT COUNT(*) FROM table_name
- List columns: SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'xyz'
- Analyze data: SELECT * FROM table LIMIT 10
- Check relationships: Find foreign keys, orphaned records
- Explore schema: information_schema.tables, information_schema.columns
- Aggregate data: SUM, AVG, GROUP BY queries

Always explain what you're checking before running queries. Use queries to give accurate, data-driven answers.

${context?.tableName ? `\n[CURRENT CONTEXT: Admin is viewing ${context.tableName} table${context.tableCount ? ` with ${context.tableCount} rows` : ''}]\n` : ''}

Platform Features:
- Roadmap generation (AI-powered, chapter-wise)
- Gamified lessons (Match Pairs, Drag Drop, Error Detective, Equation Balancer, etc)
- Student progress tracking with XP, coins, hearts system
- AI content generation from PDFs, YouTube, manual input
- Zone/School/Batch management
- Test creation and analytics
- Referral system with credits
- Fee management with battery indicators

Tech Stack:
- Frontend: React, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Supabase (database, auth, storage, edge functions)
- AI: Lovable AI (Gemini 2.5 Flash - currently free)

Help the admin brainstorm features, discuss implementation approaches, analyze database structure,
gamification ideas, and provide technical guidance. Be concise and practical.`;

    // Define database query tool
    const tools = [
      {
        type: "function",
        function: {
          name: "query_database",
          description: "Execute read-only SQL queries on the database. Use SELECT statements to analyze table structure, count rows, find relationships, etc. Only SELECT queries are allowed.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "SELECT query to execute (read-only, no INSERT/UPDATE/DELETE)"
              }
            },
            required: ["query"]
          }
        }
      }
    ];

    console.log('Starting AI chat with', messages.length, 'messages');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: messages.map(m => ({
          role: m.role === 'system' ? 'user' : m.role,
          parts: [{ text: m.content }]
        })),
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        tools: [{
          functionDeclarations: [{
            name: "query_database",
            description: "Execute read-only SQL queries on the database. Use SELECT statements to analyze table structure, count rows, find relationships, etc. Only SELECT queries are allowed.",
            parameters: {
              type: "OBJECT",
              properties: {
                query: {
                  type: "STRING",
                  description: "SELECT query to execute (read-only, no INSERT/UPDATE/DELETE)"
                }
              },
              required: ["query"]
            }
          }]
        }],
        generationConfig: {
          temperature: 0.7
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded with Gemini API. Please wait a moment and try again.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Gemini API usage limit reached. Please check your quota at Google AI Studio.' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    // Stream the response and handle tool calls
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        let currentToolCall: any = null;
        
        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (!line.trim() || line.startsWith(':')) continue;
            if (!line.startsWith('data: ')) continue;
            
            const data = line.slice(6);
            if (data === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              continue;
            }
            
            try {
              const parsed = JSON.parse(data);
              
              const candidate = parsed.candidates?.[0];
              const parts = candidate?.content?.parts || [];
              
              // Check for function calls in parts
              const functionCallPart = parts.find((part: any) => part.functionCall);
              
              if (functionCallPart) {
                currentToolCall = {
                  function: {
                    name: functionCallPart.functionCall.name,
                    arguments: JSON.stringify(functionCallPart.functionCall.args)
                  }
                };
              }
              
              // Forward text content
              const textPart = parts.find((part: any) => part.text);
              if (textPart?.text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  choices: [{ delta: { content: textPart.text } }]
                })}\n\n`));
              }
              
              // If we have a complete tool call and finish reason indicates function call
              if (currentToolCall && candidate?.finishReason === 'FUNCTION_CALL') {
                try {
                  const args = JSON.parse(currentToolCall.function.arguments);
                  
                  if (currentToolCall.function.name === 'query_database') {
                    const query = args.query;
                    
                    // Validate it's a SELECT query
                    if (!query.trim().toUpperCase().startsWith('SELECT')) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        choices: [{ delta: { content: '\n\n⚠️ Error: Only SELECT queries are allowed for security reasons.\n\n' } }]
                      })}\n\n`));
                    } else {
                      // Execute the query
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        choices: [{ delta: { content: `\n\n🔍 Executing query:\n\`\`\`sql\n${query}\n\`\`\`\n\n` } }]
                      })}\n\n`));
                      
                      const { data: queryResult, error: queryError } = await supabase.rpc('exec_raw_sql', {
                        sql_query: query
                      });
                      
                      if (queryError) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          choices: [{ delta: { content: `❌ Query error: ${queryError.message}\n\n` } }]
                        })}\n\n`));
                      } else {
                        const resultText = JSON.stringify(queryResult, null, 2);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          choices: [{ delta: { content: `✅ Query results:\n\`\`\`json\n${resultText}\n\`\`\`\n\n` } }]
                        })}\n\n`));
                      }
                    }
                  }
                  
                  currentToolCall = null;
                } catch (e) {
                  console.error('Tool execution error:', e);
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    choices: [{ delta: { content: `\n\n❌ Error executing tool: ${e.message}\n\n` } }]
                  })}\n\n`));
                }
              }
              
              // Check for stream end
              if (candidate?.finishReason === 'STOP') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              }
            } catch (e) {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
        
        controller.close();
      }
    });

    return new Response(stream, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Admin AI Assistant error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
