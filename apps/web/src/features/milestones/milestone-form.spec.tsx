import { screen, waitFor, within } from '@testing-library/react';
import type {
  FamilyMemberResponse,
  LocationResponse,
  MilestoneResponse,
  PlaceResponse,
  ValidationErrorBody,
} from '@time-capsule/shared';
import { http, HttpResponse } from 'msw';
import { familyMemberQueries } from '~/features/family-members/queries';
import { placeQueries } from '~/features/places/queries';
import { setLanguage } from '~/i18n';
import {
  buildFamilyMember,
  buildFamilyMemberDetail,
  buildLocation,
  buildMilestone,
  buildPlace,
  buildPlaceDetail,
} from '~/test/fixtures';
import { renderRoute } from '~/test/render-route';
import { apiUrl, server } from '~/test/server';

/** GET /family-members: the participant options both form routes load. */
function useFamilyMembersHandler(familyMembers: FamilyMemberResponse[]) {
  server.use(
    http.get(apiUrl('/family-members'), () => HttpResponse.json(familyMembers)),
  );
}

/** GET /places and GET /locations: the "where" options both form routes load. */
function useWhereHandlers(places: PlaceResponse[], locations: LocationResponse[]) {
  server.use(
    http.get(apiUrl('/places'), () => HttpResponse.json(places)),
    http.get(apiUrl('/locations'), () => HttpResponse.json(locations)),
  );
}

// Every test renders a form route, whose loader fetches the participant and "where" options.
beforeEach(() => {
  useFamilyMembersHandler([]);
  useWhereHandlers([], []);
});

/** POST /milestones answering `created`, recording each body; GET of the new detail page. */
function useCreateHandlers(created: MilestoneResponse) {
  const requests: unknown[] = [];
  server.use(
    http.post(apiUrl('/milestones'), async ({ request }) => {
      requests.push(await request.json());
      return HttpResponse.json(created, { status: 201 });
    }),
    http.get(apiUrl(`/milestones/${created.id}`), () =>
      HttpResponse.json(created),
    ),
  );
  return requests;
}

/**
 * GET and PATCH /milestones/:id over one stored milestone. Stateful because the detail page's
 * loader refetches after a save.
 */
function useEditHandlers(milestone: MilestoneResponse) {
  let current = milestone;
  const requests: unknown[] = [];
  server.use(
    http.get(apiUrl(`/milestones/${milestone.id}`), () =>
      HttpResponse.json(current),
    ),
    http.patch(apiUrl(`/milestones/${milestone.id}`), async ({ request }) => {
      const body = (await request.json()) as Partial<MilestoneResponse>;
      requests.push(body);
      current = { ...current, ...body };
      return HttpResponse.json(current);
    }),
  );
  return requests;
}

