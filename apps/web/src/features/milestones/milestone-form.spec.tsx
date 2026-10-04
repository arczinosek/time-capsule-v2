import { screen, waitFor } from '@testing-library/react';
import type {
  MilestoneResponse,
  ValidationErrorBody,
} from '@time-capsule/shared';
import { http, HttpResponse } from 'msw';
import { setLanguage } from '~/i18n';
import { buildMilestone } from '~/test/fixtures';
import { renderRoute } from '~/test/render-route';
import { apiUrl, server } from '~/test/server';

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
    renderRoute('/milestones/abc/edit'); // no handlers: any request would error

    expect(await screen.findByText('Page not found.')).toBeInTheDocument();
  });
});
