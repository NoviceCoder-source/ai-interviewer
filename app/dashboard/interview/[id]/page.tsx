'use client';
import React, { useEffect, useState, useRef, use } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import jsPDF from 'jspdf';

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
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // ── Race condition guard ──────────────────────────────────────────────────
  const initializedRef = useRef(false);

  // ── Batched Supabase writes ───────────────────────────────────────────────
  const WRITE_BATCH_SIZE = 3;
  const messagesSinceLastWrite = useRef(0);
  const latestHistoryRef = useRef<Message[]>([]);

  useEffect(() => {
    latestHistoryRef.current = chatHistory;
  }, [chatHistory]);

  // Flush unsaved messages when the user closes/navigates away.
  useEffect(() => {
    const handleUnload = () => {
      if (messagesSinceLastWrite.current > 0) {
        navigator.sendBeacon(
          `/api/save-history`,
          new Blob(
            [JSON.stringify({ id: interviewId, chat_history: latestHistoryRef.current })],
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
      await supabase
        .from('interviews')
        .update({ chat_history: history })
        .eq('id', interviewId);
    }
  };

  // ── Unique question detection ─────────────────────────────────────────────
  const STOP_WORDS = new Set([
    'what','is','are','the','a','an','in','of','to','do','does','how',
    'why','when','where','which','can','you','your','it','its','this',
    'that','and','or','for','with','about','between','explain','describe',
    'define','tell','me','difference','use','used','give','example','write',
    'simple','basic','python','sql','data','machine','learning','analytics'
  ]);

  const extractQuestion = (content: string): string => {
    const sentences = content.split(/(?<=[.?!])\s+/);
    const questionSentence = sentences.find(s => s.trim().endsWith('?'))
      || sentences[sentences.length - 1];
    return questionSentence.toLowerCase().trim();
  };

  const getKeywords = (text: string): Set<string> => {
    const words = text
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));
    return new Set(words);
  };

  const assistantMessages = chatHistory.filter(m => m.role === 'assistant');

  const uniqueQuestions = assistantMessages.filter((msg, index) => {
    if (index === 0) return true;

    const currentKeywords = getKeywords(extractQuestion(msg.content));
    if (currentKeywords.size === 0) return true;

    const isDuplicate = assistantMessages.slice(0, index).some(prevMsg => {
      const prevKeywords = getKeywords(extractQuestion(prevMsg.content));
      if (prevKeywords.size === 0) return false;

      const overlap = [...currentKeywords].filter(w => prevKeywords.has(w)).length;
      const similarity = overlap / Math.max(currentKeywords.size, prevKeywords.size);
      return similarity >= 0.75;
    });

    return !isDuplicate;
  });

  // Only count questions that actually received a user response.
  // Uses content-based lookup instead of reference-based indexOf to avoid
  // React state re-renders breaking object reference equality.
  const questionsAsked = uniqueQuestions.filter((msg) => {
    const msgIndex = chatHistory.findIndex(
      (m) => m.role === msg.role && m.content === msg.content
    );
    const nextMsg = chatHistory[msgIndex + 1];
    return nextMsg?.role === 'user';
  }).length;
  const minQuestionsRequired = 5;
  const canEndInterview = questionsAsked >= minQuestionsRequired;

  // ── Session initialisation ───────────────────────────────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

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

        // ── FIX: If session is already graded, redirect to read-only report
        // page immediately. Handles direct URL access and back button.
        if (data.report) {
          router.replace(`/dashboard/review/${interviewId}`);
          return;
        }

        if (data.chat_history && data.chat_history.length > 0) {
          // In-progress session — resume silently, no welcome-back needed
          setChatHistory(data.chat_history);
        } else {
          // Brand new session — trigger first greeting
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

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatHistory, isThinking]);

  // ── Send message ─────────────────────────────────────────────────────────
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

  // ── End interview ────────────────────────────────────────────────────────
  const handleEndInterview = async () => {
    if (!canEndInterview) return;

    setIsInputDisabled(true);
    setIsEvaluating(true);

    try {
      const lastMsg = chatHistory[chatHistory.length - 1];
      const historyForEvaluation = lastMsg?.role === 'assistant'
        ? chatHistory.slice(0, -1)
        : chatHistory;

      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // ── Strip markdown syntax for clean PDF output ───────────────────────────
  const stripMarkdown = (text: string): string => {
    return text
      .replace(/```[\s\S]*?```/g, '[code block]')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[(.+?)\]\(.*?\)/g, '$1')
      .replace(/^\s*[-*+]\s+/gm, '• ')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/^\s*>\s+/gm, '')
      .replace(/---/g, '─────────────────')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  // ── PDF download ─────────────────────────────────────────────────────────
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    const addText = (text: string, fontSize: number, isBold = false, color: [number, number, number] = [0, 0, 0]) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += fontSize * 0.5;
      });
      y += 3;
    };

    addText('AI INTERVIEWER', 20, true, [79, 70, 229]);
    addText('Interview Chat Transcript', 12, false, [100, 100, 100]);
    addText(`Subject: ${interview?.subject} | Difficulty: ${interview?.difficulty}`, 11, false, [100, 100, 100]);
    addText(`Date: ${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 11, false, [100, 100, 100]);

    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    if (report) {
      addText(`FINAL SCORE: ${report.score}%`, 16, true, [79, 70, 229]);
      addText(report.summary, 11, false, [60, 60, 60]);
      y += 5;
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;
    }

    addText('CHAT TRANSCRIPT', 13, true, [40, 40, 40]);
    y += 3;

    chatHistory.forEach((msg) => {
      if (msg.role === 'assistant') {
        addText('Interviewer:', 10, true, [79, 70, 229]);
        addText(stripMarkdown(msg.content), 10, false, [30, 30, 30]);
      } else if (msg.role === 'user') {
        addText('Candidate:', 10, true, [16, 185, 129]);
        addText(stripMarkdown(msg.content), 10, false, [30, 30, 30]);
      }
      y += 2;
    });

    doc.save(`interview-${interview?.subject}-${interview?.difficulty}-${new Date().toISOString().slice(0, 10)}.pdf`);
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
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className={`h-2.5 rounded-full transition-all duration-1000 ${scoreColors.bg}`} style={{ width: `${report.score}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-300 mt-1.5">
                    <span>0</span><span>50</span><span>100</span>
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">📋</div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Interviewer&apos;s Assessment</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-base font-medium border-l-4 border-indigo-200 pl-4 italic">{report.summary}</p>
                </div>

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

                {/* ── FIX: "Return to Dashboard" instead of "Return to Archive"
                    router.replace removes the interview room from history so
                    the back button goes to dashboard, not back here. ── */}
                <div className="bg-white rounded-[2.5rem] p-6 shadow-xl flex flex-col gap-3">
                  <button
                    onClick={() => router.replace('/dashboard')}
                    className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl"
                  >
                    🏠 Save & Return to Student Dashboard
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full bg-indigo-50 text-indigo-700 py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-indigo-100 transition-all border border-indigo-100"
                  >
                    📄 Download Chat as PDF
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