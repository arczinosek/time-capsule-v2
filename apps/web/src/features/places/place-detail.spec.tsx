import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { milestoneQueries } from '~/features/milestones/queries';
import { setLanguage } from '~/i18n';
import { buildMilestone, buildPlace, buildPlaceDetail } from '~/test/fixtures';
import { renderRoute } from '~/test/render-route';
import { apiUrl, server } from '~/test/server';

const location = { id: 3, name: 'Garden', latitude: 50.061698, longitude: 19.937206 };

describe('/places/$placeId (place page)', () => {
  it('shows the description, the location on a map and the milestones there', async () => {
    server.use(
      http.get(apiUrl('/places/5'), () =>
        HttpResponse.json(
          buildPlaceDetail({
            id: 5,
            name: 'Home',
            description: 'Where we **grew up**.',
            location,
            milestones: [
              {
                id: 8,
                date: '1990-06-01',
                title: 'Moved in',
                category: 'home_and_places',
              },
            ],
          }),
        ),
      ),
    );

    renderRoute('/places/5');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Home' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('grew up', { selector: 'strong' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Garden')).toBeInTheDocument();
    expect(screen.getByText(/50\.061698°, 19\.937206°/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open in OpenStreetMap' }),
    ).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/?mlat=50.061698&mlon=19.937206#map=16/50.061698/19.937206',
    );
    const map = screen.getByRole('group', { name: 'Map of Garden' });
    // The map chunk loads lazily.
    expect(await within(map).findByTestId('location-preview-map')).toHaveAttribute(
      'data-point',
      '50.061698,19.937206',
    );
    expect(screen.getByRole('link', { name: 'Moved in' })).toHaveAttribute(
      'href',
      '/milestones/8',
    );
    expect(screen.getByText('1 June 1990')).toBeInTheDocument();
    expect(screen.getByText(/Home and places/)).toBeInTheDocument();
  });

  it('says when there is no location, description or milestone, in Polish', async () => {
    server.use(
      http.get(apiUrl('/places/5'), () =>
        HttpResponse.json(buildPlaceDetail({ id: 5, name: 'Dom' })),
      ),
    );
    await setLanguage('pl');

    renderRoute('/places/5');

    expect(await screen.findByText('Brak lokalizacji.')).toBeInTheDocument();
    expect(screen.getByText('Brak opisu.')).toBeInTheDocument();
    expect(
      screen.getByText('Nie ma tu jeszcze żadnych wydarzeń.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('location-preview-map')).not.toBeInTheDocument();
  });

  it('deletes after confirming, returns to the list and marks milestones stale', async () => {
    server.use(
      http.get(apiUrl('/places/5'), () =>
        HttpResponse.json(buildPlaceDetail({ id: 5, name: 'Home', location })),
      ),
      http.delete(
        apiUrl('/places/5'),
        () => new HttpResponse(null, { status: 204 }),
      ),
      http.get(apiUrl('/places'), () => HttpResponse.json([])),
    );
    const { user, router, queryClient } = renderRoute('/places/5');
    const milestoneKey = milestoneQueries.detail(8).queryKey;
    queryClient.setQueryData(milestoneKey, buildMilestone({ id: 8 }));

    await user.click(await screen.findByRole('button', { name: 'Delete Home' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(
      within(dialog).getByText(
        "This can't be undone. Its location and the milestones there stay.",
      ),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('No places yet.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/places');
    expect(queryClient.getQueryState(milestoneKey)?.isInvalidated).toBe(true);
  });

  it('shows not found when the api answers 404', async () => {
    server.use(
      http.get(apiUrl('/places/999'), () =>
        HttpResponse.json(
          { message: 'Place 999 not found', error: 'Not Found', statusCode: 404 },
          { status: 404 },
        ),
      ),
    );

    renderRoute('/places/999');

    expect(await screen.findByText('Place not found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to places' })).toHaveAttribute(
      'href',
      '/places',
    );
  });
});

describe('/places (places list)', () => {
  it('lists the places with their location', async () => {
    server.use(
      http.get(apiUrl('/places'), () =>
        HttpResponse.json([
          buildPlace({ id: 5, name: 'Home', location }),
          buildPlace({ id: 6, name: 'Somewhere' }),
        ]),
      ),
    );

    renderRoute('/places');

    expect(await screen.findByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/places/5',
    );
    expect(screen.getByText('Garden')).toBeInTheDocument();
    expect(screen.getByText('No location.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New place' })).toHaveAttribute(
      'href',
      '/places/new',
    );
  });
});
