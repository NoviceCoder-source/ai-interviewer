'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './lib/supabase';

type Mode = 'login' | 'register';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');

  // Login states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register states
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // ── Login Handler ──────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, status, role')
        .eq('username', username.trim())
        .single();

      if (profileError || !profile) {
        setLoginError('Username not found. Please check your username.');
        return;
      }

      if (profile.status === 'pending') {
        setLoginError('Your account is still pending approval.');
        return;
      }

      if (profile.status === 'rejected') {
        setLoginError('Your account has been rejected. Please contact Bignalytics.');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      });

      if (signInError) {
        setLoginError('Incorrect password. Please try again.');
        return;
      }

      if (profile.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }

    } catch (err) {
      console.error('Login processing crash:', err);
      setLoginError('Something went wrong. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Safe Server-Side Register Handler ──────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, contact, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setRegisterError(data.error || 'Registration failed.');
        return;
      }

      setRegisterSuccess(true);

    } catch (err) {
      console.error('Registration post error:', err);
      setRegisterError('Something went wrong. Please try again.');
    } finally {
      setRegisterLoading(false);
    }
  };

  if (registerSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
        <div className="bg-white/10 backdrop-blur-lg p-10 rounded-2xl shadow-2xl border border-white/20 w-full max-w-sm text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-extrabold text-white mb-2">Request Submitted!</h1>
          <p className="text-indigo-100 text-sm font-medium">
            Your registration request has been sent to Bignalytics staff for approval.
            You will receive an email once your account is approved.
          </p>
          <button
            onClick={() => { setRegisterSuccess(false); setMode('login'); }}
            className="mt-6 w-full bg-white text-indigo-600 font-bold py-3 px-4 rounded-xl hover:scale-105 transition-all"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="bg-white/10 backdrop-blur-lg p-10 rounded-2xl shadow-2xl border border-white/20 w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎓</div>
          <h1 className="text-3xl font-extrabold text-white">Bignalytics</h1>
          <p className="text-indigo-100 text-sm font-medium mt-1">AI Interview Practice Platform</p>
        </div>

        <div className="flex rounded-xl border border-white/20 overflow-hidden mb-8">
          <button
            onClick={() => { setMode('login'); setLoginError(''); }}
            className={`flex-1 py-3 text-sm font-bold transition-all ${
              mode === 'login' ? 'bg-white text-indigo-600' : 'bg-transparent text-white hover:bg-white/10'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => { setMode('register'); setRegisterError(''); }}
            className={`flex-1 py-3 text-sm font-bold transition-all ${
              mode === 'register' ? 'bg-white text-indigo-600' : 'bg-transparent text-white hover:bg-white/10'
            }`}
          >
            Register
          </button>
        </div>

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-white text-sm font-bold mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full bg-white/20 text-white placeholder-white/50 border border-white/30 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-bold mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-white/20 text-white placeholder-white/50 border border-white/30 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>

            {loginError && (
              <p className="text-red-200 text-xs font-bold bg-red-500/20 px-3 py-2 rounded-lg">
                ⚠️ {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-white text-indigo-600 font-bold py-3 px-4 rounded-xl shadow-md hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loginLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-white text-sm font-bold mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full bg-white/20 text-white placeholder-white/50 border border-white/30 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-bold mb-1">Contact Number</label>
              <input
                type="tel"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Enter your contact number"
                className="w-full bg-white/20 text-white placeholder-white/50 border border-white/30 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-bold mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full bg-white/20 text-white placeholder-white/50 border border-white/30 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>

            {registerError && (
              <p className="text-red-200 text-xs font-bold bg-red-500/20 px-3 py-2 rounded-lg">
                ⚠️ {registerError}
              </p>
            )}

            <button
              type="submit"
              disabled={registerLoading}
              className="w-full bg-white text-indigo-600 font-bold py-3 px-4 rounded-xl shadow-md hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {registerLoading ? 'Submitting...' : 'Submit Registration'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
