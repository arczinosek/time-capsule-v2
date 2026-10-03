import { setupServer } from 'msw/node';
import { env } from '~/env';

// No default handlers: each test declares the api responses it relies on, e.g.
// server.use(http.get(apiUrl('/milestones'), () => HttpResponse.json([...]))).
export const server = setupServer();

/** Same base URL the app uses (pinned to http://api.test in vitest.config.ts). */
export const apiUrl = (path: string) => `${env.VITE_API_URL}${path}`;
