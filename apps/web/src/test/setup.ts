import '@testing-library/jest-dom/vitest';
import i18n from 'i18next';
import { initI18n } from '~/i18n';
import { server } from './server';

// Leaflet needs a real layout: every test gets the stub maps instead. The setup file must not
// import location-map itself, or the mock doesn't apply.
vi.mock('~/features/locations/location-map', () => import('./location-map.mock'));

// jsdom doesn't implement scrolling: the router's scroll restoration calls scrollTo on
// navigation, the timeline's year nav calls scrollIntoView.
window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};

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
