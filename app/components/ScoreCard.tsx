// app/components/ScoreCard.tsx
import type { ScoreColors } from '../lib/scoreColors';

interface ScoreCardProps {
  subject: string;
  difficulty: string;
  date: string; // formatted date string, caller decides format
  score: number;
  scoreColors: ScoreColors;
  studentLine?: string; // optional, admin view only
}

export default function ScoreCard({ subject, difficulty, date, score, scoreColors, studentLine }: ScoreCardProps) {
  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">Interview Report</p>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
            {subject} <span className="text-gray-300">·</span>{' '}
            <span className="text-indigo-500">{difficulty}</span>
          </h2>
          {studentLine && (
            <p className="text-gray-600 text-xs font-bold mt-1">{studentLine}</p>
          )}
          <p className="text-gray-400 text-xs font-medium mt-1">{date}</p>
        </div>
        <div className="text-right">
          <div className={`text-7xl font-black tracking-tighter ${scoreColors.text}`}>
            {score}<span className="text-3xl">%</span>
          </div>
          <span className={`inline-block mt-1 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${scoreColors.bg}`}>
            {scoreColors.label}
          </span>
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className={`h-2.5 rounded-full transition-all duration-1000 ${scoreColors.bg}`} style={{ width: `${score}%` }} />
      </div>
      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-300 mt-1.5">
        <span>0</span><span>50</span><span>100</span>
      </div>
    </div>
  );
}