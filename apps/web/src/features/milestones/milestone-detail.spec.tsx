import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setLanguage } from '~/i18n';
import { buildMilestone } from '~/test/fixtures';
import { renderRoute } from '~/test/render-route';
import { apiUrl, server } from '~/test/server';

describe('/milestones/$milestoneId (milestone page)', () => {
  it('shows the title, date, category and the Markdown description', async () => {
    server.use(
      http.get(apiUrl('/milestones/7'), () =>
        HttpResponse.json(
          buildMilestone({
            id: 7,
            title: 'Seaside trip',
            date: '2024-05-01',
            category: 'travels_and_adventures',
            description: '# The beach\n\nWe were **proud**.',
          }),
        ),
      ),
    );

    renderRoute('/milestones/7');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Seaside trip' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 May 2024')).toHaveAttribute(
      'datetime',
      '2024-05-01',
    );
    expect(screen.getByText(/Travels and adventures/)).toBeInTheDocument();
    // Markdown headings sit below the page's <h1>.
    expect(
      await screen.findByRole('heading', { level: 2, name: 'The beach' }),
    ).toBeInTheDocument();
    expect(screen.getByText('proud', { selector: 'strong' })).toBeInTheDocument();
  });

  it('shows the date and category in Polish', async () => {
    server.use(
      http.get(apiUrl('/milestones/7'), () =>
        HttpResponse.json(
          buildMilestone({
            id: 7,
            date: '2024-05-01',
            category: 'travels_and_adventures',
          }),
        ),
      ),
    );
    await setLanguage('pl');

    renderRoute('/milestones/7');

    expect(await screen.findByText('1 maja 2024')).toBeInTheDocument();
    expect(screen.getByText(/Podróże i przygody/)).toBeInTheDocument();
    expect(screen.getByText('Brak opisu.')).toBeInTheDocument();
  });

  it('says when there is no description', async () => {
    server.use(
      http.get(apiUrl('/milestones/7'), () =>
        HttpResponse.json(buildMilestone({ id: 7, description: null })),
      ),
    );

    renderRoute('/milestones/7');

    expect(await screen.findByText('No description.')).toBeInTheDocument();
  });

  it('links to the edit page', async () => {
    server.use(
      http.get(apiUrl('/milestones/7'), () =>
        HttpResponse.json(buildMilestone({ id: 7 })),
      ),
    );

    renderRoute('/milestones/7');

    expect(await screen.findByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/milestones/7/edit',
    );
  });

  it('deletes after confirming and returns to the list without refetching itself', async () => {
    const getHandler = vi.fn(() =>
      HttpResponse.json(buildMilestone({ id: 7, title: 'First steps' })),
    );
    server.use(
      http.get(apiUrl('/milestones/7'), getHandler),
      http.delete(
        apiUrl('/milestones/7'),
        () => new HttpResponse(null, { status: 204 }),
      ),
      http.get(apiUrl('/milestones'), () => HttpResponse.json([])),
    );
    const { user, router } = renderRoute('/milestones/7');

    await user.click(
      await screen.findByRole('button', { name: 'Delete First steps' }),
    );
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('No milestones yet.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/milestones');
    expect(getHandler).toHaveBeenCalledTimes(1);
  });

  it('shows not found when the api answers 404', async () => {
    server.use(
      http.get(apiUrl('/milestones/999'), () =>
        HttpResponse.json(
          { message: 'Milestone 999 not found', error: 'Not Found', statusCode: 404 },
          { status: 404 },
        ),
      ),
    );

    renderRoute('/milestones/999');

    expect(await screen.findByText('Milestone not found.')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Back to milestones' }),
    ).toHaveAttribute('href', '/milestones');
  });

  it('shows the not-found page for a malformed id without calling the api', async () => {
    renderRoute('/milestones/abc'); // no handlers: any request would error

    expect(await screen.findByText('Page not found.')).toBeInTheDocument();
  });
});
