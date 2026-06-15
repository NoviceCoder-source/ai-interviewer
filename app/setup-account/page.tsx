'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function SetupAccountPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      // Check if there's a recovery token in the URL query params
      // Supabase sends: ?token=xxx&type=recovery
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const type = params.get('type');

      if (token && type === 'recovery') {
        // Exchange the token for a session
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'recovery',
        });

        if (verifyError) {
          console.error('Token verify error:', verifyError);
          // Link expired or invalid — send back to login
          router.replace('/?error=link_expired');
          return;
        }

        // Token verified — user is now logged in, clear the URL params
        window.history.replaceState({}, '', '/setup-account');
        setChecking(false);
        return;
      }

      // No token in URL — check if already logged in (returning to this page)
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('status, username')
        .eq('id', user.id)
        .single();

      if (!profile || profile.status !== 'approved') {
        router.replace('/');
        return;
      }

      // Already set up — send to dashboard
      if (profile.username) {
        router.replace('/dashboard');
        return;
      }

      setChecking(false);
    };

    checkUser();
  }, [router]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setError('Username can only contain letters, numbers, and underscores.');
      return;
    }

    setLoading(true);

    try {
      // Check if username is taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.trim().toLowerCase())
        .single();

      if (existing) {
        setError('This username is already taken. Please choose another.');
        return;
      }

      // Set the new password
      const { error: passwordError } = await supabase.auth.updateUser({
        password,
      });

      if (passwordError) {
        setError('Failed to set password. Please try again.');
        return;
      }

      // Save username to profile
      const { data: { user } } = await supabase.auth.getUser();
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username: username.trim().toLowerCase() })
        .eq('id', user!.id);

      if (profileError) {
        setError('Failed to save username. Please try again.');
        return;
      }

      router.replace('/dashboard');

    } catch (err) {
      console.error('Setup error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="bg-white/10 backdrop-blur-lg p-10 rounded-2xl shadow-2xl border border-white/20 w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-2xl font-extrabold text-white">You&apos;re Approved!</h1>
          <p className="text-indigo-100 text-sm font-medium mt-2">
            Set up your username and password to access Bignalytics.
          </p>
        </div>

        <form onSubmit={handleSetup} className="space-y-4">
          <div>
            <label className="block text-white text-sm font-bold mb-1">Choose a Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. sarthak123"
              className="w-full bg-white/20 text-white placeholder-white/50 border border-white/30 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <p className="text-white/50 text-xs mt-1">Letters, numbers, and underscores only.</p>
          </div>

          <div>
            <label className="block text-white text-sm font-bold mb-1">Choose a Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full bg-white/20 text-white placeholder-white/50 border border-white/30 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>

          <div>
            <label className="block text-white text-sm font-bold mb-1">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              className="w-full bg-white/20 text-white placeholder-white/50 border border-white/30 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>

          {error && (
            <p className="text-red-200 text-xs font-bold bg-red-500/20 px-3 py-2 rounded-lg">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-indigo-600 font-bold py-3 px-4 rounded-xl shadow-md hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up...' : 'Complete Setup'}
          </button>
        </form>

      </div>
    </div>
  );
}