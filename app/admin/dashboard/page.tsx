'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase'; // Cleaned up relative path to match app/admin/dashboard structure

type Student = {
  id: string;
  full_name: string;
  email: string;
  contact: string;
  status: 'pending' | 'approved' | 'rejected';
  updated_at: string;
};

type FilterStatus = 'pending' | 'approved' | 'rejected';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterStatus>('pending');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    // Verify admin session privileges on mount
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        router.push('/');
        return;
      }
      if (profile.full_name) setAdminName(profile.full_name);
    };

    checkAdmin();
  }, [router]);

  // ── Corrected Pipeline Fetch Function ──────────────────────────────────────
  const fetchStudents = async (status: FilterStatus) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, contact, status, updated_at')
        .eq('status', status)
        .eq('role', 'student')
        .order('updated_at', { ascending: false }); // 👈 FIXED: Sorts dynamically by real column

      if (error) {
        console.error('Supabase fetch validation failure:', error.message);
      } else {
        setStudents(data || []);
      }
    } catch (err) {
      console.error('Unexpected dashboard fetch exception:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(activeTab);
  }, [activeTab]);

  const handleStatusChange = async (id: string, newStatus: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert(`Failed to update status: ${error.message}`);
    } else {
      // Re-fetch the current active view lists seamlessly
      fetchStudents(activeTab);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#0B132B] text-white p-8">
      {/* Top Identity bar */}
      <div className="flex justify-between items-center mb-10 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
            🔐 BIGNALYTICS <span className="text-indigo-400 font-medium text-2xl">ADMIN</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1">Logged in as <span className="text-white font-semibold">{adminName}</span></p>
        </div>
        <button
          onClick={handleSignOut}
          className="bg-white/10 hover:bg-white/20 border border-white/10 px-6 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all"
        >
          SIGN OUT
        </button>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* State Selection Navigation Tabs */}
        <div className="flex space-x-4 mb-6">
          {(['pending', 'approved', 'rejected'] as FilterStatus[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-bold text-sm tracking-wider uppercase transition-all ${
                activeTab === tab
                  ? 'bg-amber-500 text-[#0B132B] shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Dynamic Card Dashboard Workspace */}
        <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-2xl p-8 min-h-[350px] flex flex-col justify-center">
          {loading ? (
            <div className="text-center text-gray-400 font-medium">Loading records...</div>
          ) : students.length === 0 ? (
            <div className="text-center space-y-3">
              <div className="text-4xl">📬</div>
              <h3 className="text-gray-400 font-bold uppercase tracking-widest text-sm">No {activeTab} Students</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 align-top self-start w-full">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col justify-between hover:border-white/20 transition-all shadow-md"
                >
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{student.full_name}</h3>
                    <p className="text-gray-400 text-xs font-medium mb-3">{student.email}</p>
                    <div className="text-xs text-gray-300 space-y-1 bg-black/20 p-3 rounded-lg border border-white/5">
                      <div>📞 <span className="font-semibold">{student.contact || 'N/A'}</span></div>
                    </div>
                  </div>

                  {activeTab === 'pending' && (
                    <div className="flex space-x-3 mt-5">
                      <button
                        onClick={() => handleStatusChange(student.id, 'approved')}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-lg text-xs tracking-wider transition-all"
                      >
                        APPROVE
                      </button>
                      <button
                        onClick={() => handleStatusChange(student.id, 'rejected')}
                        className="flex-1 bg-red-500/20 hover:bg-red-500 text-red-200 font-bold py-2 rounded-lg text-xs tracking-wider border border-red-500/30 transition-all"
                      >
                        REJECT
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}