import { createFileRoute, redirect } from '@tanstack/react-router';

// A location has no page of its own (it is a name and a point): /locations/5 opens the editor
// instead of an empty outlet.
export const Route = createFileRoute('/locations/$locationId/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/locations/$locationId/edit',
      params: { locationId: params.locationId },
      replace: true,
    });
  },
});
