'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useSiteSettings } from '../lib/SiteSettingsContext';
import {
  LayoutDashboard, Mic, History, BarChart3, Settings,
  Bell, ChevronDown, ArrowRight, Check, ShieldCheck, Sparkles, FileText,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function Dashboard() {
  const router = useRouter();
  const settings = useSiteSettings();
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadStudent = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'student') { router.replace('/'); return; }

      setStudentName(profile.full_name || 'Student');
      setLoading(false);
    };
    loadStudent();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const primaryBg = { backgroundColor: 'var(--color-primary)' };
  const secondaryBg = { backgroundColor: 'var(--color-secondary)' };
  const secondaryText = { color: 'var(--color-secondary)' };
  const secondaryTint = (pct: number) => ({ backgroundColor: `color-mix(in srgb, var(--color-secondary) ${pct}%, transparent)` });
  const primaryTint = (pct: number) => ({ backgroundColor: `color-mix(in srgb, var(--color-primary) ${pct}%, transparent)` });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7faff] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: 'var(--color-secondary)', borderTopColor: 'transparent' }} />
        <p className="font-medium tracking-widest text-xs uppercase" style={secondaryText}>Loading your workspace...</p>
      </div>
    );
  }

  const firstName = studentName.split(' ')[0] || 'Student';
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <div className="h-screen bg-[#f7faff] text-[#10254a] flex overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-[240px] shrink-0 flex flex-col text-white" style={primaryBg}>
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
          <NavItem icon={<LayoutDashboard size={19} />} text="Dashboard" active activeStyle={secondaryBg} />
          <NavItem icon={<Mic size={19} />} text="New Interview" onClick={() => router.push('/dashboard/setup')} />
          <NavItem icon={<History size={19} />} text="Past Sessions" onClick={() => router.push('/dashboard/review')} />
          <NavItem icon={<BarChart3 size={19} />} text="Performance" onClick={() => router.push('/dashboard/performance')} />
          <NavItem icon={<Settings size={19} />} text="Settings" disabled />
        </nav>

        <div className="mx-4 mb-4 overflow-hidden rounded-xl p-4 relative" style={primaryTint(70)}>
          <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
            <Sparkles size={14} style={secondaryText} />
          </div>
          <h3 className="text-sm font-semibold leading-tight">Build Your Interview Confidence</h3>
          <p className="mt-1 text-xs leading-5 text-blue-100/70">Practice. Improve. Get hired.</p>
          <div className="absolute -bottom-6 -right-4 h-16 w-16 rounded-full blur-sm" style={secondaryTint(25)} />
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex h-16 items-center justify-end border-b border-[#e6edf7] bg-white px-8 shrink-0">
          <div className="flex items-center gap-5">
            <button className="relative rounded-full p-2 text-[#10254a] hover:bg-[#f1f6fd] transition">
              <Bell size={19} />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" style={secondaryBg} />
            </button>
            <div className="relative">
              <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full" style={secondaryTint(15)}>
                  <span className="text-sm font-semibold" style={secondaryText}>{initial}</span>
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold text-[#10254a]">{firstName}</p>
                  <p className="text-[11px] text-[#7890b0]">Candidate</p>
                </div>
                <ChevronDown size={15} className="text-[#7890b0]" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-[#e6edf7] py-2 z-10">
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="mx-auto max-w-[1300px] h-full flex flex-col">

            <section className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-[#eef7ff] to-white px-8 py-6 shrink-0">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[2px]" style={secondaryText}>Welcome Back,</p>
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-[#10254a]">
                {studentName} <span className="ml-2 text-2xl">👋</span>
              </h1>
              <p className="mt-2 max-w-[600px] text-sm leading-6 text-[#607a9f]">
                Your AI-powered interview coach is here to help you practice, improve and get hired.
              </p>
            </section>

            <section className="grid gap-5 lg:grid-cols-2 flex-1 min-h-0">
              <DashboardCard
                icon={
                  <div className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg shadow-blue-200" style={secondaryBg}>
                    <Mic size={26} strokeWidth={2} />
                  </div>
                }
                badge="Start Fresh"
                badgeStyle={secondaryTint(12)}
                badgeTextStyle={secondaryText}
                title="New Interview"
                description="Start a dynamic AI interview session and practice with real-time feedback."
                features={['Real-time voice or text interview', 'AI-powered evaluation', 'Get instant feedback and suggestions']}
                checkStyle={secondaryTint(15)}
                checkIconStyle={secondaryText}
                buttonText="Start Interview"
                buttonStyle={secondaryBg}
                onClick={() => router.push('/dashboard/setup')}
                primary
              />
              <DashboardCard
                icon={
                  <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ ...secondaryTint(12), ...secondaryText }}>
                    <FileText size={26} strokeWidth={1.8} />
                  </div>
                }
                badge="Track Progress"
                badgeStyle={{ backgroundColor: '#e4f2ff' }}
                badgeTextStyle={{ color: '#2473d3' }}
                title="Past Sessions"
                description="Review your previous interviews, check your performance and track your growth."
                features={['View detailed session reports', 'See strengths and improvement areas', 'Track your performance over time']}
                checkStyle={secondaryTint(15)}
                checkIconStyle={secondaryText}
                buttonText="View Past Sessions"
                outlineStyle={{ borderColor: 'var(--color-secondary)', ...secondaryText }}
                onClick={() => router.push('/dashboard/review')}
              />
            </section>

            <footer className="mt-5 flex flex-col items-center justify-between gap-2 border-t border-[#e2eaf4] pt-4 text-xs text-[#8aa0be] sm:flex-row shrink-0">
              <p>V2.0 &nbsp;//&nbsp; {settings.org_name.toUpperCase()} AI INTERVIEWER</p>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-[#80a5d0]" />
                <span>Safe</span><span>•</span><span>Private</span><span>•</span><span>Secure</span>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  icon, text, active, disabled, onClick, activeStyle,
}: { icon: React.ReactNode; text: string; active?: boolean; disabled?: boolean; onClick?: () => void; activeStyle?: React.CSSProperties }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={active ? activeStyle : undefined}
      className={`mb-1.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
        active
          ? 'text-white shadow-lg shadow-blue-950/20'
          : disabled
          ? 'text-blue-100/30 cursor-not-allowed'
          : 'text-blue-100/75 hover:bg-white/10 hover:text-white'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{text}</span>
    </button>
  );
}

function DashboardCard({
  icon, badge, badgeStyle, badgeTextStyle, title, description, features,
  checkStyle, checkIconStyle, buttonText, buttonStyle, outlineStyle, onClick, primary,
}: {
  icon: React.ReactNode; badge: string; badgeStyle?: React.CSSProperties; badgeTextStyle?: React.CSSProperties;
  title: string; description: string; features: string[];
  checkStyle?: React.CSSProperties; checkIconStyle?: React.CSSProperties;
  buttonText: string; buttonStyle?: React.CSSProperties; outlineStyle?: React.CSSProperties;
  onClick: () => void; primary?: boolean;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border p-6 flex flex-col transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${
      primary ? 'border-[#d4e7fb] bg-gradient-to-br from-white via-white to-[#e9f5ff]' : 'border-[#e0e8f2] bg-white'
    }`}>
      {primary && <div className="absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-[#d9ecff]/60 blur-sm" />}
      <div className="relative z-10 flex flex-col flex-1">
        <div className="mb-4">{icon}</div>
        <span className="inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ ...badgeStyle, ...badgeTextStyle }}>{badge}</span>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#10254a]">{title}</h2>
        <p className="mt-2 max-w-[480px] text-sm leading-6 text-[#607a9f]">{description}</p>
        <div className="mt-4 space-y-2.5">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2.5 text-[13px] text-[#587292]">
              <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full" style={checkStyle}>
                <Check size={11} strokeWidth={3} style={checkIconStyle} />
              </span>
              {feature}
            </div>
          ))}
        </div>
        <button
          onClick={onClick}
          style={primary ? buttonStyle : outlineStyle}
          className={`mt-5 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all w-fit ${
            primary ? 'text-white shadow-lg shadow-blue-200 hover:opacity-90' : 'border-2 bg-white hover:bg-[#edf6ff]'
          }`}
        >
          {buttonText}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}