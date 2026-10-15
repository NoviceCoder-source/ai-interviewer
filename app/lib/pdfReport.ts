// app/lib/pdfReport.ts
import jsPDF from 'jspdf';
import type { Message, EvaluationReport } from './types';
import { stripMarkdown as stripMarkdownLocal } from './questionAnalysis';

interface ReportPDFOptions {
  orgName: string;
  subject: string;
  difficulty: string;
  date: Date;
  report?: EvaluationReport;
  chatHistory: Message[];
  studentLine?: string; // e.g. "Student: John Doe (john@x.com)" — admin view only
  heading?: string; // default "Interview Report"
}

export function generateInterviewPDF(opts: ReportPDFOptions): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  const addText = (text: string, fontSize: number, isBold = false, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += fontSize * 0.5;
    });
    y += 3;
  };

  addText(opts.orgName.toUpperCase(), 20, true, [79, 70, 229]);
  addText(opts.heading || 'Interview Report', 12, false, [100, 100, 100]);
  if (opts.studentLine) addText(opts.studentLine, 11, false, [100, 100, 100]);
  addText(`Subject: ${opts.subject} | Difficulty: ${opts.difficulty}`, 11, false, [100, 100, 100]);
  addText(
    `Date: ${opts.date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
    11, false, [100, 100, 100]
  );

  y += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  if (opts.report) {
    addText(`FINAL SCORE: ${opts.report.score}%`, 16, true, [79, 70, 229]);
    addText(opts.report.summary, 11, false, [60, 60, 60]);
    y += 5;
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
  }

  addText('CHAT TRANSCRIPT', 13, true, [40, 40, 40]);
  y += 3;

  opts.chatHistory.forEach((msg) => {
    if (msg.role === 'assistant') {
      addText('Interviewer:', 10, true, [79, 70, 229]);
      addText(stripMarkdownLocal(msg.content), 10, false, [30, 30, 30]);
    } else if (msg.role === 'user') {
      addText('Candidate:', 10, true, [16, 185, 129]);
      addText(stripMarkdownLocal(msg.content), 10, false, [30, 30, 30]);
    }
    y += 2;
  });

  return doc;
}

// local import to avoid circular concerns; reuse the shared one
