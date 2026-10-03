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
            description: 'Wobbly but proud.',
          }),
        ]),
      ),
    );

    const { router } = renderRoute('/');

    expect(await screen.findByText('First steps')).toBeInTheDocument();
    expect(screen.getByText('Wobbly but proud.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/milestones');
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

    expect(await screen.findByText(/Cannot reach/)).toHaveTextContent(
      'http://api.test/milestones',
    );
    expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument();
  });
});
