import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { queryOne } from '../lib/db.js';
import type { Profile } from '../lib/types.js';

const PROFILE_COLS = 'id, email, role, full_name, username, avatar_url, home_address, home_lat, home_lng, created_at, updated_at';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const UpdateProfileSchema = z.object({
  full_name:    z.string().min(1).max(120).optional(),
  username:     z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{2,29}$/, {
    message: 'Username must be 3-30 chars, start with a letter, and contain only letters, numbers, and underscores',
  }).optional(),
  avatar_url:   z.string().url().optional(),
  home_address: z.string().max(255).optional(),
  home_lat:     z.coerce.number().min(-90).max(90).optional(),
  home_lng:     z.coerce.number().min(-180).max(180).optional(),
});

const UploadAvatarSchema = z.object({
  data:        z.string().min(1),        // base64-encoded file bytes
  contentType: z.string().min(1),
});

export default async function profileRoutes(fastify: FastifyInstance) {
  // GET /profile
  fastify.get('/profile', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const profile = await queryOne<Profile>(
      `SELECT ${PROFILE_COLS} FROM profiles WHERE id = $1`,
      [request.user.id],
    );
    if (!profile) return reply.status(404).send({ error: 'Profile not found' });
    return { profile };
  });

  // PUT /profile
  fastify.put('/profile', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const parsed = UpdateProfileSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.errors[0]?.message ?? 'Invalid input' });

    const { full_name, username, avatar_url, home_address, home_lat, home_lng } = parsed.data;

    if (username) {
      const existing = await queryOne<{ id: string }>(
        'SELECT id FROM profiles WHERE username = $1 AND id != $2',
        [username, request.user.id],
      );
      if (existing) return reply.status(409).send({ error: 'Username already taken' });
    }

    const profile = await queryOne<Profile>(
      `UPDATE profiles
          SET full_name    = COALESCE($1, full_name),
              username     = COALESCE($2, username),
              avatar_url   = COALESCE($3, avatar_url),
              home_address = COALESCE($4, home_address),
              home_lat     = COALESCE($5, home_lat),
              home_lng     = COALESCE($6, home_lng),
              updated_at   = NOW()
        WHERE id = $7
        RETURNING ${PROFILE_COLS}`,
      [full_name ?? null, username ?? null, avatar_url ?? null,
       home_address ?? null, home_lat ?? null, home_lng ?? null,
       request.user.id],
    );
    if (!profile) return reply.status(404).send({ error: 'Profile not found' });
    return { profile };
  });

  // POST /profile/avatar — accepts base64 image, uploads via service role, returns public URL
  fastify.post('/profile/avatar', async (request, reply) => {
    if (!request.user) return reply.status(401).send({ error: 'Authentication required' });

    const parsed = UploadAvatarSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid payload' });

    const { data: b64, contentType } = parsed.data;

    if (!ALLOWED_MIME.has(contentType)) {
      return reply.status(415).send({ error: 'Unsupported image type. Use JPEG, PNG, WebP or GIF.' });
    }

    const buffer = Buffer.from(b64, 'base64');
    if (buffer.byteLength > MAX_BYTES) {
      return reply.status(413).send({ error: 'Image must be under 2 MB' });
    }

    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const storagePath = `${request.user.id}/avatar.${ext}`;

    const { error: uploadError } = await fastify.supabase.storage
      .from('avatars')
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (uploadError) {
      fastify.log.error(uploadError, 'Avatar upload failed');
      return reply.status(500).send({ error: uploadError.message });
    }

    const { data: urlData } = fastify.supabase.storage
      .from('avatars')
      .getPublicUrl(storagePath);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const profile = await queryOne<Profile>(
      `UPDATE profiles SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING ${PROFILE_COLS}`,
      [publicUrl, request.user.id],
    );

    return { avatar_url: publicUrl, profile };
  });
}
