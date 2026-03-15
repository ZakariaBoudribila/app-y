-- Migration: create profiles table (Profil Pro)

BEGIN;

CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  about_me TEXT,
  experiences JSONB NOT NULL DEFAULT '[]'::jsonb,
  education JSONB NOT NULL DEFAULT '[]'::jsonb,
  languages TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  software TEXT[] NOT NULL DEFAULT ARRAY[]::text[]
);

COMMIT;
