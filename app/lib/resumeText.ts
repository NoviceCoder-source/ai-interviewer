// Pure helpers for resume uploads (used by app/api/parse-resume).

/** Fewer letters than this means the PDF is effectively unreadable (a scan, or just a stray mark). */
export const MIN_RESUME_LETTERS = 50;

/**
 * Cleans text extracted by pdf2json. It inserts "----Page (N) Break----" markers even when a page has
 * no text (e.g. a scanned image), so they are removed before deciding whether anything is readable.
 */
export function cleanResumeText(raw: string): string {
  return raw
    .replace(/\u0000/g, '')
    .replace(/-+Page \(\d+\) Break-+/g, '')
    .trim();
}

/** True when the cleaned text has enough real letters to be a resume. */
export function isReadableResume(text: string): boolean {
  return text.replace(/[^\p{L}]/gu, '').length >= MIN_RESUME_LETTERS;
}
