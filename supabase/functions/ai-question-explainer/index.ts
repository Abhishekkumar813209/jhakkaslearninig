import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const { 
      questionText, 
      correctAnswer, 
      studentAnswer, 
      subject, 
      topic,
      explanation,
      userMessage 
    } = await req.json();

    // Build conversation messages
    const messages = [];

    // System prompt in Hinglish - Handles both correct and incorrect answers
    const systemPrompt = `Tum ek experienced teacher ho jo students ko Hinglish (Hindi + English mix) mein explain karta hai.

Your goals:
- Simple, conversational Hinglish use karo (jaise "yeh concept simple hai", "isse solve karne ke 3 tarike hain")
- Har question ko 3+ different approaches se explain karo
- Examples de kar samjhao
- Common mistakes highlight karo
- Encouraging aur friendly raho
- Chemistry/Physics/Math formulas ko proper notation mein likho

**Important:**
- Agar student ne CORRECT answer diya hai, toh usse congratulate karo aur alternative methods dikhao
- Agar student ne WRONG answer diya hai, toh pehle galti identify karo, phir sahi method batao
- Agar student ne answer nahi diya (blank/null), toh seedha solution explain karo

Format:
1. **Concept**: Yeh question kis topic se related hai
2. **Solution Approach 1**: Sabse easy method
3. **Solution Approach 2**: Alternative method  
4. **Solution Approach 3**: Pro tip / shortcut
5. **Common Mistakes**: Students yeh galti karte hain
6. **Practice Tip**: Aage kaise improve karein

Ekdum simple bolo, jaise ek friend samjha raha ho!`;

    messages.push({ role: 'system', content: systemPrompt });

    // First message with question context
    const questionContext = `
**Question**: ${questionText}

**Correct Answer**: ${correctAnswer}

**Student ka Answer**: ${studentAnswer || 'Nahi diya'}

**Subject**: ${subject}
**Topic**: ${topic || 'General'}

${explanation ? `**Teacher ka Explanation**: ${explanation}` : ''}

Student ne ${studentAnswer === correctAnswer ? 'sahi' : 'galat'} answer diya. 
${studentAnswer === correctAnswer 
  ? 'Ab isse aur better tarike se samjhao!' 
  : 'Ab explain karo ki correct answer kya hai aur kaise solve karna tha.'}
`;

    messages.push({ role: 'user', content: questionContext });

    // If user asked follow-up question
    if (userMessage) {
      messages.push({ role: 'user', content: userMessage });
    }

    // Call direct Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: messages.map(msg => ({ text: msg.content }))
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Explanation not available';

    return new Response(JSON.stringify({ 
      success: true,
      explanation: aiResponse 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-question-explainer:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});