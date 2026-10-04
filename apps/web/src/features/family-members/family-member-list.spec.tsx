import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setLanguage } from '~/i18n';
import { buildFamilyMember, buildMilestone } from '~/test/fixtures';
import { renderRoute } from '~/test/render-route';
import { apiUrl, server } from '~/test/server';

describe('/family-members (family members list)', () => {
  it('lists family members with their kind and life dates, linking to their pages', async () => {
    server.use(
      http.get(apiUrl('/family-members'), () =>
        HttpResponse.json([
          buildFamilyMember({
            id: 1,
            name: 'Anna',
            birthDate: '1950-05-03',
            deathDate: '2020-02-01',
          }),
          buildFamilyMember({ id: 2, name: 'Burek', kind: 'animal' }),
        ]),
      ),
    );

    renderRoute('/family-members');

    expect(await screen.findByRole('link', { name: 'Anna' })).toHaveAttribute(
      'href',
      '/family-members/1',
    );
    expect(screen.getByText('b. 3 May 1950')).toHaveAttribute(
      'datetime',
      '1950-05-03',
    );
    expect(screen.getByText('d. 1 February 2020')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Burek' })).toBeInTheDocument();
    expect(screen.getByText('Animal')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'New family member' }),
    ).toHaveAttribute('href', '/family-members/new');
  });

  it('shows the life dates and kind in Polish', async () => {
    server.use(
      http.get(apiUrl('/family-members'), () =>
        HttpResponse.json([
          buildFamilyMember({ name: 'Anna', birthDate: '1950-05-03' }),
        ]),
      ),
    );
    await setLanguage('pl');

    renderRoute('/family-members');

    expect(await screen.findByText('ur. 3 maja 1950')).toBeInTheDocument();
    expect(screen.getByText(/Człowiek/)).toBeInTheDocument();
  });

  it('says when there are no family members yet', async () => {
    server.use(http.get(apiUrl('/family-members'), () => HttpResponse.json([])));

    renderRoute('/family-members');

    expect(
      await screen.findByText('No family members yet.'),
    ).toBeInTheDocument();
  });

  it('is linked from the header', async () => {
    server.use(
      http.get(apiUrl('/milestones'), () => HttpResponse.json([buildMilestone()])),
      http.get(apiUrl('/family-members'), () =>
        HttpResponse.json([buildFamilyMember({ name: 'Anna' })]),
      ),
    );
    const { user, router } = renderRoute('/milestones');

    await user.click(await screen.findByRole('link', { name: 'Family' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Family members' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/family-members');
  });
});
