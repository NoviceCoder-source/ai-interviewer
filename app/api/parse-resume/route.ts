import { NextResponse } from 'next/server';
import PDFParser from 'pdf2json';
import { requireUser } from '../../lib/auth';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { jsonError, serverError } from '../../lib/http';

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
/** Fewer letters than this means the PDF is effectively unreadable (a scan, or just a stray mark). */
const MIN_RESUME_LETTERS = 50;

function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParser(null, 1);
  return new Promise((resolve, reject) => {
    parser.on('pdfParser_dataError', (err) => reject(new Error(err.parserError)));
    parser.on('pdfParser_dataReady', () => resolve(parser.getRawTextContent()));
    parser.parseBuffer(buffer);
  });
}

/** Accepts a PDF upload, stores it privately under the caller's folder, and saves its text. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return jsonError(400, 'Please choose a PDF file.');
    if (file.size > MAX_RESUME_BYTES) return jsonError(400, 'Resume must be 5 MB or smaller.');

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.subarray(0, 4).toString() !== '%PDF') return jsonError(400, 'Only PDF files are supported.');

    // pdf2json inserts "----Page (N) Break----" markers even when a page has no text (e.g. a scanned
    // image), so strip them before deciding whether the PDF contains anything readable.
    const text = (await extractPdfText(buffer))
      .replace(/\u0000/g, '')
      .replace(/-+Page \(\d+\) Break-+/g, '')
      .trim();
    const letters = text.replace(/[^\p{L}]/gu, '').length;
    if (letters < MIN_RESUME_LETTERS) return jsonError(400, 'Could not read any text from this PDF. Is it a scanned image?');

    const { error: uploadError } = await supabaseAdmin.storage
      .from('resumes')
      .upload(`${auth.userId}/${Date.now()}.pdf`, buffer, { contentType: 'application/pdf' });
    if (uploadError) throw uploadError;

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ resume_context: text, updated_at: new Date().toISOString() })
      .eq('id', auth.userId);
    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('parse-resume', err);
  }
}
