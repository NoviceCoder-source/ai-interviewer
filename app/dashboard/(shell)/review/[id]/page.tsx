'use client';
import { useEffect, useState, use } from 'react';
import { supabase } from '../../../../lib/supabase/browser';
import { useRouter } from 'next/navigation';
import { generateInterviewPDF } from '../../../../lib/pdfReport';
import { getUniqueQuestions, stripMarkdown } from '../../../../lib/questionAnalysis';
import { getScoreTheme } from '../../../../lib/scoreColors';
import { useSiteSettings } from '../../../../lib/SiteSettingsContext';
import { ArrowLeft, CalendarDays, Download, CheckCircle2, Target, Bot, User } from 'lucide-react';
import { secondaryText, secondaryTint } from '../../../../lib/theme';
import type { InterviewData } from '../../../../lib/types';
import LoadingState from '../../../../components/LoadingState';
import EndedEarlyNotice from '../../../../components/EndedEarlyNotice';

export default function ReviewReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const interviewId = resolvedParams.id;

  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const settings = useSiteSettings();

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

  const handleDownloadPDF = () => {
    if (!interview) return;
    const doc = generateInterviewPDF({
      orgName: settings.org_name,
      subject: interview.subject,
      difficulty: interview.difficulty,
      date: new Date(interview.created_at),
      report: interview.report,
      chatHistory: interview.chat_history || [],
    });
    doc.save(`report-${interview.subject}-${interview.difficulty}-${interview.created_at.slice(0, 10)}.pdf`);
  };

  if (loading) {
    return (
      <LoadingState label="Loading report..." />
    );
  }

  if (!interview) return null;

  const report = interview.report;
  const meta = getScoreTheme(report.score, report.endedEarly);
  const userResponses = interview.chat_history?.filter((m) => m.role === 'user').length ?? 0;
  const uniqueQuestions = getUniqueQuestions(interview.chat_history?.filter((m) => m.role === 'assistant') ?? []);

  const subjectEmoji = interview.subject === 'Python' ? '🐍' : interview.subject === 'SQL' ? '🗄️' : '💻';

  return (
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

        {/* STRENGTHS + IMPROVEMENTS (none for an interview that was ended early) */}
        {report.endedEarly ? (
          <div className="mb-4">
            <EndedEarlyNotice summary={report.summary} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <InsightBox title="Key Strengths" icon={<CheckCircle2 size={17} />} items={report.strengths} type="success" />
            <InsightBox title="Areas for Growth" icon={<Target size={17} />} items={report.improvements} type="warning" />
          </div>
        )}

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