# Request Data Flow

## Typical Request Lifecycle

Requête HTTP → `Express app` → Router (`routes/*`) → Middleware(s) → Controller (`controllers/*`) → Model (`models/*` + `config/database.js`) → Réponse JSON

## Middleware Stack (current)

Dans `server/src/app.js` (ordre actuel):
1. `cors(...)`
2. `app.options(/.*/, cors())`
3. `express.json()`
4. Montage des routers:
   - `/api/tasks`
   - `/api/journal`
   - `/api/users`
   - `/api/goals`
   - `/api/history`
5. `GET /api/health`

## Route Map

Montées dans `server/src/app.js`:
- `/api/tasks` → `server/src/routes/taskRoutes.js`
  - `GET /` (protégée)
  - `POST /` (protégée)
  - `PUT /:id` (protégée)
  - `DELETE /:id` (protégée)

- `/api/journal` → `server/src/routes/dailyEntryRoutes.js`
  - `GET /` (protégée)
  - `POST /` (protégée)

- `/api/goals` → `server/src/routes/goalRoutes.js`
  - `GET /` (protégée)
  - `POST /` (protégée)
  - `PUT /:id` (protégée)
  - `DELETE /:id` (protégée)

- `/api/history` → `server/src/routes/historyRoutes.js`
  - `GET /summary` (protégée)

- `/api/users` → `server/src/routes/userRoutes.js`
  - `POST /register`
  - `POST /login`

Auth middleware:
- `server/src/middlewares/auth.js` est utilisé sur les routes protégées. Il lit `Authorization: Bearer <token>`, vérifie le JWT, puis vérifie l’existence du user en DB.
