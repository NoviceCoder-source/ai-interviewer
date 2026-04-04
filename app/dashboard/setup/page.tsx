'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function SetupInterviewPage() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<'normal' | 'resume'>('normal');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert("You must be logged in to start an interview.");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('interviews')
        .insert([
          {
            user_id: session.user.id,
            subject: mode === 'resume' ? 'Resume-Based' : subject,
            difficulty: mode === 'resume' ? 'Personalized' : difficulty,
            status: 'in_progress'
          }
        ])
        .select()
        .single();

      if (error) throw error;

      router.push(`/dashboard/interview/${data.id}`);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error("Error saving interview:", errorMessage);
      alert("Failed to save interview.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("You must be logged in.");
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `resumes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: filePath,
          userId: session.user.id
        })
      });

      if (!response.ok) throw new Error('Parsing failed. Please try again.');

      alert('Resume uploaded! You can now start your personalized interview.');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      alert('Error: ' + errorMessage);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h1 className="text-2xl font-extrabold text-indigo-600 mb-2 text-center">
          Configure Your Interview
        </h1>
        <p className="text-center text-gray-400 text-sm mb-8">Choose how you want to be interviewed</p>

        {/* MODE TOGGLE */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-8">
          <button
            type="button"
            onClick={() => setMode('normal')}
            className={`flex-1 py-3 text-sm font-bold transition-all ${
              mode === 'normal'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            📚 By Subject
          </button>
          <button
            type="button"
            onClick={() => setMode('resume')}
            className={`flex-1 py-3 text-sm font-bold transition-all ${
              mode === 'resume'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            📄 By Resume
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {mode === 'normal' ? (
            <>
              {/* Subject Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Select Subject
                </label>
                <select
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                >
                  <option value="" disabled>Choose a topic...</option>
                  <option value="Python">Python</option>
                  <option value="SQL">SQL</option>
                  <option value="Data Analytics">Data Analytics</option>
                  <option value="Machine Learning">Machine Learning</option>
                </select>
              </div>

              {/* Difficulty Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Select Difficulty
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { level: 'Fresher', desc: 'No experience', emoji: '🌱' },
                    { level: 'Beginner', desc: 'Some basics', emoji: '📘' },
                    { level: 'Intermediate', desc: 'Working knowledge', emoji: '⚡' },
                    { level: 'Advanced', desc: 'Expert level', emoji: '🔥' },
                  ].map(({ level, desc, emoji }) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setDifficulty(level)}
                      className={`py-3 px-3 text-left rounded-xl border transition-all ${
                        difficulty === level
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      <div className="text-lg mb-1">{emoji}</div>
                      <div className="font-bold text-sm">{level}</div>
                      <div className={`text-[10px] ${difficulty === level ? 'text-indigo-200' : 'text-gray-400'}`}>{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!subject || !difficulty || isLoading}
                className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Preparing...' : 'Start Interview'}
              </button>
            </>
          ) : (
            <>
              {/* Resume Mode */}
              <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 text-center space-y-4">
                <div className="text-4xl">📄</div>
                <div>
                  <h3 className="font-bold text-indigo-900 text-sm">Resume-Based Interview</h3>
                  <p className="text-indigo-600/70 text-xs mt-1">
                    Upload your resume and the AI will ask questions tailored to your projects and experience.
                  </p>
                </div>
                <label className={`inline-block cursor-pointer px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow ${
                  uploading ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}>
                  {uploading ? 'Analyzing PDF...' : '📎 Upload PDF Resume'}
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleResumeUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading || uploading}
                className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Preparing...' : 'Start Resume Interview'}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="w-full text-gray-500 font-bold py-2 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}