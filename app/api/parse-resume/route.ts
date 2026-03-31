import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PDFParser from 'pdf2json';

// Use the Service Role Key to bypass RLS policies during the parse
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use the SECRET service key here
);

export async function POST(req: Request) {
  try {
    const { filePath, userId } = await req.json();

    console.log("🆔 Admin Sync for User ID:", userId);

    if (!filePath || !userId) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // 1. Download from Storage
    const { data, error: downloadError } = await supabaseAdmin.storage
      .from('resumes')
      .download(filePath);

    if (downloadError) throw downloadError;

    // 2. Parse PDF
    const buffer = Buffer.from(await data.arrayBuffer());
    const pdfParser = new PDFParser(null, 1);
    
    const fullText = await new Promise<string>((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (errData: { parserError: string }) => reject(errData.parserError));
      pdfParser.on("pdfParser_dataReady", () => {
        resolve(pdfParser.getRawTextContent());
      });
      pdfParser.parseBuffer(buffer);
    });

    const cleanedText = fullText.replace(/\u0000/g, '').trim();
    console.log("📝 Extracted Text Length:", cleanedText.length);

    // 3. THE FIX: Admin Upsert (Bypasses RLS)
    const { data: upsertData, error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({ 
        id: userId, 
        resume_context: cleanedText,
        updated_at: new Date().toISOString() 
      })
      .select();

    if (upsertError) {
      console.error("❌ Admin Sync Error:", upsertError.message);
      throw upsertError;
    }

    console.log("✅ Admin Sync Success! Rows affected:", upsertData?.length);

    return NextResponse.json({ 
      success: true, 
      message: "Resume saved via Admin sync!",
      textLength: cleanedText.length 
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error("❌ PARSE ROUTE CRASHED:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}