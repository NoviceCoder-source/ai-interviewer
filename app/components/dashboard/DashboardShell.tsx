'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Mic, History, BarChart3, Settings, Bell, ChevronDown, Sparkles, ClipboardList, Coins } from 'lucide-react';
import { supabase } from '../../lib/supabase/browser';
import { useSiteSettings } from '../../lib/SiteSettingsContext';
import { primaryBg, primaryTint, secondaryBg, secondaryText, secondaryTint } from '../../lib/theme';
import OrgLogo from '../OrgLogo';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/setup', label: 'New Interview', icon: Mic },
  { href: '/dashboard/tests', label: 'MCQ Tests', icon: ClipboardList },
  { href: '/dashboard/review', label: 'Past Sessions', icon: History },
  { href: '/dashboard/performance', label: 'Performance', icon: BarChart3 },
];

const isActive = (pathname: string, href: string) =>
  href === '/dashboard' ? pathname === href : pathname.startsWith(href);

const StudentNameContext = createContext('');

/** The signed-in student's full name ('' until loaded). */
export const useStudentName = () => useContext(StudentNameContext);

/** Sidebar + top bar shared by every student dashboard page. */
export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState('');
  const [credits, setCredits] = useState<number | null>(null);
  const pathname = usePathname();

  // Reloaded on navigation so the balance updates after a test is started.
  useEffect(() => {
    const loadName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('full_name, credits').eq('id', user.id).single();
      setName(data?.full_name || 'Student');
      setCredits(typeof data?.credits === 'number' ? data.credits : null);
    };
    loadName();
  }, [pathname]);

  return (
    <StudentNameContext.Provider value={name}>
      <div className="h-screen bg-[#f5f9fe] text-ink flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar name={name} credits={credits} />
          {children}
        </div>
      </div>
    </StudentNameContext.Provider>
  );
}

function Sidebar() {
  const settings = useSiteSettings();
  const pathname = usePathname();

  return (
    <aside className="w-[240px] shrink-0 hidden lg:flex lg:flex-col text-white" style={primaryBg}>
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
        <OrgLogo className="h-8" />
        <span className="text-lg font-bold tracking-tight truncate">{settings.org_name}</span>
      </div>

      <nav className="flex-1 px-4 py-5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              style={active ? secondaryBg : undefined}
              className={`mb-1.5 flex h-11 w-full items-center gap-3 rounded-xl px-4 text-sm transition ${
                active ? 'font-semibold text-white shadow-lg shadow-black/10' : 'text-blue-100/80 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          );
        })}
        <span className="mb-1.5 flex h-11 w-full cursor-not-allowed items-center gap-3 rounded-xl px-4 text-sm text-blue-100/40">
          <Settings size={19} />
          <span>Settings</span>
        </span>
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
  );
}

function TopBar({ name, credits }: { name: string; credits: number | null }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const firstName = name.split(' ')[0];

  return (
    <header className="flex h-16 items-center justify-end border-b border-[#e4edf7] bg-white px-6 sm:px-8 shrink-0">
      <div className="flex items-center gap-5">
        {credits !== null && (
          <Link href="/dashboard/tests" title="Credit balance" className="flex items-center gap-1.5 rounded-full bg-[#f1f6fc] px-3 py-1.5 text-xs font-semibold text-[#173b6c]">
            <Coins size={14} style={secondaryText} /> {credits} credits
          </Link>
        )}
        <button aria-label="Notifications" className="relative rounded-full p-2 text-[#173b6c] hover:bg-[#f1f6fc] transition">
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" style={secondaryBg} />
        </button>
        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full" style={secondaryTint(15)}>
              <span className="text-sm font-semibold" style={secondaryText}>{firstName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-[#10254a]">{firstName}</p>
              <p className="text-[11px] text-[#7890b0]">Candidate</p>
            </div>
            <ChevronDown size={15} className="text-[#7890b0]" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-[#e4edf7] py-2 z-10">
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
  );
}
