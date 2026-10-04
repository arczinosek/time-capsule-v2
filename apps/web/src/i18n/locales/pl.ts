import type { en } from './en';

type PluralSuffix = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
type ExpandPlural<K, Forms extends PluralSuffix> =
  K extends `${infer Base}_${PluralSuffix}` ? `${Base}_${Forms}` : K;
/** Exactly Source's keys, with each plural key expanded to this locale's CLDR categories. */
type Translation<Source, Forms extends PluralSuffix> = Record<
  ExpandPlural<keyof Source & string, Forms>,
  string
>;

// A missing, extra or misspelled key, or a missing plural form, is a compile error.
export const pl = {
  'app.name': 'Kapsuła czasu',
  'language.label': 'Język',

  // --- common ---
  'common.cancel': 'Anuluj',
  'common.create': 'Dodaj',
  'common.delete': 'Usuń',
  'common.edit': 'Edytuj',
  'common.loading': 'Wczytywanie',
  'common.save': 'Zapisz',
  'common.tryAgain': 'Spróbuj ponownie',

  // --- errors ---
  'error.title': 'Coś poszło nie tak',
  'error.network':
    'Nie można połączyć się z api. Czy działa i czy jego CORS_ORIGIN zgadza się z adresem tej strony?',
  'error.unexpected': 'Serwer odpowiedział błędem. Spróbuj ponownie.',
  'error.notFound': 'Ten element już nie istnieje.',
  'error.pageNotFound': 'Nie znaleziono strony.',

  // --- validation (keys owned by @time-capsule/shared messages.ts) ---
  'validation.invalid': 'Nieprawidłowa wartość',
  'validation.failed': 'Popraw zaznaczone pola',
  'validation.atLeastOneField': 'Podaj co najmniej jedno pole do zmiany',
  'validation.date.invalid': 'Podaj prawidłową datę',
  'validation.title.required': 'Tytuł jest wymagany',
  'validation.title.tooLong': 'Tytuł może mieć najwyżej 255 znaków',
  'validation.description.tooLong': 'Opis jest za długi (maks. 64 KB tekstu)',
  'validation.category.invalid': 'Wybierz kategorię z listy',

  // --- categories (slugs from @time-capsule/shared MILESTONE_CATEGORIES) ---
  'category.life_and_memory': 'Życie i wspomnienia',
  'category.relationships_and_marriage': 'Związki i małżeństwo',
  'category.education_and_career': 'Edukacja i kariera',
  'category.home_and_places': 'Dom i miejsca',
  'category.travels_and_adventures': 'Podróże i przygody',
  'category.holidays_and_celebrations': 'Święta i uroczystości',
  'category.stories_and_anecdotes': 'Historie i anegdoty',

  // --- markdown ---
  'markdown.write': 'Pisz',
  'markdown.preview': 'Podgląd',
  'markdown.emptyPreview': 'Nic do podglądu.',

  // --- milestones ---
  'milestones.title': 'Wydarzenia',
  'milestones.new': 'Nowe wydarzenie',
  'milestones.edit': 'Edytuj wydarzenie',
  'milestones.empty': 'Nie ma jeszcze żadnych wydarzeń.',
  'milestones.notFound': 'Nie znaleziono wydarzenia.',
  'milestones.backToList': 'Wróć do wydarzeń',
  'milestones.editLabel': 'Edytuj {{title}}',
  'milestones.deleteLabel': 'Usuń {{title}}',
  'milestones.deleteTitle': 'Usunąć „{{title}}”?',
  'milestones.deleteDescription': 'Tej operacji nie można cofnąć.',
  'milestones.noDescription': 'Brak opisu.',
  'milestones.form.date': 'Data',
  'milestones.form.title': 'Tytuł',
  'milestones.form.category': 'Kategoria',
  'milestones.form.noCategory': 'Bez kategorii',
  'milestones.form.description': 'Opis',
  'milestones.form.descriptionHint':
    'Możesz używać Markdown: **pogrubienie**, *kursywa*, # nagłówek, - lista, [link](https://…).',
} as const satisfies Translation<typeof en, 'one' | 'few' | 'many' | 'other'>;
