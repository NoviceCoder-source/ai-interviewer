'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../lib/api';
import { useSiteSettings } from '../lib/SiteSettingsContext';
import OrgLogo from '../components/OrgLogo';

export default function AdminLoginPage() {
  const router = useRouter();
  const settings = useSiteSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { redirectTo } = await api.post<{ redirectTo: string }>('/api/auth/admin-login', { email, password, secretCode });
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="bg-gray-900 p-10 rounded-2xl shadow-2xl border border-gray-800 w-full max-w-sm">

        <div className="text-center mb-8">
          <OrgLogo
            className="h-14 mx-auto mb-3"
            fallback={
              <div className="text-5xl mb-3">🔐</div>
            }
          />
          <h1 className="text-2xl font-extrabold text-white">Admin Portal</h1>
          <p className="text-gray-400 text-sm font-medium mt-1">{settings.org_name} Staff Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-bold mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-bold mb-1">Secret Code</label>
            <input
              type="password"
              required
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              placeholder="Enter admin secret code"
              className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs font-bold bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Login as Admin'}
          </button>

          <p className="text-center text-gray-600 text-xs">
            Student?{' '}
            <Link href="/" className="text-indigo-400 font-bold hover:underline">
              Go to student login
            </Link>
          </p>
        </form>

      </div>
    </div>
  );
}