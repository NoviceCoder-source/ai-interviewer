interface StrengthsImprovementsProps {
  strengths: string[];
  improvements: string[];
}

export default function StrengthsImprovements({ strengths, improvements }: StrengthsImprovementsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-lg">✅</div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Key Strengths</h3>
        </div>
        <div className="space-y-3">
          {strengths?.length ? strengths.map((s, i) => (
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
          {improvements?.length ? improvements.map((im, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-100">
              <span className="text-amber-500 font-black text-sm mt-0.5">→</span>
              <p className="text-amber-800 text-xs font-bold leading-relaxed">{im}</p>
            </div>
          )) : <p className="text-gray-300 text-xs">No improvements recorded.</p>}
        </div>
      </div>
    </div>
  );
}