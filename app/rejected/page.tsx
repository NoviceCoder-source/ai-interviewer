'use client';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { useSiteSettings } from '../lib/SiteSettingsContext';

export default function RejectedPage() {
  const router = useRouter();
  const settings = useSiteSettings();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500 via-pink-500 to-rose-500 p-4">
      <div className="bg-white/10 backdrop-blur-lg p-10 rounded-2xl shadow-2xl border border-white/20 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="text-2xl font-extrabold text-white mb-2">Account Rejected</h1>
        <p className="text-red-100 text-sm font-medium mb-6">
          Unfortunately, your registration request has been rejected by {settings.org_name} staff.
        </p>
        <div className="bg-white/10 rounded-xl p-4 mb-6 border border-white/20">
          <p className="text-white/80 text-xs font-medium">
            If you believe this is a mistake, please contact {settings.org_name} directly to resolve this issue.
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full bg-white/20 text-white font-bold py-3 px-4 rounded-xl hover:bg-white/30 transition-all border border-white/30 text-sm"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}