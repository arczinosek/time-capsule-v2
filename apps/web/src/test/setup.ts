import '@testing-library/jest-dom/vitest';
import i18n from 'i18next';
import { initI18n } from '~/i18n';
import { server } from './server';

// jsdom doesn't implement scrolling; the router's scroll restoration calls it on navigation.
window.scrollTo = () => {};

// Specs read in English. A Polish case calls `await setLanguage('pl')` before renderRoute.
// Reset in beforeEach (not afterEach), so it never re-renders a tree that is still mounted.
initI18n('en');
beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage('en');
});

// Any request without a handler errors instead of reaching the network.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
