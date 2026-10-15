'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useSiteSettings } from '../../lib/SiteSettingsContext';
import {
  LayoutDashboard, Mic, History, BarChart3, Settings, Bell, ChevronDown,
  Sparkles, TrendingUp, Award, Target, Calendar,
} from 'lucide-react';

interface EvaluationReport {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

interface InterviewSession {
  id: string;
  subject: string;
  difficulty: string;
  created_at: string;
  report: EvaluationReport;
}

export default function PerformancePage() {
  const router = useRouter();
  const settings = useSiteSettings();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const primaryBg = { backgroundColor: 'var(--color-primary)' };
  const secondaryBg = { backgroundColor: 'var(--color-secondary)' };
  const secondaryText = { color: 'var(--color-secondary)' };
  const secondaryTint = (pct: number) => ({ backgroundColor: `color-mix(in srgb, var(--color-secondary) ${pct}%, transparent)` });
  const primaryTint = (pct: number) => ({ backgroundColor: `color-mix(in srgb, var(--color-primary) ${pct}%, transparent)` });

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
      <div className="h-screen bg-[#f5f9fe] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: 'var(--color-secondary)', borderTopColor: 'transparent' }} />
        <p className="font-medium tracking-widest text-xs uppercase" style={secondaryText}>Loading performance...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#f5f9fe] text-[#102b58] flex overflow-hidden">

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
          <SidebarItem icon={<History size={19} />} label="Past Sessions" onClick={() => router.push('/dashboard/review')} />
          <SidebarItem icon={<BarChart3 size={19} />} label="Performance" active activeStyle={secondaryBg} />
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
        <header className="flex h-16 items-center justify-end border-b border-[#e4edf7] bg-white px-6 sm:px-8 shrink-0">
          <div className="flex items-center gap-5">
            <button className="relative rounded-full p-2 text-[#173b6c] hover:bg-[#f1f6fc] transition">
              <Bell size={18} />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" style={secondaryBg} />
            </button>
            <div className="relative">
              <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full" style={secondaryTint(15)}>
                  <span className="text-xs font-semibold" style={secondaryText}>U</span>
                </div>
                <ChevronDown size={14} className="text-[#7891ad]" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-[#e4edf7] py-2 z-10">
                  <button onClick={() => router.push('/dashboard')} className="w-full text-left px-4 py-2 text-sm font-semibold text-[#102b58] hover:bg-gray-50 transition-colors">
                    Back to Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          <div className="mx-auto max-w-[1250px]">

            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={secondaryTint(12)}>
                <BarChart3 size={20} style={secondaryText} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#102b58] sm:text-2xl">Performance</h1>
                <p className="mt-0.5 text-xs text-[#718aa7]">Track your growth across every interview you have completed.</p>
              </div>
            </div>

            {!stats ? (
              <div className="rounded-2xl border border-dashed border-[#cbddec] bg-white px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={secondaryTint(12)}>
                  <BarChart3 size={24} style={secondaryText} />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#183b69]">No data yet</h3>
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
                  <h2 className="text-base font-bold text-[#102b58] mb-5">Score Trend</h2>
                  <ScoreTrendChart sessions={sessions} />
                </div>

                {/* SUBJECT BREAKDOWN */}
                <div className="bg-white rounded-2xl border border-[#e0eaf4] shadow-sm p-6 mb-6">
                  <h2 className="text-base font-bold text-[#102b58] mb-5">Average Score by Subject</h2>
                  <div className="space-y-4">
                    {stats.subjectAverages.map((s) => (
                      <div key={s.subject} className="flex items-center gap-4">
                        <span className="w-40 shrink-0 text-sm font-semibold text-[#183b69] truncate">{s.subject}</span>
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
                  <h2 className="text-base font-bold text-[#102b58] mb-4">Recent Sessions</h2>
                  <div className="space-y-2 pb-4">
                    {[...sessions].reverse().slice(0, 5).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => router.push(`/dashboard/review/${s.id}`)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#f5f9fe] transition text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-sm font-semibold text-[#183b69] truncate">{s.subject}</span>
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