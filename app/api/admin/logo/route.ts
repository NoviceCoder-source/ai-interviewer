import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { jsonError, serverError } from '../../../lib/http';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

/** Uploads a new logo to the public branding bucket and returns its URL (saved via update-settings). */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const file = (await req.formData()).get('file');
    if (!(file instanceof File)) return jsonError(400, 'Please choose an image.');
    const ext = EXTENSIONS[file.type];
    if (!ext) return jsonError(400, 'Logo must be PNG, JPG, WebP or SVG.');
    if (file.size > MAX_LOGO_BYTES) return jsonError(400, 'Logo must be 2 MB or smaller.');

    const path = `logos/logo-${Date.now()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from('branding')
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
    if (error) throw error;

    const { data } = supabaseAdmin.storage.from('branding').getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    return serverError('admin/logo', err);
  }
}
