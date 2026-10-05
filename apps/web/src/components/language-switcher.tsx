import { Languages } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { isLanguage, setLanguage, useLanguage } from '~/i18n';

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const language = useLanguage();
  const id = useId();
  return (
    <div className="flex items-center gap-1.5">
      <Languages aria-hidden className="size-4 text-brass-ink" />
      <label htmlFor={id} className="sr-only">
        {t('language.label')}
      </label>
      <select
        id={id}
        value={language}
        onChange={(event) => {
          const next = event.target.value;
          if (isLanguage(next)) void setLanguage(next);
        }}
        className="h-9 rounded-sm border border-input bg-card px-2 font-heading text-sm tracking-wide text-foreground"
      >
        {/* Endonyms: each language named in itself, so they are never translated. */}
        <option value="en" lang="en">
          English
        </option>
        <option value="pl" lang="pl">
          Polski
        </option>
      </select>
    </div>
  );
}
