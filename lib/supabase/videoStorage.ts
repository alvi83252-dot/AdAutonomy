import { getSupabaseBrowser } from '@/lib/supabase/client';
import { getSupabaseServer } from '@/lib/supabase/client';
import { generateId } from '@/lib/utils';

export const AD_VIDEOS_BUCKET = 'ad-videos';

export function getPublicVideoUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return '';
  return `${base}/storage/v1/object/public/${AD_VIDEOS_BUCKET}/${storagePath}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9.-]/gi, '-').toLowerCase() || 'ad.webm';
}

export function buildVideoStoragePath(filename: string): string {
  const safe = sanitizeFilename(filename);
  return `ads/${generateId()}-${safe}`;
}

/** Upload from browser (bypasses Vercel body limits). */
export async function uploadVideoFromBrowser(
  blob: Blob,
  filename: string
): Promise<{ url: string; path: string }> {
  const client = getSupabaseBrowser();
  if (!client) {
    throw new Error('Supabase is not configured for video hosting');
  }

  const path = buildVideoStoragePath(filename);
  const { error } = await client.storage.from(AD_VIDEOS_BUCKET).upload(path, blob, {
    contentType: blob.type || 'video/webm',
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = client.storage.from(AD_VIDEOS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Server fallback for smaller videos when browser upload is unavailable. */
export async function uploadVideoFromServer(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<{ url: string; path: string }> {
  const client = getSupabaseServer();
  if (!client) {
    throw new Error('Supabase is not configured for video hosting');
  }

  const path = buildVideoStoragePath(filename);
  const { error } = await client.storage.from(AD_VIDEOS_BUCKET).upload(path, buffer, {
    contentType: contentType || 'video/webm',
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { url: getPublicVideoUrl(path), path };
}