describe('/milestones/new (new milestone)', () => {
  it('validates with the shared schema before sending anything', async () => {
    const createHandler = vi.fn(() =>
      HttpResponse.json(buildMilestone(), { status: 201 }),
    );
    server.use(http.post(apiUrl('/milestones'), createHandler));
    const { user } = renderRoute('/milestones/new');

    await user.click(await screen.findByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid date')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(createHandler).not.toHaveBeenCalled();
  });

  it('shows client validation errors in Polish', async () => {
    await setLanguage('pl');
    const { user } = renderRoute('/milestones/new');

    await user.click(await screen.findByRole('button', { name: 'Dodaj' }));

    expect(await screen.findByText('Tytuł jest wymagany')).toBeInTheDocument();
    expect(screen.getByText('Podaj prawidłową datę')).toBeInTheDocument();
  });

  it('creates a milestone and opens its page', async () => {
    const created = buildMilestone({ title: 'First steps' });
    const requests = useCreateHandlers(created);
    const { user, router } = renderRoute('/milestones/new');

    await user.type(await screen.findByLabelText('Date'), '2024-05-01');
    await user.type(screen.getByLabelText('Title'), '  First steps  ');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'First steps' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/milestones/${created.id}`);
    // Trimmed by the shared schema; the empty textarea and select are sent as null.
    expect(requests).toEqual([
      {
        date: '2024-05-01',
        title: 'First steps',
        description: null,
        category: null,
        familyMemberIds: [],
        locationId: null,
      },
    ]);
  });

  it('sends the chosen category and the Markdown description', async () => {
    const created = buildMilestone({ title: 'Seaside' });
    const requests = useCreateHandlers(created);
    const { user } = renderRoute('/milestones/new');

    await user.type(await screen.findByLabelText('Date'), '2024-07-01');
    await user.type(screen.getByLabelText('Title'), 'Seaside');
    await user.selectOptions(
      screen.getByLabelText('Category'),
      'Travels and adventures',
    );
    // paste, not type: user.type reads [ and { as key descriptors.
    await user.click(screen.getByLabelText('Description'));
    await user.paste('We saw **the sea**, see [photos](https://example.com).');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await screen.findByRole('heading', { level: 1, name: 'Seaside' });
    expect(requests).toEqual([
      {
        date: '2024-07-01',
        title: 'Seaside',
        description: 'We saw **the sea**, see [photos](https://example.com).',
        category: 'travels_and_adventures',
        familyMemberIds: [],
        locationId: null,
      },
    ]);
  });

  it('previews the Markdown description', async () => {
    const { user } = renderRoute('/milestones/new');

    await user.click(await screen.findByLabelText('Description'));
    await user.paste('Proud **parents**');
    await user.click(screen.getByRole('tab', { name: 'Preview' }));

    expect(await screen.findByText('parents', { selector: 'strong' })).toBeInTheDocument();
  });

  it('blocks a description over 65,535 UTF-8 bytes on the client', async () => {
    const createHandler = vi.fn(() =>
      HttpResponse.json(buildMilestone(), { status: 201 }),
    );
    server.use(http.post(apiUrl('/milestones'), createHandler));
    const { user } = renderRoute('/milestones/new');

    await user.type(await screen.findByLabelText('Date'), '2024-05-01');
    await user.type(screen.getByLabelText('Title'), 'Long story');
    await user.click(screen.getByLabelText('Description'));
    await user.paste('ą'.repeat(32_768));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByText('Description is too long (max 64 KB of text)'),
    ).toBeInTheDocument();
    expect(createHandler).not.toHaveBeenCalled();
  });

  it("shows the api's validation errors under the matching fields", async () => {
    server.use(
      http.post(apiUrl('/milestones'), () =>
        HttpResponse.json<ValidationErrorBody>(
          {
            message: 'validation.failed',
            errors: {
              formErrors: [],
              fieldErrors: {
                // A key is translated; any other text is shown verbatim.
                title: ['Title is already taken'],
                category: ['validation.category.invalid'],
              },
            },
          },
          { status: 400 },
        ),
      ),
    );
    const { user } = renderRoute('/milestones/new');

    await user.type(await screen.findByLabelText('Date'), '2024-05-01');
    await user.type(screen.getByLabelText('Title'), 'First steps');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByText('Title is already taken'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Choose a category from the list'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('shows a server error without leaking its English text', async () => {
    server.use(
      http.post(apiUrl('/milestones'), () =>
        HttpResponse.json(
          { statusCode: 500, message: 'Internal server error' },
          { status: 500 },
        ),
      ),
    );
    const { user } = renderRoute('/milestones/new');

    await user.type(await screen.findByLabelText('Date'), '2024-05-01');
    await user.type(screen.getByLabelText('Title'), 'First steps');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByText('The server answered with an error. Try again.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Internal server error')).not.toBeInTheDocument();
  });
});

describe('/milestones/$milestoneId/edit (edit milestone)', () => {
  it('loads the milestone into the form, saves and opens its page', async () => {
    const milestone = buildMilestone({ id: 7, title: 'First steps' });
    const requests = useEditHandlers(milestone);
    const { user, router } = renderRoute('/milestones/7/edit');

    const title = await screen.findByLabelText('Title');
    expect(title).toHaveValue('First steps');

    await user.clear(title);
    await user.type(title, 'First wobbly steps');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'First wobbly steps',
      }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/milestones/7');
    expect(requests).toEqual([
      {
        date: milestone.date,
        title: 'First wobbly steps',
        description: null,
        category: null,
        familyMemberIds: [],
        locationId: null,
      },
    ]);
  });

  it('pre-selects the category and clears it with the empty option', async () => {
    const milestone = buildMilestone({
      id: 8,
      category: 'travels_and_adventures',
    });
    const requests = useEditHandlers(milestone);
    const { user } = renderRoute('/milestones/8/edit');

    const category = await screen.findByLabelText('Category');
    expect(category).toHaveValue('travels_and_adventures');

    await user.selectOptions(category, 'No category');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(requests).toEqual([
        expect.objectContaining({ category: null }),
      ]),
    );
  });

  it('cancels back to the milestone page', async () => {
    const milestone = buildMilestone({ id: 9, title: 'Birthday' });
    useEditHandlers(milestone);
    const { user, router } = renderRoute('/milestones/9/edit');

    await user.click(await screen.findByRole('link', { name: 'Cancel' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Birthday' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/milestones/9');
  });

  it('shows not found when the api answers 404', async () => {
    server.use(
      http.get(apiUrl('/milestones/999'), () =>
        HttpResponse.json(
          {
            message: 'Milestone 999 not found',
            error: 'Not Found',
            statusCode: 404,
          },
          { status: 404 },
        ),
      ),
    );

    renderRoute('/milestones/999/edit');

    expect(await screen.findByText('Milestone not found.')).toBeInTheDocument();
  });

  it('shows the not-found page for a malformed id without calling the api', async () => {
    server.resetHandlers(); // no handlers: any request would error
    renderRoute('/milestones/abc/edit');

    expect(await screen.findByText('Page not found.')).toBeInTheDocument();
  });
});

describe('cross-feature cache', () => {
  // Family member pages list the milestones they take part in, place pages those held there.
  const familyMemberKey = familyMemberQueries.detail(1).queryKey;
  const placeKey = placeQueries.detail(2).queryKey;

  it('marks cached family members and places stale on create', async () => {
    const created = buildMilestone({ title: 'Seaside' });
    useCreateHandlers(created);
    const { user, queryClient } = renderRoute('/milestones/new');
    queryClient.setQueryData(familyMemberKey, buildFamilyMemberDetail({ id: 1 }));
    queryClient.setQueryData(placeKey, buildPlaceDetail({ id: 2 }));

    await user.type(await screen.findByLabelText('Date'), '2024-07-01');
    await user.type(screen.getByLabelText('Title'), 'Seaside');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await screen.findByRole('heading', { level: 1, name: 'Seaside' });
    expect(queryClient.getQueryState(familyMemberKey)?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(placeKey)?.isInvalidated).toBe(true);
  });

  it('marks cached family members and places stale on save', async () => {
    useEditHandlers(buildMilestone({ id: 7, title: 'First steps' }));
    const { user, queryClient } = renderRoute('/milestones/7/edit');
    queryClient.setQueryData(familyMemberKey, buildFamilyMemberDetail({ id: 1 }));
    queryClient.setQueryData(placeKey, buildPlaceDetail({ id: 2 }));

    await user.click(await screen.findByRole('button', { name: 'Save' }));

    await screen.findByRole('heading', { level: 1, name: 'First steps' });
    expect(queryClient.getQueryState(familyMemberKey)?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(placeKey)?.isInvalidated).toBe(true);
  });
});

describe('participants (family member picker)', () => {
  const ada = buildFamilyMember({ id: 1, name: 'Ada' });
  const burek = buildFamilyMember({ id: 2, name: 'Burek', kind: 'animal' });
  const jan = buildFamilyMember({ id: 3, name: 'Jan' });

  it('sends the ticked family members', async () => {
    useFamilyMembersHandler([ada, burek, jan]);
    const created = buildMilestone({ title: 'Walk', familyMembers: [ada, burek] });
    const requests = useCreateHandlers(created);
    const { user } = renderRoute('/milestones/new');

    await user.click(await screen.findByRole('checkbox', { name: 'Burek' }));
    await user.click(screen.getByRole('checkbox', { name: 'Ada' }));
    expect(screen.getByText('Selected: 2')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Date'), '2024-05-01');
    await user.type(screen.getByLabelText('Title'), 'Walk');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await screen.findByRole('heading', { level: 1, name: 'Walk' });
    expect(requests).toEqual([
      expect.objectContaining({ familyMemberIds: [2, 1] }),
    ]);
  });

  it('pre-selects the participants on edit and sends the reduced set', async () => {
    useFamilyMembersHandler([ada, burek, jan]);
    const milestone = buildMilestone({ id: 7, familyMembers: [ada, jan] });
    const requests = useEditHandlers(milestone);
    const { user } = renderRoute('/milestones/7/edit');

    const adaBox = await screen.findByRole('checkbox', { name: 'Ada' });
    expect(adaBox).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Jan' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Burek' })).not.toBeChecked();

    await user.click(adaBox);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(requests).toEqual([
        expect.objectContaining({ familyMemberIds: [3] }),
      ]),
    );
  });

  it('filters the rows and keeps hidden ones selected; Enter does not submit', async () => {
    useFamilyMembersHandler([ada, burek, jan]);
    const createHandler = vi.fn(() =>
      HttpResponse.json(buildMilestone(), { status: 201 }),
    );
    server.use(http.post(apiUrl('/milestones'), createHandler));
    const { user } = renderRoute('/milestones/new');

    await user.click(await screen.findByRole('checkbox', { name: 'Ada' }));
    await user.type(
      screen.getByRole('searchbox', { name: 'Search family members' }),
      'bu{Enter}',
    );

    expect(screen.getByRole('checkbox', { name: 'Burek' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Ada' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Jan' })).not.toBeInTheDocument();
    expect(screen.getByText('Selected: 1')).toBeInTheDocument();
    // Enter submitted nothing, so no validation errors either.
    expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
    expect(createHandler).not.toHaveBeenCalled();

    await user.clear(screen.getByRole('searchbox', { name: 'Search family members' }));
    await user.type(
      screen.getByRole('searchbox', { name: 'Search family members' }),
      'zz',
    );
    expect(screen.getByText('No family member matches.')).toBeInTheDocument();
  });

  it("shows the api's error on the participants", async () => {
    useFamilyMembersHandler([ada]);
    server.use(
      http.post(apiUrl('/milestones'), () =>
        HttpResponse.json<ValidationErrorBody>(
          {
            message: 'validation.failed',
            errors: {
              formErrors: [],
              fieldErrors: {
                familyMemberIds: ['validation.familyMember.notFound'],
              },
            },
          },
          { status: 400 },
        ),
      ),
    );
    const { user } = renderRoute('/milestones/new');

    await user.click(await screen.findByRole('checkbox', { name: 'Ada' }));
    await user.type(screen.getByLabelText('Date'), '2024-05-01');
    await user.type(screen.getByLabelText('Title'), 'Walk');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    const fieldset = screen.getByRole('group', { name: 'Participants' });
    expect(
      await within(fieldset).findByText(
        'The chosen family member no longer exists',
      ),
    ).toBeInTheDocument();
  });

  it('links to adding a family member when there are none', async () => {
    renderRoute('/milestones/new');

    expect(
      await screen.findByText(/No family members yet\./),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Add a family member' }),
    ).toHaveAttribute('href', '/family-members/new');
  });

  it('counts the selection in Polish', async () => {
    useFamilyMembersHandler([ada, burek]);
    await setLanguage('pl');
    const { user } = renderRoute('/milestones/new');

    await user.click(await screen.findByRole('checkbox', { name: 'Ada' }));

    expect(screen.getByText('Wybrano: 1')).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Uczestnicy' }),
    ).toBeInTheDocument();
  });
});

describe('where (location select)', () => {
  const krakow = buildLocation({ id: 11, name: 'Kraków', place: { id: 21, name: 'Home' } });
  const lake = buildLocation({ id: 12, name: 'Lake' });
  const home = buildPlace({
    id: 21,
    name: 'Home',
    location: { id: 11, name: 'Kraków', latitude: 50.061698, longitude: 19.937206 },
  });
  const nowhere = buildPlace({ id: 22, name: 'Somewhere', location: null });

  it('offers places that have a location and the free locations, and sends a location id', async () => {
    useWhereHandlers([home, nowhere], [krakow, lake]);
    const created = buildMilestone({ title: 'Dinner' });
    const requests = useCreateHandlers(created);
    const { user } = renderRoute('/milestones/new');

    const where = await screen.findByLabelText('Where');
    // A place without a location can't be chosen; a place's location is offered as the place.
    expect(
      within(where)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Not set', 'Home', 'Lake']);
    expect(within(where).getByRole('group', { name: 'Places' })).toBeInTheDocument();
    expect(
      within(where).getByRole('group', { name: 'Other locations' }),
    ).toBeInTheDocument();

    await user.selectOptions(where, 'Home');
    await user.type(screen.getByLabelText('Date'), '2024-05-01');
    await user.type(screen.getByLabelText('Title'), 'Dinner');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await screen.findByRole('heading', { level: 1, name: 'Dinner' });
    expect(requests).toEqual([expect.objectContaining({ locationId: 11 })]);
  });

  it('pre-selects the location on edit and clears it with the empty option', async () => {
    useWhereHandlers([home], [krakow, lake]);
    const milestone = buildMilestone({
      id: 7,
      location: { id: 12, name: 'Lake', latitude: 50.061698, longitude: 19.937206 },
    });
    const requests = useEditHandlers(milestone);
    const { user } = renderRoute('/milestones/7/edit');

    const where = await screen.findByLabelText('Where');
    expect(where).toHaveValue('12');

    await user.selectOptions(where, 'Not set');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(requests).toEqual([expect.objectContaining({ locationId: null })]),
    );
  });

  it('creates a location in a dialog and selects it, without submitting the milestone', async () => {
    const created = buildLocation({ id: 13, name: 'Wawel' });
    let locations = [lake];
    const locationRequests: unknown[] = [];
    const createMilestoneHandler = vi.fn(() =>
      HttpResponse.json(buildMilestone(), { status: 201 }),
    );
    server.use(
      http.get(apiUrl('/locations'), () => HttpResponse.json(locations)),
      http.post(apiUrl('/locations'), async ({ request }) => {
        locationRequests.push(await request.json());
        locations = [lake, created];
        return HttpResponse.json(created, { status: 201 });
      }),
      http.post(apiUrl('/milestones'), createMilestoneHandler),
    );
    const { user } = renderRoute('/milestones/new');

    await user.click(await screen.findByRole('button', { name: 'New location' }));
    const dialog = await screen.findByRole('dialog', { name: 'New location' });
    await user.type(within(dialog).getByLabelText('Name'), 'Wawel');
    await user.click(
      within(dialog).getByRole('button', { name: 'Pick a point (map stub)' }),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(locationRequests).toEqual([
      { name: 'Wawel', latitude: 50.061698, longitude: 19.937206 },
    ]);
    expect(screen.getByLabelText('Where')).toHaveValue('13');
    expect(createMilestoneHandler).not.toHaveBeenCalled();
  });
});
