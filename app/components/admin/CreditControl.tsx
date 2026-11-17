'use client';
import { useState } from 'react';
import { api } from '../../lib/api';

/** Inline "add / remove credits" control for one student on the admin Students page. */
export default function CreditControl({ studentId, onChange }: { studentId: string; onChange: (balance: number) => void }) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const apply = async () => {
    setBusy(true);
    setError('');
    try {
      const { balance } = await api.post<{ balance: number }>('/api/admin/credits', { userId: studentId, amount: Number(amount) });
      onChange(balance);
      setAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update credits.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="+50 or -10"
          aria-label="Credits to add or remove"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={apply}
          disabled={busy || !amount || Number(amount) === 0}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold tracking-wide text-white transition hover:bg-indigo-700 disabled:opacity-40"
        >
          {busy ? '…' : 'UPDATE CREDITS'}
        </button>
      </div>
      {error && <p className="mt-1 text-[11px] font-semibold text-red-300">{error}</p>}
    </div>
  );
}
