import { screen } from '@testing-library/react';
import type { ValidationErrorBody } from '@time-capsule/shared';
import { http, HttpResponse } from 'msw';
import { buildMilestone } from '~/test/fixtures';
import { renderRoute } from '~/test/render-route';
import { apiUrl, server } from '~/test/server';

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

  it('creates a milestone and returns to the list', async () => {
    let sent: unknown;
    const created = buildMilestone({ title: 'First steps' });
    server.use(
      http.post(apiUrl('/milestones'), async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(created, { status: 201 });
      }),
      http.get(apiUrl('/milestones'), () => HttpResponse.json([created])),
    );
    const { user, router } = renderRoute('/milestones/new');

    await user.type(await screen.findByLabelText('Date'), '2024-05-01');
    await user.type(screen.getByLabelText('Title'), '  First steps  ');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('First steps')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/milestones');
    // Trimmed by the shared schema; the empty textarea is sent as null.
    expect(sent).toEqual({
      date: '2024-05-01',
      title: 'First steps',
      description: null,
    });
  });

  it("shows the api's validation errors under the matching fields", async () => {
    server.use(
      http.post(apiUrl('/milestones'), () =>
        HttpResponse.json<ValidationErrorBody>(
          {
            message: 'Validation failed',
            errors: {
              formErrors: [],
              fieldErrors: { title: ['Title is already taken'] },
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
    expect(screen.getByLabelText('Title')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});

describe('/milestones/$milestoneId/edit (edit milestone)', () => {
  it('loads the milestone into the form and saves changes', async () => {
    const milestone = buildMilestone({ id: 7, title: 'First steps' });
    const updated = { ...milestone, title: 'First wobbly steps' };

    let sent: unknown;
    server.use(
      http.get(apiUrl('/milestones/7'), () => HttpResponse.json(milestone)),
      http.patch(apiUrl('/milestones/7'), async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(updated);
      }),
      http.get(apiUrl('/milestones'), () => HttpResponse.json([updated])),
    );

    const { user } = renderRoute('/milestones/7/edit');

    const title = await screen.findByLabelText('Title');
    expect(title).toHaveValue('First steps');

    await user.clear(title);
    await user.type(title, 'First wobbly steps');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('First wobbly steps')).toBeInTheDocument();
    expect(sent).toEqual({
      date: milestone.date,
      title: 'First wobbly steps',
      description: null,
    });
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
