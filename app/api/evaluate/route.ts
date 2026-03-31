import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY 
});

export async function POST(req: Request) {
  console.log("🚀 EVALUATION STARTED: Request received");

  try {
    const { history, subject } = await req.json();

    if (!history || history.length === 0) {
      return NextResponse.json({ error: "No history found" }, { status: 400 });
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a technical recruiter. Analyze the transcript for a ${subject} role.
          You MUST return a JSON object with EXACTLY these keys:
          {
            "score": <number 0-100>,
            "summary": "<2 sentence string>",
            "strengths": ["string", "string", "string"],
            "improvements": ["string", "string", "string"]
          }`
        },
        { 
          role: "user", 
          content: `Transcript: ${JSON.stringify(history)}` 
        }
      ],
      model: "llama-3.3-70b-versatile",
      // Force JSON mode
      response_format: { type: "json_object" },
      temperature: 0.2, 
    });

    const rawContent = completion.choices[0].message.content;
    
    if (!rawContent) throw new Error("AI returned empty content");

    // Parse the AI response
    const aiReport = JSON.parse(rawContent);

    // --- THE "0% ERROR" SHIELD ---
    // We map the AI data to our frontend's expected keys just in case the AI renamed them
    const finalReport = {
      score: Number(aiReport.score) || 0,
      summary: aiReport.summary || "No summary generated.",
      strengths: Array.isArray(aiReport.strengths) ? aiReport.strengths : [],
      improvements: Array.isArray(aiReport.improvements) ? aiReport.improvements : []
    };

    console.log("✅ SUCCESS: Validated report with score:", finalReport.score);
    return NextResponse.json(finalReport);

  } catch (error) {
    const err = error as Error;
    console.error("💥 API ERROR:", err.message);
    
    // Return a valid-structured object even on failure so the frontend doesn't crash
    return NextResponse.json(
      { 
        score: 0, 
        summary: "Could not generate report. Error: " + err.message, 
        strengths: [], 
        improvements: [] 
      }, 
      { status: 500 }
    );
  }
}