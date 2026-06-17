'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const dynamic = 'force-dynamic';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyWorkspaceAccess = async () => {
      try {
        // 1. Fetch current active auth session identity
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          console.warn('Unauthorized session context.');
          window.location.replace('/');
          return;
        }

        // 2. Primary Scan: Search profile by User ID
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, role, status')
          .eq('id', user.id);

        let currentProfile = profile && profile.length > 0 ? profile[0] : null;

        // 🚀 CRITICAL RECOVERY FALLBACK:
        // Agar dynamic id mapping completely miss ho jaye, toh user ke logged-in email se row match karo!
        if (!currentProfile && user.email) {
          const { data: backupProfile } = await supabase
            .from('profiles')
            .select('full_name, role, status')
            .eq('email', user.email);

          if (backupProfile && backupProfile.length > 0) {
            currentProfile = backupProfile[0];
          }
        }

        // 3. Absolute safety gate if no profile rows exist at all
        if (!currentProfile) {
          console.error('Identity sync error: Profile mismatch matrix.');
          await supabase.auth.signOut();
          window.location.replace('/');
          return;
        }

        // 4. Secure Authorization Routing
        if (currentProfile.role === 'student' && currentProfile.status === 'approved') {
          setUser(user);
          setStudentName(currentProfile.full_name || 'Student Workspace');
          setLoading(false); // Render dashboard interface safely!
        } else {
          console.warn('Profile authorization verification rejected.');
          await supabase.auth.signOut();
          window.location.replace('/');
        }

      } catch (err) {
        console.error('Fatal execution exception inside dashboard router gate:', err);
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
        
        {/* HEADER */}
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

        {/* WORKSPACE CONTENT PANELS */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-10 bg-white/[0.01] border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center text-center">
            <span className="text-5xl mb-6">🎤</span>
            <h3 className="text-white font-bold text-xl mb-2 uppercase tracking-wide">New Interview</h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">System setup ready</p>
          </div>

          <div className="p-10 bg-white/[0.01] border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center text-center">
            <span className="text-5xl mb-6">📊</span>
            <h3 className="text-white font-bold text-xl mb-2 uppercase tracking-wide">Past Sessions</h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">History records active</p>
          </div>
        </div>

      </div>
    </div>
  );
}