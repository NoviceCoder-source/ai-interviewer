'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import Notice, { type NoticeMessage } from '../../../components/Notice';
import { useSiteSettings } from '../../../lib/SiteSettingsContext';
import { Mic, BarChart3, ChevronDown, ChevronLeft, ChevronRight, Target, FileText, Play, Check } from 'lucide-react';
import { secondaryBg, secondaryText, secondaryTint } from '../../../lib/theme';

export default function SetupInterviewPage() {
  const router = useRouter();
  const settings = useSiteSettings();
  const [mode, setMode] = useState<'subject' | 'resume'>('subject');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);

  const subjects = settings.subjects;
  const popularTopics = subjects.slice(0, 4);

  const DIFFICULTIES = [
    { icon: '🌱', title: 'Beginner', desc: 'Some basics', value: 'Beginner' },
    { icon: '⚡', title: 'Intermediate', desc: 'Working knowledge', value: 'Intermediate' },
    { icon: '🔥', title: 'Advanced', desc: 'Expert level', value: 'Advanced' },
  ];

  const handleStartInterview = async () => {
    if (mode === 'subject' && (!subject || !difficulty)) {
      setNotice({ type: 'error', text: 'Please select a subject and difficulty.' });
      return;
    }
    setIsLoading(true);
    setNotice(null);
    try {
      const { id } = await api.post<{ id: string }>('/api/interviews', { mode, subject, difficulty });
      router.push(`/dashboard/interview/${id}`);
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Failed to start the interview.' });
      setIsLoading(false);
    }
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setNotice(null);
    try {
      await api.upload('/api/parse-resume', file);
      setNotice({ type: 'success', text: 'Resume uploaded! You can now start your personalized interview.' });
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Resume upload failed.' });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto relative px-5 py-5 sm:px-8">
      <div className="pointer-events-none absolute -right-32 -top-32 h-[400px] w-[400px] rounded-full" style={secondaryTint(10)} />
      <div className="pointer-events-none absolute -bottom-48 -left-32 h-[450px] w-[450px] rounded-full" style={secondaryTint(8)} />

      <div className="relative z-10 mx-auto max-w-[1050px]">
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-4 flex items-center gap-2 text-sm font-medium text-[#53739b] hover:opacity-80 transition"
        >
          <ChevronLeft size={17} />
          Back to Dashboard
        </button>

        <div className="rounded-3xl border border-[#e2ebf5] bg-white p-6 shadow-[0_18px_55px_rgba(30,75,125,0.08)] sm:p-7">

          <div className="text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={secondaryTint(12)}>
              <Mic size={22} style={secondaryText} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Configure Your Interview</h1>
            <p className="mt-1.5 text-sm text-[#7790ad]">
              Choose how you want to be interviewed and set the details for your practice session.
            </p>
          </div>

          <div className="mt-6 rounded-xl bg-[#f1f6fc] p-1">
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setMode('subject')}
                style={mode === 'subject' ? secondaryBg : undefined}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  mode === 'subject' ? 'text-white shadow-md shadow-blue-200' : 'text-[#557292]'
                }`}
              >
                <Target size={17} /> By Subject
              </button>
              <button
                onClick={() => setMode('resume')}
                style={mode === 'resume' ? secondaryBg : undefined}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  mode === 'resume' ? 'text-white shadow-md shadow-blue-200' : 'text-[#557292]'
                }`}
              >
                <FileText size={17} /> By Resume
              </button>
            </div>
          </div>

          {mode === 'subject' && (
            <div className="mt-6">
              <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
                <div>
                  <div>
                    <div className="mb-2.5 flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={secondaryTint(12)}>
                        <Target size={17} style={secondaryText} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-ink-soft">Select Subject</label>
                        <p className="mt-0.5 text-xs text-[#7d96b2]">Choose the topic you want to be interviewed on.</p>
                      </div>
                    </div>

                    <div className="relative">
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="h-[46px] w-full appearance-none rounded-xl border border-[#d7e5f2] bg-white px-4 pr-12 text-sm text-ink-soft outline-none transition"
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-secondary)'; e.currentTarget.style.boxShadow = `0 0 0 4px color-mix(in srgb, var(--color-secondary) 10%, transparent)`; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = '#d7e5f2'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <option value="">Choose a topic...</option>
                        {subjects.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                      <ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6f89a8]" />
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-3 flex items-start gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={secondaryTint(12)}>
                        <BarChart3 size={17} style={secondaryText} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink-soft">Select Difficulty</p>
                        <p className="mt-0.5 text-xs text-[#7d96b2]">Choose the level of difficulty for your interview.</p>
                      </div>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-3">
                      {DIFFICULTIES.map((d) => (
                        <DifficultyCard
                          key={d.value}
                          icon={d.icon}
                          title={d.title}
                          description={d.desc}
                          selected={difficulty === d.value}
                          onClick={() => setDifficulty(d.value)}
                          accentBg={secondaryBg}
                          accentTint={secondaryTint(6)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-4" style={secondaryTint(8)}>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                      <Target size={17} style={secondaryText} />
                    </div>
                    <p className="text-sm font-semibold text-ink-soft">Popular Topics</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {popularTopics.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => setSubject(topic)}
                        style={subject === topic ? secondaryBg : undefined}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                          subject === topic ? 'text-white' : 'bg-white'
                        }`}
                      >
                        <span style={subject === topic ? undefined : secondaryText}>{topic}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {mode === 'resume' && (
            <div className="mt-6">
              <div className="rounded-xl border-2 border-dashed border-[#cbddec] bg-[#f8fbff] px-6 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl" style={secondaryTint(12)}>
                  <FileText size={24} style={secondaryText} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-ink-soft">Upload Your Resume</h3>
                <p className="mx-auto mt-1.5 max-w-[400px] text-sm leading-6 text-[#7d96b2]">
                  Upload your resume and our AI interviewer will generate personalized questions based on your experience and skills.
                </p>
                <label
                  style={secondaryBg}
                  className={`mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition ${
                    uploading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                  }`}
                >
                  <FileText size={16} />
                  {uploading ? 'Analyzing PDF...' : 'Choose Resume'}
                  <input type="file" accept=".pdf" onChange={handleResumeUpload} disabled={uploading} className="hidden" />
                </label>
                <p className="mt-3 text-xs text-[#9aadc2]">PDF only • Maximum 10MB</p>
              </div>
            </div>
          )}

          <div className="mt-6">
            <Notice notice={notice} className="mb-4" />
            <button
              onClick={handleStartInterview}
              disabled={isLoading || uploading}
              style={secondaryBg}
              className="group flex h-[48px] w-full items-center justify-center gap-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
            >
              <Play size={16} fill="currentColor" />
              {isLoading ? 'Preparing...' : 'Start Interview'}
              <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              className="mt-3 block w-full text-center text-sm font-semibold text-[#617b9b] hover:opacity-80 transition"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="mt-4 mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-[#8ba0b8]">
          <span className="flex items-center gap-1.5">
            <Check size={13} style={secondaryText} />
            AI-powered questions
          </span>
          <span>•</span>
          <span>Personalized difficulty</span>
          <span>•</span>
          <span>Instant feedback</span>
        </div>
      </div>
    </div>
  );
}

function DifficultyCard({ icon, title, description, selected, onClick, accentBg, accentTint }: {
  icon: string; title: string; description: string; selected: boolean; onClick: () => void;
  accentBg: React.CSSProperties; accentTint: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={selected ? { borderColor: 'var(--color-secondary)', ...accentTint } : undefined}
      className={`relative flex min-h-[88px] flex-col rounded-xl border p-3.5 text-left transition-all ${
        selected ? 'shadow-sm' : 'border-[#dce6f0] bg-white hover:border-[#a9ccec] hover:bg-[#f8fbff]'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="mt-1.5 text-sm font-semibold text-ink-soft">{title}</span>
      <span className="mt-0.5 text-xs text-[#8298b1]">{description}</span>
      <span
        style={selected ? accentBg : undefined}
        className={`absolute right-3.5 top-1/2 flex h-4.5 w-4.5 -translate-y-1/2 items-center justify-center rounded-full border-2 ${
          selected ? 'border-transparent' : 'border-[#cbdbea]'
        }`}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
    </button>
  );
}