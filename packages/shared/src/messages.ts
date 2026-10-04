import { z } from 'zod';

// Every validation message in the contract is one of these i18n keys, never prose: the api
// sends them in its 400 bodies and the web translates them (apps/web/src/i18n/locales).
// Messages carry no interpolation parameters, so limits are written into the translated text.
// A new key needs EN and PL text in the web locales, which the web type-check enforces.
export const messages = {
  invalid: 'validation.invalid',
  failed: 'validation.failed',
  atLeastOneField: 'validation.atLeastOneField',
  dateInvalid: 'validation.date.invalid',
  titleRequired: 'validation.title.required',
  titleTooLong: 'validation.title.tooLong',
  descriptionTooLong: 'validation.description.tooLong',
  categoryInvalid: 'validation.category.invalid',
  nameRequired: 'validation.name.required',
  nameTooLong: 'validation.name.tooLong',
  familyMemberKindInvalid: 'validation.familyMemberKind.invalid',
  deathBeforeBirth: 'validation.deathDate.beforeBirth',
  sameParents: 'validation.parents.same',
  ownParent: 'validation.parent.self',
  familyMemberNotFound: 'validation.familyMember.notFound',
} as const;

export type MessageKey = (typeof messages)[keyof typeof messages];

/**
 * Per-parse fallback for issues whose check has no key of its own (e.g. a number where a string
 * belongs). Pass it to every parse that reports to a user: `safeParse(v, { error: fallbackErrorMap })`
 * in the api pipe, `zodResolver(schema, { error: fallbackErrorMap })` in web forms.
 */
export const fallbackErrorMap: z.core.$ZodErrorMap = () => messages.invalid;
