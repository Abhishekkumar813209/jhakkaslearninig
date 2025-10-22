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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        tools: tools,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment and try again.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Free usage limit reached. Please add credits to your Lovable workspace.' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Stream the response and handle tool calls
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        let toolCalls: any[] = [];
        
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
              const delta = parsed.choices?.[0]?.delta;
              
              // Check for tool calls
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  if (!toolCalls[tc.index]) {
                    toolCalls[tc.index] = { id: tc.id, type: tc.type, function: { name: '', arguments: '' } };
                  }
                  if (tc.function?.name) toolCalls[tc.index].function.name = tc.function.name;
                  if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
                }
              }
              
              // Forward non-tool content
              if (delta?.content || parsed.choices?.[0]?.finish_reason === 'stop') {
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
              
              // Execute tool if finish_reason is tool_calls
              if (parsed.choices?.[0]?.finish_reason === 'tool_calls' && toolCalls.length > 0) {
                for (const toolCall of toolCalls) {
                  if (toolCall.function.name === 'query_database') {
                    try {
                      const args = JSON.parse(toolCall.function.arguments);
                      const query = args.query.trim();
                      
                      // Validate SELECT only
                      if (!query.toUpperCase().startsWith('SELECT')) {
                        throw new Error('Only SELECT queries are allowed');
                      }
                      
                      console.log('Executing query:', query);
                      const startTime = Date.now();
                      
                      // Use .rpc() to execute raw SQL
                      const { data: queryData, error: queryError, count } = await supabase.rpc('exec_raw_sql', { 
                        sql_query: query 
                      });
                      
                      const executionTime = Date.now() - startTime;
                      
                      if (queryError) {
                        console.error('Query error:', queryError);
                        const errorResult = `Query failed: ${queryError.message}`;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          choices: [{ delta: { content: `\n\n❌ ${errorResult}\n\n` } }]
                        })}\n\n`));
                      } else {
                        const rowCount = Array.isArray(queryData) ? queryData.length : 0;
                        const resultText = `\n\n✅ Query executed in ${executionTime}ms (${rowCount} rows):\n\`\`\`json\n${JSON.stringify(queryData, null, 2).substring(0, 2000)}${JSON.stringify(queryData).length > 2000 ? '\n...(truncated)' : ''}\n\`\`\`\n\n`;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          choices: [{ delta: { content: resultText } }]
                        })}\n\n`));
                      }
                    } catch (error) {
                      console.error('Tool execution error:', error);
                      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        choices: [{ delta: { content: `\n\n❌ Error: ${errorMsg}\n\n` } }]
                      })}\n\n`));
                    }
                  }
                }
                
                // Send completion marker after tool execution
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
