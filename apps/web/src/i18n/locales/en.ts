import type {
  FamilyMemberKind,
  MessageKey,
  MilestoneCategory,
} from '@time-capsule/shared';

// Every key the contract can send (validation messages, enum slugs) must have text here.
type RequiredKeys = Record<
  | MessageKey
  | `category.${MilestoneCategory}`
  | `familyMemberKind.${FamilyMemberKind}`,
  string
>;

// The source locale. Flat `<area>.<name>` keys; `{{name}}` placeholders. `as const` keeps the
// literal values, so `t` requires each placeholder's parameter. pl.ts must have the same keys.
export const en = {
  'app.name': 'Time Capsule',
  'language.label': 'Language',
  'nav.familyMembers': 'Family',
  'nav.places': 'Places',

  // --- common ---
  'common.cancel': 'Cancel',
  'common.create': 'Create',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.loading': 'Loading',
  'common.save': 'Save',
  'common.tryAgain': 'Try again',

  // --- errors ---
  'error.title': 'Something went wrong',
  'error.network':
    "Cannot reach the api. Is it running, and does its CORS_ORIGIN match this page's origin?",
  'error.unexpected': 'The server answered with an error. Try again.',
  'error.notFound': 'This item no longer exists.',
  'error.pageNotFound': 'Page not found.',

  // --- validation (keys owned by @time-capsule/shared messages.ts) ---
  'validation.invalid': 'Invalid value',
  'validation.failed': 'Check the highlighted fields',
  'validation.atLeastOneField': 'At least one field must be provided',
  'validation.date.invalid': 'Enter a valid date',
  'validation.title.required': 'Title is required',
  'validation.title.tooLong': 'Title must be at most 255 characters',
  'validation.description.tooLong': 'Description is too long (max 64 KB of text)',
  'validation.category.invalid': 'Choose a category from the list',
  'validation.name.required': 'Name is required',
  'validation.name.tooLong': 'Name must be at most 255 characters',
  'validation.familyMemberKind.invalid': 'Choose human or animal',
  'validation.deathDate.beforeBirth':
    'The date of death cannot be before the date of birth',
  'validation.parents.same': 'Mother and father must be different family members',
  'validation.parent.self': 'A family member cannot be their own parent',
  'validation.familyMember.notFound': 'The chosen family member no longer exists',
  'validation.placeName.required': 'Name is required',
  'validation.placeName.tooLong': 'Name must be at most 255 characters',
  'validation.latitude.invalid': 'Enter a latitude from -90 to 90',
  'validation.longitude.invalid': 'Enter a longitude from -180 to 180',
  'validation.location.notFound': 'The chosen location no longer exists',
  'validation.location.taken': 'This location already belongs to another place',

  // --- categories (slugs from @time-capsule/shared MILESTONE_CATEGORIES) ---
  'category.life_and_memory': 'Life and memory',
  'category.relationships_and_marriage': 'Relationships and marriage',
  'category.education_and_career': 'Education and career',
  'category.home_and_places': 'Home and places',
  'category.travels_and_adventures': 'Travels and adventures',
  'category.holidays_and_celebrations': 'Holidays and celebrations',
  'category.stories_and_anecdotes': 'Stories and anecdotes',

  // --- family member kinds (slugs from @time-capsule/shared FAMILY_MEMBER_KINDS) ---
  'familyMemberKind.human': 'Human',
  'familyMemberKind.animal': 'Animal',

  // --- markdown ---
  'markdown.write': 'Write',
  'markdown.preview': 'Preview',
  'markdown.emptyPreview': 'Nothing to preview.',
  'markdown.hint':
    'You can use Markdown: **bold**, *italic*, # heading, - list, [link](https://…).',

  // --- maps (Leaflet + OpenStreetMap) ---
  'map.picker': 'Map for choosing the point',
  'map.pickerHint': 'Click or tap the map to set the point, or type the coordinates.',
  'map.preview': 'Map of {{name}}',
  'map.marker': 'Chosen point',
  'map.zoomIn': 'Zoom in',
  'map.zoomOut': 'Zoom out',
  // HTML: Leaflet renders it in the attribution control. Keep the OSM copyright link.
  'map.attribution':
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  'map.openInOsm': 'Open in OpenStreetMap',
  'form.coordinates.latitude': 'Latitude',
  'form.coordinates.longitude': 'Longitude',
  'form.coordinates.hint': 'Decimal degrees, e.g. 50.061698. A comma works too.',

  // --- milestones ---
  'milestones.title': 'Milestones',
  'milestones.new': 'New milestone',
  'milestones.edit': 'Edit milestone',
  'milestones.empty': 'No milestones yet.',
  'milestones.notFound': 'Milestone not found.',
  'milestones.backToList': 'Back to milestones',
  'milestones.editLabel': 'Edit {{title}}',
  'milestones.deleteLabel': 'Delete {{title}}',
  'milestones.deleteTitle': 'Delete {{title}}?',
  'milestones.deleteDescription': "This can't be undone.",
  'milestones.noDescription': 'No description.',
  'milestones.participants': 'Participants',
  'milestones.where': 'Where',
  'milestones.form.date': 'Date',
  'milestones.form.title': 'Title',
  'milestones.form.category': 'Category',
  'milestones.form.noCategory': 'No category',
  'milestones.form.description': 'Description',
  'milestones.form.familyMembers': 'Participants',
  'milestones.form.location': 'Where',
  'milestones.form.noLocation': 'Not set',
  'milestones.form.places': 'Places',
  'milestones.form.locations': 'Other locations',

  // --- family members ---
  'familyMembers.title': 'Family members',
  'familyMembers.new': 'New family member',
  'familyMembers.edit': 'Edit family member',
  'familyMembers.empty': 'No family members yet.',
  'familyMembers.notFound': 'Family member not found.',
  'familyMembers.backToList': 'Back to family members',
  'familyMembers.deleteLabel': 'Delete {{name}}',
  'familyMembers.deleteTitle': 'Delete {{name}}?',
  'familyMembers.deleteDescription':
    "This can't be undone. They will be removed from milestones, and their children will lose this parent.",
  'familyMembers.noDescription': 'No description.',
  'familyMembers.born': 'b. {{date}}',
  'familyMembers.died': 'd. {{date}}',
  'familyMembers.parents': 'Parents',
  'familyMembers.mother': 'Mother',
  'familyMembers.father': 'Father',
  'familyMembers.unknownMother': 'Unknown',
  'familyMembers.unknownFather': 'Unknown',
  'familyMembers.children': 'Children',
  'familyMembers.noChildren': 'None.',
  'familyMembers.milestones': 'Milestones',
  'familyMembers.noMilestones': 'Not in any milestone yet.',
  'familyMembers.form.name': 'Name',
  'familyMembers.form.kind': 'Kind',
  'familyMembers.form.birthDate': 'Date of birth',
  'familyMembers.form.deathDate': 'Date of death',
  'familyMembers.form.description': 'Description',
  'familyMembers.picker.search': 'Search family members',
  'familyMembers.picker.selected': 'Selected: {{count}}',
  'familyMembers.picker.noMatches': 'No family member matches.',
  'familyMembers.picker.add': 'Add a family member',

  // --- places ---
  'places.title': 'Places',
  'places.subnav': 'Places and locations',
  'places.new': 'New place',
  'places.edit': 'Edit place',
  'places.empty': 'No places yet.',
  'places.notFound': 'Place not found.',
  'places.backToList': 'Back to places',
  'places.deleteLabel': 'Delete {{name}}',
  'places.deleteTitle': 'Delete {{name}}?',
  'places.deleteDescription':
    "This can't be undone. Its location and the milestones there stay.",
  'places.noDescription': 'No description.',
  'places.noLocation': 'No location.',
  'places.milestones': 'Milestones here',
  'places.noMilestones': 'No milestones here yet.',
  'places.form.name': 'Name',
  'places.form.location': 'Location',
  'places.form.noLocation': 'No location',
  'places.form.description': 'Description',

  // --- locations ---
  'locations.title': 'Locations',
  'locations.new': 'New location',
  'locations.newDescription': 'Set the point on the map or type its coordinates.',
  'locations.edit': 'Edit location',
  'locations.empty': 'No locations yet.',
  'locations.notFound': 'Location not found.',
  'locations.backToList': 'Back to locations',
  'locations.editLabel': 'Edit {{name}}',
  'locations.deleteLabel': 'Delete {{name}}',
  'locations.deleteTitle': 'Delete {{name}}?',
  'locations.deleteDescription':
    "This can't be undone. Places and milestones at this location will lose it.",
  'locations.place': 'Place:',
  'locations.form.name': 'Name',
} as const satisfies RequiredKeys & Record<string, string>;
