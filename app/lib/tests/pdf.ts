// PDF export of an MCQ test report (runs in the browser).
import jsPDF from 'jspdf';
import { LEVEL_LABELS, MAX_TAB_SWITCHES, SUBMIT_REASON_LABELS, TEST_LEVELS } from './config';
import type { FinishedTest } from './types';

export function generateTestPDF(test: FinishedTest, orgName: string): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  const add = (text: string, size = 10, bold = false, color: [number, number, number] = [30, 30, 30], indent = 0) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    for (const line of doc.splitTextToSize(text, maxWidth - indent) as string[]) {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(line, margin + indent, y);
      y += size * 0.5;
    }
    y += 2;
  };
  const rule = () => {
    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;
  };

  const r = test.result;
  add(orgName.toUpperCase(), 18, true, [79, 70, 229]);
  add('MCQ Test Report', 12, false, [100, 100, 100]);
  if (test.student) add(`Student: ${test.student.full_name} (${test.student.email})`, 10, false, [100, 100, 100]);
  add(`Subject: ${test.subject}${test.topic_name ? ` · Topic: ${test.topic_name}` : ' · All topics'} · Level: ${LEVEL_LABELS[test.level]}`, 10, false, [100, 100, 100]);
  add(`Date: ${new Date(test.started_at).toLocaleString()}`, 10, false, [100, 100, 100]);
  rule();

  add(`SCORE: ${r.score} / ${r.maxScore}`, 16, true, [79, 70, 229]);
  add(`Correct ${r.correct} · Wrong ${r.wrong} · Unanswered ${r.skipped} · Total ${r.total}`);
  add(test.negative_marking ? `Negative marking: on (${test.negative_mark} × marks per wrong answer, ${r.negativeMarks} deducted)` : 'Negative marking: off');
  if (test.submit_reason) add(SUBMIT_REASON_LABELS[test.submit_reason] ?? test.submit_reason);
  add(`Tab / window switches: ${test.tab_switches} of ${MAX_TAB_SWITCHES}`);
  rule();

  add('MARKS BY LEVEL', 11, true);
  for (const l of TEST_LEVELS) {
    const b = r.byDifficulty[l];
    add(`${LEVEL_LABELS[l]}: ${b.marks}/${b.maxMarks} marks · ${b.correct} correct, ${b.wrong} wrong, ${b.skipped} unanswered`);
  }
  add('BY TOPIC', 11, true);
  for (const t of r.byTopic) add(`${t.topic}: ${t.correct}/${t.total} correct · ${t.marks}/${t.maxMarks} marks`);
  rule();

  if (test.report) {
    add('SUMMARY', 11, true);
    add(test.report.summary);
    if (test.report.strengths.length) {
      add('Strengths', 10, true);
      test.report.strengths.forEach((s) => add(`• ${s}`, 10, false, [30, 30, 30], 3));
    }
    if (test.report.improvements.length) {
      add('Areas to improve', 10, true);
      test.report.improvements.forEach((s) => add(`• ${s}`, 10, false, [30, 30, 30], 3));
    }
    rule();
  }

  if (test.proctor_log.length) {
    add('ANTI-CHEATING LOG', 11, true);
    for (const e of test.proctor_log) {
      const when = new Date(e.at).toLocaleTimeString();
      const what = e.type === 'leave' ? `Left the test window (${e.detail ?? ''})`
        : e.type === 'return' ? `Returned after ${e.awaySeconds ?? '?'}s`
        : `Auto-submitted (${SUBMIT_REASON_LABELS[e.detail ?? ''] ?? e.detail})`;
      add(`${when} — ${what}`, 9);
    }
    rule();
  }

  add('QUESTION REVIEW', 11, true);
  test.questions.forEach((q, i) => {
    const answer = test.answers[q.id];
    const status = answer === undefined ? 'Unanswered' : answer === q.correct_index ? 'Correct' : 'Wrong';
    const color: [number, number, number] = status === 'Correct' ? [16, 140, 90] : status === 'Wrong' ? [200, 50, 50] : [120, 120, 120];
    add(`Q${i + 1}. [${LEVEL_LABELS[q.difficulty]} · ${q.topic}] ${q.question}`, 10, true);
    q.options.forEach((o, j) => {
      const marks = `${j === q.correct_index ? '  (correct answer)' : ''}${j === answer ? '  (your answer)' : ''}`;
      add(`${String.fromCharCode(65 + j)}. ${o}${marks}`, 9, j === q.correct_index, [60, 60, 60], 4);
    });
    add(status, 9, true, color, 4);
    if (q.explanation) add(`Explanation: ${q.explanation}`, 9, false, [100, 100, 100], 4);
    y += 2;
  });

  return doc;
}
