'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './lib/supabase';
import { useSiteSettings } from './lib/SiteSettingsContext';

type Mode = 'login' | 'register';

export default function Home() {
  const router = useRouter();
  const settings = useSiteSettings();
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
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
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
        .ilike('username', username.trim())
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
        setLoginError(`Your account has been rejected. Please contact ${settings.org_name}.`);
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
      console.error('Login error:', err);
      setLoginError('Something went wrong. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Register Handler ───────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    // Validate username
    if (regUsername.trim().length < 3) {
      setRegisterError('Username must be at least 3 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(regUsername.trim())) {
      setRegisterError('Username can only contain letters, numbers, and underscores.');
      return;
    }

    // Validate password
    if (regPassword.length < 8) {
      setRegisterError('Password must be at least 8 characters.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegisterError('Passwords do not match.');
      return;
    }

    setRegisterLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          contact,
          email,
          username: regUsername.trim().toLowerCase(),
          password: regPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setRegisterError(data.error || 'Registration failed.');
        return;
      }

      setRegisterSuccess(true);

    } catch (err) {
      console.error('Registration error:', err);
      setRegisterError('Something went wrong. Please try again.');
    } finally {
      setRegisterLoading(false);
    }
  };

  // ── Success Screen ─────────────────────────────────────────────────────────
  if (registerSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
        <div className="bg-white/10 backdrop-blur-lg p-10 rounded-2xl shadow-2xl border border-white/20 w-full max-w-sm text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-extrabold text-white mb-2">Registration Submitted!</h1>
          <p className="text-indigo-100 text-sm font-medium">
            Your registration has been sent to {settings.org_name} staff for approval.
            You will receive an email once your account is approved or rejected.
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
          {settings.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logo_url}
              alt={settings.org_name}
              className="h-16 mx-auto mb-3 object-contain"
            />
          ) : (
            <div className="text-5xl mb-3">🎓</div>
          )}
          <h1 className="text-3xl font-extrabold text-white">{settings.org_name}</h1>
          <p className="text-indigo-100 text-sm font-medium mt-1">AI Interview Practice Platform</p>
        </div>

        {/* Mode Toggle */}
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

        {/* LOGIN FORM */}
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

            <p className="text-center text-white/60 text-xs">
              New student?{' '}
              <button type="button" onClick={() => setMode('register')} className="text-white font-bold underline">
                Register here
              </button>
            </p>
          </form>
        )}

        {/* REGISTER FORM */}
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
            <div>
              <label className="block text-white text-sm font-bold mb-1">Choose a Username</label>
              <input
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
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
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-white/20 text-white placeholder-white/50 border border-white/30 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-bold mb-1">Confirm Password</label>
              <input
                type="password"
                required
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
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

            <p className="text-center text-white/60 text-xs">
              Already have an account?{' '}
              <button type="button" onClick={() => setMode('login')} className="text-white font-bold underline">
                Login here
              </button>
            </p>
          </form>
        )}

      </div>
    </div>
  );
}