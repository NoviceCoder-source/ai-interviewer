interface ReportActionsProps {
  onDownloadPDF: () => void;
  onBack: () => void;
  backLabel: string;
  downloadLabel?: string;
}

export default function ReportActions({
  onDownloadPDF,
  onBack,
  backLabel,
  downloadLabel = '📄 Download Report as PDF',
}: ReportActionsProps) {
  return (
    <div className="bg-white rounded-[2.5rem] p-6 shadow-xl flex flex-col gap-3">
      <button
        onClick={onDownloadPDF}
        className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl"
      >
        {downloadLabel}
      </button>
      <button
        onClick={onBack}
        className="w-full bg-indigo-50 text-indigo-700 py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-indigo-100 transition-all border border-indigo-100"
      >
        {backLabel}
      </button>
    </div>
  );
}