'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './lib/supabase'; // Using your verified folder-level path layout

export default function Home() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Form Field States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [contact, setContact] = useState('');

  // ── True Username Login Processing ────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      let loginEmail = username; // Default to what was typed in the box

      // If the user didn't type a classic email string, assume it's a username lookup request
      if (!username.includes('@')) {
        // 🚀 FIXED: Replaced .single() with a safe data array check to prevent 406 crashes
        const { data: profiles, error: lookupError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', username);

        if (lookupError) {
          setErrorMessage(`Database lookup error: ${lookupError.message}`);
          setLoading(false);
          return;
        }

        // Check if the array returned empty
        if (!profiles || profiles.length === 0) {
          setErrorMessage('No profile found matching that username. Please sign up or verify spelling.');
          setLoading(false);
          return;
        }

        loginEmail = profiles[0].email; // Safely pull the email out of the first match
      }

      // Authenticate via Supabase identity system using resolved email profile
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (authError) {
        setErrorMessage(authError.message);
        setLoading(false);
        return;
      }

      if (authData?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', authData.user.id)
          .single();

        if (profileError || !profile) {
          setErrorMessage('Failed to fetch account status authorization.');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // Admin Entry Route
        if (profile.role === 'admin') {
          router.push('/admin/dashboard');
          return;
        }

        // Student Access Check Gateway
        if (profile.role === 'student') {
          if (profile.status === 'pending') {
            setErrorMessage('Your registration is currently awaiting administrative approval.');
            await supabase.auth.signOut();
          } else if (profile.status === 'rejected') {
            setErrorMessage('Your access request has been declined by administration.');
            await supabase.auth.signOut();
          } else {
            // 🚀 FIXED: Routes directly to your actual folder layout path matching app/dashboard
            router.push('/dashboard'); 
          }
        }
      }
    } catch (err: any) {
      console.error('Authentication process exception error details:', err);
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Registration Pipeline Flow ─────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your entries.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          username,
          contact: contact || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result.error || 'Registration failed.');
      } else {
        setRegistrationSuccess(true);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
        setUsername('');
        setContact('');
      }
    } catch (err) {
      setErrorMessage('Unable to connect to registration servers.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B132B] flex flex-col justify-center items-center p-6 text-white">
      <div className="w-full max-w-md bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-2xl p-8 shadow-xl">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
            🔐 BIGNALYTICS
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            {registrationSuccess ? 'Account Initialized' : isSignUp ? 'Create your platform profile credentials' : 'Sign in to access your dashboard system'}
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-xs font-medium tracking-wide">
            ⚠️ {errorMessage}
          </div>
        )}

        {registrationSuccess ? (
          <div className="text-center space-y-4 py-4">
            <div className="text-5xl">⏳</div>
            <h2 className="text-lg font-bold text-amber-400">Awaiting Administrative Approval</h2>
            <p className="text-gray-300 text-xs leading-relaxed max-w-xs mx-auto">
              Your account has been registered successfully. You will receive a notification email once an admin evaluates and activates your profile access.
            </p>
            <button
              onClick={() => { setRegistrationSuccess(false); setIsSignUp(false); }}
              className="mt-4 w-full bg-indigo-500 hover:bg-indigo-600 font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/20"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
            {isSignUp ? (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 transition-all text-white"
                    placeholder="Sam Thomson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 transition-all text-white"
                    placeholder="sam_thomson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Contact Number (Optional)</label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 transition-all text-white"
                    placeholder="9993348867"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 transition-all text-white"
                    placeholder="name@domain.com"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Username or Email</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 transition-all text-white"
                  placeholder="sam_thomson or name@domain.com"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 transition-all text-white"
                placeholder="••••••••"
              />
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 transition-all text-white"
                  placeholder="••••••••"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/20 mt-6"
            >
              {loading ? 'Processing Transaction...' : isSignUp ? 'Submit Registration' : 'Authenticate Session'}
            </button>

            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMessage('');
                }}
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-all underline decoration-indigo-500/30 underline-offset-4"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}