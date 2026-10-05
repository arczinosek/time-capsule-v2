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
  'nav.main': 'Nawigacja główna',
  'nav.skipToContent': 'Przejdź do treści',
  'nav.chronicle': 'Kronika',
  'nav.familyMembers': 'Rodzina',
  'nav.places': 'Miejsca',

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
  'validation.name.required': 'Imię jest wymagane',
  'validation.name.tooLong': 'Imię może mieć najwyżej 255 znaków',
  'validation.familyMemberKind.invalid': 'Wybierz: człowiek czy zwierzę',
  'validation.deathDate.beforeBirth':
    'Data śmierci nie może być wcześniejsza niż data urodzenia',
  'validation.parents.same': 'Matka i ojciec muszą być różnymi członkami rodziny',
  'validation.parent.self': 'Członek rodziny nie może być swoim własnym rodzicem',
  'validation.familyMember.notFound': 'Wybrany członek rodziny już nie istnieje',
  'validation.placeName.required': 'Nazwa jest wymagana',
  'validation.placeName.tooLong': 'Nazwa może mieć najwyżej 255 znaków',
  'validation.latitude.invalid': 'Podaj szerokość geograficzną od -90 do 90',
  'validation.longitude.invalid': 'Podaj długość geograficzną od -180 do 180',
  'validation.location.notFound': 'Wybrana lokalizacja już nie istnieje',
  'validation.location.taken': 'Ta lokalizacja należy już do innego miejsca',
  'validation.media.targetInvalid':
    'Zdjęcia mogą należeć tylko do wydarzenia lub członka rodziny',
  'validation.media.contentTypeInvalid':
    'Dozwolone są tylko obrazy JPEG, PNG, WebP i GIF',
  'validation.media.empty': 'Plik jest pusty',
  'validation.media.tooLarge': 'Plik jest za duży (maks. 20 MB)',
  'validation.media.capMilestone': 'Wydarzenie może mieć najwyżej 10 zdjęć',
  'validation.media.capFamilyMember': 'Członek rodziny może mieć najwyżej 100 zdjęć',
  'validation.media.notFound': 'Wybrane zdjęcie już nie istnieje',
  'validation.media.notReady': 'Wybrane zdjęcie nie zostało jeszcze przesłane',
  'validation.media.duplicate': 'Zdjęcie występuje na liście więcej niż raz',
  'validation.media.uploadInvalid':
    'Przesłany plik jest nieprawidłowy lub nie dotarł do magazynu plików',
  'validation.media.stale':
    'Zdjęcia zmieniły się w międzyczasie. Odświeżono, spróbuj ponownie.',

  // --- categories (slugs from @time-capsule/shared MILESTONE_CATEGORIES) ---
  'category.life_and_memory': 'Życie i wspomnienia',
  'category.relationships_and_marriage': 'Związki i małżeństwo',
  'category.education_and_career': 'Edukacja i kariera',
  'category.home_and_places': 'Dom i miejsca',
  'category.travels_and_adventures': 'Podróże i przygody',
  'category.holidays_and_celebrations': 'Święta i uroczystości',
  'category.stories_and_anecdotes': 'Historie i anegdoty',

  // --- family member kinds (slugs from @time-capsule/shared FAMILY_MEMBER_KINDS) ---
  'familyMemberKind.human': 'Człowiek',
  'familyMemberKind.animal': 'Zwierzę',

  // --- markdown ---
  'markdown.write': 'Pisz',
  'markdown.preview': 'Podgląd',
  'markdown.emptyPreview': 'Nic do podglądu.',
  'markdown.hint':
    'Możesz używać Markdown: **pogrubienie**, *kursywa*, # nagłówek, - lista, [link](https://…).',

  // --- maps (Leaflet + OpenStreetMap) ---
  'map.picker': 'Mapa do wyboru punktu',
  'map.pickerHint': 'Kliknij lub dotknij mapy, aby ustawić punkt, albo wpisz współrzędne.',
  'map.preview': 'Mapa: {{name}}',
  'map.marker': 'Wybrany punkt',
  'map.zoomIn': 'Przybliż',
  'map.zoomOut': 'Oddal',
  'map.attribution':
    '&copy; <a href="https://www.openstreetmap.org/copyright">autorzy OpenStreetMap</a>',
  'map.attributionPrefix':
    '<a href="https://leafletjs.com" title="Biblioteka JavaScript do map interaktywnych">Leaflet</a>',
  'map.openInOsm': 'Otwórz w OpenStreetMap',
  'form.coordinates.latitude': 'Szerokość geograficzna',
  'form.coordinates.longitude': 'Długość geograficzna',
  'form.coordinates.hint': 'Stopnie dziesiętne, np. 50,061698. Kropka też działa.',

  // --- media (photos) ---
  'media.title': 'Zdjęcia',
  'media.count': '{{count}} / {{max}}',
  'media.empty': 'Brak zdjęć.',
  'media.add': 'Dodaj zdjęcia',
  'media.hint': 'JPEG, PNG, WebP lub GIF, do 20 MB każdy.',
  'media.full': 'Osiągnięto limit zdjęć.',
  'media.uploading': 'Przesyłanie: {{name}}',
  'media.dismissLabel': 'Ukryj błąd pliku {{name}}',
  'media.alt': 'Zdjęcie {{index}}: {{label}}',
  'media.loadFailed': 'Nie można wczytać zdjęcia.',
  'media.moveEarlier': 'Przesuń zdjęcie {{index}} wcześniej',
  'media.moveLater': 'Przesuń zdjęcie {{index}} dalej',
  'media.removeLabel': 'Usuń zdjęcie {{index}}',
  'media.removeTitle': 'Usunąć to zdjęcie?',
  'media.removeDescription':
    'Zdjęcie zniknie z tego miejsca. Jeśli nie jest użyte nigdzie indziej, zostanie trwale usunięte.',
  'media.remove': 'Usuń',
  'media.library': 'Wybierz z biblioteki',
  'media.libraryTitle': 'Biblioteka zdjęć',
  'media.libraryDescription': 'Zdjęcia z całej kroniki. Wybierz jedno, aby je tu dodać.',
  'media.libraryEmpty': 'Brak innych zdjęć w bibliotece.',
  'media.libraryPick': 'Dodaj zdjęcie {{index}} z biblioteki',
  'media.upload.tooLarge': 'Plik jest za duży (maks. 20 MB).',
  'media.upload.empty': 'Plik jest pusty.',
  'media.upload.expired': 'Link do przesyłania wygasł. Spróbuj ponownie.',
  'media.upload.network':
    'Nie można połączyć się z magazynem plików. Czy działa i czy jego CORS zezwala na adres tej strony?',
  'media.upload.failed': 'Magazyn plików odrzucił plik ({{code}}).',

  // --- lightbox (an enlarged photo) ---
  'lightbox.open': 'Powiększ zdjęcie {{index}}: {{label}}',
  'lightbox.title': 'Zdjęcie {{current}} z {{total}}: {{label}}',
  'lightbox.counter': '{{current}} / {{total}}',
  'lightbox.previous': 'Poprzednie zdjęcie',
  'lightbox.next': 'Następne zdjęcie',
  'lightbox.close': 'Zamknij',

  // --- timeline (/milestones) ---
  'timeline.title': 'Kronika',
  'timeline.yearNav': 'Przejdź do roku',
  'timeline.familyMembers': 'Uczestnicy: {{names}}',
  'timeline.moreFamilyMembers': 'i jeszcze {{count}}',
  'timeline.photos_one': '{{count}} zdjęcie',
  'timeline.photos_few': '{{count}} zdjęcia',
  'timeline.photos_many': '{{count}} zdjęć',
  'timeline.photos_other': '{{count}} zdjęcia',

  // --- milestones ---
  'milestones.new': 'Nowe wydarzenie',
  'milestones.edit': 'Edytuj wydarzenie',
  'milestones.empty': 'Nie ma jeszcze żadnych wydarzeń.',
  'milestones.notFound': 'Nie znaleziono wydarzenia.',
  'milestones.backToList': 'Wróć do wydarzeń',
  'milestones.deleteLabel': 'Usuń {{title}}',
  'milestones.deleteTitle': 'Usunąć „{{title}}”?',
  'milestones.deleteDescription': 'Tej operacji nie można cofnąć.',
  'milestones.noDescription': 'Brak opisu.',
  'milestones.participants': 'Uczestnicy',
  'milestones.where': 'Gdzie',
  'milestones.form.date': 'Data',
  'milestones.form.title': 'Tytuł',
  'milestones.form.category': 'Kategoria',
  'milestones.form.noCategory': 'Bez kategorii',
  'milestones.form.description': 'Opis',
  'milestones.form.familyMembers': 'Uczestnicy',
  'milestones.form.location': 'Gdzie',
  'milestones.form.noLocation': 'Nie podano',
  'milestones.form.places': 'Miejsca',
  'milestones.form.locations': 'Inne lokalizacje',

  // --- family members ---
  'familyMembers.title': 'Członkowie rodziny',
  'familyMembers.new': 'Nowy członek rodziny',
  'familyMembers.edit': 'Edytuj członka rodziny',
  'familyMembers.empty': 'Nie ma jeszcze żadnych członków rodziny.',
  'familyMembers.notFound': 'Nie znaleziono członka rodziny.',
  'familyMembers.backToList': 'Wróć do członków rodziny',
  'familyMembers.deleteLabel': 'Usuń {{name}}',
  'familyMembers.deleteTitle': 'Usunąć {{name}}?',
  'familyMembers.deleteDescription':
    'Tej operacji nie można cofnąć. Zniknie z wydarzeń, a dzieci stracą tego rodzica.',
  'familyMembers.noDescription': 'Brak opisu.',
  'familyMembers.born': 'ur. {{date}}',
  'familyMembers.died': 'zm. {{date}}',
  'familyMembers.parents': 'Rodzice',
  'familyMembers.mother': 'Matka',
  'familyMembers.father': 'Ojciec',
  'familyMembers.unknownMother': 'Nieznana',
  'familyMembers.unknownFather': 'Nieznany',
  'familyMembers.children': 'Dzieci',
  'familyMembers.noChildren': 'Brak.',
  'familyMembers.milestones': 'Wydarzenia',
  'familyMembers.noMilestones': 'Nie bierze jeszcze udziału w żadnym wydarzeniu.',
  'familyMembers.form.name': 'Imię',
  'familyMembers.form.kind': 'Rodzaj',
  'familyMembers.form.birthDate': 'Data urodzenia',
  'familyMembers.form.deathDate': 'Data śmierci',
  'familyMembers.form.description': 'Opis',
  'familyMembers.picker.search': 'Szukaj członków rodziny',
  'familyMembers.picker.selected': 'Wybrano: {{count}}',
  'familyMembers.picker.noMatches': 'Nikt nie pasuje do wyszukiwania.',
  'familyMembers.picker.add': 'Dodaj członka rodziny',

  // --- places ---
  'places.title': 'Miejsca',
  'places.subnav': 'Miejsca i lokalizacje',
  'places.new': 'Nowe miejsce',
  'places.edit': 'Edytuj miejsce',
  'places.empty': 'Nie ma jeszcze żadnych miejsc.',
  'places.notFound': 'Nie znaleziono miejsca.',
  'places.backToList': 'Wróć do miejsc',
  'places.deleteLabel': 'Usuń {{name}}',
  'places.deleteTitle': 'Usunąć „{{name}}”?',
  'places.deleteDescription':
    'Tej operacji nie można cofnąć. Jego lokalizacja i wydarzenia w niej zostaną.',
  'places.noDescription': 'Brak opisu.',
  'places.noLocation': 'Brak lokalizacji.',
  'places.milestones': 'Wydarzenia w tym miejscu',
  'places.noMilestones': 'Nie ma tu jeszcze żadnych wydarzeń.',
  'places.form.name': 'Nazwa',
  'places.form.location': 'Lokalizacja',
  'places.form.noLocation': 'Bez lokalizacji',
  'places.form.description': 'Opis',

  // --- locations ---
  'locations.title': 'Lokalizacje',
  'locations.new': 'Nowa lokalizacja',
  'locations.newDescription': 'Ustaw punkt na mapie albo wpisz jego współrzędne.',
  'locations.edit': 'Edytuj lokalizację',
  'locations.empty': 'Nie ma jeszcze żadnych lokalizacji.',
  'locations.notFound': 'Nie znaleziono lokalizacji.',
  'locations.backToList': 'Wróć do lokalizacji',
  'locations.editLabel': 'Edytuj {{name}}',
  'locations.deleteLabel': 'Usuń {{name}}',
  'locations.deleteTitle': 'Usunąć „{{name}}”?',
  'locations.deleteDescription':
    'Tej operacji nie można cofnąć. Miejsca i wydarzenia w tej lokalizacji stracą ją.',
  'locations.place': 'Miejsce:',
  'locations.form.name': 'Nazwa',
} as const satisfies Translation<typeof en, 'one' | 'few' | 'many' | 'other'>;
