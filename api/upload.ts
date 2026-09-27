import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
}
function getSupabaseAnonKey(): string {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
}

function validateFile(mime: string, size: number): { ok: boolean; maxSize: number; type: 'image' | 'video' | null } {
  if (ALLOWED_IMAGE_MIME.has(mime)) return { ok: true, maxSize: MAX_IMAGE_SIZE, type: 'image' };
  if (ALLOWED_VIDEO_MIME.has(mime)) return { ok: true, maxSize: MAX_VIDEO_SIZE, type: 'video' };
  return { ok: false, maxSize: 0, type: null };
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

  // Create user-scoped Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // Verify user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Parse multipart form
  const form = formidable({
    maxFileSize: MAX_VIDEO_SIZE,
    multiples: false,
  });

  const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve([fields, files]);
    });
  });

  const file = files.file?.[0];
  if (!file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const mime = file.mimetype || '';
  const size = file.size;
  const validation = validateFile(mime, size);
  if (!validation.ok || size > validation.maxSize) {
    return res.status(400).json({ error: 'File size exceeds limit or unsupported type' });
  }

  // Determine bucket
  const bucket = (fields.bucket?.[0] as string) || 'property-media';

  // Build object path per RLS policy
  let objectPath: string;
  const ext = path.extname(file.originalFilename || '').toLowerCase() || (validation.type === 'video' ? '.mp4' : '.jpg');
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const safeName = `${uniqueSuffix}${ext}`;

  if (bucket === 'reels') {
    objectPath = `${user.id}/${safeName}`;
  } else {
    objectPath = `properties/${user.id}/${safeName}`;
  }

  // Read file buffer
  const fileBuffer = fs.readFileSync(file.filepath);

  const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, fileBuffer, {
    contentType: mime,
    upsert: false,
  });

  // Cleanup temp file
  fs.unlinkSync(file.filepath);

  if (uploadError) {
    console.error('Supabase upload error:', uploadError);
    return res.status(500).json({ error: 'Failed to upload to storage' });
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  const publicUrl = publicUrlData.publicUrl;

  return res.status(200).json({
    url: publicUrl,
    filename: safeName,
    size,
    mimetype: mime,
  });
}