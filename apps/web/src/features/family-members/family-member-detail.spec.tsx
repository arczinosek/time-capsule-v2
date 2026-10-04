import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { milestoneQueries } from '~/features/milestones/queries';
import { setLanguage } from '~/i18n';
import { buildFamilyMemberDetail, buildMilestone } from '~/test/fixtures';
import { renderRoute } from '~/test/render-route';
import { apiUrl, server } from '~/test/server';

describe('/family-members/$familyMemberId (family member page)', () => {
  const ola = buildFamilyMemberDetail({
    id: 5,
    name: 'Ola',
    birthDate: '1990-03-01',
    description: 'Loves **horses**.',
    motherId: 1,
    fatherId: 2,
    mother: { id: 1, name: 'Anna', kind: 'human' },
    father: { id: 2, name: 'Jan', kind: 'human' },
    children: [{ id: 8, name: 'Burek', kind: 'animal' }],
    milestones: [
      {
        id: 9,
        date: '1990-06-01',
        title: 'Christening',
        category: 'holidays_and_celebrations',
      },
    ],
  });

  it('shows the parents, children and milestones as links', async () => {
    server.use(
      http.get(apiUrl('/family-members/5'), () => HttpResponse.json(ola)),
    );

    renderRoute('/family-members/5');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ola' }),
    ).toBeInTheDocument();
    expect(screen.getByText('b. 1 March 1990')).toHaveAttribute(
      'datetime',
      '1990-03-01',
    );
    expect(screen.getByRole('link', { name: 'Anna' })).toHaveAttribute(
      'href',
      '/family-members/1',
    );
    expect(screen.getByRole('link', { name: 'Jan' })).toHaveAttribute(
      'href',
      '/family-members/2',
    );
    expect(screen.getByRole('link', { name: 'Burek' })).toHaveAttribute(
      'href',
      '/family-members/8',
    );
    expect(screen.getByRole('link', { name: 'Christening' })).toHaveAttribute(
      'href',
      '/milestones/9',
    );
    expect(screen.getByText('1 June 1990')).toBeInTheDocument();
    expect(
      await screen.findByText('horses', { selector: 'strong' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/family-members/5/edit',
    );
  });

  it('shows unknown parents and empty sections in Polish', async () => {
    server.use(
      http.get(apiUrl('/family-members/6'), () =>
        HttpResponse.json(
          buildFamilyMemberDetail({ id: 6, name: 'Ada', birthDate: '2024-05-01' }),
        ),
      ),
    );
    await setLanguage('pl');

    renderRoute('/family-members/6');

    expect(await screen.findByText('ur. 1 maja 2024')).toBeInTheDocument();
    expect(screen.getByText('Nieznana')).toBeInTheDocument();
    expect(screen.getByText('Nieznany')).toBeInTheDocument();
    expect(screen.getByText('Brak.')).toBeInTheDocument();
    expect(
      screen.getByText('Nie bierze jeszcze udziału w żadnym wydarzeniu.'),
    ).toBeInTheDocument();
  });

  it('deletes after confirming and returns to the list', async () => {
    const getHandler = vi.fn(() => HttpResponse.json(ola));
    server.use(
      http.get(apiUrl('/family-members/5'), getHandler),
      http.delete(
        apiUrl('/family-members/5'),
        () => new HttpResponse(null, { status: 204 }),
      ),
      http.get(apiUrl('/family-members'), () => HttpResponse.json([])),
    );
    const { user, router } = renderRoute('/family-members/5');

    await user.click(await screen.findByRole('button', { name: 'Delete Ola' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Delete Ola?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('No family members yet.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/family-members');
    expect(getHandler).toHaveBeenCalledTimes(1);
  });

  it('marks cached milestones stale on delete (they list their participants)', async () => {
    server.use(
      http.get(apiUrl('/family-members/5'), () => HttpResponse.json(ola)),
      http.delete(
        apiUrl('/family-members/5'),
        () => new HttpResponse(null, { status: 204 }),
      ),
      http.get(apiUrl('/family-members'), () => HttpResponse.json([])),
    );
    const { user, queryClient } = renderRoute('/family-members/5');
    const milestoneKey = milestoneQueries.detail(9).queryKey;
    queryClient.setQueryData(milestoneKey, buildMilestone({ id: 9 }));

    await user.click(await screen.findByRole('button', { name: 'Delete Ola' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await screen.findByText('No family members yet.');
    expect(queryClient.getQueryState(milestoneKey)?.isInvalidated).toBe(true);
  });

  it('shows not found when the api answers 404', async () => {
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

    renderRoute('/family-members/999');

    expect(
      await screen.findByText('Family member not found.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Back to family members' }),
    ).toHaveAttribute('href', '/family-members');
  });

  it('shows the not-found page for a malformed id without calling the api', async () => {
    renderRoute('/family-members/abc'); // no handlers: any request would error

    expect(await screen.findByText('Page not found.')).toBeInTheDocument();
  });
});
