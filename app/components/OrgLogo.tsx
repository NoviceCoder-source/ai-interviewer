'use client';
import type { ReactNode } from 'react';
import { useSiteSettings } from '../lib/SiteSettingsContext';
import { secondaryBg } from '../lib/theme';

/**
 * The org's uploaded logo, or `fallback` when none is set
 * (default: the bar-chart mark; pass `null` to render nothing).
 */
export default function OrgLogo({ className, fallback }: { className: string; fallback?: ReactNode }) {
  const settings = useSiteSettings();

  if (!settings.logo_url) return <>{fallback === undefined ? <BarsMark /> : fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- logo is an arbitrary admin-supplied URL
    <img src={settings.logo_url} alt={settings.org_name} className={`object-contain ${className}`} />
  );
}

function BarsMark() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={secondaryBg}>
      <div className="flex items-end gap-[3px]">
        {['h-2.5', 'h-5', 'h-7', 'h-4', 'h-2.5'].map((h, i) => (
          <span key={i} className={`${h} w-[3px] rounded-full bg-white`} />
        ))}
      </div>
    </div>
  );
}
