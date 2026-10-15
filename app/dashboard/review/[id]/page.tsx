'use client';
import { useEffect, useState, use } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import { useSiteSettings } from '../../../lib/SiteSettingsContext';
import {
  ArrowLeft, Bell, CalendarDays, Download,
  CheckCircle2, Target, Bot, User, ChevronDown,
  LayoutDashboard, Mic, History, BarChart3, Settings, Sparkles,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface EvaluationReport {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

interface InterviewData {
  id: string;
  subject: string;
  difficulty: string;
  created_at: string;
  report: EvaluationReport;
  chat_history: Message[];
}

export default function ReviewReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const interviewId = resolvedParams.id;

  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const settings = useSiteSettings();
  const [menuOpen, setMenuOpen] = useState(false);

  const primaryBg = { backgroundColor: 'var(--color-primary)' };
  const secondaryBg = { backgroundColor: 'var(--color-secondary)' };
  const secondaryText = { color: 'var(--color-secondary)' };
  const secondaryTint = (pct: number) => ({ backgroundColor: `color-mix(in srgb, var(--color-secondary) ${pct}%, transparent)` });
  const primaryTint = (pct: number) => ({ backgroundColor: `color-mix(in srgb, var(--color-primary) ${pct}%, transparent)` });

  useEffect(() => {
    const fetchReport = async () => {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .single();

      if (error || !data?.report) {
        router.push('/dashboard/review');
        return;
      }

      setInterview(data as InterviewData);
      setLoading(false);
    };
    fetchReport();
  }, [interviewId, router]);

  const getScoreMeta = (score: number) => {
    if (score >= 80) return { color: '#16A36D', bg: '#F4FFFB', border: '#CCEFE2', label: 'Excellent' };
    if (score >= 60) return { color: 'var(--color-secondary)', bg: 'color-mix(in srgb, var(--color-secondary) 8%, white)', border: 'color-mix(in srgb, var(--color-secondary) 25%, white)', label: 'Good' };
    if (score >= 40) return { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Average' };
    return { color: '#EF3948', bg: '#FFF7F8', border: '#FFD9DD', label: 'Needs Work' };
  };

  const stripMarkdown = (text: string): string => {
    return text
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
  };

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

    doc.save(`report-${interview.subject}-${interview.difficulty}-${interview.created_at.slice(0, 10)}.pdf`);
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#f5f8fc] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: 'var(--color-secondary)', borderTopColor: 'transparent' }} />
        <p className="font-medium tracking-widest text-xs uppercase" style={secondaryText}>Loading report...</p>
      </div>
    );
  }

  if (!interview) return null;

  const report = interview.report;
  const meta = getScoreMeta(report.score);
  const userResponses = interview.chat_history?.filter((m) => m.role === 'user').length ?? 0;
  const assistantMessages = interview.chat_history?.filter((m) => m.role === 'assistant') ?? [];

  const STOP_WORDS = new Set([
    'what', 'is', 'are', 'the', 'a', 'an', 'in', 'of', 'to', 'do', 'does', 'how',
    'why', 'when', 'where', 'which', 'can', 'you', 'your', 'it', 'its', 'this',
    'that', 'and', 'or', 'for', 'with', 'about', 'between', 'explain', 'describe',
    'define', 'tell', 'me', 'difference', 'use', 'used', 'give', 'example', 'write',
    'simple', 'basic', 'python', 'sql', 'data', 'machine', 'learning', 'analytics',
  ]);

  const extractQuestion = (content: string): string => {
    const sentences = content.split(/(?<=[.?!])\s+/);
    const questionSentence = sentences.find((s) => s.trim().endsWith('?')) || sentences[sentences.length - 1];
    return questionSentence.toLowerCase().trim();
  };

  const getKeywords = (text: string): Set<string> => new Set(
    text.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );

  const uniqueQuestions = assistantMessages.filter((msg, index) => {
    if (index === 0) return true;
    const currentKeywords = getKeywords(extractQuestion(msg.content));
    if (currentKeywords.size === 0) return true;
    const isDuplicate = assistantMessages.slice(0, index).some((prevMsg) => {
      const prevKeywords = getKeywords(extractQuestion(prevMsg.content));
      if (prevKeywords.size === 0) return false;
      const overlap = [...currentKeywords].filter((w) => prevKeywords.has(w)).length;
      return overlap / Math.max(currentKeywords.size, prevKeywords.size) >= 0.75;
    });
    return !isDuplicate;
  });

  const subjectEmoji = interview.subject === 'Python' ? '🐍' : interview.subject === 'SQL' ? '🗄️' : '💻';

  return (
    <div className="h-screen bg-[#f5f8fc] text-[#102b59] flex overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-[240px] shrink-0 hidden lg:flex lg:flex-col text-white" style={primaryBg}>
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
          {settings.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo_url} alt={settings.org_name} className="h-8 object-contain" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={secondaryBg}>
              <div className="flex items-end gap-[3px]">
                <span className="h-2.5 w-[3px] rounded-full bg-white" />
                <span className="h-5 w-[3px] rounded-full bg-white" />
                <span className="h-7 w-[3px] rounded-full bg-white" />
                <span className="h-4 w-[3px] rounded-full bg-white" />
                <span className="h-2.5 w-[3px] rounded-full bg-white" />
              </div>
            </div>
          )}
          <span className="text-lg font-bold tracking-tight truncate">{settings.org_name}</span>
        </div>

        <nav className="flex-1 px-4 py-5 overflow-y-auto">
          <SidebarItem icon={<LayoutDashboard size={19} />} label="Dashboard" onClick={() => router.push('/dashboard')} />
          <SidebarItem icon={<Mic size={19} />} label="New Interview" onClick={() => router.push('/dashboard/setup')} />
          <SidebarItem icon={<History size={19} />} label="Past Sessions" active activeStyle={secondaryBg} />
          <SidebarItem icon={<BarChart3 size={19} />} label="Performance" onClick={() => router.push('/dashboard/performance')} />
          <SidebarItem icon={<Settings size={19} />} label="Settings" disabled />
        </nav>

        <div className="mx-4 mb-4 overflow-hidden rounded-xl relative p-4" style={primaryTint(70)}>
          <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
            <Sparkles size={14} style={secondaryText} />
          </div>
          <h3 className="text-sm font-bold leading-tight">Build Your Interview Confidence</h3>
          <p className="mt-1 text-xs text-blue-100/70">Practice. Improve. Get hired.</p>
          <div className="absolute -bottom-6 -right-4 h-16 w-16 rounded-full blur-sm" style={secondaryTint(25)} />
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex h-16 items-center justify-end border-b border-[#e7eef7] bg-white px-8 shrink-0">
          <div className="flex items-center gap-6">
            <button className="relative text-[#173b70] hover:opacity-70 transition">
              <Bell size={19} />
              <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full" style={secondaryBg} />
            </button>
            <div className="relative">
              <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs" style={{ ...secondaryTint(15), ...secondaryText }}>
                  U
                </div>
                <ChevronDown size={14} className="text-[#7285a0]" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-[#e7eef7] py-2 z-10">
                  <button onClick={() => router.push('/dashboard')} className="w-full text-left px-4 py-2 text-sm font-semibold text-[#102b58] hover:bg-gray-50 transition-colors">
                    Back to Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-[1250px] mx-auto">

            <button
              onClick={() => router.push('/dashboard/review')}
              className="flex items-center gap-2 font-medium text-sm mb-5 hover:gap-3 transition-all"
              style={secondaryText}
            >
              <ArrowLeft size={16} /> Back to Past Sessions
            </button>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#112f61]">Interview Report</h1>
                <p className="text-sm text-[#7185a3] mt-1">
                  Here is your detailed performance analysis for the{' '}
                  <span className="font-semibold text-[#3b5275]">{interview.subject} - {interview.difficulty}</span> interview.
                </p>
              </div>

              <div className="bg-white border border-[#dce8f6] rounded-2xl px-4 py-2.5 flex flex-wrap items-center gap-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm" style={secondaryTint(12)}>{subjectEmoji}</div>
                  <span className="font-semibold text-sm">{interview.subject}</span>
                </div>
                <span style={secondaryTint(12)} className="text-xs font-semibold px-3 py-1 rounded-full">
                  <span style={secondaryText}>{interview.difficulty}</span>
                </span>
                <div className="flex items-center gap-1.5 text-sm text-[#70839f]">
                  <CalendarDays size={15} />
                  {new Date(interview.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* SCORE + ASSESSMENT */}
            <section className="bg-white rounded-2xl border border-[#e0eaf5] shadow-sm p-6 mb-4">
              <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6 items-center">
                <div className="flex items-center gap-6">
                  <div className="relative w-[100px] h-[100px] shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="48" fill="none" stroke="#e5edf7" strokeWidth="10" />
                      <circle cx="60" cy="60" r="48" fill="none" stroke={meta.color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${report.score * 3.01} 301`} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold">{report.score}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-[#8293aa] mb-1">Overall Score</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold" style={{ color: meta.color }}>{report.score}%</span>
                      <span style={{ backgroundColor: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }} className="px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        {meta.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#edf2f7] pt-4 xl:border-t-0 xl:border-l xl:pl-6 xl:pt-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#8293aa] mb-2">Interviewer&apos;s Assessment</p>
                  <p className="text-sm text-[#506783] italic leading-6 border-l-4 pl-3" style={{ borderColor: 'var(--color-secondary)' }}>
                    {report.summary}
                  </p>
                </div>
              </div>
            </section>

            {/* STRENGTHS + IMPROVEMENTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <InsightBox title="Key Strengths" icon={<CheckCircle2 size={17} />} items={report.strengths} type="success" />
              <InsightBox title="Areas for Growth" icon={<Target size={17} />} items={report.improvements} type="warning" />
            </div>

            {/* STATS */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <StatCard value={userResponses} label="Responses Given" />
              <StatCard value={uniqueQuestions.length} label="Unique Questions" />
              <StatCard value={meta.label} label="Overall Rating" color={meta.color} />
            </div>

            {/* TRANSCRIPT */}
            <section className="bg-white rounded-2xl border border-[#e0eaf5] shadow-sm p-6 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={secondaryTint(12)}>
                    <Bot size={18} style={secondaryText} />
                  </div>
                  <h2 className="text-lg font-bold">Interview Transcript</h2>
                </div>
                <button
                  onClick={handleDownloadPDF}
                  style={{ borderColor: 'var(--color-secondary)', ...secondaryText }}
                  className="flex items-center justify-center gap-2 px-4 py-2 border rounded-full text-sm font-semibold hover:opacity-80 transition"
                >
                  <Download size={15} /> Download Report (PDF)
                </button>
              </div>

              <div className="space-y-4">
                {interview.chat_history?.map((msg, i) => (
                  <TranscriptMessage
                    key={i}
                    speaker={msg.role === 'assistant' ? 'Interviewer' : 'You'}
                    icon={msg.role === 'assistant' ? <Bot size={17} /> : <User size={17} />}
                    message={stripMarkdown(msg.content)}
                    interviewer={msg.role === 'assistant'}
                    secondaryTint={secondaryTint}
                    secondaryText={secondaryText}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, disabled, onClick, activeStyle }: {
  icon: React.ReactNode; label: string; active?: boolean; disabled?: boolean; onClick?: () => void; activeStyle?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={active ? activeStyle : undefined}
      className={`mb-1.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
        active ? 'text-white shadow-lg shadow-blue-950/20' : disabled ? 'text-blue-100/30 cursor-not-allowed' : 'text-blue-100/75 hover:bg-white/10 hover:text-white'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function InsightBox({ title, items, type, icon }: { title: string; items: string[]; type: 'success' | 'warning'; icon: React.ReactNode }) {
  const styles = type === 'success'
    ? { wrapper: 'bg-[#f3fffa] border-[#ccefe1]', title: 'text-[#008c65]', chip: 'bg-white text-[#18ad7a]' }
    : { wrapper: 'bg-[#fffaf0] border-[#fde68a]', title: 'text-[#b45309]', chip: 'bg-white text-[#d97706]' };

  return (
    <div className={`border rounded-2xl p-5 ${styles.wrapper}`}>
      <div className={`flex items-center gap-2 font-bold text-sm mb-3 uppercase tracking-wide ${styles.title}`}>
        {icon} {title}
      </div>
      <div className="space-y-2">
        {items?.length ? items.map((item, i) => (
          <div key={i} className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 ${styles.chip}`}>
            <span className="font-bold mt-0.5">→</span>
            <span className="text-sm font-semibold leading-5">{item}</span>
          </div>
        )) : <p className="text-sm text-gray-400">None recorded.</p>}
      </div>
    </div>
  );
}

function StatCard({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e0eaf5] shadow-sm p-5 text-center">
      <p className="text-3xl font-black" style={color ? { color } : undefined}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#8293aa] mt-1">{label}</p>
    </div>
  );
}

function TranscriptMessage({ speaker, icon, message, interviewer, secondaryTint, secondaryText }: {
  speaker: string; icon: React.ReactNode; message: string; interviewer: boolean;
  secondaryTint: (pct: number) => React.CSSProperties; secondaryText: React.CSSProperties;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5 ml-1">
        <span className="text-xs font-semibold text-[#49617f]">{speaker}</span>
      </div>
      <div className={`flex gap-3 p-3.5 rounded-xl border ${interviewer ? 'bg-[#f7fbff] border-[#e1edf8]' : 'bg-[#fafcff] border-[#e9eff6]'}`}>
        <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center" style={interviewer ? { ...secondaryTint(12), ...secondaryText } : { backgroundColor: '#e8eef7', color: '#7690af' }}>
          {icon}
        </div>
        <div className="text-sm text-[#526983] leading-6 whitespace-pre-wrap">{message}</div>
      </div>
    </div>
  );
}