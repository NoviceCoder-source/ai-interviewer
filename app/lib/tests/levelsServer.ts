import { getSiteSettings } from '../getSiteSettings';
import { cleanRequirements } from './levels';

/** Validates a level sent by the admin UI. */
export async function parseLevel(body: { name?: unknown; position?: unknown; requirements?: unknown }) {
  const name = String(body.name ?? '').trim();
  const position = Number(body.position);
  if (!name || name.length > 60) return { ok: false as const, error: 'Level name must be 1–60 characters.' };
  if (!Number.isInteger(position) || position < 0 || position > 1000) return { ok: false as const, error: 'Order must be a whole number from 0 to 1000.' };
  const { subjects } = await getSiteSettings();
  const reqs = cleanRequirements(body.requirements, subjects);
  if (!reqs.ok) return reqs;
  return { ok: true as const, value: { name, position, requirements: reqs.value } };
}
