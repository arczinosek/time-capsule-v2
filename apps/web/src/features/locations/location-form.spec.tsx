import { screen, waitFor } from '@testing-library/react';
import type {
  LocationResponse,
  ValidationErrorBody,
} from '@time-capsule/shared';
import { http, HttpResponse } from 'msw';
import { milestoneQueries } from '~/features/milestones/queries';
import { placeQueries } from '~/features/places/queries';
import { setLanguage } from '~/i18n';
import {
  buildLocation,
  buildMilestone,
  buildPlaceDetail,
} from '~/test/fixtures';
import { renderRoute } from '~/test/render-route';
import { apiUrl, server } from '~/test/server';

/** POST /locations answering `created`, recording each body; GET of the list it returns to. */
function useCreateHandlers(created: LocationResponse) {
  const requests: unknown[] = [];
  server.use(
    http.post(apiUrl('/locations'), async ({ request }) => {
      requests.push(await request.json());
      return HttpResponse.json(created, { status: 201 });
    }),
    http.get(apiUrl('/locations'), () => HttpResponse.json([created])),
  );
  return requests;
}

describe('/locations/new (new location)', () => {
  it('uses the map stub, not Leaflet, in tests', async () => {
    renderRoute('/locations/new');

    expect(await screen.findByTestId('location-picker-map')).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Map for choosing the point' }),
    ).toBeInTheDocument();
  });

  it('validates with the shared schema before sending anything', async () => {
    const createHandler = vi.fn(() =>
      HttpResponse.json(buildLocation(), { status: 201 }),
    );
    server.use(http.post(apiUrl('/locations'), createHandler));
    const { user } = renderRoute('/locations/new');

    await user.type(await screen.findByLabelText('Latitude'), '91');
    await user.type(screen.getByLabelText('Longitude'), 'east');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a latitude from -90 to 90')).toBeInTheDocument();
    expect(
      screen.getByText('Enter a longitude from -180 to 180'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Latitude')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(createHandler).not.toHaveBeenCalled();
  });

  it('sends coordinates typed with a decimal comma as numbers, then lists the locations', async () => {
    const created = buildLocation({ name: 'Kraków, Rynek' });
    const requests = useCreateHandlers(created);
    const { user, router } = renderRoute('/locations/new');

    await user.type(await screen.findByLabelText('Name'), '  Kraków, Rynek ');
    await user.type(screen.getByLabelText('Latitude'), '50,061698');
    await user.type(screen.getByLabelText('Longitude'), ' 19,937206');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Locations' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/locations');
    expect(requests).toEqual([
      { name: 'Kraków, Rynek', latitude: 50.061698, longitude: 19.937206 },
    ]);
  });

  it('fills both coordinates from the map, and the map follows the fields', async () => {
    const { user } = renderRoute('/locations/new');

    const map = await screen.findByTestId('location-picker-map');
    expect(map).toHaveAttribute('data-point', '');

    await user.click(screen.getByRole('button', { name: 'Pick a point (map stub)' }));

    expect(screen.getByLabelText('Latitude')).toHaveValue('50.061698');
    expect(screen.getByLabelText('Longitude')).toHaveValue('19.937206');
    expect(map).toHaveAttribute('data-point', '50.061698,19.937206');

    await user.clear(screen.getByLabelText('Latitude'));
    await user.type(screen.getByLabelText('Latitude'), '-33,5');

    expect(map).toHaveAttribute('data-point', '-33.5,19.937206');
  });

  it("shows the api's validation errors under the matching fields", async () => {
    server.use(
      http.post(apiUrl('/locations'), () =>
        HttpResponse.json<ValidationErrorBody>(
          {
            message: 'validation.failed',
            errors: {
              formErrors: [],
              fieldErrors: { latitude: ['validation.latitude.invalid'] },
            },
          },
          { status: 400 },
        ),
      ),
    );
    const { user } = renderRoute('/locations/new');

    await user.type(await screen.findByLabelText('Name'), 'Edge');
    await user.type(screen.getByLabelText('Latitude'), '45');
    await user.type(screen.getByLabelText('Longitude'), '45');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByText('Enter a latitude from -90 to 90'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Latitude')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('labels the fields and errors in Polish', async () => {
    await setLanguage('pl');
    const { user } = renderRoute('/locations/new');

    await user.click(await screen.findByRole('button', { name: 'Dodaj' }));

    expect(await screen.findByText('Nazwa jest wymagana')).toBeInTheDocument();
    expect(screen.getByLabelText('Szerokość geograficzna')).toBeInTheDocument();
    expect(
      screen.getByText('Podaj długość geograficzną od -180 do 180'),
    ).toBeInTheDocument();
  });
});

describe('/locations/$locationId/edit (edit location)', () => {
  it('loads the location, saves the changed coordinates and returns to the list', async () => {
    let current = buildLocation({ id: 5, name: 'Rynek' });
    const requests: unknown[] = [];
    server.use(
      http.get(apiUrl('/locations/5'), () => HttpResponse.json(current)),
      http.patch(apiUrl('/locations/5'), async ({ request }) => {
        const body = (await request.json()) as Partial<LocationResponse>;
        requests.push(body);
        current = { ...current, ...body };
        return HttpResponse.json(current);
      }),
      http.get(apiUrl('/locations'), () => HttpResponse.json([current])),
    );
    const { user, router, queryClient } = renderRoute('/locations/5/edit');
    // Milestones and places embed the location: moved coordinates must reach their pages.
    const milestoneKey = milestoneQueries.detail(8).queryKey;
    const placeKey = placeQueries.detail(2).queryKey;
    queryClient.setQueryData(milestoneKey, buildMilestone({ id: 8 }));
    queryClient.setQueryData(placeKey, buildPlaceDetail({ id: 2 }));

    const latitude = await screen.findByLabelText('Latitude');
    expect(screen.getByLabelText('Name')).toHaveValue('Rynek');
    expect(latitude).toHaveValue('50.061698');

    await user.clear(latitude);
    await user.type(latitude, '50,0617');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/locations'),
    );
    expect(requests).toEqual([
      { name: 'Rynek', latitude: 50.0617, longitude: 19.937206 },
    ]);
    expect(queryClient.getQueryState(milestoneKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(placeKey)?.isInvalidated).toBe(true);
  });

  it('opens the editor for /locations/$locationId (there is no location page)', async () => {
    server.use(
      http.get(apiUrl('/locations/5'), () =>
        HttpResponse.json(buildLocation({ id: 5, name: 'Rynek' })),
      ),
    );
    const { router } = renderRoute('/locations/5');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit location' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/locations/5/edit');
  });

  it('shows not found when the api answers 404', async () => {
    server.use(
      http.get(apiUrl('/locations/999'), () =>
        HttpResponse.json(
          { message: 'Location 999 not found', error: 'Not Found', statusCode: 404 },
          { status: 404 },
        ),
      ),
    );

    renderRoute('/locations/999/edit');

    expect(await screen.findByText('Location not found.')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Back to locations' }),
    ).toHaveAttribute('href', '/locations');
  });
});
