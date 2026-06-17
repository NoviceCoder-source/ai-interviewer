'use client';

import { useState } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Form Fields
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

      // Username Lookup Logic
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

      // Supabase Sign In
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

        // TURN OFF LOADING IMMEDIATELY TO UNFREEZE DOM
        setLoading(false);

        if (profile.role === 'admin') {
          window.location.href = '/admin/dashboard';
          return;
        }

        if (profile.role === 'student') {
          if (profile.status === 'pending') {
            setErrorMessage('Your registration is currently awaiting administrative approval.');
            await supabase.auth.signOut();
          } else if (profile.status === 'rejected') {
            setErrorMessage('Your access request has been declined by administration.');
            await supabase.auth.signOut();
          } else {
            // 🚀 Direct standard browser navigation wrapper bypass
            window.location.href = '/dashboard';
            return;
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
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
          <p className="text-gray-400 text-xs mt-1">Sign in to access your dashboard system</p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-xs font-medium">
            ⚠️ {errorMessage}
          </div>
        )}

        {registrationSuccess ? (
          <div className="text-center space-y-4 py-4">
            <h2 className="text-lg font-bold text-amber-400">Awaiting Approval</h2>
            <button onClick={() => { setRegistrationSuccess(false); setIsSignUp(false); }} className="w-full bg-indigo-500 py-3 rounded-xl text-sm font-bold">
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Full Name</label>
                  <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Email Address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1">Username or Email</label>
              <input type="text" required value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" placeholder="sam_thomson" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Confirm Password</label>
                <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" />
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-indigo-500 disabled:bg-indigo-500/50 text-white font-bold py-3 rounded-xl text-sm mt-6">
              {loading ? 'Processing...' : isSignUp ? 'Submit Registration' : 'Authenticate Session'}
            </button>

            <div className="text-center mt-4">
              <button type="button" onClick={() => { setIsSignUp(!isSignUp); setErrorMessage(''); }} className="text-xs text-indigo-400 underline">
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}