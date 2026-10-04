import { createFileRoute, notFound } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { NotFound } from '~/components/route-states';
import { familyMemberQueries } from '~/features/family-members/queries';
import { ApiError } from '~/lib/api-client';
import { toPositiveInt } from '~/lib/route-params';

// Layout for /family-members/$familyMemberId/*: owns the id, the detail loader and the
// not-found page, so the leaf routes (index, edit) only read the cache.
export const Route = createFileRoute('/family-members/$familyMemberId')({
  params: {
    parse: ({ familyMemberId }) => {
      const id = toPositiveInt(familyMemberId);
      return id === false ? false : { familyMemberId: id };
    },
    stringify: ({ familyMemberId }) => ({
      familyMemberId: String(familyMemberId),
    }),
  },
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.query(
        familyMemberQueries.detail(params.familyMemberId),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  notFoundComponent: FamilyMemberNotFound,
});

function FamilyMemberNotFound() {
  const { t } = useTranslation();
  return (
    <NotFound
      message={t('familyMembers.notFound')}
      to="/family-members"
      label={t('familyMembers.backToList')}
    />
  );
}
