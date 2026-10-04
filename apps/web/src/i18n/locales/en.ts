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
  'milestones.form.date': 'Date',
  'milestones.form.title': 'Title',
  'milestones.form.category': 'Category',
  'milestones.form.noCategory': 'No category',
  'milestones.form.description': 'Description',
  'milestones.form.familyMembers': 'Participants',

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
} as const satisfies RequiredKeys & Record<string, string>;
