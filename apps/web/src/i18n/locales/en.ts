import type { MessageKey, MilestoneCategory } from '@time-capsule/shared';

// Every key the contract can send (validation messages, enum slugs) must have text here.
type RequiredKeys = Record<MessageKey | `category.${MilestoneCategory}`, string>;

// The source locale. Flat `<area>.<name>` keys; `{{name}}` placeholders. `as const` keeps the
// literal values, so `t` requires each placeholder's parameter. pl.ts must have the same keys.
export const en = {
  'app.name': 'Time Capsule',
  'language.label': 'Language',

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

  // --- categories (slugs from @time-capsule/shared MILESTONE_CATEGORIES) ---
  'category.life_and_memory': 'Life and memory',
  'category.relationships_and_marriage': 'Relationships and marriage',
  'category.education_and_career': 'Education and career',
  'category.home_and_places': 'Home and places',
  'category.travels_and_adventures': 'Travels and adventures',
  'category.holidays_and_celebrations': 'Holidays and celebrations',
  'category.stories_and_anecdotes': 'Stories and anecdotes',

  // --- markdown ---
  'markdown.write': 'Write',
  'markdown.preview': 'Preview',
  'markdown.emptyPreview': 'Nothing to preview.',

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
  'milestones.form.date': 'Date',
  'milestones.form.title': 'Title',
  'milestones.form.category': 'Category',
  'milestones.form.noCategory': 'No category',
  'milestones.form.description': 'Description',
  'milestones.form.descriptionHint':
    'You can use Markdown: **bold**, *italic*, # heading, - list, [link](https://…).',
} as const satisfies RequiredKeys & Record<string, string>;
