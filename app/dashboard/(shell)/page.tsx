'use client';
import { useRouter } from 'next/navigation';
import { useStudentName } from '../../components/dashboard/DashboardShell';
import { useSiteSettings } from '../../lib/SiteSettingsContext';
import { Mic, ArrowRight, Check, ShieldCheck, FileText, ClipboardList } from 'lucide-react';
import ProgressStrip from '../../components/dashboard/ProgressStrip';
import { secondaryBg, secondaryText, secondaryTint } from '../../lib/theme';

export default function Dashboard() {
  const router = useRouter();
  const settings = useSiteSettings();
  const studentName = useStudentName();

  return (
    <div className="flex-1 overflow-y-auto px-8 py-4">
      <div className="mx-auto max-w-[1300px] min-h-full flex flex-col">

        <section className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-[#eef7ff] to-white px-6 py-4 shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-[2px]" style={secondaryText}>Welcome Back,</p>
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-[#10254a]">
            {studentName} <span className="ml-1.5 text-xl">👋</span>
          </h1>
          <p className="mt-1 max-w-[600px] text-sm text-[#607a9f]">
            Your AI-powered interview coach is here to help you practice, improve and get hired.
          </p>
        </section>

        <ProgressStrip />

        <section className="grid gap-4 lg:grid-cols-3 flex-1">
          <DashboardCard
            icon={
              <div className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg shadow-blue-200" style={secondaryBg}>
                <Mic size={22} strokeWidth={2} />
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
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ ...secondaryTint(12), ...secondaryText }}>
                <ClipboardList size={22} strokeWidth={1.8} />
              </div>
            }
            badge="Test Yourself"
            badgeStyle={secondaryTint(12)}
            badgeTextStyle={secondaryText}
            title="MCQ Test"
            description="Take a timed multiple-choice test out of 50 marks, by subject, topic and level."
            features={['Questions from your institute question bank', 'Instant, rule-based scoring', 'Level-wise and topic-wise report']}
            checkStyle={secondaryTint(15)}
            checkIconStyle={secondaryText}
            buttonText="Take a Test"
            outlineStyle={{ borderColor: 'var(--color-secondary)', ...secondaryText }}
            onClick={() => router.push('/dashboard/tests')}
          />
          <DashboardCard
            icon={
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ ...secondaryTint(12), ...secondaryText }}>
                <FileText size={22} strokeWidth={1.8} />
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

        <footer className="mt-4 flex flex-col items-center justify-between gap-2 border-t border-[#e2eaf4] pt-3 text-xs text-[#8aa0be] sm:flex-row shrink-0">
          <p>V3.2 &nbsp;//&nbsp; {settings.org_name.toUpperCase()} AI INTERVIEWER</p>
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#80a5d0]" />
            <span>Safe</span><span>•</span><span>Private</span><span>•</span><span>Secure</span>
          </div>
        </footer>
      </div>
    </div>
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
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border p-5 flex flex-col text-left cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${
      primary ? 'border-[#d4e7fb] bg-gradient-to-br from-white via-white to-[#e9f5ff]' : 'border-[#e0e8f2] bg-white'
    }`}
    >
      {primary &&<div className="absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-[#d9ecff]/60 blur-sm" />}
      <div className="relative z-10 flex flex-col flex-1">
        <div className="flex items-center gap-3.5">
          {icon}
          <div>
            <span className="inline-flex w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ ...badgeStyle, ...badgeTextStyle }}>{badge}</span>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-[#10254a]">{title}</h2>
          </div>
        </div>
        <p className="mt-3 max-w-[480px] text-sm leading-5 text-[#607a9f]">{description}</p>
        <div className="mt-3 mb-4 space-y-1.5">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2.5 text-[13px] text-[#587292]">
              <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full" style={checkStyle}>
                <Check size={11} strokeWidth={3} style={checkIconStyle} />
              </span>
              {feature}
            </div>
          ))}
        </div>
        <span
          style={primary ? buttonStyle : outlineStyle}
          className={`mt-auto flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all w-fit ${
            primary ? 'text-white shadow-lg shadow-blue-200 group-hover:opacity-90' : 'border-2 bg-white group-hover:bg-[#edf6ff]'
          }`}
        >
          {buttonText}
          <ArrowRight size={16} />
        </span>
      </div>
    </button>
  );
}