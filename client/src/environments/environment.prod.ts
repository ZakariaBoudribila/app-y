export const environment = {
  production: true,
  // En prod sur Vercel, on passe par la Function /api/* (same-origin) pour éviter CORS.
  apiBaseUrl: '/api'
};