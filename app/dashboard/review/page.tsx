'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase/browser';
import { useSiteSettings } from '../../lib/SiteSettingsContext';
import {
  LayoutDashboard, Mic, History, BarChart3, Settings, Bell, ChevronDown,
  Search, Eye, CalendarDays, Sparkles, FileText,
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

export default function PastSessionsPage() {
  const router = useRouter();
  const settings = useSiteSettings();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'By Subject' | 'By Resume'>('All');
  const [search, setSearch] = useState('');
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
          .order('created_at', { ascending: false });

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

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesSearch =
        s.subject.toLowerCase().includes(search.toLowerCase()) ||
        s.difficulty.toLowerCase().includes(search.toLowerCase());
      const isResume = s.subject === 'Resume-Based';
      const matchesFilter =
        filter === 'All' ||
        (filter === 'By Subject' && !isResume) ||
        (filter === 'By Resume' && isResume);
      return matchesSearch && matchesFilter;
    });
  }, [sessions, filter, search]);

  if (loading) {
    return (
      <div className="h-screen bg-[#f5f9fe] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: 'var(--color-secondary)', borderTopColor: 'transparent' }} />
        <p className="font-medium tracking-widest text-xs uppercase" style={secondaryText}>Loading sessions...</p>
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
        <header className="flex h-16 items-center justify-end border-b border-[#e3edf7] bg-white px-6 sm:px-8 shrink-0">
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
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-[#e3edf7] py-2 z-10">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="w-full text-left px-4 py-2 text-sm font-semibold text-[#102b58] hover:bg-gray-50 transition-colors"
                  >
                    Back to Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto relative px-5 py-4 sm:px-8">
          <div className="pointer-events-none absolute -right-40 -top-40 h-[400px] w-[400px] rounded-full" style={secondaryTint(8)} />
          <div className="pointer-events-none absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full" style={secondaryTint(6)} />

          <div className="relative z-10 mx-auto max-w-[1250px]">

            <div className="mb-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={secondaryTint(12)}>
                    <History size={20} style={secondaryText} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-[#102b58] sm:text-2xl">Past Sessions</h1>
                    <p className="mt-0.5 text-xs text-[#718aa7]">
                      Review your previous interviews and track your progress over time.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex rounded-xl bg-[#eaf3fc] p-1">
                    {(['All', 'By Subject', 'By Resume'] as const).map((item) => (
                      <button
                        key={item}
                        onClick={() => setFilter(item)}
                        style={filter === item ? secondaryBg : undefined}
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                          filter === item ? 'text-white shadow-sm' : 'text-[#6682a3]'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8aa1ba]" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search sessions..."
                      className="h-[36px] w-full rounded-xl border border-[#dce7f2] bg-white pl-10 pr-4 text-sm text-[#183b69] outline-none transition sm:w-[190px]"
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-secondary)'; e.currentTarget.style.boxShadow = `0 0 0 4px color-mix(in srgb, var(--color-secondary) 10%, transparent)`; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#dce7f2'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredSessions.length > 0 ? (
                filteredSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onViewReport={() => router.push(`/dashboard/review/${session.id}`)}
                    secondaryText={secondaryText}
                    secondaryTint={secondaryTint}
                  />
                ))
              ) : (
                <EmptyState secondaryTint={secondaryTint(12)} secondaryText={secondaryText} onStart={() => router.push('/dashboard/setup')} secondaryBg={secondaryBg} />
              )}
            </div>

            {filteredSessions.length > 0 && (
              <p className="text-xs text-[#8aa1ba] py-3">
                Showing <span className="font-semibold text-[#527394]">{filteredSessions.length}</span> of{' '}
                <span className="font-semibold text-[#527394]">{sessions.length}</span> sessions
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionCard({ session, onViewReport, secondaryText, secondaryTint }: {
  session: InterviewSession; onViewReport: () => void;
  secondaryText: React.CSSProperties; secondaryTint: (pct: number) => React.CSSProperties;
}) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (session.report.score / 100) * circumference;
  const date = new Date(session.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="group rounded-xl border border-[#e0eaf4] bg-white p-3.5 shadow-[0_4px_16px_rgba(25,75,125,0.04)] transition-all hover:shadow-[0_8px_24px_rgba(25,75,125,0.08)]">
      <div className="flex flex-col gap-3.5 xl:flex-row xl:items-center">

        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={secondaryTint(10)}>
            <SubjectIcon subject={session.subject} accent={secondaryText} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-[#102b58]">{session.subject}</h2>
              <span style={secondaryTint(12)} className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                <span style={secondaryText}>{session.difficulty}</span>
              </span>
            </div>
            <span className="mt-1 flex items-center gap-1.5 text-xs text-[#7c94af]">
              <CalendarDays size={12} /> {date}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-[#edf2f7] pt-3 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
          <div className="relative h-[50px] w-[50px] shrink-0">
            <svg width="50" height="50" viewBox="0 0 50 50" className="-rotate-90">
              <circle cx="25" cy="25" r={radius} fill="none" stroke="#e4edf6" strokeWidth="5" />
              <circle cx="25" cy="25" r={radius} fill="none" stroke="var(--color-secondary)" strokeWidth="5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={progress} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-[#527394]">{session.report.score}%</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium text-[#7b94b0]">Final Grade</p>
            <p className="mt-0.5 text-lg font-bold leading-none" style={secondaryText}>{session.report.score}%</p>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-[#edf2f7] pt-3 xl:border-0 xl:pt-0">
          <button
            onClick={onViewReport}
            style={{ borderColor: 'var(--color-secondary)', ...secondaryText }}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border bg-white px-3.5 text-xs font-semibold transition hover:opacity-80 xl:flex-none"
          >
            <Eye size={14} /> View Report
          </button>
        </div>
      </div>
    </div>
  );
}

function SubjectIcon({ subject, accent }: { subject: string; accent: React.CSSProperties }) {
  if (subject === 'Python') return <span className="text-xl">🐍</span>;
  if (subject === 'SQL') return <span className="text-xl">🗄️</span>;
  if (subject === 'Data Analytics') return <BarChart3 size={20} style={accent} />;
  return <FileText size={19} style={accent} />;
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

function EmptyState({ secondaryTint, secondaryText, secondaryBg, onStart }: {
  secondaryTint: React.CSSProperties; secondaryText: React.CSSProperties; secondaryBg: React.CSSProperties; onStart: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#cbddec] bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl" style={secondaryTint}>
        <History size={20} style={secondaryText} />
      </div>
      <h3 className="mt-3 text-base font-bold text-[#183b69]">No sessions found</h3>
      <p className="mt-1 text-sm text-[#8298b1]">Once you complete an interview, it will show up here.</p>
      <button onClick={onStart} style={secondaryBg} className="mt-4 px-5 py-2 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition">
        Start First Interview
      </button>
    </div>
  );
}