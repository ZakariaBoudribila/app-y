# Codebase Overview

## Project Structure

```
.
├─ api/
│  └─ [...path].js
├─ client/                      # Angular front-end
│  ├─ src/
│  │  ├─ app/
│  │  │  ├─ components/
│  │  │  ├─ pages/
│  │  │  └─ services/
│  │  └─ environments/
│  └─ vercel.json
├─ server/                      # Node/Express API
│  ├─ .env
│  ├─ package.json
│  └─ src/
│     ├─ app.js
│     ├─ server.js
│     ├─ config/
│     ├─ controllers/
│     ├─ middlewares/
│     ├─ models/
│     └─ routes/
└─ vercel.json
```

## Stack & Dependencies

### Server (`server/`)
- `express` — serveur HTTP / routing
- `cors` — CORS
- `dotenv` — chargement des variables d’environnement depuis `server/.env`
- `pg` — PostgreSQL (via `Pool`)
- `bcryptjs` — hash des mots de passe
- `jsonwebtoken` — signature/validation JWT (auth actuelle)

### Client (`client/`)
- Angular (via `angular.json`) — SPA front-end
- Le token est envoyé via header `Authorization: Bearer ...` (stockage côté front actuellement via `localStorage`)

## Entry Point

- Démarrage serveur: `server/src/server.js`
- Création/paramétrage Express: `server/src/app.js`

Scripts NPM (dans `server/package.json`):
- `npm run dev` → `nodemon src/server.js`
- `npm start` → `node src/server.js`

## Environment Variables

Trouvées dans `server/.env`:
- `DATABASE_URL` — string de connexion PostgreSQL
- `JWT_SECRET` — secret JWT (auth actuelle)
- `PORT` — port d’écoute de l’API (dev fixé à 3001)

## Existing Auth (if any)

Auth existante:
- Endpoints:
  - `POST /api/users/register`
  - `POST /api/users/login`
- Stratégie:
  - Mot de passe hashé via `bcryptjs`
  - JWT signé via `JWT_SECRET` (payload: `{ id: user.id }`, expiration: 24h)
  - Les routes protégées utilisent `server/src/middlewares/auth.js` qui valide le Bearer token et vérifie l’existence de l’utilisateur en DB.

Limites actuelles:
- Pas de refresh token
- Pas de rotation / détection de réutilisation
- Un seul secret

## Database

- Moteur: PostgreSQL
- Driver: `pg`
- Connexion + initialisation des tables: `server/src/config/database.js`
- Tables créées si absentes:
  - `users` (id, username, email, password_hash)
  - `tasks`, `goals`, `daily_entries` (liées à `users`)
