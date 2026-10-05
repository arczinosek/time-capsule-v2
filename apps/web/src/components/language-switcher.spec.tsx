import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { buildMilestone } from '~/test/fixtures';
import { renderRoute } from '~/test/render-route';
import { apiUrl, server } from '~/test/server';

describe('LanguageSwitcher', () => {
  it('switches the whole page to Polish and remembers the choice', async () => {
    server.use(
      http.get(apiUrl('/milestones'), () =>
        HttpResponse.json([
          buildMilestone({ date: '2024-05-01', category: 'life_and_memory' }),
        ]),
      ),
    );
    const { user } = renderRoute('/milestones');

    expect(await screen.findByText('1 May 2024')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Chronicle' })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('lang', 'en');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Language' }),
      'pl',
    );

    expect(await screen.findByText('1 maja 2024')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Kronika' })).toBeInTheDocument();
    expect(screen.getByText(/Życie i wspomnienia/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kapsuła czasu' })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('lang', 'pl');
    expect(localStorage.getItem('time-capsule.language')).toBe('pl');
    expect(screen.getByRole('combobox', { name: 'Język' })).toHaveValue('pl');
  });

  it('names each language in itself', async () => {
    server.use(http.get(apiUrl('/milestones'), () => HttpResponse.json([])));
    renderRoute('/milestones');

    const options = await screen.findAllByRole('option');

    expect(
      options.map((option) => [option.textContent, option.getAttribute('lang')]),
    ).toEqual([
      ['English', 'en'],
      ['Polski', 'pl'],
    ]);
  });
});
