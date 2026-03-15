-- Crée la table user_profiles (profil CV de l'utilisateur)
-- Colonnes demandées: user_id (unique), about_me (text), experiences (jsonb), education (jsonb), languages (text[]), software (text[])

BEGIN;

-- Dépendance: table users (nécessaire pour la FK). Idempotent.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_data_url TEXT,
  role TEXT NOT NULL DEFAULT 'user'
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data_url TEXT;

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  about_me TEXT,
  experiences JSONB NOT NULL DEFAULT '[]'::jsonb,
  education JSONB NOT NULL DEFAULT '[]'::jsonb,
  languages TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  software TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  phone TEXT,
  address TEXT,
  linkedin TEXT
);

-- Si la table existait déjà (anciens schémas), on s'assure des colonnes contact.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS linkedin TEXT;

COMMIT;
