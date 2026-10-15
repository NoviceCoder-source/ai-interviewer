'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase/browser';
import { BarChart3, TrendingUp, Award, Target, Calendar } from 'lucide-react';
import { secondaryBg, secondaryText, secondaryTint } from '../../../lib/theme';
import type { InterviewSummary as InterviewSession } from '../../../lib/types';
import LoadingState from '../../../components/LoadingState';

export default function PerformancePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data, error } = await supabase
          .from('interviews')
          .select('*')
          .not('report', 'is', null)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (data) setSessions(data as InterviewSession[]);
      } catch (err) {
        console.error('Error fetching sessions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const stats = useMemo(() => {
    if (sessions.length === 0) return null;

    const totalSessions = sessions.length;
    const avgScore = Math.round(sessions.reduce((sum, s) => sum + s.report.score, 0) / totalSessions);

    const bySubject: Record<string, number[]> = {};
    sessions.forEach((s) => {
      if (!bySubject[s.subject]) bySubject[s.subject] = [];
      bySubject[s.subject].push(s.report.score);
    });
    const subjectAverages = Object.entries(bySubject).map(([subject, scores]) => ({
      subject,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length,
    })).sort((a, b) => b.avg - a.avg);

    const bestSubject = subjectAverages[0];
    const firstScore = sessions[0].report.score;
    const lastScore = sessions[sessions.length - 1].report.score;
    const improvement = lastScore - firstScore;

    return { totalSessions, avgScore, subjectAverages, bestSubject, improvement };
  }, [sessions]);

  if (loading) {
    return (
      <LoadingState label="Loading performance..." />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
      <div className="mx-auto max-w-[1250px]">

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={secondaryTint(12)}>
            <BarChart3 size={20} style={secondaryText} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Performance</h1>
            <p className="mt-0.5 text-xs text-[#718aa7]">Track your growth across every interview you have completed.</p>
          </div>
        </div>

        {!stats ? (
          <div className="rounded-2xl border border-dashed border-[#cbddec] bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={secondaryTint(12)}>
              <BarChart3 size={24} style={secondaryText} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-ink-soft">No data yet</h3>
            <p className="mt-1.5 text-sm text-[#8298b1]">Complete an interview to start seeing your performance trends here.</p>
            <button onClick={() => router.push('/dashboard/setup')} style={secondaryBg} className="mt-5 px-6 py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition">
              Start First Interview
            </button>
          </div>
        ) : (
          <>
            {/* STAT CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard icon={<Calendar size={18} style={secondaryText} />} tint={secondaryTint(12)} value={stats.totalSessions} label="Total Sessions" />
              <StatCard icon={<Target size={18} style={secondaryText} />} tint={secondaryTint(12)} value={`${stats.avgScore}%`} label="Average Score" />
              <StatCard icon={<Award size={18} style={secondaryText} />} tint={secondaryTint(12)} value={stats.bestSubject.subject} label="Best Subject" sub={`${stats.bestSubject.avg}% avg`} />
              <StatCard
                icon={<TrendingUp size={18} style={{ color: stats.improvement >= 0 ? '#16A36D' : '#EF3948' }} />}
                tint={{ backgroundColor: stats.improvement >= 0 ? '#F4FFFB' : '#FFF7F8' }}
                value={`${stats.improvement >= 0 ? '+' : ''}${stats.improvement}%`}
                label="Improvement"
                sub="First vs latest"
                valueColor={stats.improvement >= 0 ? '#16A36D' : '#EF3948'}
              />
            </div>

            {/* SCORE TREND */}
            <div className="bg-white rounded-2xl border border-[#e0eaf4] shadow-sm p-6 mb-6">
              <h2 className="text-base font-bold text-ink mb-5">Score Trend</h2>
              <ScoreTrendChart sessions={sessions} />
            </div>

            {/* SUBJECT BREAKDOWN */}
            <div className="bg-white rounded-2xl border border-[#e0eaf4] shadow-sm p-6 mb-6">
              <h2 className="text-base font-bold text-ink mb-5">Average Score by Subject</h2>
              <div className="space-y-4">
                {stats.subjectAverages.map((s) => (
                  <div key={s.subject} className="flex items-center gap-4">
                    <span className="w-40 shrink-0 text-sm font-semibold text-ink-soft truncate">{s.subject}</span>
                    <div className="flex-1 h-2.5 bg-[#eef2f8] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.avg}%`, backgroundColor: 'var(--color-secondary)' }} />
                    </div>
                    <span className="w-12 text-right text-sm font-bold" style={secondaryText}>{s.avg}%</span>
                    <span className="w-20 shrink-0 text-xs text-[#8298b1] text-right">{s.count} session{s.count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RECENT SESSIONS */}
            <div className="bg-white rounded-2xl border border-[#e0eaf4] shadow-sm p-6 pb-2">
              <h2 className="text-base font-bold text-ink mb-4">Recent Sessions</h2>
              <div className="space-y-2 pb-4">
                {[...sessions].reverse().slice(0, 5).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => router.push(`/dashboard/review/${s.id}`)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#f5f9fe] transition text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-semibold text-ink-soft truncate">{s.subject}</span>
                      <span style={secondaryTint(12)} className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide shrink-0">
                        <span style={secondaryText}>{s.difficulty}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-[#8298b1]">{new Date(s.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                      <span className="text-sm font-bold" style={secondaryText}>{s.report.score}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, tint, value, label, sub, valueColor }: {
  icon: React.ReactNode; tint: React.CSSProperties; value: string | number; label: string; sub?: string; valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e0eaf4] shadow-sm p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl mb-3" style={tint}>{icon}</div>
      <p className="text-2xl font-black truncate" style={valueColor ? { color: valueColor } : undefined}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#8293aa] mt-1">{label}</p>
      {sub && <p className="text-xs text-[#8298b1] mt-0.5">{sub}</p>}
    </div>
  );
}

function ScoreTrendChart({ sessions }: { sessions: InterviewSession[] }) {
  const width = 1000;
  const height = 200;
  const padding = 30;
  const scores = sessions.map((s) => s.report.score);
  const n = scores.length;

  if (n === 1) {
    return <p className="text-sm text-[#8298b1] text-center py-10">Complete more interviews to see your trend line.</p>;
  }

  const stepX = (width - padding * 2) / (n - 1);
  const points = scores.map((score, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (score / 100) * (height - padding * 2);
    return { x, y, score };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 500 }}>
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#eef2f8" strokeWidth="1" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#eef2f8" strokeWidth="1" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#eef2f8" strokeWidth="1" />

        <path d={areaD} fill="color-mix(in srgb, var(--color-secondary) 8%, transparent)" />
        <path d={pathD} fill="none" stroke="var(--color-secondary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="var(--color-secondary)" stroke="white" strokeWidth="2" />
            <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-secondary)">{p.score}%</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
