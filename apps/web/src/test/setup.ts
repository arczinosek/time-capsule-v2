import '@testing-library/jest-dom/vitest';
import { server } from './server';

// jsdom doesn't implement scrolling; the router's scroll restoration calls it on navigation.
window.scrollTo = () => {};

// Any request without a handler errors instead of reaching the network.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
