import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setLanguage } from '~/i18n';
import { buildMilestone } from '~/test/fixtures';
import { renderRoute } from '~/test/render-route';
import { apiUrl, server } from '~/test/server';

/** The main navigation's links and which one is current. */
async function mainNav() {
  const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
  return within(nav)
    .getAllByRole('link')
    .map((link) => [link.textContent, link.getAttribute('aria-current')]);
}

describe('AppNav', () => {
  it('is one navigation with Chronicle, Family and Places, marking the current one', async () => {
    server.use(http.get(apiUrl('/family-members'), () => HttpResponse.json([])));

    renderRoute('/family-members');

    const expectedLinks = [
      ['Chronicle', null],
      ['Family', 'page'],
      ['Places', null],
    ];
    expect(await mainNav()).toEqual(expectedLinks);
    expect(screen.getAllByRole('navigation', { name: 'Main navigation' })).toHaveLength(1);
  });

  it('marks Chronicle current on a milestone page too', async () => {
    server.use(
      http.get(apiUrl('/milestones/3'), () =>
        HttpResponse.json(buildMilestone({ id: 3 })),
      ),
    );

    renderRoute('/milestones/3');

    expect(await mainNav()).toEqual([
      ['Chronicle', 'page'],
      ['Family', null],
      ['Places', null],
    ]);
  });

  it('marks Places current on the locations pages', async () => {
    server.use(http.get(apiUrl('/locations'), () => HttpResponse.json([])));

    renderRoute('/locations');

    expect(await mainNav()).toEqual([
      ['Chronicle', null],
      ['Family', null],
      ['Places', 'page'],
    ]);
  });

  it('is translated', async () => {
    server.use(http.get(apiUrl('/places'), () => HttpResponse.json([])));
    await setLanguage('pl');

    renderRoute('/places');

    const nav = await screen.findByRole('navigation', { name: 'Nawigacja główna' });
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Kronika',
      'Rodzina',
      'Miejsca',
    ]);
    expect(
      screen.getByRole('link', { name: 'Przejdź do treści' }),
    ).toBeInTheDocument();
  });

  it('starts with a skip link that focuses the main content without navigating', async () => {
    server.use(http.get(apiUrl('/milestones'), () => HttpResponse.json([])));
    const { user, router } = renderRoute('/milestones');
    await screen.findByText('No milestones yet.');

    await user.tab();
    const skipLink = screen.getByRole('link', { name: 'Skip to content' });
    expect(skipLink).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('main')).toHaveFocus();
    expect(router.state.location.pathname).toBe('/milestones');
    expect(router.state.location.hash).toBe('');
  });
});
