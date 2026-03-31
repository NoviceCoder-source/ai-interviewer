import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { messages, message, history, userId, subject } = await req.json();

    // Normalize: support both {messages} and {message + history} formats
    const conversationMessages = messages || [
      ...(history || []),
      ...(message ? [{ role: 'user', content: message }] : [])
    ];

    let systemInstruction = "";

    if (subject && subject !== 'Resume-Based') {
      // MODE A: Specific Subject Interview (Python, SQL, ML, Analytics)
      systemInstruction = `
        You are a Senior Technical Interviewer specializing in ${subject}. 
        Focus strictly on evaluating the candidate's proficiency in ${subject}.
        - If the subject is Python: Focus on data structures, libraries (Pandas/NumPy), and clean code.
        - If the subject is SQL: Focus on complex joins, window functions, and optimization.
        - If the subject is ML/Analytics: Focus on model evaluation, feature engineering, and data insights.
        Ask one technical question at a time and wait for the response.
      `;
    } else {
      // MODE B: Resume-Based Interview
      // Get userId from messages context if not directly provided
      const { data: { user } } = await supabaseAdmin.auth.getUser();
      
      // Try to get userId from the request or fall back to fetching via session
      let resolvedUserId = userId;
      
      if (!resolvedUserId) {
        // Fetch the most recent user who uploaded a resume as fallback
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, resume_context')
          .not('resume_context', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        
        resolvedUserId = profile?.id;
      }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('resume_context')
        .eq('id', resolvedUserId)
        .single();

      const resumeContext = profile?.resume_context || "No resume context found.";
      
      systemInstruction = `
        You are a Senior Technical Interviewer. The candidate has provided their resume below.
        Study it carefully and ask questions SPECIFICALLY about their actual projects, tools, and experience.
        
        CANDIDATE RESUME:
        """
        ${resumeContext}
        """
        
        STRICT RULES:
        - Ask questions ONLY about what is mentioned in the resume above.
        - Reference specific projects, tools, and technologies from their resume.
        - For example, if they built a WhatsApp project with N8N, ask about N8N workflows specifically.
        - Do NOT make assumptions or ask generic questions unrelated to their resume.
        - Focus on Python, SQL, Data Analytics, and Machine Learning aspects of their projects.
        - Ignore any mention of SoC, HDL, Digital Electronics, or IoT.
        - Ask one question at a time and wait for the response.
      `;
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemInstruction },
        ...conversationMessages
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "";

    return NextResponse.json({ text: aiResponse });

  } catch (err: unknown) {
    console.error("❌ CHAT ERROR:", err);
    return NextResponse.json({ error: "Failed to initialize interview session." }, { status: 500 });
  }
}