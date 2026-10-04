import { screen, waitFor, within } from '@testing-library/react';
import type {
  FamilyMemberDetailResponse,
  FamilyMemberResponse,
  ValidationErrorBody,
} from '@time-capsule/shared';
import { http, HttpResponse } from 'msw';
import { milestoneQueries } from '~/features/milestones/queries';
import { setLanguage } from '~/i18n';
import {
  buildFamilyMember,
  buildFamilyMemberDetail,
  buildMilestone,
} from '~/test/fixtures';
import { renderRoute } from '~/test/render-route';
import { apiUrl, server } from '~/test/server';

const anna = buildFamilyMember({ id: 1, name: 'Anna' });
const jan = buildFamilyMember({ id: 2, name: 'Jan' });

/** GET /family-members: the parent options both form routes load. */
function useFamilyMembersHandler(familyMembers: FamilyMemberResponse[]) {
  server.use(
    http.get(apiUrl('/family-members'), () => HttpResponse.json(familyMembers)),
  );
}

/** POST /family-members answering `created`, recording each body; GET of the new page. */
function useCreateHandlers(created: FamilyMemberDetailResponse) {
  const requests: unknown[] = [];
  server.use(
    http.post(apiUrl('/family-members'), async ({ request }) => {
      requests.push(await request.json());
      return HttpResponse.json(created, { status: 201 });
    }),
    http.get(apiUrl(`/family-members/${created.id}`), () =>
      HttpResponse.json(created),
    ),
  );
  return requests;
}

/** GET and PATCH /family-members/:id over one stored member (the page refetches after a save). */
function useEditHandlers(familyMember: FamilyMemberDetailResponse) {
  let current = familyMember;
  const requests: unknown[] = [];
  server.use(
    http.get(apiUrl(`/family-members/${familyMember.id}`), () =>
      HttpResponse.json(current),
    ),
    http.patch(
      apiUrl(`/family-members/${familyMember.id}`),
      async ({ request }) => {
        const body = (await request.json()) as Partial<FamilyMemberDetailResponse>;
        requests.push(body);
        current = { ...current, ...body };
        return HttpResponse.json(current);
      },
    ),
  );
  return requests;
}

