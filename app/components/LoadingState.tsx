import { secondaryText } from '../lib/theme';

/** Centered spinner that fills its container. */
export default function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-1 min-h-[60vh] flex-col items-center justify-center">
      <div
        className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mb-4"
        style={{ borderColor: 'var(--color-secondary)', borderTopColor: 'transparent' }}
      />
      <p className="font-medium tracking-widest text-xs uppercase" style={secondaryText}>{label}</p>
    </div>
  );
}
