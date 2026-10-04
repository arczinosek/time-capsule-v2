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
      <Languages aria-hidden className="size-4 text-muted-foreground" />
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
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
