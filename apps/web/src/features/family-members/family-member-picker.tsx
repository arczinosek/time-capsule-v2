import { Link } from '@tanstack/react-router';
import type { FamilyMemberResponse } from '@time-capsule/shared';
import { useId, useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '~/components/ui/input';

/**
 * Chooses several family members: a filter over a list of native checkboxes. Each row is a
 * full-width tap target of at least 44 px, and the selection stays visible in place, which
 * suits phones better than a popover combobox or a <select multiple>.
 *
 * Render it inside a <fieldset> whose legend names the choice. Selected members stay selected
 * while the filter hides them.
 */
export function FamilyMemberPicker({
  familyMembers,
  value,
  onChange,
  onBlur,
  ref,
  invalid,
}: {
  familyMembers: FamilyMemberResponse[];
  value: number[];
  onChange: (value: number[]) => void;
  onBlur?: () => void;
  /** Goes to the filter input, so React Hook Form can focus the field. */
  ref?: Ref<HTMLInputElement>;
  invalid?: boolean;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const filterId = useId();

  if (familyMembers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('familyMembers.empty')}{' '}
        <Link to="/family-members/new" className="underline underline-offset-4">
          {t('familyMembers.picker.add')}
        </Link>
      </p>
    );
  }

  const query = filter.trim().toLocaleLowerCase();
  const shown = familyMembers.filter((familyMember) =>
    familyMember.name.toLocaleLowerCase().includes(query),
  );
  const toggle = (id: number, checked: boolean) =>
    onChange(
      checked ? [...value, id] : value.filter((selectedId) => selectedId !== id),
    );

  return (
    <div className="space-y-2">
      <label htmlFor={filterId} className="sr-only">
        {t('familyMembers.picker.search')}
      </label>
      <Input
        ref={ref}
        id={filterId}
        type="search"
        placeholder={t('familyMembers.picker.search')}
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        onBlur={onBlur}
        // Enter in a filter box would submit the whole form.
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault();
        }}
        aria-invalid={invalid}
        autoComplete="off"
      />
      {shown.length > 0 ? (
        <ul className="max-h-72 overflow-y-auto rounded-lg border">
          {shown.map((familyMember) => (
            <li key={familyMember.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3">
                <input
                  type="checkbox"
                  className="size-5 accent-primary"
                  checked={value.includes(familyMember.id)}
                  onChange={(event) =>
                    toggle(familyMember.id, event.target.checked)
                  }
                />
                <span>{familyMember.name}</span>
                {/* A visual hint only: the checkbox is named by the name alone. */}
                <span
                  aria-hidden
                  className="ml-auto text-sm text-muted-foreground"
                >
                  {t(`familyMemberKind.${familyMember.kind}`)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('familyMembers.picker.noMatches')}
        </p>
      )}
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t('familyMembers.picker.selected', { count: value.length })}
      </p>
    </div>
  );
}
