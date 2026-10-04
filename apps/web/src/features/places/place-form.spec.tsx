import { screen, waitFor, within } from '@testing-library/react';
import type {
  LocationResponse,
  PlaceDetailResponse,
  ValidationErrorBody,
} from '@time-capsule/shared';
import { http, HttpResponse } from 'msw';
import { buildLocation, buildPlaceDetail } from '~/test/fixtures';
import { renderRoute } from '~/test/render-route';
import { apiUrl, server } from '~/test/server';

const rynek = buildLocation({ id: 1, name: 'Rynek' });
const lake = buildLocation({ id: 2, name: 'Lake', place: { id: 9, name: 'Cabin' } });
const garden = buildLocation({ id: 3, name: 'Garden', place: { id: 5, name: 'Home' } });

/** GET /locations: the options both form routes load. */
function useLocationsHandler(locations: LocationResponse[]) {
  server.use(http.get(apiUrl('/locations'), () => HttpResponse.json(locations)));
}

/** POST /places answering `created`, recording each body; GET of the new page. */
function useCreateHandlers(created: PlaceDetailResponse) {
  const requests: unknown[] = [];
  server.use(
    http.post(apiUrl('/places'), async ({ request }) => {
      requests.push(await request.json());
      return HttpResponse.json(created, { status: 201 });
    }),
    http.get(apiUrl(`/places/${created.id}`), () => HttpResponse.json(created)),
  );
  return requests;
}

function optionNames(select: HTMLElement) {
  return within(select)
    .getAllByRole('option')
    .map((option) => option.textContent);
}

describe('/places/new (new place)', () => {
  beforeEach(() => {
    useLocationsHandler([rynek, lake, garden]);
  });

  it('validates with the shared schema before sending anything', async () => {
    const createHandler = vi.fn(() =>
      HttpResponse.json(buildPlaceDetail(), { status: 201 }),
    );
    server.use(http.post(apiUrl('/places'), createHandler));
    const { user } = renderRoute('/places/new');

    await user.click(await screen.findByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(createHandler).not.toHaveBeenCalled();
  });

  it('offers only the locations no other place owns, and sends the body', async () => {
    const created = buildPlaceDetail({ id: 4, name: 'Square' });
    const requests = useCreateHandlers(created);
    const { user, router } = renderRoute('/places/new');

    const location = await screen.findByLabelText('Location');
    expect(optionNames(location)).toEqual(['No location', 'Rynek']);

    await user.type(screen.getByLabelText('Name'), ' Square ');
    await user.selectOptions(location, 'Rynek');
    await user.click(screen.getByLabelText('Description'));
    await user.paste('Pigeons **everywhere**.');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Square' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/places/4');
    expect(requests).toEqual([
      { name: 'Square', description: 'Pigeons **everywhere**.', locationId: 1 },
    ]);
  });

  it('sends null for no location and an empty description', async () => {
    const requests = useCreateHandlers(buildPlaceDetail({ id: 4, name: 'Square' }));
    const { user } = renderRoute('/places/new');

    await user.type(await screen.findByLabelText('Name'), 'Square');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await screen.findByRole('heading', { level: 1, name: 'Square' });
    expect(requests).toEqual([
      { name: 'Square', description: null, locationId: null },
    ]);
  });

  it('creates a location in a dialog and selects it, without submitting the place', async () => {
    const created = buildLocation({ id: 6, name: 'Wawel' });
    let locations = [rynek];
    const locationRequests: unknown[] = [];
    const createPlaceHandler = vi.fn(() =>
      HttpResponse.json(buildPlaceDetail(), { status: 201 }),
    );
    server.use(
      http.get(apiUrl('/locations'), () => HttpResponse.json(locations)),
      http.post(apiUrl('/locations'), async ({ request }) => {
        locationRequests.push(await request.json());
        locations = [rynek, created];
        return HttpResponse.json(created, { status: 201 });
      }),
      http.post(apiUrl('/places'), createPlaceHandler),
    );
    const { user } = renderRoute('/places/new');

    await user.click(await screen.findByRole('button', { name: 'New location' }));
    const dialog = await screen.findByRole('dialog', { name: 'New location' });
    // The built-in close button is English-only text: the dialog drops it for Cancel.
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    ).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Name'), 'Wawel');
    await user.type(within(dialog).getByLabelText('Latitude'), '50,054');
    await user.type(within(dialog).getByLabelText('Longitude'), '19,935');
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(locationRequests).toEqual([
      { name: 'Wawel', latitude: 50.054, longitude: 19.935 },
    ]);
    expect(screen.getByLabelText('Location')).toHaveValue('6');
    // The place's own form neither submitted nor validated.
    expect(createPlaceHandler).not.toHaveBeenCalled();
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });

  it('cancels the dialog without creating anything', async () => {
    const createHandler = vi.fn(() =>
      HttpResponse.json(buildLocation(), { status: 201 }),
    );
    server.use(http.post(apiUrl('/locations'), createHandler));
    const { user } = renderRoute('/places/new');

    await user.click(await screen.findByRole('button', { name: 'New location' }));
    const dialog = await screen.findByRole('dialog', { name: 'New location' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(createHandler).not.toHaveBeenCalled();
  });

  it("shows the api's error on the location", async () => {
    server.use(
      http.post(apiUrl('/places'), () =>
        HttpResponse.json<ValidationErrorBody>(
          {
            message: 'validation.failed',
            errors: {
              formErrors: [],
              fieldErrors: { locationId: ['validation.location.taken'] },
            },
          },
          { status: 400 },
        ),
      ),
    );
    const { user } = renderRoute('/places/new');

    await user.type(await screen.findByLabelText('Name'), 'Square');
    await user.selectOptions(screen.getByLabelText('Location'), 'Rynek');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByText('This location already belongs to another place'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Location')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('/places/$placeId/edit (edit place)', () => {
  it('keeps its own location as an option, saves and opens its page', async () => {
    useLocationsHandler([rynek, lake, garden]);
    let current = buildPlaceDetail({
      id: 5,
      name: 'Home',
      location: { id: 3, name: 'Garden', latitude: 50.1, longitude: 19.9 },
    });
    const requests: unknown[] = [];
    server.use(
      http.get(apiUrl('/places/5'), () => HttpResponse.json(current)),
      http.patch(apiUrl('/places/5'), async ({ request }) => {
        const body = (await request.json()) as { name: string };
        requests.push(body);
        current = { ...current, name: body.name };
        return HttpResponse.json(current);
      }),
    );
    const { user, router } = renderRoute('/places/5/edit');

    const location = await screen.findByLabelText('Location');
    expect(location).toHaveValue('3');
    expect(optionNames(location)).toEqual(['No location', 'Rynek', 'Garden']);

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Old home');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Old home' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/places/5');
    expect(requests).toEqual([
      { name: 'Old home', description: null, locationId: 3 },
    ]);
  });
});
