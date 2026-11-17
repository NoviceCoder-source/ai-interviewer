'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const ADMIN_NAV = [
  { href: '/admin/dashboard', label: 'Students' },
  { href: '/admin/question-bank', label: 'Question Bank' },
  { href: '/admin/test-settings', label: 'Test Settings' },
  { href: '/admin/levels', label: 'Levels' },
  { href: '/admin/test-reports', label: 'Test Reports' },
  { href: '/admin/reports', label: 'Interview Reports' },
  { href: '/admin/settings', label: 'Branding' },
];

/** Admin section nav as a row of pills. */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2">
      {ADMIN_NAV.map(({ href, label }) => {
        const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
              active ? 'border-amber-500 bg-amber-500 text-[#0B132B]' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Dark admin page frame: nav, title and description. */
export default function AdminPage({ title, description, children, wide }: {
  title: string; description?: string; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-gray-950 p-6 text-white md:p-10">
      <div className={`mx-auto ${wide ? 'max-w-7xl' : 'max-w-5xl'}`}>
        <AdminNav />
        <h1 className="mt-8 text-3xl font-extrabold">{title}</h1>
        {description && <p className="mt-2 text-sm text-gray-400">{description}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

/** Small error/success line used across admin pages. */
export function AdminNotice({ error, success }: { error?: string; success?: string }) {
  if (error) return <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">{error}</p>;
  if (success) return <p role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">{success}</p>;
  return null;
}

export const inputClass =
  'w-full rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
export const buttonClass =
  'rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50';
export const cardClass = 'rounded-2xl border border-gray-800 bg-gray-900/60 p-5';
