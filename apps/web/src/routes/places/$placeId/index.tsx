import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { PlaceDetail } from '~/features/places/place-detail';
import { placeQueries } from '~/features/places/queries';

// The loader, params and not-found page live in ./route.tsx.
export const Route = createFileRoute('/places/$placeId/')({
  component: PlacePage,
});

function PlacePage() {
  const { placeId } = Route.useParams();
  const { data: place } = useSuspenseQuery(placeQueries.detail(placeId));
  const navigate = useNavigate();
  return (
    <PlaceDetail place={place} onDeleted={() => navigate({ to: '/places' })} />
  );
}
