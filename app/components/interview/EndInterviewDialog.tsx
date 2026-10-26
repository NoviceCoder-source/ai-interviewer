'use client';
import { useEffect, useRef, useState } from 'react';

const CONFIRM_WORD = 'Submit';

interface EndInterviewDialogProps {
  questionsAnswered: number;
  minQuestions: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Asks the candidate to type "Submit" before ending the interview.
 * Below the minimum, it warns that ending now is an automatic fail.
 */
export default function EndInterviewDialog({ questionsAnswered, minQuestions, onConfirm, onCancel }: EndInterviewDialogProps) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const willFail = questionsAnswered < minQuestions;
  const confirmed = typed.trim().toLowerCase() === CONFIRM_WORD.toLowerCase();

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="end-interview-title"
        aria-describedby="end-interview-desc"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-[2rem] border bg-[#111122] p-8 shadow-2xl ${willFail ? 'border-red-500/40' : 'border-white/10'}`}
      >
        <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${willFail ? 'bg-red-500/15' : 'bg-indigo-500/15'}`}>
          {willFail ? '⚠️' : '🏁'}
        </div>

        <h2 id="end-interview-title" className="text-lg font-black uppercase tracking-widest text-white">
          {willFail ? 'End interview early?' : 'End & grade interview?'}
        </h2>

        <div id="end-interview-desc" className="mt-3 space-y-3 text-sm leading-relaxed text-white/70">
          {willFail ? (
            <>
              <p>
                You have answered <strong className="text-white">{questionsAnswered} of {minQuestions}</strong> required questions.
              </p>
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-medium text-red-200">
                If you end now, no report will be generated and this interview will be recorded as
                <strong> failed with a score of 0%</strong>. This cannot be undone.
              </p>
            </>
          ) : (
            <p>
              You have answered <strong className="text-white">{questionsAnswered}</strong> questions. Your interview will be
              graded and you won&apos;t be able to answer any more questions.
            </p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (confirmed) onConfirm();
          }}
          className="mt-6"
        >
          <label htmlFor="end-interview-confirm" className="mb-2 block text-xs font-bold uppercase tracking-widest text-white/50">
            Type <span className="text-white">{CONFIRM_WORD}</span> to confirm
          </label>
          <input
            id="end-interview-confirm"
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            placeholder={CONFIRM_WORD}
            className="w-full rounded-xl border border-white/10 bg-[#1a1a2e] px-4 py-3 font-medium text-white outline-none placeholder:text-white/20 focus:ring-2 focus:ring-indigo-600"
          />

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-full border border-white/10 py-3 text-[10px] font-black uppercase tracking-widest text-white/70 transition hover:bg-white/5"
            >
              Keep going
            </button>
            <button
              type="submit"
              disabled={!confirmed}
              className={`flex-1 rounded-full py-3 text-[10px] font-black uppercase tracking-widest transition disabled:cursor-not-allowed disabled:opacity-30 ${
                willFail ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-white text-black hover:bg-indigo-500 hover:text-white'
              }`}
            >
              {willFail ? 'End & fail' : 'End & grade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
