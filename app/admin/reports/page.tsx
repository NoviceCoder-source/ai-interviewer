'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

interface Report {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

interface InterviewRow {
  id: string;
  subject: string;
  difficulty: string;
  created_at: string;
  report: Report;
  profiles: { full_name: string; email: string } | null;
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<InterviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'subject' | 'score'>('date');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (!profile || profile.role !== 'admin') { router.push('/'); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      try {
        const res = await fetch('/api/admin/interviews', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (res.ok) setSessions(data.interviews || []);
      } catch (err) {
        console.error('Error fetching admin reports:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const filtered = sessions
    .filter(s =>
      s.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.profiles?.email?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'subject') return a.subject.localeCompare(b.subject);
      return b.report.score - a.report.score;
    });

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-indigo-600 font-black uppercase tracking-widest text-xs">Loading Reports...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.push('/admin/dashboard')}
          className="group mb-8 flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:text-black transition-colors"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Dashboard
        </button>

        <header className="mb-12">
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">
            Student <span className="text-indigo-600">Reports</span>
          </h1>
          <p className="text-gray-500 font-medium mt-2">Review every student&apos;s interview performance.</p>
        </header>

        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by student name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'subject' | 'score')}
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="date">Sort: Date</option>
            <option value="subject">Sort: Subject</option>
            <option value="score">Sort: Score</option>
          </select>
        </div>

        <div className="grid gap-6">
          {filtered.length > 0 ? (
            filtered.map((s) => (
              <div
                key={s.id}
                className="group bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 transition-all flex flex-col md:flex-row justify-between items-center gap-6"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-black text-gray-800 tracking-tight">{s.subject}</h3>
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider border border-indigo-100">
                      {s.difficulty}
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs font-bold">
                    {s.profiles?.full_name || 'Unknown Student'} <span className="text-gray-300">·</span> {s.profiles?.email || 'No Email'}
                  </p>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
                    Attempted on {new Date(s.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <div className="flex items-center gap-10">
                  <div className="text-center">
                    <span className="block text-4xl font-black text-indigo-600 tabular-nums">
                      {s.report.score}%
                    </span>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Final Grade</span>
                  </div>

                  <button
                    onClick={() => router.push(`/admin/reports/${s.id}`)}
                    className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 hover:scale-105 active:scale-95 transition-all shadow-lg"
                  >
                    Review Report
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-[3rem] p-20 border-2 border-dashed border-gray-200 text-center">
              <div className="text-5xl mb-4">📭</div>
              <h2 className="text-xl font-black text-gray-900 uppercase">No reports found</h2>
              <p className="text-gray-400 font-medium mt-2 max-w-xs mx-auto">
                Once students complete interviews, reports will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}