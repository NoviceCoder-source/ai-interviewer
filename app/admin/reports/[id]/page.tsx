'use client';
import { useEffect, useState, use } from 'react';
import { api } from '../../../lib/api';
import { useRouter } from 'next/navigation';
import { useSiteSettings } from '../../../lib/SiteSettingsContext';
import type { AdminInterviewData as InterviewData } from '../../../lib/types';
import { getScoreColor } from '../../../lib/scoreColors';
import { getUniqueQuestions } from '../../../lib/questionAnalysis';
import { generateInterviewPDF } from '../../../lib/pdfReport';
import ScoreCard from '../../../components/ScoreCard';
import StrengthsImprovements from '../../../components/StrengthsImprovements';
import ReportActions from '../../../components/ReportActions';

export default function AdminReviewReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const interviewId = resolvedParams.id;
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const settings = useSiteSettings();

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const { interview } = await api.get<{ interview: InterviewData }>(`/api/admin/interview/${interviewId}`);
        if (!interview?.report) { router.push('/admin/reports'); return; }
        setInterview(interview);
      } catch {
        router.push('/admin/reports');
      } finally {
        setLoading(false);
      }
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
    chatHistory: interview.chat_history,
    studentLine: `Student: ${interview.profiles?.full_name || 'Unknown'} (${interview.profiles?.email || 'N/A'})`,
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

  const uniqueQuestions = getUniqueQuestions(assistantMessages);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-4 py-8">

        <button
          onClick={() => router.push('/admin/reports')}
          className="group mb-4 flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:text-black transition-colors"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Reports
        </button>

        <ScoreCard
          subject={interview.subject}
          difficulty={interview.difficulty}
          date={new Date(interview.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          score={report.score}
          scoreColors={scoreColors}
          studentLine={`${interview.profiles?.full_name || 'Unknown Student'} · ${interview.profiles?.email}`}
        />

        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">📋</div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Interviewer&apos;s Assessment</h3>
          </div>
          <p className="text-gray-700 leading-relaxed text-base font-medium border-l-4 border-indigo-200 pl-4 italic">
            {report.summary}
          </p>
        </div>

        <StrengthsImprovements strengths={report.strengths} improvements={report.improvements} />

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

        <ReportActions
          onDownloadPDF={handleDownloadPDF}
          onBack={() => router.push('/admin/reports')}
          backLabel="← Back to Reports"
        />

      </div>
    </div>
  );
}