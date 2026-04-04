'use client';
import React, { useEffect, useState, useRef, use } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface EvaluationReport {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

interface InterviewData {
  id: string;
  subject: string;
  difficulty: string;
  report?: EvaluationReport;
  chat_history?: Message[];
}

export default function InterviewRoom({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const interviewId = resolvedParams.id;

  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // --- UNIQUE QUESTION DETECTION ---
  const assistantMessages = chatHistory.filter(m => m.role === 'assistant');

  const uniqueQuestions = assistantMessages.filter((msg, index) => {
    if (index === 0) return true;

    const currentFingerprint = msg.content.slice(0, 80).toLowerCase().trim();

    const isDuplicate = assistantMessages.slice(0, index).some(prevMsg => {
      const prevFingerprint = prevMsg.content.slice(0, 80).toLowerCase().trim();
      const currentWords = new Set(currentFingerprint.split(' '));
      const prevWords = new Set(prevFingerprint.split(' '));
      const overlap = [...currentWords].filter(w => prevWords.has(w)).length;
      const similarity = overlap / Math.max(currentWords.size, prevWords.size);
      return similarity > 0.6;
    });

    return !isDuplicate;
  });

  const questionsAsked = uniqueQuestions.length;
  const minQuestionsRequired = 5;
  const canEndInterview = questionsAsked >= minQuestionsRequired;

  useEffect(() => {
    const startSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .single();

      if (data) {
        setInterview(data);

        if (data.chat_history && data.chat_history.length > 0) {
          setChatHistory(data.chat_history);
        }

        if (data.report) {
          setReport(data.report as EvaluationReport);
        } else if (!data.chat_history || data.chat_history.length === 0) {
          await triggerFirstGreeting(data.subject, data.difficulty, user?.id);
        } else {
          await triggerWelcomeBack(data.subject, data.difficulty, user?.id, data.chat_history);
        }
      }
    };

    const triggerFirstGreeting = async (subject: string, difficulty: string, userId?: string) => {
      setIsThinking(true);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: "Hello! I am ready to start. Please introduce yourself and ask me the first question." }],
            subject: subject,
            difficulty: difficulty,
            userId: userId
          }),
        });
        const chatData = await res.json();
        if (chatData.text) {
          const initialHistory = [{ role: 'assistant' as const, content: chatData.text }];
          setChatHistory(initialHistory);
          await supabase.from('interviews').update({ chat_history: initialHistory }).eq('id', interviewId);
        }
      } catch (err) {
        console.error("Initial Chat Error:", err);
      } finally {
        setIsThinking(false);
      }
    };

    const triggerWelcomeBack = async (subject: string, difficulty: string, userId?: string, existingHistory?: Message[]) => {
      setIsThinking(true);
      try {
        const welcomePrompt = [...(existingHistory || []), {
          role: 'user' as const,
          content: "I'm back! Please give me a brief welcome back message and remind me where we left off, then continue the interview."
        }];

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: welcomePrompt,
            subject: subject,
            difficulty: difficulty,
            userId: userId
          }),
        });
        const chatData = await res.json();
        if (chatData.text) {
          const updatedHistory = [
            ...(existingHistory || []),
            { role: 'assistant' as const, content: chatData.text }
          ];
          setChatHistory(updatedHistory);
          await supabase.from('interviews').update({ chat_history: updatedHistory }).eq('id', interviewId);
        }
      } catch (err) {
        console.error("Welcome Back Error:", err);
      } finally {
        setIsThinking(false);
      }
    };

    if (interviewId) startSession();
  }, [interviewId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatHistory, isThinking]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isThinking) return;

    const userMsg: Message = { role: 'user', content: userInput };
    const updatedHistory = [...chatHistory, userMsg];

    setChatHistory(updatedHistory);
    setUserInput('');
    setIsThinking(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory,
          subject: interview?.subject,
          difficulty: interview?.difficulty,
          userId: currentUserId
        }),
      });

      const data = await res.json();
      if (data.text) {
        const newHistory = [...updatedHistory, { role: 'assistant' as const, content: data.text }];
        setChatHistory(newHistory);
        await supabase.from('interviews').update({ chat_history: newHistory }).eq('id', interviewId);
      }
    } catch (err) {
      console.error("Chat Error:", err);
    } finally {
      setIsThinking(false);
    }
  };

  const handleEndInterview = async () => {
    if (!canEndInterview) return;
    setIsEvaluating(true);
    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: chatHistory, subject: interview?.subject }),
      });

      const data = await response.json();

      const finalReport: EvaluationReport = {
        score: data.score ?? 0,
        summary: data.summary || "No summary generated.",
        strengths: data.strengths || [],
        improvements: data.improvements || []
      };

      setReport(finalReport);
      await supabase.from('interviews')
        .update({ report: finalReport, chat_history: chatHistory })
        .eq('id', interviewId);
    } catch (e) {
      console.error("Evaluation Error:", e);
    } finally {
      setIsEvaluating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-500', label: 'Excellent' };
    if (score >= 60) return { text: 'text-indigo-600', bg: 'bg-indigo-500', label: 'Good' };
    if (score >= 40) return { text: 'text-amber-600', bg: 'bg-amber-500', label: 'Average' };
    return { text: 'text-red-600', bg: 'bg-red-500', label: 'Needs Work' };
  };

  const MarkdownContent = ({ content }: { content: string }) => (
    <ReactMarkdown
      components={{
        code({ className, children, ...props }: React.ComponentPropsWithoutRef<'code'>) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : 'python';
          const isBlock = !!match || String(children).includes('\n');

          return isBlock ? (
            <div className="my-3 rounded-xl overflow-hidden border border-white/5">
              <div className="flex items-center px-4 py-2 bg-[#1a1a2e] border-b border-white/5">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                  {language}
                </span>
              </div>
              <SyntaxHighlighter
                language={language}
                style={atomOneDark}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  background: '#1e1e2e',
                  fontSize: '0.85rem',
                }}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code className="text-indigo-300 font-mono text-sm bg-black/30 px-1 rounded" {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );

  const scoreColors = report ? getScoreColor(report.score) : null;

  return (
    <div className="min-h-screen bg-[#0a0a1a] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col h-[92vh]">

        {/* HEADER */}
        <header className="flex justify-between items-center mb-8 px-4">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h1 className="text-white text-xl font-black uppercase tracking-widest italic">
              SESSION / <span className="text-indigo-400">{interview?.subject || 'INITIALIZING'}</span>
              {interview?.difficulty && (
                <span className="ml-3 text-xs font-black text-white/30 normal-case tracking-widest">
                  [{interview.difficulty}]
                </span>
              )}
            </h1>
          </div>

          {/* END & GRADE BUTTON WITH PROGRESS */}
          <div className="flex items-center gap-3">
            {!canEndInterview && (
              <div className="text-right">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">
                  {questionsAsked}/{minQuestionsRequired} unique questions
                </p>
                <div className="w-32 bg-white/10 rounded-full h-1.5 mt-1">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((questionsAsked / minQuestionsRequired) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
            <button
              onClick={handleEndInterview}
              disabled={!canEndInterview}
              title={!canEndInterview ? `${minQuestionsRequired - questionsAsked} more unique questions needed` : 'End interview and get your grade'}
              className={`px-8 py-3 rounded-full font-black uppercase text-[10px] tracking-widest transition-all shadow-xl ${
                canEndInterview
                  ? 'bg-white text-black hover:bg-red-500 hover:text-white cursor-pointer'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              End & Grade
            </button>
          </div>
        </header>

        {/* CHAT INTERFACE */}
        <main className="flex-1 bg-[#111122] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/5 relative">
          <div ref={scrollRef} className="flex-1 p-8 overflow-y-auto space-y-8 scrollbar-hide">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4`}>
                <div className={`max-w-[85%] md:max-w-[75%] p-6 rounded-[2.5rem] text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-xl'
                    : 'bg-[#1a1a2e] text-indigo-50 border border-white/5 rounded-tl-none'
                }`}>
                  <MarkdownContent content={msg.content} />
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-[#1a1a2e] px-6 py-3 rounded-full text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse border border-white/5">
                  Interviewer is analyzing...
                </div>
              </div>
            )}
          </div>

          {/* INPUT AREA */}
          <div className="p-6 bg-[#0a0a1a]/50 backdrop-blur-2xl border-t border-white/5 flex gap-4 items-end">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Provide your solution or explanation..."
              rows={1}
              className="flex-1 bg-[#1a1a2e] text-white border-none rounded-[1.5rem] px-8 py-4 font-medium focus:ring-2 focus:ring-indigo-600 outline-none transition-all placeholder:text-white/10 resize-none min-h-[60px] max-h-[150px] overflow-y-auto"
            />
            <button
              onClick={handleSendMessage}
              className="bg-indigo-600 text-white px-10 h-[60px] rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-white hover:text-indigo-600 transition-all active:scale-95"
            >
              Send
            </button>
          </div>
        </main>
      </div>

      {/* EVALUATION MODAL */}
      {(isEvaluating || report) && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[100] flex items-start justify-center p-4 overflow-y-auto pt-8 pb-20">
          <div className="max-w-3xl w-full my-auto">

            {isEvaluating ? (
              <div className="bg-white rounded-[3rem] p-16 text-center shadow-2xl">
                <div className="w-16 h-16 border-t-4 border-indigo-600 border-solid rounded-full animate-spin mx-auto mb-8" />
                <h2 className="text-2xl font-black uppercase tracking-widest text-gray-900 mb-2">Analyzing Interview</h2>
                <p className="text-gray-400 text-sm font-medium">Generating your detailed performance report...</p>
              </div>
            ) : report && scoreColors && (
              <div className="space-y-4 animate-in fade-in duration-500">

                {/* TOP CARD — Score + Meta */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">Interview Report</p>
                      <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                        {interview?.subject} <span className="text-gray-300">·</span> <span className="text-indigo-500">{interview?.difficulty}</span>
                      </h2>
                      <p className="text-gray-400 text-xs font-medium mt-1">
                        {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-7xl font-black tracking-tighter ${scoreColors.text}`}>
                        {report.score}<span className="text-3xl">%</span>
                      </div>
                      <span className={`inline-block mt-1 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${scoreColors.bg}`}>
                        {scoreColors.label}
                      </span>
                    </div>
                  </div>

                  {/* Score Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-1000 ${scoreColors.bg}`}
                      style={{ width: `${report.score}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-300 mt-1.5">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>

                {/* SUMMARY CARD */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">📋</div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Interviewer's Assessment</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-base font-medium border-l-4 border-indigo-200 pl-4 italic">
                    {report.summary}
                  </p>
                </div>

                {/* STRENGTHS + IMPROVEMENTS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-[2.5rem] p-8 shadow-xl">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-lg">✅</div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Key Strengths</h3>
                    </div>
                    <div className="space-y-3">
                      {report.strengths?.length ? report.strengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <span className="text-emerald-500 font-black text-sm mt-0.5">→</span>
                          <p className="text-emerald-800 text-xs font-bold leading-relaxed">{s}</p>
                        </div>
                      )) : <p className="text-gray-300 text-xs">No strengths recorded.</p>}
                    </div>
                  </div>

                  <div className="bg-white rounded-[2.5rem] p-8 shadow-xl">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-lg">🎯</div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Areas for Growth</h3>
                    </div>
                    <div className="space-y-3">
                      {report.improvements?.length ? report.improvements.map((im, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-100">
                          <span className="text-amber-500 font-black text-sm mt-0.5">→</span>
                          <p className="text-amber-800 text-xs font-bold leading-relaxed">{im}</p>
                        </div>
                      )) : <p className="text-gray-300 text-xs">No improvements recorded.</p>}
                    </div>
                  </div>
                </div>

                {/* STATS ROW */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-[2rem] p-6 shadow-xl text-center">
                    <p className="text-3xl font-black text-gray-900">
                      {chatHistory.filter(m => m.role === 'user').length}
                    </p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">Responses Given</p>
                  </div>
                  <div className="bg-white rounded-[2rem] p-6 shadow-xl text-center">
                    <p className="text-3xl font-black text-gray-900">
                      {questionsAsked}
                    </p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">Unique Questions</p>
                  </div>
                  <div className="bg-white rounded-[2rem] p-6 shadow-xl text-center">
                    <p className={`text-3xl font-black ${scoreColors.text}`}>{scoreColors.label}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">Overall Rating</p>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="bg-white rounded-[2.5rem] p-6 shadow-xl flex flex-col gap-3">
                  <button
                    onClick={() => router.push('/dashboard/review')}
                    className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl"
                  >
                    💾 Save & Return to Archive
                  </button>
                  <button
                    onClick={() => setReport(null)}
                    className="w-full text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em] hover:text-black py-2 transition-colors text-center"
                  >
                    Return to Session
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}