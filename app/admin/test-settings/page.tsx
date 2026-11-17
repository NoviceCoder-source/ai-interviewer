'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  LEVEL_LABELS, MARKS, MIN_QUESTIONS, TEST_LEVELS, TOTAL_MARKS, mixCount, mixMarks, mixOf, validateMix,
  type TestConfig, type TestLevel,
} from '../../lib/tests/config';
import AdminPage, { AdminNotice, buttonClass, cardClass, inputClass } from '../../components/admin/AdminPage';

type CostKey = `${string}|${TestLevel}`;

export default function TestSettingsPage() {
  const [configs, setConfigs] = useState<TestConfig[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [costs, setCosts] = useState<Record<CostKey, string>>({});
  const [defaultCredits, setDefaultCredits] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ error?: string; success?: string }>({});

  useEffect(() => {
    api.get<{ configs: TestConfig[]; costs: { subject: string; level: TestLevel; cost: number }[]; defaultCredits: number; subjects: string[] }>('/api/admin/test-config')
      .then((d) => {
        setConfigs(d.configs);
        setSubjects(d.subjects);
        setDefaultCredits(String(d.defaultCredits));
        setCosts(Object.fromEntries(d.costs.map((c) => [`${c.subject}|${c.level}`, String(c.cost)])));
      })
      .catch((err) => setMsg({ error: err instanceof Error ? err.message : 'Could not load settings. Has the Phase 1 migration been run?' }))
      .finally(() => setLoading(false));
  }, []);

  const update = (level: TestLevel, patch: Partial<TestConfig>) =>
    setConfigs((cs) => cs.map((c) => (c.level === level ? { ...c, ...patch } : c)));

  const save = async () => {
    setSaving(true);
    setMsg({});
    try {
      const costList = Object.entries(costs)
        .filter(([, v]) => v.trim() !== '')
        .map(([k, v]) => {
          const [subject, level] = k.split('|');
          return { subject, level, cost: Number(v) };
        });
      await api.post('/api/admin/test-config', { configs, costs: costList, defaultCredits: Number(defaultCredits) });
      setMsg({ success: 'Settings saved. They apply to tests started from now on.' });
    } catch (err) {
      setMsg({ error: err instanceof Error ? err.message : 'Could not save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminPage title="Test Settings"><p className="text-gray-400">Loading…</p></AdminPage>;

  return (
    <AdminPage
      title="Test Settings"
      description={`Marks: basic ${MARKS.basic}, intermediate ${MARKS.intermediate}, advanced ${MARKS.advanced}. Every test must total exactly ${TOTAL_MARKS} marks and have at least ${MIN_QUESTIONS} questions.`}
    >
      <div className="space-y-6">
        {configs.map((c) => {
          const mix = mixOf(c);
          const mixError = validateMix(mix);
          const count = mixCount(mix);
          return (
            <section key={c.level} className={cardClass}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold">{LEVEL_LABELS[c.level]} test</h2>
                <p className={`text-xs font-bold ${mixError ? 'text-red-400' : 'text-emerald-400'}`}>
                  {count} questions · {mixMarks(mix)}/{TOTAL_MARKS} marks
                  {count > 0 && ` · split ${TEST_LEVELS.map((l) => Math.round((mix[l] / count) * 100)).join('/')}%`}
                </p>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {TEST_LEVELS.map((l) => (
                  <label key={l} className="text-xs font-bold text-gray-400">
                    {LEVEL_LABELS[l]} questions ({MARKS[l]} mark{MARKS[l] > 1 ? 's' : ''} each)
                    <input
                      type="number" min={0} value={c[`${l}_count`]}
                      onChange={(e) => update(c.level, { [`${l}_count`]: Number(e.target.value) } as Partial<TestConfig>)}
                      className={`${inputClass} mt-1`}
                    />
                  </label>
                ))}
              </div>
              {mixError && <p className="mt-2 text-xs font-bold text-red-400">{mixError}</p>}

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <label className="text-xs font-bold text-gray-400">
                  Time limit (minutes)
                  <input type="number" min={5} max={240} value={c.duration_minutes}
                    onChange={(e) => update(c.level, { duration_minutes: Number(e.target.value) })} className={`${inputClass} mt-1`} />
                </label>
                <label className="text-xs font-bold text-gray-400">
                  Credit cost (default for all subjects)
                  <input type="number" min={0} value={c.credit_cost}
                    onChange={(e) => update(c.level, { credit_cost: Number(e.target.value) })} className={`${inputClass} mt-1`} />
                </label>
                <div className="text-xs font-bold text-gray-400">
                  Marking
                  <div className="mt-1 flex rounded-xl border border-gray-800 bg-gray-900 p-1">
                    {[false, true].map((on) => (
                      <button
                        key={String(on)} type="button"
                        onClick={() => update(c.level, { negative_marking: on })}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-bold ${c.negative_marking === on ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}
                      >
                        {on ? 'Negative marking' : 'No negative marking'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {c.negative_marking && (
                <label className="mt-4 block max-w-sm text-xs font-bold text-gray-400">
                  Deduction per wrong answer (fraction of that question&apos;s marks)
                  <input type="number" min={0} max={1} step={0.05} value={c.negative_mark}
                    onChange={(e) => update(c.level, { negative_mark: Number(e.target.value) })} className={`${inputClass} mt-1`} />
                  <span className="mt-1 block font-medium text-gray-500">
                    e.g. 0.25 → a wrong basic answer costs {(MARKS.basic * c.negative_mark).toFixed(2)}, intermediate {(MARKS.intermediate * c.negative_mark).toFixed(2)}, advanced {(MARKS.advanced * c.negative_mark).toFixed(2)}. Unanswered questions always score 0.
                  </span>
                </label>
              )}
            </section>
          );
        })}

        <section className={cardClass}>
          <h2 className="text-lg font-bold">Credits</h2>
          <label className="mt-4 block max-w-xs text-xs font-bold text-gray-400">
            Starting credits for new students
            <input type="number" min={0} value={defaultCredits} onChange={(e) => setDefaultCredits(e.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <p className="mt-1 text-xs text-gray-500">Only affects students who register from now on. Top up existing students from the Students page.</p>

          <h3 className="mt-6 text-sm font-bold">Price per subject <span className="font-medium text-gray-500">(leave blank to use the default above)</span></h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="py-2 pr-3">Subject</th>
                  {TEST_LEVELS.map((l) => <th key={l} className="px-2 py-2">{LEVEL_LABELS[l]}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {subjects.map((s) => (
                  <tr key={s}>
                    <td className="py-2 pr-3 font-medium">{s}</td>
                    {TEST_LEVELS.map((l) => {
                      const key: CostKey = `${s}|${l}`;
                      return (
                        <td key={l} className="px-2 py-2">
                          <input
                            type="number" min={0} value={costs[key] ?? ''}
                            placeholder={String(configs.find((c) => c.level === l)?.credit_cost ?? '')}
                            onChange={(e) => setCosts((cs) => ({ ...cs, [key]: e.target.value }))}
                            className={`${inputClass} max-w-[110px]`}
                            aria-label={`${s} ${LEVEL_LABELS[l]} price`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <AdminNotice {...msg} />
        <button onClick={save} disabled={saving || configs.some((c) => validateMix(mixOf(c)) !== null)} className={`${buttonClass} w-full py-3`}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </AdminPage>
  );
}
