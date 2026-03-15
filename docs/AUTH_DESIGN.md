# Authentication System Design

## Pattern: JWT + Rotating Refresh Tokens

Objectif: conserver l’accès via Bearer token (compatible avec l’existant) tout en ajoutant un refresh token rotatif stocké en cookie HttpOnly + whitelist en base.

## Token Strategy

- Access Token:
  - Durée courte (par défaut 15 minutes)
  - Signé HS256
  - Envoyé par le client via `Authorization: Bearer <accessToken>`
  - Payload minimal: `sub` (userId), `role` (optionnel), et un alias `id` (pour compatibilité avec le code existant qui lit `req.userData.id`)

- Refresh Token:
  - Chaîne opaque aléatoire (pas un JWT)
  - Durée longue (par défaut 7 jours)
  - Stockée côté client en cookie `HttpOnly` (jamais en `localStorage`)
  - Stockée côté serveur uniquement sous forme hashée (SHA-256) en base

## Security Decisions

- Rotation: chaque appel à `/api/auth/refresh` révoque l’ancien refresh token et émet un nouveau refresh token.
- Détection de réutilisation:
  - Si un refresh token déjà révoqué est réutilisé → on invalide toute la “famille” (token family) et on force une reconnexion.
- Hash du refresh token:
  - DB ne stocke jamais la valeur brute, uniquement `token_hash = sha256(rawRefresh)`.
- Hash du password:
  - `bcryptjs` avec cost factor 12.
- Données sensibles:
  - Pas d’email / mot de passe dans les JWT.

## Endpoints à Exposer

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Création compte |
| POST | /api/auth/login | Émet access token + refresh cookie |
| POST | /api/auth/refresh | Rotation refresh token + nouveau access token |
| POST | /api/auth/logout | Révoque refresh token (cookie) |
| GET  | /api/auth/me | Profil courant (protégé) |

Compatibilité:
- Conserver `POST /api/users/register` et `POST /api/users/login` (front actuel) mais les implémenter en s’appuyant sur le même noyau d’auth.

## Middleware

- `authenticate.js`
  - Valide `Authorization: Bearer <accessToken>`
  - Attache `req.user` + `req.userData` (alias compat)

- `authorize.js`
  - Garde RBAC simple (ex: `authorize('admin')`)

## Models / Tables Required (PostgreSQL)

### `users`
- `id` (INTEGER identity)
- `username` (TEXT)
- `email` (TEXT, unique)
- `password_hash` (TEXT)
- `role` (TEXT, default `user`) — à ajouter si absent

### `refresh_tokens`
- `id` (INTEGER identity)
- `token_hash` (TEXT unique)
- `user_id` (INTEGER → FK users)
- `family` (TEXT) — identifiant de lignée (UUID string, généré via `crypto.randomUUID()`)
- `expires_at` (TIMESTAMPTZ)
- `revoked` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)
- `revoked_at` (TIMESTAMPTZ nullable)

Indexation recommandée:
- unique sur `token_hash`
- index sur `(user_id)` et `(family)`
