'use client';

import { createContext, useContext } from 'react';
import type { SiteSettings } from './getSiteSettings';

const SiteSettingsContext = createContext<SiteSettings | null>(null);

export function SiteSettingsProvider({
  settings,
  children,
}: {
  settings: SiteSettings;
  children: React.ReactNode;
}) {
  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

/**
 * Use inside any 'use client' component to read org_name, logo_url,
 * primary_color, secondary_color, subjects, etc.
 * Throws if used outside the provider so misuse is caught early.
 */
export function useSiteSettings(): SiteSettings {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return ctx;
}