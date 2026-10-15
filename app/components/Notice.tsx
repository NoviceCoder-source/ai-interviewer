export interface NoticeMessage {
  type: 'error' | 'success';
  text: string;
}

const STYLES: Record<NoticeMessage['type'], string> = {
  error: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

/** Inline status message (replaces window.alert). Renders nothing when `notice` is null. */
export default function Notice({ notice, className = '' }: { notice: NoticeMessage | null; className?: string }) {
  if (!notice) return null;
  return (
    <p
      role={notice.type === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 text-sm font-medium ${STYLES[notice.type]} ${className}`}
    >
      {notice.text}
    </p>
  );
}
