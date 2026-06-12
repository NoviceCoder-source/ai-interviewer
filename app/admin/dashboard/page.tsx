'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

interface Student {
  id: string;
  full_name: string;
  email: string;
  contact: string;
  status: string;
  created_at: string;
}

type FilterStatus = 'pending' | 'approved' | 'rejected';

export default function AdminDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminName, setAdminName] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/admin');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.replace('/admin');
        return;
      }

      setAdminName(profile?.full_name || user.email || 'Admin');
      await fetchStudents('pending');
    };

    init();
  }, [router]);

  const fetchStudents = async (status: FilterStatus) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, contact, status, created_at')
      .eq('status', status)
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (!error && data) setStudents(data as Student[]);
    setLoading(false);
  };

  const handleFilter = (status: FilterStatus) => {
    setFilter(status);
    fetchStudents(status);
  };

  const handleAction = async (
    studentId: string,
    studentEmail: string,
    action: 'approve' | 'reject' | 'revoke'
  ) => {
    if (action === 'reject' || action === 'revoke') {
      const confirmed = window.confirm(
        action === 'revoke'
          ? 'Are you sure you want to revoke this student\'s access?'
          : 'Are you sure you want to reject this student?'
      );
      if (!confirmed) return;
    }

    setActionLoading(studentId);

    try {
      const res = await fetch('/api/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, studentEmail, action }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert('Action failed: ' + data.error);
        return;
      }

      if (data.warning) {
        alert('⚠️ ' + data.warning);
      } else if (action === 'approve') {
        alert(`✅ Student approved! A setup link has been sent to ${studentEmail}`);
      }

      // Remove from current list
      setStudents(prev => prev.filter(s => s.id !== studentId));

    } catch (err) {
      console.error('Action error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/admin');
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6 font-sans">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">
              🔐 Bignalytics <span className="text-indigo-400">Admin</span>
            </h1>
            <p className="text-gray-500 text-xs font-medium mt-1">
              Logged in as {adminName}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-6 py-2 bg-gray-800 text-gray-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
          >
            Sign Out
          </button>
        </header>

        {/* FILTER TABS */}
        <div className="flex gap-3 mb-6">
          {(['pending', 'approved', 'rejected'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => handleFilter(status)}
              className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                filter === status
                  ? status === 'pending'
                    ? 'bg-amber-500 text-white'
                    : status === 'approved'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-red-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {status}
              {filter === status && (
                <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full">
                  {students.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* STUDENT LIST */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl p-16 text-center border border-gray-800">
            <div className="text-4xl mb-4">
              {filter === 'pending' ? '📭' : filter === 'approved' ? '✅' : '❌'}
            </div>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">
              No {filter} students
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {students.map((student) => (
              <div
                key={student.id}
                className="bg-gray-900 rounded-2xl p-6 border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                {/* Student Info */}
                <div className="flex-1">
                  <h3 className="text-white font-black text-lg">
                    {student.full_name || 'No name provided'}
                  </h3>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <p className="text-gray-400 text-sm">📧 {student.email}</p>
                    <p className="text-gray-400 text-sm">📱 {student.contact || 'No contact provided'}</p>
                  </div>
                  <p className="text-gray-600 text-xs mt-2">
                    Registered on {new Date(student.created_at).toLocaleDateString(undefined, {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                </div>

                {/* Action Buttons */}
                {filter === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAction(student.id, student.email, 'approve')}
                      disabled={actionLoading === student.id}
                      className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === student.id ? '...' : '✅ Approve'}
                    </button>
                    <button
                      onClick={() => handleAction(student.id, student.email, 'reject')}
                      disabled={actionLoading === student.id}
                      className="px-6 py-3 bg-red-500/20 text-red-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/30"
                    >
                      {actionLoading === student.id ? '...' : '❌ Reject'}
                    </button>
                  </div>
                )}

                {filter === 'approved' && (
                  <div className="flex gap-3">
                    <span className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl font-black text-xs uppercase tracking-widest border border-emerald-500/30">
                      ✅ Approved
                    </span>
                    <button
                      onClick={() => handleAction(student.id, student.email, 'revoke')}
                      disabled={actionLoading === student.id}
                      className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 border border-red-500/30"
                    >
                      {actionLoading === student.id ? '...' : 'Revoke'}
                    </button>
                  </div>
                )}

                {filter === 'rejected' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAction(student.id, student.email, 'approve')}
                      disabled={actionLoading === student.id}
                      className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 border border-emerald-500/30"
                    >
                      {actionLoading === student.id ? '...' : 'Approve'}
                    </button>
                    <span className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-black text-xs uppercase tracking-widest border border-red-500/30">
                      ❌ Rejected
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}