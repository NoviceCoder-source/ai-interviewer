'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

interface SiteSettingsForm {
  org_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  subjects: string[];
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<SiteSettingsForm>({
    org_name: '',
    logo_url: null,
    primary_color: '#4f46e5',
    secondary_color: '#7c3aed',
    subjects: [],
  });
  const [subjectsInput, setSubjectsInput] = useState('');

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single();
      if (!profile || profile.role !== 'admin') { router.push('/'); return; }
      setLoadingAuth(false);
    };
    checkAdmin();
  }, [router]);

  useEffect(() => {
    if (loadingAuth) return;
    const loadSettings = async () => {
      const { data, error: fetchError } = await supabase
        .from('site_settings').select('*').eq('id', 1).single();
      if (!fetchError && data) {
        setForm({
          org_name: data.org_name,
          logo_url: data.logo_url,
          primary_color: data.primary_color,
          secondary_color: data.secondary_color,
          subjects: data.subjects || [],
        });
        setSubjectsInput((data.subjects || []).join(', '));
      }
      setLoadingSettings(false);
    };
    loadSettings();
  }, [loadingAuth]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError('');
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('branding').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('branding').getPublicUrl(filePath);
      setForm((f) => ({ ...f, logo_url: publicUrlData.publicUrl }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Logo upload failed.');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      const subjects = subjectsInput.split(',').map((s) => s.trim()).filter(Boolean);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('You must be logged in.'); return; }

      const res = await fetch('/api/admin/update-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          org_name: form.org_name.trim(),
          logo_url: form.logo_url,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
          subjects,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save settings.'); return; }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingAuth || loadingSettings) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-medium tracking-widest text-xs uppercase">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6 md:p-12 text-white">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push('/admin/dashboard')}
          className="mb-8 flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">
          ← Back to Dashboard
        </button>
        <h1 className="text-3xl font-extrabold mb-2">White Label Settings</h1>
        <p className="text-gray-400 text-sm mb-10">
          Changes here update branding across the entire platform — login screen, dashboards, and PDF exports.
        </p>
        <form onSubmit={handleSave} className="space-y-8">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Organisation Name</label>
            <input type="text" required value={form.org_name}
              onChange={(e) => setForm((f) => ({ ...f, org_name: e.target.value }))}
              placeholder="e.g. Acme Academy"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Logo</label>
            <div className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
              {form.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logo_url} alt="Logo preview" className="h-14 object-contain bg-white/5 rounded-lg p-1" />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-xs">None</div>
              )}
              <label className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                uploadingLogo ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} className="hidden" />
              </label>
            </div>
            <p className="text-gray-600 text-xs mt-1">PNG or SVG with transparent background recommended.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Primary Color</label>
              <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2">
                <input type="color" value={form.primary_color}
                  onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent" />
                <input type="text" value={form.primary_color}
                  onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
                  className="flex-1 bg-transparent text-sm font-mono focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Secondary Color</label>
              <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2">
                <input type="color" value={form.secondary_color}
                  onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent" />
                <input type="text" value={form.secondary_color}
                  onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))}
                  className="flex-1 bg-transparent text-sm font-mono focus:outline-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Interview Subjects</label>
            <input type="text" value={subjectsInput} onChange={(e) => setSubjectsInput(e.target.value)}
              placeholder="Python, SQL, Data Analytics, Machine Learning"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <p className="text-gray-600 text-xs mt-1">Comma-separated. These appear as options when students set up an interview.</p>
          </div>

          {error && <p className="text-red-400 text-xs font-bold bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">⚠️ {error}</p>}
          {success && <p className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">✅ Settings saved successfully.</p>}

          <button type="submit" disabled={saving || uploadingLogo}
            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}