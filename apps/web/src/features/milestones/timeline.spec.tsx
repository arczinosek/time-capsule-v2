import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setLanguage } from '~/i18n';
import { buildMedia, buildMilestone } from '~/test/fixtures';
import { renderRoute } from '~/test/render-route';
import { apiUrl, server } from '~/test/server';

const photos = (count: number) =>
  Array.from({ length: count }, () => buildMedia());

describe('/milestones (the timeline)', () => {
  it('redirects / here and groups the milestones by year, in the api order', async () => {
    server.use(
      http.get(apiUrl('/milestones'), () =>
        HttpResponse.json([
          buildMilestone({ id: 1, date: '2024-05-01', title: 'First steps' }),
          buildMilestone({ id: 2, date: '2024-01-10', title: 'First word' }),
          buildMilestone({ id: 3, date: '2023-07-01', title: 'Born' }),
        ]),
      ),
    );

    const { router } = renderRoute('/');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Chronicle' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/milestones');
    const expectedYears = ['2024', '2023'];
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual(expectedYears);
    const year2024 = screen.getByRole('region', { name: '2024' });
    expect(
      within(year2024)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['First steps', 'First word']);
    expect(
      within(screen.getByRole('region', { name: '2023' })).getByRole('article', {
        name: 'Born',
      }),
    ).toBeInTheDocument();
  });

  it('shows an entry: date, title link, category, place, participants, excerpt and photos', async () => {
    server.use(
      http.get(apiUrl('/milestones'), () =>
        HttpResponse.json([
          buildMilestone({
            id: 1,
            date: '2024-05-01',
            title: 'First steps',
            category: 'life_and_memory',
            description: '**Wobbly** but _proud_.',
            location: { id: 3, name: 'Garden', latitude: 50, longitude: 19 },
            place: { id: 5, name: 'Home' },
            familyMembers: [
              { id: 1, name: 'Anna', kind: 'human' },
              { id: 2, name: 'Jan', kind: 'human' },
              { id: 3, name: 'Ola', kind: 'human' },
              { id: 4, name: 'Burek', kind: 'animal' },
              { id: 5, name: 'Mruczek', kind: 'animal' },
            ],
            media: photos(3),
          }),
          buildMilestone({
            id: 2,
            date: '2024-04-01',
            title: 'Garden party',
            location: { id: 3, name: 'Garden', latitude: 50, longitude: 19 },
            familyMembers: [{ id: 1, name: 'Anna', kind: 'human' }],
            media: photos(1),
          }),
        ]),
      ),
    );

    renderRoute('/milestones');

    const entry = await screen.findByRole('article', { name: 'First steps' });
    expect(within(entry).getByText('1 May 2024')).toHaveAttribute(
      'datetime',
      '2024-05-01',
    );
    expect(within(entry).getByRole('link', { name: 'First steps' })).toHaveAttribute(
      'href',
      '/milestones/1',
    );
    expect(within(entry).getByText('Life and memory')).toBeInTheDocument();
    expect(within(entry).getByText('Home')).toBeInTheDocument();
    expect(
      within(entry).getByText('Participants: Anna, Jan, Ola and 2 more'),
    ).toBeInTheDocument();
    expect(within(entry).getByText('Wobbly but proud.')).toBeInTheDocument();
    expect(within(entry).getByText('3 photos')).toBeInTheDocument();
    // No images on the timeline: photos are full-size originals.
    expect(within(entry).queryByRole('img')).not.toBeInTheDocument();

    // A location without a place shows the location; one participant, one photo.
    const other = screen.getByRole('article', { name: 'Garden party' });
    expect(within(other).getByText('Garden')).toBeInTheDocument();
    expect(within(other).getByText('Participants: Anna')).toBeInTheDocument();
    expect(within(other).getByText('1 photo')).toBeInTheDocument();
  });

  it('counts photos with Polish plural forms', async () => {
    server.use(
      http.get(apiUrl('/milestones'), () =>
        HttpResponse.json(
          [1, 3, 5, 22].map((count, index) =>
            buildMilestone({ id: index + 1, title: `M${count}`, media: photos(count) }),
          ),
        ),
      ),
    );
    await setLanguage('pl');

    renderRoute('/milestones');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kronika' }),
    ).toBeInTheDocument();
    const expectedCounts = {
      M1: '1 zdjęcie',
      M3: '3 zdjęcia',
      M5: '5 zdjęć',
      M22: '22 zdjęcia',
    };
    for (const [title, expectedCount] of Object.entries(expectedCounts)) {
      expect(
        within(screen.getByRole('article', { name: title })).getByText(expectedCount),
      ).toBeInTheDocument();
    }
  });

  it('jumps to a year without changing the URL or refetching', async () => {
    const listHandler = vi.fn(() =>
      HttpResponse.json([
        buildMilestone({ id: 1, date: '2024-05-01' }),
        buildMilestone({ id: 2, date: '2023-07-01' }),
        buildMilestone({ id: 3, date: '2021-02-03' }),
      ]),
    );
    server.use(http.get(apiUrl('/milestones'), listHandler));
    const { user, router } = renderRoute('/milestones');

    const yearNav = await screen.findByRole('navigation', { name: 'Jump to year' });
    expect(
      within(yearNav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['2024', '2023', '2021']);
    await user.click(within(yearNav).getByRole('link', { name: '2023' }));

    expect(screen.getByRole('heading', { level: 2, name: '2023' })).toHaveFocus();
    expect(router.state.location.pathname).toBe('/milestones');
    expect(router.state.location.hash).toBe('');
    expect(listHandler).toHaveBeenCalledTimes(1);
  });

  it('has no year nav for a single year', async () => {
    server.use(
      http.get(apiUrl('/milestones'), () =>
        HttpResponse.json([
          buildMilestone({ id: 1, date: '2024-05-01' }),
          buildMilestone({ id: 2, date: '2024-01-01' }),
        ]),
      ),
    );

    renderRoute('/milestones');

    expect(
      await screen.findByRole('heading', { level: 2, name: '2024' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Jump to year' }),
    ).not.toBeInTheDocument();
  });

  it('opens a milestone from its title', async () => {
    const milestone = buildMilestone({ id: 3, title: 'First steps' });
    server.use(
      http.get(apiUrl('/milestones'), () => HttpResponse.json([milestone])),
      http.get(apiUrl('/milestones/3'), () => HttpResponse.json(milestone)),
    );
    const { user, router } = renderRoute('/milestones');

    await user.click(await screen.findByRole('link', { name: 'First steps' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'First steps' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/milestones/3');
  });

  it('says when there are no milestones yet', async () => {
    server.use(http.get(apiUrl('/milestones'), () => HttpResponse.json([])));

    renderRoute('/milestones');

    expect(await screen.findByText('No milestones yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New milestone' })).toHaveAttribute(
      'href',
      '/milestones/new',
    );
  });

  it('explains when the api cannot be reached', async () => {
    server.use(http.get(apiUrl('/milestones'), () => HttpResponse.error()));

    renderRoute('/milestones');

    expect(
      await screen.findByText(
        "Cannot reach the api. Is it running, and does its CORS_ORIGIN match this page's origin?",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument();
  });
});
