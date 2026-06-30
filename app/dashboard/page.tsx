'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useSiteSettings } from '../lib/SiteSettingsContext';

export const dynamic = 'force-dynamic';

export default function Dashboard() {
  const router = useRouter();
  const settings = useSiteSettings();
  const [studentName, setStudentName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace('/');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role, status')
          .eq('id', user.id)
          .single();

        if (!profile) {
          await supabase.auth.signOut();
          router.replace('/');
          return;
        }

        if (profile.role === 'student' && profile.status === 'approved') {
          setStudentName(profile.full_name || 'Student');
          setEmail(user.email || '');
          setLoading(false);
        } else {
          await supabase.auth.signOut();
          router.replace('/');
        }

      } catch (err) {
        console.error('Dashboard auth error:', err);
        router.replace('/');
      }
    };

    verifyAccess();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B132B] flex flex-col justify-center items-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-medium tracking-widest text-xs uppercase">
          Loading your workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B132B] p-4 md:p-12 font-sans text-white">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <header className="flex justify-between items-start mb-12">
          <div className="flex items-center gap-4">
            {settings.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logo_url} alt={settings.org_name} className="h-10 object-contain" />
            )}
            <div>
              <h1 className="text-4xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-2">
                🎓 {settings.org_name} Dashboard
              </h1>
              <p className="text-gray-400 text-sm font-medium">
                Welcome back, <span className="text-white font-semibold">{studentName}</span>
                <span className="text-gray-500 font-normal ml-2">({email})</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-red-400 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/10 py-2.5 px-6 rounded-full transition-all border border-red-500/20"
          >
            Sign Out
          </button>
        </header>

        {/* MAIN CARDS */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* New Interview */}
          <button
            onClick={() => router.push('/dashboard/setup')}
            className="group p-10 bg-white/[0.02] border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center text-center hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer"
          >
            <span className="text-5xl mb-6 group-hover:scale-110 transition-transform">🎤</span>
            <h3 className="text-white font-bold text-xl mb-2 uppercase tracking-wide">
              New Interview
            </h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
              Start a Dynamic Session
            </p>
          </button>

          {/* Past Sessions */}
          <button
            onClick={() => router.push('/dashboard/review')}
            className="group p-10 bg-white/[0.02] border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center text-center hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer"
          >
            <span className="text-5xl mb-6 group-hover:scale-110 transition-transform">📊</span>
            <h3 className="text-white font-bold text-xl mb-2 uppercase tracking-wide">
              Past Sessions
            </h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
              Review Grades & Feedback
            </p>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-[10px] font-bold uppercase tracking-widest mt-16">
          V.2.0 // {settings.org_name} AI Interviewer
        </p>

      </div>
    </div>
  );
}