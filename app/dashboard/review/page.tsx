'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

// --- TYPE DEFINITIONS (No more 'any'!) ---
interface EvaluationReport {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

interface InterviewSession {
  id: string;
  subject: string;
  difficulty: string;
  created_at: string;
  report: EvaluationReport;
}

export default function ReviewSessions() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data, error } = await supabase
          .from('interviews')
          .select('*')
          .not('report', 'is', null) // Only fetch interviews that have a completed report
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setSessions(data as InterviewSession[]);
      } catch (err) {
        console.error("Error fetching sessions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-indigo-600 font-black uppercase tracking-widest text-xs">Loading History...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Navigation */}
        <button 
          onClick={() => router.push('/dashboard')} 
          className="group mb-8 flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:text-black transition-colors"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Dashboard
        </button>

        <header className="mb-12">
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">
            Interview <span className="text-indigo-600">Archive</span>
          </h1>
          <p className="text-gray-500 font-medium mt-2">Track your growth and review AI feedback from past sessions.</p>
        </header>

        {/* Sessions List */}
        <div className="grid gap-6">
          {sessions.length > 0 ? (
            sessions.map((session) => (
              <div 
                key={session.id} 
                className="group bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 transition-all flex flex-col md:flex-row justify-between items-center gap-6"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-black text-gray-800 tracking-tight">{session.subject}</h3>
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider border border-indigo-100">
                      {session.difficulty}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                    Attempted on {new Date(session.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <div className="flex items-center gap-10">
                  <div className="text-center">
                    <span className="block text-4xl font-black text-indigo-600 tabular-nums">
                      {session.report.score}%
                    </span>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Final Grade</span>
                  </div>
                  
                  <button 
                    onClick={() => router.push(`/dashboard/interview/${session.id}`)}
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
              <h2 className="text-xl font-black text-gray-900 uppercase">No sessions found</h2>
              <p className="text-gray-400 font-medium mt-2 max-w-xs mx-auto">
                Once you complete an interview, your detailed report will appear here.
              </p>
              <button 
                onClick={() => router.push('/dashboard')}
                className="mt-8 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest"
              >
                Start First Interview
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}