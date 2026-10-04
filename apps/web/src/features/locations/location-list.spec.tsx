import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setLanguage } from '~/i18n';
import { buildLocation, buildMilestone } from '~/test/fixtures';
import { renderRoute } from '~/test/render-route';
import { apiUrl, server } from '~/test/server';

describe('/locations (locations list)', () => {
  it('lists the locations with their coordinates and owning place', async () => {
    server.use(
      http.get(apiUrl('/locations'), () =>
        HttpResponse.json([
          buildLocation({ id: 1, name: 'Rynek', place: { id: 7, name: 'Home' } }),
          buildLocation({
            id: 2,
            name: 'Opera',
            latitude: -33.856784,
            longitude: 151.215297,
          }),
        ]),
      ),
    );

    renderRoute('/locations');

    expect(await screen.findByRole('link', { name: 'Rynek' })).toHaveAttribute(
      'href',
      '/locations/1/edit',
    );
    expect(screen.getByText('50.061698°, 19.937206°')).toBeInTheDocument();
    expect(screen.getByText('-33.856784°, 151.215297°')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/places/7',
    );
    expect(screen.getByRole('link', { name: 'Edit Opera' })).toHaveAttribute(
      'href',
      '/locations/2/edit',
    );
    expect(screen.getByRole('link', { name: 'New location' })).toHaveAttribute(
      'href',
      '/locations/new',
    );
    expect(
      screen.getByRole('navigation', { name: 'Places and locations' }),
    ).toBeInTheDocument();
  });

  it('shows the coordinates in Polish', async () => {
    server.use(
      http.get(apiUrl('/locations'), () => HttpResponse.json([buildLocation()])),
    );
    await setLanguage('pl');

    renderRoute('/locations');

    expect(await screen.findByText('50,061698°; 19,937206°')).toBeInTheDocument();
  });

  it('says when there are no locations yet', async () => {
    server.use(http.get(apiUrl('/locations'), () => HttpResponse.json([])));

    renderRoute('/locations');

    expect(await screen.findByText('No locations yet.')).toBeInTheDocument();
  });

  it('deletes after a warning that places and milestones lose it', async () => {
    let locations = [buildLocation({ id: 1, name: 'Rynek' })];
    const deleteHandler = vi.fn(() => {
      locations = [];
      return new HttpResponse(null, { status: 204 });
    });
    server.use(
      http.get(apiUrl('/locations'), () => HttpResponse.json(locations)),
      http.delete(apiUrl('/locations/1'), deleteHandler),
    );
    const { user } = renderRoute('/locations');

    await user.click(await screen.findByRole('button', { name: 'Delete Rynek' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Rynek?' });
    expect(
      within(dialog).getByText(
        "This can't be undone. Places and milestones at this location will lose it.",
      ),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('No locations yet.')).toBeInTheDocument();
    expect(deleteHandler).toHaveBeenCalledTimes(1);
  });

  it('is linked from the places page, which is linked from the header', async () => {
    server.use(
      http.get(apiUrl('/milestones'), () => HttpResponse.json([buildMilestone()])),
      http.get(apiUrl('/places'), () => HttpResponse.json([])),
      http.get(apiUrl('/locations'), () => HttpResponse.json([buildLocation({ name: 'Rynek' })])),
    );
    const { user, router } = renderRoute('/milestones');

    await user.click(await screen.findByRole('link', { name: 'Places' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Places' }),
    ).toBeInTheDocument();

    const subnav = screen.getByRole('navigation', { name: 'Places and locations' });
    await user.click(within(subnav).getByRole('link', { name: 'Locations' }));

    expect(await screen.findByRole('link', { name: 'Rynek' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/locations');
  });
});
