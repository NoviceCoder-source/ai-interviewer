import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { getSiteSettings } from '../../../lib/getSiteSettings';
import { LEVEL_LABELS, TEST_LEVELS, isTestLevel, mixOf, validateMix, type TestConfig } from '../../../lib/tests/config';
import { getTestConfigs } from '../../../lib/tests/server';
import { jsonError, serverError } from '../../../lib/http';

/** GET /api/admin/test-config — test rules per level, per-subject prices and the default credit balance. */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const [configs, costs, settings, { subjects }] = await Promise.all([
      getTestConfigs(),
      supabaseAdmin.from('credit_costs').select('subject, level, cost'),
      supabaseAdmin.from('site_settings').select('default_credits').eq('id', 1).single(),
      getSiteSettings(),
    ]);
    if (costs.error) throw costs.error;
    return NextResponse.json({
      configs: TEST_LEVELS.map((l) => configs[l]),
      costs: costs.data ?? [],
      defaultCredits: settings.data?.default_credits ?? 0,
      subjects,
    });
  } catch (err) {
    return serverError('admin/test-config', err);
  }
}

const isWhole = (n: unknown, min: number, max: number) => Number.isInteger(n) && (n as number) >= min && (n as number) <= max;

/** POST /api/admin/test-config { configs: TestConfig[], costs: {subject, level, cost}[], defaultCredits } */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const configs: TestConfig[] = Array.isArray(body.configs) ? body.configs : [];
    if (configs.length !== TEST_LEVELS.length || !TEST_LEVELS.every((l) => configs.some((c) => c.level === l))) {
      return jsonError(400, 'Send settings for all three test levels.');
    }

    const rows = [];
    for (const c of configs) {
      const label = LEVEL_LABELS[c.level];
      const mixError = validateMix(mixOf(c));
      if (mixError) return jsonError(400, `${label} test: ${mixError}`);
      if (!isWhole(c.duration_minutes, 5, 240)) return jsonError(400, `${label} test: time limit must be 5–240 minutes.`);
      if (!isWhole(c.credit_cost, 0, 10000)) return jsonError(400, `${label} test: credit cost must be a whole number of 0 or more.`);
      const negativeMark = Number(c.negative_mark);
      if (!(negativeMark >= 0 && negativeMark <= 1)) return jsonError(400, `${label} test: negative mark must be between 0 and 1.`);
      rows.push({
        level: c.level,
        basic_count: c.basic_count,
        intermediate_count: c.intermediate_count,
        advanced_count: c.advanced_count,
        duration_minutes: c.duration_minutes,
        negative_marking: Boolean(c.negative_marking),
        negative_mark: Math.round(negativeMark * 100) / 100,
        credit_cost: c.credit_cost,
        updated_at: new Date().toISOString(),
      });
    }

    const defaultCredits = Number(body.defaultCredits);
    if (!isWhole(defaultCredits, 0, 1_000_000)) return jsonError(400, 'Default credits must be a whole number of 0 or more.');

    const { subjects } = await getSiteSettings();
    const costs: { subject: string; level: string; cost: number }[] = [];
    for (const c of Array.isArray(body.costs) ? body.costs : []) {
      if (!subjects.includes(c?.subject) || !isTestLevel(c?.level)) return jsonError(400, 'Invalid subject price.');
      if (!isWhole(c.cost, 0, 10000)) return jsonError(400, `Price for ${c.subject} ${LEVEL_LABELS[c.level as keyof typeof LEVEL_LABELS]} must be a whole number of 0 or more.`);
      costs.push({ subject: c.subject, level: c.level, cost: c.cost });
    }

    const { error: configError } = await supabaseAdmin.from('test_configs').upsert(rows, { onConflict: 'level' });
    if (configError) throw configError;

    const { error: settingsError } = await supabaseAdmin.from('site_settings').update({ default_credits: defaultCredits }).eq('id', 1);
    if (settingsError) throw settingsError;

    // Replace the per-subject price list with what the admin sent.
    const { error: clearError } = await supabaseAdmin.from('credit_costs').delete().neq('subject', '');
    if (clearError) throw clearError;
    if (costs.length) {
      const { error } = await supabaseAdmin.from('credit_costs').insert(costs);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('admin/test-config/save', err);
  }
}
