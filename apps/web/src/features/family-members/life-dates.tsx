import { useTranslation } from 'react-i18next';
import { useLanguage } from '~/i18n';
import { formatDate } from '~/lib/dates';

/** 'b. 3 May 1950 · d. 1 February 2020'; nothing when both dates are unknown. */
export function LifeDates({
  birthDate,
  deathDate,
}: {
  birthDate: string | null;
  deathDate: string | null;
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  if (!birthDate && !deathDate) return null;
  return (
    <span>
      {birthDate && (
        <time dateTime={birthDate}>
          {t('familyMembers.born', { date: formatDate(birthDate, language) })}
        </time>
      )}
      {birthDate && deathDate && ' · '}
      {deathDate && (
        <time dateTime={deathDate}>
          {t('familyMembers.died', { date: formatDate(deathDate, language) })}
        </time>
      )}
    </span>
  );
}
