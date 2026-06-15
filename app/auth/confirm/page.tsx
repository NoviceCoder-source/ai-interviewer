'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      // The recovery token comes as a hash fragment — only available in browser
      // e.g. #access_token=xxx&refresh_token=yyy&type=recovery
      const hash = window.location.hash;

      if (!hash) {
        // No hash — check if there's a code param (OTP flow)
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setErrorMsg(error.message);
            setStatus('error');
            return;
          }
          router.replace('/setup-account');
          return;
        }

        // No hash and no code — nothing to do
        setErrorMsg('Invalid or expired link. Please contact Bignalytics staff.');
        setStatus('error');
        return;
      }

      // Parse the hash fragment
      const params = new URLSearchParams(hash.replace('#', ''));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      if (!accessToken || !refreshToken) {
        setErrorMsg('Invalid link. Missing tokens. Please contact Bignalytics staff.');
        setStatus('error');
        return;
      }

      // Set the session using the tokens from the hash
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        setErrorMsg(error.message);
        setStatus('error');
        return;
      }

      // For recovery type — send to setup-account to set username + password
      // For other types — send to dashboard
      if (type === 'recovery') {
        router.replace('/setup-account');
      } else {
        router.replace('/dashboard');
      }
    };

    handleCallback();
  }, [router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="text-white text-center">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-bold text-sm uppercase tracking-widest">Verifying your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500 via-pink-500 to-rose-500 p-4">
      <div className="bg-white/10 backdrop-blur-lg p-10 rounded-2xl shadow-2xl border border-white/20 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-extrabold text-white mb-2">Link Error</h1>
        <p className="text-red-100 text-sm font-medium mb-6">{errorMsg}</p>
        <button
          onClick={() => router.replace('/')}
          className="w-full bg-white/20 text-white font-bold py-3 px-4 rounded-xl hover:bg-white/30 transition-all border border-white/30 text-sm"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}