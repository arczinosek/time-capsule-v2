import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { buildMilestone } from '~/test/fixtures';
import { renderRoute } from '~/test/render-route';
import { apiUrl, server } from '~/test/server';

describe('/milestones (milestones list)', () => {
  it('redirects / here and lists the milestones', async () => {
    server.use(
      http.get(apiUrl('/milestones'), () =>
        HttpResponse.json([
          buildMilestone({
            title: 'First steps',
            date: '2024-05-01',
            description: 'Wobbly but proud.',
            category: 'life_and_memory',
          }),
        ]),
      ),
    );

    const { router } = renderRoute('/');

    expect(await screen.findByText('First steps')).toBeInTheDocument();
    expect(await screen.findByText('Wobbly but proud.')).toBeInTheDocument();
    expect(screen.getByText('1 May 2024')).toHaveAttribute(
      'datetime',
      '2024-05-01',
    );
    expect(screen.getByText(/Life and memory/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/milestones');
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

  it('deletes a milestone after confirmation', async () => {
    let milestones = [buildMilestone({ id: 1, title: 'First steps' })];
    server.use(
      http.get(apiUrl('/milestones'), () => HttpResponse.json(milestones)),
      http.delete(apiUrl('/milestones/:id'), ({ params }) => {
        milestones = milestones.filter((m) => m.id !== Number(params.id));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderRoute('/milestones');

    await user.click(
      await screen.findByRole('button', { name: 'Delete First steps' }),
    );
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('No milestones yet.')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
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
