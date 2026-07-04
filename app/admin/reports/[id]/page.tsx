'use client';
import { useEffect, useState, use } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import { useSiteSettings } from '../../../lib/SiteSettingsContext';

interface Message { role: 'user' | 'assistant'; content: string; }
interface Report { score: number; summary: string; strengths: string[]; improvements: string[]; }
interface InterviewData {
  id: string; subject: string; difficulty: string; created_at: string;
  report: Report; chat_history: Message[];
  profiles: { full_name: string; email: string } | null;
}

export default function AdminReviewReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const interviewId = resolvedParams.id;
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const settings = useSiteSettings();

  useEffect(() => {
    const fetchReport = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      try {
        const res = await fetch(`/api/admin/interview/${interviewId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.interview?.report) { router.push('/admin/reports'); return; }
        setInterview(data.interview);
      } catch (err) {
        console.error(err);
        router.push('/admin/reports');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [interviewId, router]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-500', label: 'Excellent' };
    if (score >= 60) return { text: 'text-indigo-600', bg: 'bg-indigo-500', label: 'Good' };
    if (score >= 40) return { text: 'text-amber-600', bg: 'bg-amber-500', label: 'Average' };
    return { text: 'text-red-600', bg: 'bg-red-500', label: 'Needs Work' };
  };

  const stripMarkdown = (text: string): string => text
    .replace(/```[\s\S]*?```/g, '[code block]')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.+?)\]\(.*?\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/---/g, '─────────────────')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const handleDownloadPDF = () => {
    if (!interview) return;
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

    addText(settings.org_name.toUpperCase(), 20, true, [79, 70, 229]);
    addText('Interview Report', 12, false, [100, 100, 100]);
    addText(`Student: ${interview.profiles?.full_name || 'Unknown'} (${interview.profiles?.email || 'N/A'})`, 11, false, [100, 100, 100]);
    addText(`Subject: ${interview.subject} | Difficulty: ${interview.difficulty}`, 11, false, [100, 100, 100]);
    addText(`Date: ${new Date(interview.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 11, false, [100, 100, 100]);

    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    addText(`FINAL SCORE: ${interview.report.score}%`, 16, true, [79, 70, 229]);
    addText(interview.report.summary, 11, false, [60, 60, 60]);
    y += 5;
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    addText('CHAT TRANSCRIPT', 13, true, [40, 40, 40]);
    y += 3;

    interview.chat_history?.forEach((msg) => {
      if (msg.role === 'assistant') {
        addText('Interviewer:', 10, true, [79, 70, 229]);
        addText(stripMarkdown(msg.content), 10, false, [30, 30, 30]);
      } else if (msg.role === 'user') {
        addText('Candidate:', 10, true, [16, 185, 129]);
        addText(stripMarkdown(msg.content), 10, false, [30, 30, 30]);
      }
      y += 2;
    });

    doc.save(`report-${interview.profiles?.full_name || 'student'}-${interview.subject}-${interview.created_at.slice(0, 10)}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-indigo-600 font-black uppercase tracking-widest text-xs">Loading Report...</p>
      </div>
    );
  }

  if (!interview) return null;

  const report = interview.report;
  const scoreColors = getScoreColor(report.score);
  const userResponses = interview.chat_history?.filter(m => m.role === 'user').length ?? 0;
  const assistantMessages = interview.chat_history?.filter(m => m.role === 'assistant') ?? [];

  const STOP_WORDS = new Set([
    'what','is','are','the','a','an','in','of','to','do','does','how',
    'why','when','where','which','can','you','your','it','its','this',
    'that','and','or','for','with','about','between','explain','describe',
    'define','tell','me','difference','use','used','give','example','write',
    'simple','basic','python','sql','data','machine','learning','analytics'
  ]);

  const extractQuestion = (content: string): string => {
    const sentences = content.split(/(?<=[.?!])\s+/);
    const questionSentence = sentences.find(s => s.trim().endsWith('?')) || sentences[sentences.length - 1];
    return questionSentence.toLowerCase().trim();
  };

  const getKeywords = (text: string): Set<string> => new Set(
    text.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w))
  );

  const uniqueQuestions = assistantMessages.filter((msg, index) => {
    if (index === 0) return true;
    const currentKeywords = getKeywords(extractQuestion(msg.content));
    if (currentKeywords.size === 0) return true;
    const isDuplicate = assistantMessages.slice(0, index).some(prevMsg => {
      const prevKeywords = getKeywords(extractQuestion(prevMsg.content));
      if (prevKeywords.size === 0) return false;
      const overlap = [...currentKeywords].filter(w => prevKeywords.has(w)).length;
      return overlap / Math.max(currentKeywords.size, prevKeywords.size) >= 0.75;
    });
    return !isDuplicate;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-4 py-8">

        <button
          onClick={() => router.push('/admin/reports')}
          className="group mb-4 flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:text-black transition-colors"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Reports
        </button>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">Interview Report</p>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                {interview.subject} <span className="text-gray-300">·</span>{' '}
                <span className="text-indigo-500">{interview.difficulty}</span>
              </h2>
              <p className="text-gray-600 text-xs font-bold mt-1">
                {interview.profiles?.full_name || 'Unknown Student'} <span className="text-gray-300">·</span> {interview.profiles?.email}
              </p>
              <p className="text-gray-400 text-xs font-medium mt-1">
                {new Date(interview.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-7xl font-black tracking-tighter ${scoreColors.text}`}>
                {report.score}<span className="text-3xl">%</span>
              </div>
              <span className={`inline-block mt-1 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${scoreColors.bg}`}>
                {scoreColors.label}
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div className={`h-2.5 rounded-full transition-all duration-1000 ${scoreColors.bg}`} style={{ width: `${report.score}%` }} />
          </div>
          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-300 mt-1.5">
            <span>0</span><span>50</span><span>100</span>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">📋</div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Interviewer&apos;s Assessment</h3>
          </div>
          <p className="text-gray-700 leading-relaxed text-base font-medium border-l-4 border-indigo-200 pl-4 italic">
            {report.summary}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-lg">✅</div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Key Strengths</h3>
            </div>
            <div className="space-y-3">
              {report.strengths?.length ? report.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <span className="text-emerald-500 font-black text-sm mt-0.5">→</span>
                  <p className="text-emerald-800 text-xs font-bold leading-relaxed">{s}</p>
                </div>
              )) : <p className="text-gray-300 text-xs">No strengths recorded.</p>}
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-lg">🎯</div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Areas for Growth</h3>
            </div>
            <div className="space-y-3">
              {report.improvements?.length ? report.improvements.map((im, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-100">
                  <span className="text-amber-500 font-black text-sm mt-0.5">→</span>
                  <p className="text-amber-800 text-xs font-bold leading-relaxed">{im}</p>
                </div>
              )) : <p className="text-gray-300 text-xs">No improvements recorded.</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-[2rem] p-6 shadow-xl text-center">
            <p className="text-3xl font-black text-gray-900">{userResponses}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">Responses Given</p>
          </div>
          <div className="bg-white rounded-[2rem] p-6 shadow-xl text-center">
            <p className="text-3xl font-black text-gray-900">{uniqueQuestions.length}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">Unique Questions</p>
          </div>
          <div className="bg-white rounded-[2rem] p-6 shadow-xl text-center">
            <p className={`text-3xl font-black ${scoreColors.text}`}>{scoreColors.label}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">Overall Rating</p>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-6 shadow-xl flex flex-col gap-3">
          <button
            onClick={handleDownloadPDF}
            className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl"
          >
            📄 Download Report as PDF
          </button>
          <button
            onClick={() => router.push('/admin/reports')}
            className="w-full bg-indigo-50 text-indigo-700 py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-indigo-100 transition-all border border-indigo-100"
          >
            ← Back to Reports
          </button>
        </div>

      </div>
    </div>
  );
}