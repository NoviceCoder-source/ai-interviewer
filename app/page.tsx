'use client';

import { useState } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Core Form Binding Hooks
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [contact, setContact] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      let loginEmail = usernameInput.trim();

      if (!loginEmail) {
        setErrorMessage('Please enter your username or email address.');
        setLoading(false);
        return;
      }

      // Username standard matching logic
      if (!loginEmail.includes('@')) {
        const { data: profiles, error: lookupError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', loginEmail);

        if (lookupError) {
          setErrorMessage(`Database lookup failure: ${lookupError.message}`);
          setLoading(false);
          return;
        }

        if (!profiles || profiles.length === 0) {
          setErrorMessage('No profile found matching that username.');
          setLoading(false);
          return;
        }

        loginEmail = profiles[0].email;
      }

      // Authenticate via Supabase identity system
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
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

        // Admin Redirect Block
        if (profile.role === 'admin') {
          setLoading(false);
          setTimeout(() => {
            window.location.assign('/admin/dashboard');
          }, 50);
          return;
        }

        // Student Redirect Block
        if (profile.role === 'student') {
          if (profile.status === 'pending') {
            setErrorMessage('Your registration is currently awaiting administrative approval.');
            await supabase.auth.signOut();
          } else if (profile.status === 'rejected') {
            setErrorMessage('Your access request has been declined by administration.');
            await supabase.auth.signOut();
          } else {
            // 🚀 RELEASE FREEZE TOGGLE FIRST THEN HARD SWITCH VIEWPORT
            setLoading(false);
            setTimeout(() => {
              window.location.assign('/dashboard');
            }, 50);
            return;
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

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
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          username: usernameInput.trim(),
          contact: contact.trim() || null,
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
        setUsernameInput('');
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
              Your account has been registered successfully. Return to login once approved.
            </p>
            <button
              onClick={() => { setRegistrationSuccess(false); setIsSignUp(false); }}
              className="mt-4 w-full bg-indigo-500 hover:bg-indigo-600 font-bold py-3 rounded-xl text-sm transition-all shadow-lg"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 text-white"
                    placeholder="Sam Thomson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Contact Number (Optional)</label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 text-white"
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
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 text-white"
                    placeholder="name@domain.com"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                {isSignUp ? 'Username' : 'Username or Email'}
              </label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 text-white"
                placeholder="sam_thomson"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 text-white"
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
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 text-white"
                  placeholder="••••••••"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg mt-6"
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
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-all underline underline-offset-4"
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