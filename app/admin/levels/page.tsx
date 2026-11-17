'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useSiteSettings } from '../../lib/SiteSettingsContext';
import { LEVEL_LABELS, TEST_LEVELS, TOTAL_MARKS, type TestLevel } from '../../lib/tests/config';
import type { LevelRequirement, StudentLevel } from '../../lib/tests/levels';
import AdminPage, { AdminNotice, buttonClass, cardClass, inputClass } from '../../components/admin/AdminPage';

interface Draft {
  id?: string;
  name: string;
  position: number;
  requirements: LevelRequirement[];
}

const emptyRequirement = (): LevelRequirement => ({ level: 'basic', count: 1, min_score: 0, subject: null });

const describe = (r: LevelRequirement) =>
  `${r.count} × ${LEVEL_LABELS[r.level]} test${r.count > 1 ? 's' : ''}${r.subject ? ` in ${r.subject}` : ' (any subject)'}${r.min_score > 0 ? `, each scoring ≥ ${r.min_score}/${TOTAL_MARKS}` : ''}`;

export default function LevelsPage() {
  const { subjects } = useSiteSettings();
  const [levels, setLevels] = useState<StudentLevel[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<{ error?: string; success?: string }>({});

  const load = useCallback(async () => {
    try {
      const { levels } = await api.get<{ levels: StudentLevel[] }>('/api/admin/levels');
      setLevels(levels);
    } catch (err) {
      setMsg({ error: err instanceof Error ? err.message : 'Could not load levels.' });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!draft) return;
    setMsg({});
    try {
      const body = { name: draft.name, position: draft.position, requirements: draft.requirements };
      if (draft.id) {
        const res = await fetch(`/api/admin/levels/${draft.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not save level.');
      } else {
        await api.post('/api/admin/levels', body);
      }
      setDraft(null);
      setMsg({ success: 'Level saved.' });
      load();
    } catch (err) {
      setMsg({ error: err instanceof Error ? err.message : 'Could not save level.' });
    }
  };

  const remove = async (level: StudentLevel) => {
    if (!window.confirm(`Delete "${level.name}"? Students' progress is recalculated from their tests.`)) return;
    const res = await fetch(`/api/admin/levels/${level.id}`, { method: 'DELETE' });
    if (!res.ok) { setMsg({ error: 'Could not delete level.' }); return; }
    load();
  };

  const setReq = (i: number, patch: Partial<LevelRequirement>) =>
    setDraft((d) => d && { ...d, requirements: d.requirements.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  return (
    <AdminPage
      title="Student Levels"
      description="Group tests into levels. Students work through levels in order: a test counts toward the level they are on, and once every requirement is met they move up."
    >
      <div className="space-y-3">
        {levels.map((l, i) => (
          <section key={l.id} className={`${cardClass} flex flex-wrap items-start justify-between gap-4`}>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Step {i + 1} · order {l.position}</p>
              <h2 className="text-lg font-bold">{l.name}</h2>
              <ul className="mt-1 list-disc pl-5 text-sm text-gray-300">
                {l.requirements.map((r, j) => <li key={j}>{describe(r)}</li>)}
              </ul>
            </div>
            <div className="flex gap-3 text-xs font-bold">
              <button onClick={() => setDraft({ ...l })} className="text-indigo-300 hover:text-white">Edit</button>
              <button onClick={() => remove(l)} className="text-red-400 hover:text-red-300">Delete</button>
            </div>
          </section>
        ))}
        {levels.length === 0 && <p className="text-sm text-gray-500">No levels yet.</p>}
      </div>

      <div className="mt-4"><AdminNotice {...msg} /></div>

      {draft ? (
        <section className={`${cardClass} mt-6`}>
          <h2 className="text-lg font-bold">{draft.id ? 'Edit level' : 'New level'}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_140px]">
            <label className="text-xs font-bold text-gray-400">
              Name
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Level 1" className={`${inputClass} mt-1`} />
            </label>
            <label className="text-xs font-bold text-gray-400">
              Order (lower first)
              <input type="number" min={0} value={draft.position} onChange={(e) => setDraft({ ...draft, position: Number(e.target.value) })} className={`${inputClass} mt-1`} />
            </label>
          </div>

          <h3 className="mt-6 text-sm font-bold">Tests required to complete this level</h3>
          <div className="mt-3 space-y-2">
            {draft.requirements.map((r, i) => (
              <div key={i} className="grid items-end gap-2 rounded-xl bg-black/20 p-3 sm:grid-cols-[90px_1fr_1fr_120px_auto]">
                <label className="text-[11px] font-bold text-gray-500">
                  Tests
                  <input type="number" min={1} value={r.count} onChange={(e) => setReq(i, { count: Number(e.target.value) })} className={`${inputClass} mt-1`} />
                </label>
                <label className="text-[11px] font-bold text-gray-500">
                  Test level
                  <select value={r.level} onChange={(e) => setReq(i, { level: e.target.value as TestLevel })} className={`${inputClass} mt-1`}>
                    {TEST_LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                  </select>
                </label>
                <label className="text-[11px] font-bold text-gray-500">
                  Subject
                  <select value={r.subject ?? ''} onChange={(e) => setReq(i, { subject: e.target.value || null })} className={`${inputClass} mt-1`}>
                    <option value="">Any subject</option>
                    {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="text-[11px] font-bold text-gray-500">
                  Min score /{TOTAL_MARKS}
                  <input type="number" min={0} max={TOTAL_MARKS} value={r.min_score} onChange={(e) => setReq(i, { min_score: Number(e.target.value) })} className={`${inputClass} mt-1`} />
                </label>
                <button
                  onClick={() => setDraft({ ...draft, requirements: draft.requirements.filter((_, j) => j !== i) })}
                  className="pb-2 text-xs font-bold text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setDraft({ ...draft, requirements: [...draft.requirements, emptyRequirement()] })}
            className="mt-3 text-xs font-bold text-indigo-300 hover:text-white"
          >
            + Add requirement
          </button>

          <div className="mt-6 flex gap-3">
            <button onClick={save} className={buttonClass}>Save level</button>
            <button onClick={() => setDraft(null)} className="rounded-xl px-4 py-2 text-sm font-bold text-gray-400 hover:bg-white/5">Cancel</button>
          </div>
        </section>
      ) : (
        <button
          onClick={() => setDraft({ name: `Level ${levels.length + 1}`, position: (levels.at(-1)?.position ?? 0) + 1, requirements: [emptyRequirement()] })}
          className={`${buttonClass} mt-6`}
        >
          + New level
        </button>
      )}
    </AdminPage>
  );
}
