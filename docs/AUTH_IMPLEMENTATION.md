# Auth System — Implementation Record

## Files Created

Server (`server/src`):
- `utils/tokens.js`
- `models/userModel.js`
- `models/refreshTokenModel.js`
- `controllers/authController.js`
- `middlewares/authenticate.js`
- `middlewares/authorize.js`
- `routes/authRoutes.js`

## Files Updated

- `server/src/app.js` — ajout `cookie-parser` + montage `app.use('/api/auth', ...)` + CORS compatible cookies
- `server/src/config/database.js` — ajout `role` sur `users` + création table `refresh_tokens`
- `server/src/middlewares/auth.js` — validation access token via la nouvelle util (compat `req.userData.id` conservée)
- `server/src/routes/userRoutes.js` — endpoints legacy `/api/users/*` branchés sur le nouveau noyau d’auth
- `server/.env` — ajout des variables JWT/cookies
- `server/.env.example` — ajouté (valeurs vides)

## Packages Added

Dans `server/package.json`:
- `cookie-parser` — lecture des cookies HttpOnly

Note: l’identifiant de famille des refresh tokens est généré via `crypto.randomUUID()` (Node.js), donc aucun package externe n’est requis.

(Packages déjà présents et utilisés: `jsonwebtoken`, `bcryptjs`, `pg`, `dotenv`, `cors`, `express`.)

## Environment Variables Added

Dans `server/.env` / `server/.env.example`:
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN` (défaut conseillé: `15m`)
- `JWT_REFRESH_EXPIRES_IN` (défaut conseillé: `7d`)
- `COOKIE_SECURE` (`true` en prod HTTPS)
- `COOKIE_SAME_SITE` (`strict` recommandé)

Note: le refresh token est opaque (aléatoire) et n’est pas un JWT. `JWT_REFRESH_SECRET` est gardé côté config pour coller au contrat d’env, mais n’est pas nécessaire pour une stratégie “opaque token”.

## Endpoints

Nouveaux endpoints:

| Method | Route | Auth Required |
|--------|-------|--------------|
| POST | /api/auth/register | Non |
| POST | /api/auth/login | Non |
| POST | /api/auth/refresh | Non (cookie HttpOnly) |
| POST | /api/auth/logout | Non (cookie HttpOnly) |
| GET  | /api/auth/me | Oui (Bearer) |

Compatibilité maintenue:
- `POST /api/users/register`
- `POST /api/users/login`

## How to Protect a Route

```javascript
const authenticate = require('./middlewares/authenticate');
const authorize = require('./middlewares/authorize');

router.get('/profile', authenticate, handler);
router.delete('/admin-only', authenticate, authorize('admin'), handler);
```

## Security Notes

- Access tokens courts (config via `JWT_ACCESS_EXPIRES_IN`) → le client doit appeler `/api/auth/refresh` pour renouveler.
- Refresh token rotatif: chaque refresh révoque l’ancien et émet un nouveau.
- Réutilisation d’un refresh token déjà révoqué → suppression de la famille (`family`) et reconnexion requise.
- Les refresh tokens sont stockés en base uniquement sous forme hashée (SHA-256).
- Les mots de passe sont hashés avec bcrypt (cost 12).
