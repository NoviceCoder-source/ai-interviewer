'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const verifyWorkspaceAccess = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          window.location.replace('/');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, role, status')
          .eq('id', user.id);

        if (profileError || !profile || profile.length === 0) {
          await supabase.auth.signOut();
          window.location.replace('/');
          return;
        }

        const currentProfile = profile[0];

        if (currentProfile.role === 'student' && currentProfile.status === 'approved') {
          setUser(user);
          setStudentName(currentProfile.full_name || 'Student Workspace');
          setLoading(false);
        } else {
          await supabase.auth.signOut();
          window.location.replace('/');
        }
      } catch (err) {
        window.location.replace('/');
      }
    };

    verifyWorkspaceAccess();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.replace('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B132B] flex flex-col justify-center items-center text-white font-medium tracking-widest text-xs uppercase">
        Validating secure workspace credentials...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B132B] p-4 md:p-12 font-sans text-white">
      <div className="max-w-5xl mx-auto bg-white/[0.02] backdrop-blur-md rounded-[3rem] shadow-xl p-8 md:p-16 border border-white/5">
        <header className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-4xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-2">
              🚀 STUDENT WORKSPACE
            </h1>
            <p className="text-gray-400 text-xs font-medium">
              Welcome back, <span className="text-white font-semibold">{studentName}</span>{' '}
              <span className="text-gray-500 font-normal">({user?.email})</span>
            </p>
          </div>
          <button 
            onClick={handleSignOut}
            className="text-red-400 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/10 py-2.5 px-6 rounded-full transition-all border border-red-500/20"
          >
            Sign Out
          </button>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <div 
            onClick={() => router.push('/dashboard/setup')}
            className="cursor-pointer p-10 bg-white/[0.01] border-2 border-dashed border-white/10 rounded-[3rem] hover:border-indigo-400 hover:bg-indigo-500/[0.02] transition-all flex flex-col items-center justify-center text-center group"
          >
            <span className="text-5xl mb-6 group-hover:rotate-12 transition-transform">🎤</span>
            <h3 className="text-white font-bold text-xl mb-2 uppercase tracking-wide">New Interview</h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Start a dynamic session</p>
          </div>

          <div 
            onClick={() => router.push('/dashboard/review')}
            className="cursor-pointer p-10 bg-white/[0.01] border-2 border-dashed border-white/10 rounded-[3rem] hover:border-purple-400 hover:bg-purple-500/[0.02] transition-all flex flex-col items-center justify-center text-center group"
          >
            <span className="text-5xl mb-6 group-hover:scale-110 transition-transform">📊</span>
            <h3 className="text-white font-bold text-xl mb-2 uppercase tracking-wide">Past Sessions</h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Review grades & feedback</p>
          </div>
        </div>

        <footer className="mt-16 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-500">
            V.2.0 // Active Virtual Environment
          </p>
        </footer>
      </div>
    </div>
  );
}