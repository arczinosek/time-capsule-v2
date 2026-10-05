import { groupByYear } from './group-by-year';

describe('groupByYear', () => {
  it('returns no groups for no items', () => {
    expect(groupByYear([])).toEqual([]);
  });

  it('keeps the input order of the years and of the items in each', () => {
    const items = [
      { id: 1, date: '2024-05-01' },
      { id: 2, date: '2024-01-10' },
      { id: 3, date: '2023-12-31' },
      { id: 4, date: '2021-01-01' },
    ];

    const expectedGroups = [
      { year: '2024', items: [items[0], items[1]] },
      { year: '2023', items: [items[2]] },
      { year: '2021', items: [items[3]] },
    ];
    expect(groupByYear(items)).toEqual(expectedGroups);
  });

  it('merges a year that comes back later into its first group', () => {
    const items = [
      { id: 1, date: '2024-05-01' },
      { id: 2, date: '2023-05-01' },
      { id: 3, date: '2024-01-01' },
    ];

    const expectedGroups = [
      { year: '2024', items: [items[0], items[2]] },
      { year: '2023', items: [items[1]] },
    ];
    expect(groupByYear(items)).toEqual(expectedGroups);
  });

  it('takes the year from the string, so year boundaries never shift', () => {
    // As Dates at midnight UTC, both would fall in 2023 west of Greenwich.
    const items = [{ date: '2024-01-01' }, { date: '2023-12-31' }];

    expect(groupByYear(items).map(({ year }) => year)).toEqual(['2024', '2023']);
  });
});
