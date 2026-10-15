'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './lib/api';
import { useSiteSettings } from './lib/SiteSettingsContext';
import { Mic, BarChart3, TrendingUp, User, Lock, Eye, EyeOff, ArrowRight, Mail, Phone, UserPlus } from 'lucide-react';
import OrgLogo from './components/OrgLogo';
import { secondaryBg, secondaryText, secondaryTint } from './lib/theme';

type Mode = 'login' | 'register';

export default function Home() {
  const router = useRouter();
  const settings = useSiteSettings();
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const { redirectTo } = await api.post<{ redirectTo: string }>('/api/auth/login', { username, password });
      router.push(redirectTo);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    if (regUsername.trim().length < 3) { setRegisterError('Username must be at least 3 characters.'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(regUsername.trim())) { setRegisterError('Username can only contain letters, numbers, and underscores.'); return; }
    if (regPassword.length < 8) { setRegisterError('Password must be at least 8 characters.'); return; }
    if (regPassword !== regConfirmPassword) { setRegisterError('Passwords do not match.'); return; }

    setRegisterLoading(true);
    try {
      await api.post('/api/register', {
        fullName, contact, email,
        username: regUsername.trim().toLowerCase(),
        password: regPassword,
      });
      setRegisterSuccess(true);
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setRegisterLoading(false);
    }
  };

  if (registerSuccess) {
    return (
      <main className="min-h-screen bg-[#f7faff] flex items-center justify-center p-6">
        <div className="w-full max-w-[440px] rounded-[28px] border border-[#e4edf7] bg-white p-10 text-center shadow-[0_20px_60px_rgba(25,80,140,0.10)]">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-ink mb-2">Registration submitted</h1>
          <p className="text-sm text-[#7690b1]">
            Your registration has been sent to {settings.org_name} staff for approval.
            You will receive an email once your account is approved or rejected.
          </p>
          <button
            onClick={() => { setRegisterSuccess(false); setMode('login'); }}
            style={secondaryBg}
            className="mt-7 w-full h-[52px] rounded-xl text-white font-semibold shadow-lg shadow-blue-200 hover:opacity-90 transition-all"
          >
            Back to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7faff]">
      <div className="flex min-h-screen">

        {/* LEFT SIDE */}
        <section className="relative hidden w-1/2 overflow-hidden lg:flex" style={{ background: `linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 6%, #eef7ff), color-mix(in srgb, var(--color-secondary) 14%, #eef7ff))` }}>
          <div className="absolute -left-32 top-32 h-[420px] w-[420px] rounded-full" style={secondaryTint(15)} />
          <div className="absolute -bottom-32 -right-20 h-[400px] w-[400px] rounded-full" style={secondaryTint(20)} />

          <div className="relative z-10 flex w-full flex-col px-16 py-12">
            <div className="flex items-center gap-3">
              <OrgLogo
                className="h-11"
                fallback={
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={secondaryBg}>
                    <div className="flex items-end gap-[3px]">
                      <span className="h-3 w-[3px] rounded-full bg-white" />
                      <span className="h-6 w-[3px] rounded-full bg-white" />
                      <span className="h-9 w-[3px] rounded-full bg-white" />
                      <span className="h-5 w-[3px] rounded-full bg-white" />
                      <span className="h-3 w-[3px] rounded-full bg-white" />
                    </div>
                  </div>
                }
              />
              <span className="text-2xl font-bold text-ink">{settings.org_name}</span>
            </div>

            <div className="mt-20 max-w-[620px]">
              <h1 className="text-[46px] font-bold leading-[1.1] tracking-tight text-ink">
                Your AI Interview
                <span className="block" style={secondaryText}>Practice Platform</span>
              </h1>
              <p className="mt-6 max-w-[560px] text-lg leading-8 text-[#55749d]">
                Build your confidence, improve your skills, and get ready for your dream job.
              </p>

              <div className="mt-9 flex gap-8">
                <Feature icon={<Mic size={22} />} title="Realistic" subtitle="Interviews" accent={secondaryText} />
                <Feature icon={<BarChart3 size={22} />} title="Instant" subtitle="Feedback" accent={secondaryText} />
                <Feature icon={<TrendingUp size={22} />} title="Track" subtitle="Progress" accent={secondaryText} />
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT SIDE */}
        <section className="flex flex-1 items-center justify-center bg-[#f8fbff] px-6 py-10">
          <div className="w-full max-w-[480px]">
            <div className="rounded-[28px] border border-[#e4edf7] bg-white p-8 shadow-[0_20px_60px_rgba(25,80,140,0.10)] sm:p-10">

              <div className="text-center">
                <OrgLogo
                  className="mx-auto h-12"
                  fallback={
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={secondaryTint(12)}>
                      <div className="flex items-end gap-[3px]">
                        <span className="h-4 w-[4px] rounded-full" style={secondaryBg} />
                        <span className="h-7 w-[4px] rounded-full" style={secondaryBg} />
                        <span className="h-10 w-[4px] rounded-full" style={secondaryBg} />
                        <span className="h-6 w-[4px] rounded-full" style={secondaryBg} />
                        <span className="h-4 w-[4px] rounded-full" style={secondaryBg} />
                      </div>
                    </div>
                  }
                />
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink">{settings.org_name}</h2>
                <p className="mt-2 text-sm text-[#7690b1]">AI Interview Practice Platform</p>
              </div>

              <div className="mt-8 flex rounded-2xl bg-[#f2f7fc] p-1">
                <button
                  onClick={() => { setMode('login'); setLoginError(''); }}
                  style={mode === 'login' ? secondaryBg : undefined}
                  className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all ${mode === 'login' ? 'text-white shadow-md shadow-blue-200' : 'text-[#6682a5]'}`}
                >
                  Login
                </button>
                <button
                  onClick={() => { setMode('register'); setRegisterError(''); }}
                  style={mode === 'register' ? secondaryBg : undefined}
                  className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all ${mode === 'register' ? 'text-white shadow-md shadow-blue-200' : 'text-[#6682a5]'}`}
                >
                  Register
                </button>
              </div>

              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="mt-7 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink">Username</label>
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#88a2c1]" />
                      <input
                        type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        className="h-[52px] w-full rounded-xl border border-[#d7e4f1] bg-white pl-12 pr-4 text-sm text-ink outline-none transition-all placeholder:text-[#9aafc7] focus:border-[var(--color-secondary)] focus:ring-4"
                        style={{ boxShadow: 'none' }}
                        onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 4px color-mix(in srgb, var(--color-secondary) 10%, transparent)`)}
                        onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink">Password</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#88a2c1]" />
                      <input
                        type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="h-[52px] w-full rounded-xl border border-[#d7e4f1] bg-white pl-12 pr-12 text-sm text-ink outline-none transition-all placeholder:text-[#9aafc7]"
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-secondary)'; e.currentTarget.style.boxShadow = `0 0 0 4px color-mix(in srgb, var(--color-secondary) 10%, transparent)`; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = '#d7e4f1'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7894b5]">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <p className="text-red-500 text-xs font-semibold bg-red-50 px-3 py-2 rounded-lg">{loginError}</p>
                  )}

                  <button
                    type="submit" disabled={loginLoading} style={secondaryBg}
                    className="group mt-2 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl text-white text-base font-semibold shadow-lg shadow-blue-200 hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {loginLoading ? 'Logging in...' : 'Login'}
                    <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
                  </button>

                  <p className="mt-5 text-center text-sm text-[#7892b2]">
                    New student?{' '}
                    <button type="button" onClick={() => setMode('register')} className="font-semibold hover:underline" style={secondaryText}>
                      Register here
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="mt-7 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink">Full Name</label>
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#88a2c1]" />
                      <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="h-[52px] w-full rounded-xl border border-[#d7e4f1] bg-white pl-12 pr-4 text-sm text-ink outline-none placeholder:text-[#9aafc7]" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink">Contact Number</label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#88a2c1]" />
                      <input type="tel" required value={contact} onChange={(e) => setContact(e.target.value)}
                        placeholder="Enter your contact number"
                        className="h-[52px] w-full rounded-xl border border-[#d7e4f1] bg-white pl-12 pr-4 text-sm text-ink outline-none placeholder:text-[#9aafc7]" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink">Email Address</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#88a2c1]" />
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="h-[52px] w-full rounded-xl border border-[#d7e4f1] bg-white pl-12 pr-4 text-sm text-ink outline-none placeholder:text-[#9aafc7]" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink">Choose a Username</label>
                    <div className="relative">
                      <UserPlus size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#88a2c1]" />
                      <input type="text" required value={regUsername} onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="e.g. sarthak123"
                        className="h-[52px] w-full rounded-xl border border-[#d7e4f1] bg-white pl-12 pr-4 text-sm text-ink outline-none placeholder:text-[#9aafc7]" />
                    </div>
                    <p className="text-[#9aafc7] text-xs mt-1">Letters, numbers, and underscores only.</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink">Choose a Password</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#88a2c1]" />
                      <input type={showPassword ? 'text' : 'password'} required value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="h-[52px] w-full rounded-xl border border-[#d7e4f1] bg-white pl-12 pr-12 text-sm text-ink outline-none placeholder:text-[#9aafc7]" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7894b5]">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-ink">Confirm Password</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#88a2c1]" />
                      <input type={showConfirmPassword ? 'text' : 'password'} required value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Repeat your password"
                        className="h-[52px] w-full rounded-xl border border-[#d7e4f1] bg-white pl-12 pr-12 text-sm text-ink outline-none placeholder:text-[#9aafc7]" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7894b5]">
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {registerError && (
                    <p className="text-red-500 text-xs font-semibold bg-red-50 px-3 py-2 rounded-lg">{registerError}</p>
                  )}

                  <button
                    type="submit" disabled={registerLoading} style={secondaryBg}
                    className="group mt-2 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl text-white text-base font-semibold shadow-lg shadow-blue-200 hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {registerLoading ? 'Submitting...' : 'Create Account'}
                    <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
                  </button>

                  <p className="mt-5 text-center text-sm text-[#7892b2]">
                    Already have an account?{' '}
                    <button type="button" onClick={() => setMode('login')} className="font-semibold hover:underline" style={secondaryText}>
                      Login here
                    </button>
                  </p>
                </form>
              )}
            </div>

            <p className="mt-6 text-center text-xs text-[#9aadc4]">
              Practice smarter • Improve faster • Get hired
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({ icon, title, subtitle, accent }: { icon: React.ReactNode; title: string; subtitle: string; accent: React.CSSProperties }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm" style={accent}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-[#214875]">{title}</p>
        <p className="text-sm text-[#55749d]">{subtitle}</p>
      </div>
    </div>
  );
}