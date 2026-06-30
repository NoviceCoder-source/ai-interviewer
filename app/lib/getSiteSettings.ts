import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface SiteSettings {
  id: number;
  org_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  subjects: string[];
  updated_at: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  id: 1,
  org_name: 'Bignalytics',
  logo_url: null,
  primary_color: '#4f46e5',
  secondary_color: '#7c3aed',
  subjects: ['Python', 'SQL', 'Data Analytics', 'Machine Learning'],
  updated_at: new Date().toISOString(),
};

/**
 * Fetches the single site_settings row.
 * Safe to call from Server Components (layout.tsx, page.tsx) and API routes.
 * Falls back to sane defaults if the row is missing or the fetch fails,
 * so a misconfigured DB never breaks the whole site.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) {
      console.error('getSiteSettings: falling back to defaults', error?.message);
      return DEFAULT_SETTINGS;
    }

    return data as SiteSettings;
  } catch (err) {
    console.error('getSiteSettings: unexpected error', err);
    return DEFAULT_SETTINGS;
  }
}