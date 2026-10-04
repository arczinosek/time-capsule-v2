/**
 * For a route's params.parse: the id as a number, or false for anything but a positive integer,
 * so /milestones/abc falls through to the not-found page instead of calling the api.
 */
export function toPositiveInt(value: string): number | false {
  return /^[1-9]\d*$/.test(value) ? Number(value) : false;
}
