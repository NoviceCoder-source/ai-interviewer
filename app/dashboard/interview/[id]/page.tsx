'use client';
import React, { useEffect, useState, useRef, use } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useSiteSettings } from '../../../lib/SiteSettingsContext';
import type { Message, EvaluationReport } from '../../../lib/types';
import { getScoreColor } from '../../../lib/scoreColors';
import { getUniqueQuestions } from '../../../lib/questionAnalysis';
import { generateInterviewPDF } from '../../../lib/pdfReport';
import ScoreCard from '../../../components/ScoreCard';
import StrengthsImprovements from '../../../components/StrengthsImprovements';
import ReportActions from '../../../components/ReportActions';

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
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const settings = useSiteSettings();

  const initializedRef = useRef(false);

  const WRITE_BATCH_SIZE = 3;
  const messagesSinceLastWrite = useRef(0);
  const latestHistoryRef = useRef<Message[]>([]);
  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    latestHistoryRef.current = chatHistory;
  }, [chatHistory]);

  useEffect(() => {
    const handleUnload = () => {
      if (messagesSinceLastWrite.current > 0 && accessTokenRef.current) {
        navigator.sendBeacon(
          `/api/save-history`,
          new Blob(
            [JSON.stringify({
              id: interviewId,
              chat_history: latestHistoryRef.current,
              access_token: accessTokenRef.current,
            })],
            { type: 'application/json' }
          )
        );
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [interviewId]);

  const saveHistory = async (history: Message[], force = false) => {
    messagesSinceLastWrite.current += 1;
    const shouldWrite = force || messagesSinceLastWrite.current >= WRITE_BATCH_SIZE;

    if (shouldWrite) {
      messagesSinceLastWrite.current = 0;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch('/api/save-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: interviewId, chat_history: history }),
      });
    }
  };

  const assistantMessages = chatHistory.filter(m => m.role === 'assistant');
  const uniqueQuestions = getUniqueQuestions(assistantMessages);

  const questionsAsked = uniqueQuestions.filter((msg) => {
    const msgIndex = chatHistory.findIndex(
      (m) => m.role === msg.role && m.content === msg.content
    );
    const nextMsg = chatHistory[msgIndex + 1];
    return nextMsg?.role === 'user';
  }).length;
  const minQuestionsRequired = 5;
  const canEndInterview = questionsAsked >= minQuestionsRequired;

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const startSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data: { session } } = await supabase.auth.getSession();
      accessTokenRef.current = session?.access_token || null;

      const { data } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .single();

      if (data) {
        setInterview(data);

        if (data.report) {
          router.replace(`/dashboard/review/${interviewId}`);
          return;
        }

        if (data.chat_history && data.chat_history.length > 0) {
          setChatHistory(data.chat_history);
        } else {
          await triggerFirstGreeting(data.subject, data.difficulty, user?.id);
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
            subject,
            difficulty,
            userId,
          }),
        });
        const chatData = await res.json();
        if (chatData.text) {
          const initialHistory: Message[] = [{ role: 'assistant', content: chatData.text }];
          setChatHistory(initialHistory);
          await saveHistory(initialHistory, true);
        }
      } catch (err) {
        console.error("Initial Chat Error:", err);
      } finally {
        setIsThinking(false);
      }
    };

    if (interviewId) startSession();
  }, [interviewId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatHistory, isThinking]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isThinking || isInputDisabled) return;

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
          userId: currentUserId,
        }),
      });

      const data = await res.json();
      if (data.text) {
        const newHistory: Message[] = [...updatedHistory, { role: 'assistant', content: data.text }];
        setChatHistory(newHistory);
        await saveHistory(newHistory);
      }
    } catch (err) {
      console.error("Chat Error:", err);
    } finally {
      setIsThinking(false);
    }
  };

  const handleEndInterview = async () => {
    if (!canEndInterview) return;

    setIsInputDisabled(true);
    setIsEvaluating(true);

    try {
      const lastMsg = chatHistory[chatHistory.length - 1];
      const historyForEvaluation = lastMsg?.role === 'assistant'
        ? chatHistory.slice(0, -1)
        : chatHistory;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated.');

      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ history: historyForEvaluation, subject: interview?.subject }),
        });

      const data = await response.json();

      const finalReport: EvaluationReport = {
        score: data.score ?? 0,
        summary: data.summary || "No summary generated.",
        strengths: data.strengths || [],
        improvements: data.improvements || [],
      };

      setReport(finalReport);

      await supabase
        .from('interviews')
        .update({ report: finalReport, chat_history: chatHistory })
        .eq('id', interviewId);

      messagesSinceLastWrite.current = 0;
    } catch (e) {
      console.error("Evaluation Error:", e);
      setIsInputDisabled(false);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleDownloadPDF = () => {
    const doc = generateInterviewPDF({
      orgName: settings.org_name,
      subject: interview?.subject || '',
      difficulty: interview?.difficulty || '',
      date: new Date(),
      report: report || undefined,
      chatHistory: chatHistory,
      heading: 'Interview Chat Transcript',
    });
    doc.save(`interview-${interview?.subject}-${interview?.difficulty}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const scoreColors = report ? getScoreColor(report.score) : null;

  const MarkdownContent = ({ content }: { content: string }) => (
    <ReactMarkdown
      components={{
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-emerald-500/50 bg-emerald-500/5 pl-4 py-2 my-3 rounded-r-xl text-emerald-100/90 text-sm">
              {children}
            </blockquote>
          );
        },
        strong({ children }) {
          return <strong className="text-indigo-300 font-black">{children}</strong>;
        },
        p({ children }) {
          return <p className="mt-3">{children}</p>;
        },
        code({ className, children, ...props }: React.ComponentPropsWithoutRef<'code'>) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : 'python';
          const isBlock = !!match || String(children).includes('\n');
          return isBlock ? (
            <div className="my-3 rounded-xl overflow-hidden border border-white/5">
              <div className="flex items-center px-4 py-2 bg-[#1a1a2e] border-b border-white/5">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{language}</span>
              </div>
              <SyntaxHighlighter language={language} style={atomOneDark} customStyle={{ margin: 0, padding: '1rem', background: '#1e1e2e', fontSize: '0.85rem' }}>
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code className="text-indigo-300 font-mono text-sm bg-black/30 px-1 rounded" {...props}>{children}</code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );

  return (
    <div className="min-h-screen bg-[#0a0a1a] p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col h-[92vh]">

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
              disabled={!canEndInterview || isInputDisabled}
              title={!canEndInterview ? `${minQuestionsRequired - questionsAsked} more unique questions needed` : 'End interview and get your grade'}
              className={`px-8 py-3 rounded-full font-black uppercase text-[10px] tracking-widest transition-all shadow-xl ${
                canEndInterview && !isInputDisabled
                  ? 'bg-white text-black hover:bg-red-500 hover:text-white cursor-pointer'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              End & Grade
            </button>
          </div>
        </header>

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
              disabled={isInputDisabled}
              placeholder={isInputDisabled ? "Interview ended." : "Provide your solution or explanation..."}
              rows={1}
              className={`flex-1 bg-[#1a1a2e] text-white border-none rounded-[1.5rem] px-8 py-4 font-medium focus:ring-2 focus:ring-indigo-600 outline-none transition-all placeholder:text-white/10 resize-none min-h-[60px] max-h-[150px] overflow-y-auto ${
                isInputDisabled ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            />
            <button
              onClick={handleSendMessage}
              disabled={isInputDisabled}
              className={`bg-indigo-600 text-white px-10 h-[60px] rounded-[1.5rem] font-black uppercase text-xs tracking-widest transition-all active:scale-95 ${
                isInputDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white hover:text-indigo-600'
              }`}
            >
              Send
            </button>
          </div>
        </main>
      </div>

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
                <ScoreCard
                  subject={interview?.subject || ''}
                  difficulty={interview?.difficulty || ''}
                  date={new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  score={report.score}
                  scoreColors={scoreColors}
                />
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">📋</div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Interviewer&apos;s Assessment</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-base font-medium border-l-4 border-indigo-200 pl-4 italic">{report.summary}</p>
                </div>

                <StrengthsImprovements strengths={report.strengths} improvements={report.improvements} />

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-[2rem] p-6 shadow-xl text-center">
                    <p className="text-3xl font-black text-gray-900">{chatHistory.filter(m => m.role === 'user').length}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">Responses Given</p>
                  </div>
                  <div className="bg-white rounded-[2rem] p-6 shadow-xl text-center">
                    <p className="text-3xl font-black text-gray-900">{questionsAsked}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">Unique Questions</p>
                  </div>
                  <div className="bg-white rounded-[2rem] p-6 shadow-xl text-center">
                    <p className={`text-3xl font-black ${scoreColors.text}`}>{scoreColors.label}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">Overall Rating</p>
                  </div>
                </div>

                <ReportActions
                  onDownloadPDF={handleDownloadPDF}
                  onBack={() => router.replace('/dashboard')}
                  backLabel="🏠 Save & Return to Student Dashboard"
                  downloadLabel="📄 Download Chat as PDF"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}