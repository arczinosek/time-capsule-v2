import {
  FAMILY_MEMBER_KINDS,
  MILESTONE_CATEGORIES,
  messages,
} from '@time-capsule/shared';
import { en } from './locales/en';
import { pl } from './locales/pl';

const locales = { en, pl } satisfies Record<string, Record<string, string>>;
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** Placeholder names per base key (plural forms merged), without `count`. */
function placeholders(resources: Record<string, string>): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const [key, value] of Object.entries(resources)) {
    const base = key.replace(PLURAL_SUFFIX, '');
    const names = result.get(base) ?? new Set<string>();
    for (const [, name] of value.matchAll(/{{\s*(\w+)\s*}}/g)) {
      if (name !== 'count') names.add(name);
    }
    result.set(base, names);
  }
  return result;
}

describe('locale resources', () => {
  it.each(Object.entries(locales))('%s has no empty values', (_language, resources) => {
    const expectedEmpty: string[] = [];

    expect(
      Object.entries(resources)
        .filter(([, value]) => value.trim() === '')
        .map(([key]) => key),
    ).toEqual(expectedEmpty);
  });

  it('uses the same placeholders in every language', () => {
    const expectedPlaceholders = placeholders(en);

    expect(placeholders(pl)).toEqual(expectedPlaceholders);
  });

  it.each(Object.entries(locales))(
    '%s has every plural form its language needs',
    (language, resources) => {
      const expectedForms = new Intl.PluralRules(language)
        .resolvedOptions()
        .pluralCategories.toSorted();
      const forms = new Map<string, string[]>();
      for (const key of Object.keys(resources)) {
        const match = PLURAL_SUFFIX.exec(key);
        if (!match) continue;
        const base = key.slice(0, match.index);
        forms.set(base, [...(forms.get(base) ?? []), match[1]!]);
      }

      for (const [, keyForms] of forms) {
        expect(keyForms.toSorted()).toEqual(expectedForms);
      }
    },
  );

  // Repeats the compile-time check at runtime: these keys arrive from the api as data.
  it.each(Object.entries(locales))(
    '%s has text for every contract message and enum slug',
    (_language, resources) => {
      const expectedKeys = [
        ...Object.values(messages),
        ...MILESTONE_CATEGORIES.map((category) => `category.${category}`),
        ...FAMILY_MEMBER_KINDS.map((kind) => `familyMemberKind.${kind}`),
      ];

      for (const key of expectedKeys) {
        expect(Object.hasOwn(resources, key), key).toBe(true);
      }
    },
  );
});
