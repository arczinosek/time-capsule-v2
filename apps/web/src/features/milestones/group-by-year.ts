export type YearGroup<T> = { year: string; items: T[] };

/**
 * Groups items by the year of their `YYYY-MM-DD` date, keeping the input order (the api's:
 * newest first) for both the years and the items in each. The year is sliced from the string,
 * never parsed into a Date, so no time zone can move an item to another year.
 */
export function groupByYear<T extends { date: string }>(
  items: readonly T[],
): YearGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const year = item.date.slice(0, 4);
    const group = groups.get(year);
    if (group) group.push(item);
    else groups.set(year, [item]);
  }
  return [...groups].map(([year, yearItems]) => ({ year, items: yearItems }));
}
