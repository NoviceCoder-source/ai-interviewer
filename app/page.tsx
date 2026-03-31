'use client'; 
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './lib/supabase'; 

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 1. Check if a user is already logged in when the page loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard'); // Teleport to dashboard
      }
    });

    // 2. Listen for any login events (like returning from Google)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.push('/dashboard'); // Teleport to dashboard
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`, 
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="bg-white/10 backdrop-blur-lg p-10 rounded-2xl shadow-2xl border border-white/20 w-full max-w-sm text-center">
        <div className="mb-6 text-white text-5xl">🎓</div>
        
        <h1 className="text-3xl font-extrabold text-white mb-2">
          AI Interviewer
        </h1>
        
        <p className="text-indigo-100 mb-8 font-medium">
          Master your subjects with AI-powered practice.
        </p>
        
        <button 
          onClick={handleLogin}
          className="w-full bg-white text-indigo-600 font-bold py-3 px-4 rounded-xl shadow-md hover:scale-105 transition-all duration-300 ease-in-out"
        >
          Login with Google
        </button>
      </div>
    </div>
  );
}
