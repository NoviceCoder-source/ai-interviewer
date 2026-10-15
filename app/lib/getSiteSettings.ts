import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';

export interface SiteSettings {
  id: number;
  org_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  subjects: string[];
  updated_at: string;
}

export const DEFAULT_SUBJECTS = ['Python', 'SQL', 'Data Analytics', 'Machine Learning'];

const DEFAULT_SETTINGS: SiteSettings = {
  id: 1,
  org_name: 'Bignalytics',
  logo_url: null,
  primary_color: '#4f46e5',
  secondary_color: '#7c3aed',
  subjects: DEFAULT_SUBJECTS,
  updated_at: new Date().toISOString(),
};

/**
 * Fetches the single site_settings row (publicly readable).
 * Cached per request, so layout + generateMetadata share one query.
 * Falls back to defaults so a misconfigured DB never breaks the whole site.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();

    if (error || !data) {
      console.error('getSiteSettings: falling back to defaults', error?.message);
      return DEFAULT_SETTINGS;
    }
    const settings = data as SiteSettings;
    return { ...settings, subjects: settings.subjects?.length ? settings.subjects : DEFAULT_SUBJECTS };
  } catch (err) {
    console.error('getSiteSettings: unexpected error', err);
    return DEFAULT_SETTINGS;
  }
});