describe('/family-members/new (new family member)', () => {
  beforeEach(() => {
    useFamilyMembersHandler([anna, jan]);
  });

  it('validates with the shared schema before sending anything', async () => {
    const createHandler = vi.fn(() =>
      HttpResponse.json(buildFamilyMemberDetail(), { status: 201 }),
    );
    server.use(http.post(apiUrl('/family-members'), createHandler));
    const { user } = renderRoute('/family-members/new');

    await user.click(await screen.findByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(createHandler).not.toHaveBeenCalled();
  });

  it('creates a family member with the empty fields as null and opens their page', async () => {
    const created = buildFamilyMemberDetail({ id: 7, name: 'Ola' });
    const requests = useCreateHandlers(created);
    const { user, router } = renderRoute('/family-members/new');

    await user.type(await screen.findByLabelText('Name'), '  Ola  ');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ola' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/family-members/7');
    expect(requests).toEqual([
      {
        name: 'Ola',
        kind: 'human',
        description: null,
        birthDate: null,
        deathDate: null,
        motherId: null,
        fatherId: null,
      },
    ]);
  });

  it('sends the kind, dates and parents', async () => {
    const created = buildFamilyMemberDetail({ id: 8, name: 'Burek' });
    const requests = useCreateHandlers(created);
    const { user } = renderRoute('/family-members/new');

    await user.type(await screen.findByLabelText('Name'), 'Burek');
    await user.click(screen.getByRole('radio', { name: 'Animal' }));
    await user.type(screen.getByLabelText('Date of birth'), '2015-04-01');
    await user.type(screen.getByLabelText('Date of death'), '2024-02-01');
    await user.selectOptions(screen.getByLabelText('Mother'), 'Anna');
    await user.selectOptions(screen.getByLabelText('Father'), 'Jan');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await screen.findByRole('heading', { level: 1, name: 'Burek' });
    expect(requests).toEqual([
      {
        name: 'Burek',
        kind: 'animal',
        description: null,
        birthDate: '2015-04-01',
        deathDate: '2024-02-01',
        motherId: 1,
        fatherId: 2,
      },
    ]);
  });

  it('blocks a death date before the birth date and the same mother and father', async () => {
    const createHandler = vi.fn(() =>
      HttpResponse.json(buildFamilyMemberDetail(), { status: 201 }),
    );
    server.use(http.post(apiUrl('/family-members'), createHandler));
    const { user } = renderRoute('/family-members/new');

    await user.type(await screen.findByLabelText('Name'), 'Ola');
    await user.type(screen.getByLabelText('Date of birth'), '2000-01-02');
    await user.type(screen.getByLabelText('Date of death'), '2000-01-01');
    await user.selectOptions(screen.getByLabelText('Mother'), 'Anna');
    await user.selectOptions(screen.getByLabelText('Father'), 'Anna');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByText(
        'The date of death cannot be before the date of birth',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Date of death')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(
      screen.getByText('Mother and father must be different family members'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Father')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(createHandler).not.toHaveBeenCalled();
  });

  it("shows the api's error key under the mother", async () => {
    server.use(
      http.post(apiUrl('/family-members'), () =>
        HttpResponse.json<ValidationErrorBody>(
          {
            message: 'validation.failed',
            errors: {
              formErrors: [],
              fieldErrors: { motherId: ['validation.familyMember.notFound'] },
            },
          },
          { status: 400 },
        ),
      ),
    );
    const { user } = renderRoute('/family-members/new');

    await user.type(await screen.findByLabelText('Name'), 'Ola');
    await user.selectOptions(screen.getByLabelText('Mother'), 'Anna');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByText('The chosen family member no longer exists'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Mother')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('shows labels and errors in Polish', async () => {
    await setLanguage('pl');
    const { user } = renderRoute('/family-members/new');

    await user.click(await screen.findByRole('button', { name: 'Dodaj' }));

    expect(await screen.findByText('Imię jest wymagane')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Zwierzę' })).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Matka')).getByRole('option', {
        name: 'Nieznana',
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Ojciec')).getByRole('option', {
        name: 'Nieznany',
      }),
    ).toBeInTheDocument();
  });
});

describe('/family-members/$familyMemberId/edit (edit family member)', () => {
  it('pre-selects the parents, leaves the member out of the options and saves', async () => {
    const ola = buildFamilyMemberDetail({
      id: 3,
      name: 'Ola',
      kind: 'human',
      birthDate: '1990-03-01',
      motherId: 1,
      mother: { id: 1, name: 'Anna', kind: 'human' },
    });
    useFamilyMembersHandler([anna, jan, ola]);
    const requests = useEditHandlers(ola);
    const { user, router } = renderRoute('/family-members/3/edit');

    const mother = await screen.findByLabelText('Mother');
    expect(mother).toHaveValue('1');
    expect(screen.getByLabelText('Father')).toHaveValue('');
    expect(screen.getByLabelText('Date of birth')).toHaveValue('1990-03-01');
    expect(
      within(mother).queryByRole('option', { name: 'Ola' }),
    ).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Father'), 'Jan');
    await user.selectOptions(mother, 'Unknown');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ola' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/family-members/3');
    expect(requests).toEqual([
      {
        name: 'Ola',
        kind: 'human',
        description: null,
        birthDate: '1990-03-01',
        deathDate: null,
        motherId: null,
        fatherId: 2,
      },
    ]);
  });

  it('marks cached milestones stale on save (they show participant names)', async () => {
    const ola = buildFamilyMemberDetail({ id: 5, name: 'Ola' });
    useFamilyMembersHandler([ola]);
    useEditHandlers(ola);
    const { user, queryClient } = renderRoute('/family-members/5/edit');
    const milestoneKey = milestoneQueries.detail(9).queryKey;
    queryClient.setQueryData(milestoneKey, buildMilestone({ id: 9 }));

    const name = await screen.findByLabelText('Name');
    await user.clear(name);
    await user.type(name, 'Aleksandra');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await screen.findByRole('heading', { level: 1, name: 'Aleksandra' });
    expect(queryClient.getQueryState(milestoneKey)?.isInvalidated).toBe(true);
  });

  it('cancels back to the family member page', async () => {
    const ola = buildFamilyMemberDetail({ id: 4, name: 'Ola' });
    useFamilyMembersHandler([ola]);
    useEditHandlers(ola);
    const { user, router } = renderRoute('/family-members/4/edit');

    await user.click(await screen.findByRole('link', { name: 'Cancel' }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/family-members/4'),
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ola' }),
    ).toBeInTheDocument();
  });

  it('shows not found when the api answers 404', async () => {
    useFamilyMembersHandler([]);
    server.use(
      http.get(apiUrl('/family-members/999'), () =>
        HttpResponse.json(
          {
            message: 'Family member 999 not found',
            error: 'Not Found',
            statusCode: 404,
          },
          { status: 404 },
        ),
      ),
    );

    renderRoute('/family-members/999/edit');

    expect(
      await screen.findByText('Family member not found.'),
    ).toBeInTheDocument();
  });

  it('shows the not-found page for a malformed id without calling the api', async () => {
    renderRoute('/family-members/abc/edit'); // no handlers: any request would error

    expect(await screen.findByText('Page not found.')).toBeInTheDocument();
  });
});
