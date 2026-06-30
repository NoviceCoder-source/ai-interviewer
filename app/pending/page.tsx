'use client';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { useSiteSettings } from '../lib/SiteSettingsContext';

export default function PendingPage() {
  const router = useRouter();
  const settings = useSiteSettings();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="bg-white/10 backdrop-blur-lg p-10 rounded-2xl shadow-2xl border border-white/20 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="text-2xl font-extrabold text-white mb-2">Awaiting Approval</h1>
        <p className="text-indigo-100 text-sm font-medium mb-6">
          Your registration request is being reviewed by {settings.org_name} staff.
          You will receive an email once your account has been approved.
        </p>
        <div className="bg-white/10 rounded-xl p-4 mb-6 border border-white/20">
          <p className="text-white/80 text-xs font-medium">
            If you have been waiting for more than 24 hours, please contact us directly.
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