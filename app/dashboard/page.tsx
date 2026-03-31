'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
      }
    };
    getUser();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-12 font-sans text-gray-900">
      <div className="max-w-5xl mx-auto bg-white rounded-[3rem] shadow-xl p-8 md:p-16 border border-gray-100">
        
        {/* HEADER */}
        <header className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-5xl font-black text-indigo-600 tracking-tighter mb-2 italic">Student Dashboard</h1>
            <p className="text-gray-400 font-medium">
              Logged in as: <span className="text-indigo-900 font-bold">{user?.email}</span>
            </p>
          </div>
          <button 
            onClick={handleSignOut}
            className="text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-50 py-2 px-6 rounded-full transition-all border border-red-100"
          >
            Sign Out
          </button>
        </header>

        {/* NAVIGATION CARDS */}
        <div className="grid md:grid-cols-2 gap-8">
          
          <div 
            onClick={() => router.push('/dashboard/setup')}
            className="cursor-pointer p-10 bg-white border-2 border-dashed border-indigo-200 rounded-[3rem] hover:border-indigo-500 hover:bg-indigo-50/20 transition-all flex flex-col items-center justify-center text-center group"
          >
            <span className="text-5xl mb-6 group-hover:rotate-12 transition-transform">🎤</span>
            <h3 className="text-indigo-900 font-black text-2xl mb-2 uppercase">New Interview</h3>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Start a dynamic session</p>
          </div>

          <div 
            onClick={() => router.push('/dashboard/review')}
            className="cursor-pointer p-10 bg-white border-2 border-dashed border-purple-200 rounded-[3rem] hover:border-purple-500 hover:bg-purple-50/20 transition-all flex flex-col items-center justify-center text-center group"
          >
            <span className="text-5xl mb-6 group-hover:scale-110 transition-transform">📊</span>
            <h3 className="text-purple-800 font-black text-2xl mb-2 uppercase">Past Sessions</h3>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Review grades & feedback</p>
          </div>

        </div>

        <footer className="mt-16 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-300">V.2.0 // Active Virtual Environment</p>
        </footer>
      </div>
    </div>
  );
}