-- Migration 003: Add username and avatar_url to profiles; create avatars storage bucket

-- ─── Profile columns ──────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username   VARCHAR(30)  UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Enforce username format at DB level (letter-first, alphanumeric + underscores)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_username_format;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_username_format
    CHECK (username ~ '^[a-zA-Z][a-zA-Z0-9_]{2,29}$');

-- ─── Avatars storage bucket ───────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,             -- 2 MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ─── Storage RLS policies ─────────────────────────────────────────────────────
-- Anyone can read avatars (bucket is public, but explicit SELECT policy too)
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Authenticated users can upload/replace their own avatar
DROP POLICY IF EXISTS "avatars_user_insert" ON storage.objects;
CREATE POLICY "avatars_user_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_user_update" ON storage.objects;
CREATE POLICY "avatars_user_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_user_delete" ON storage.objects;
CREATE POLICY "avatars_user_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
