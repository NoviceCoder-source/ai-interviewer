// lib/types.d.ts
declare module 'pdf2json' {
    class PDFParser {
        // Use 'unknown' instead of 'any' to satisfy strict ESLint rules
        constructor(owner: unknown, flags: number);
        
        on(event: 'pdfParser_dataError', callback: (err: { parserError: string }) => void): void;
        
        // Using 'unknown' here as well
        on(event: 'pdfParser_dataReady', callback: (data: unknown) => void): void;
        
        parseBuffer(buffer: Buffer): void;
        
        getRawTextContent(): string;
    }
    export default PDFParser;
}