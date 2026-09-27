import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
}
function getSupabaseAnonKey(): string {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);

  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { dataUrl, filename, bucket } = req.body;
  if (!dataUrl || typeof dataUrl !== 'string') {
    return res.status(400).json({ error: 'No dataUrl provided' });
  }

  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return res.status(400).json({ error: 'Invalid dataUrl format' });
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  if (!ALLOWED_IMAGE_MIME.has(mimeType) && !ALLOWED_VIDEO_MIME.has(mimeType)) {
    return res.status(400).json({ error: 'Unsupported file type' });
  }

  const buffer = Buffer.from(base64Data, 'base64');
  const size = buffer.length;
  const maxSize = ALLOWED_IMAGE_MIME.has(mimeType) ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  if (size > maxSize) {
    return res.status(400).json({ error: 'File size exceeds limit' });
  }

  const targetBucket = bucket || 'property-media';
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const safeName = filename
    ? `${uniqueSuffix}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    : `${uniqueSuffix}.${ext}`;

  let objectPath: string;
  if (targetBucket === 'reels') {
    objectPath = `${user.id}/${safeName}`;
  } else {
    objectPath = `properties/${user.id}/${safeName}`;
  }

  const { error: uploadError } = await supabase.storage.from(targetBucket).upload(objectPath, buffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (uploadError) {
    console.error('Supabase upload error:', uploadError);
    return res.status(500).json({ error: 'Failed to upload to storage' });
  }

  const { data: publicUrlData } = supabase.storage.from(targetBucket).getPublicUrl(objectPath);
  const publicUrl = publicUrlData.publicUrl;

  return res.status(200).json({ url: publicUrl });
}