/** Shown in place of the AI assessment when an interview was ended before the minimum questions. */
export default function EndedEarlyNotice({ summary }: { summary: string }) {
  return (
    <div role="status" className="rounded-[2rem] border border-red-200 bg-red-50 p-8 shadow-xl">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-sm">⚠️</span>
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600">Interview failed — ended early</h3>
      </div>
      <p className="text-base font-medium leading-relaxed text-red-900/80">{summary}</p>
    </div>
  );
}
