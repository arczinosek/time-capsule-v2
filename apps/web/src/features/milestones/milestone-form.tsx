import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import {
  createMilestoneRequestSchema,
  descriptionSchema,
  fallbackErrorMap,
  MILESTONE_CATEGORIES,
  milestoneCategorySchema,
  type MilestoneResponse,
} from '@time-capsule/shared';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { FieldErrorMessage } from '~/components/field-error-message';
import { MarkdownEditor } from '~/components/markdown-editor';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { useTranslateMessage } from '~/i18n';
import { applyApiErrors } from '~/lib/form-errors';

// The shared request schema, adapted to what the inputs hold. Each replacement is built from
// the shared piece, so its checks (the description's byte limit) still run on the client.
const milestoneFormSchema = createMilestoneRequestSchema.extend({
  // A <textarea> can't hold null: the form keeps '' and submits null.
  description: descriptionSchema.transform((value) =>
    value.trim() === '' ? null : value,
  ),
  // A <select> can't hold null either: the empty option means "no category".
  category: z
    .union([z.literal(''), milestoneCategorySchema])
    .transform((value) => (value === '' ? null : value)),
});

/** What the inputs hold. */
export type MilestoneFormValues = z.input<typeof milestoneFormSchema>;
/** What a valid submit produces; assignable to CreateMilestoneRequest and UpdateMilestoneRequest. */
export type MilestoneFormOutput = z.output<typeof milestoneFormSchema>;

export const emptyMilestoneFormValues: MilestoneFormValues = {
  date: '',
  title: '',
  description: '',
  category: '',
};

export function toMilestoneFormValues(
  milestone: MilestoneResponse,
): MilestoneFormValues {
  return {
    date: milestone.date,
    title: milestone.title,
    description: milestone.description ?? '',
    category: milestone.category ?? '',
  };
}

type MilestoneFormProps = {
  defaultValues: MilestoneFormValues;
  /** Translated text of the submit button. */
  submitLabel: string;
  /** The milestone being edited: Cancel goes back to its page instead of the list. */
  milestoneId?: number;
  /** Throw (e.g. an ApiError) to show the failure in the form. */
  onSubmit: (values: MilestoneFormOutput) => Promise<void>;
};

const selectClassName =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30';

export function MilestoneForm({
  defaultValues,
  submitLabel,
  milestoneId,
  onSubmit,
}: MilestoneFormProps) {
  const { t } = useTranslation();
  const translate = useTranslateMessage();
  const form = useForm<MilestoneFormValues, unknown, MilestoneFormOutput>({
    // fallbackErrorMap: an issue without its own key still gets one, never zod's English text.
    resolver: zodResolver(milestoneFormSchema, { error: fallbackErrorMap }),
    defaultValues,
  });

  // handleSubmit calls this only when the shared schema passes on the client. The api
  // re-validates with the same schema; its 400s land on the same fields.
  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      applyApiErrors(error, form.setError);
    }
  });

  const serverError = form.formState.errors.root?.server;

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        {serverError?.message && (
          <Alert variant="destructive">
            <AlertDescription>{translate(serverError.message)}</AlertDescription>
          </Alert>
        )}
        <Controller
          name="date"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="milestone-date">
                {t('milestones.form.date')}
              </FieldLabel>
              {/* Native date input: gives YYYY-MM-DD or '', exactly the wire format. */}
              <Input
                {...field}
                id="milestone-date"
                type="date"
                aria-invalid={fieldState.invalid}
              />
              <FieldErrorMessage error={fieldState.error} />
            </Field>
          )}
        />
        <Controller
          name="title"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="milestone-title">
                {t('milestones.form.title')}
              </FieldLabel>
              <Input
                {...field}
                id="milestone-title"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              <FieldErrorMessage error={fieldState.error} />
            </Field>
          )}
        />
        <Controller
          name="category"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="milestone-category">
                {t('milestones.form.category')}
              </FieldLabel>
              {/* Native select: works with keyboards, screen readers and mobile pickers. */}
              <select
                {...field}
                id="milestone-category"
                className={selectClassName}
                aria-invalid={fieldState.invalid}
              >
                <option value="">{t('milestones.form.noCategory')}</option>
                {MILESTONE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {t(`category.${category}`)}
                  </option>
                ))}
              </select>
              <FieldErrorMessage error={fieldState.error} />
            </Field>
          )}
        />
        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="milestone-description">
                {t('milestones.form.description')}
              </FieldLabel>
              <MarkdownEditor
                {...field}
                id="milestone-description"
                aria-describedby="milestone-description-hint"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription id="milestone-description-hint">
                {t('milestones.form.descriptionHint')}
              </FieldDescription>
              <FieldErrorMessage error={fieldState.error} />
            </Field>
          )}
        />
        <div className="flex gap-2">
          {/* isSubmitting covers the whole async onSubmit: no double submits. */}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {submitLabel}
          </Button>
          <Button variant="outline" asChild>
            {milestoneId === undefined ? (
              <Link to="/milestones">{t('common.cancel')}</Link>
            ) : (
              <Link to="/milestones/$milestoneId" params={{ milestoneId }}>
                {t('common.cancel')}
              </Link>
            )}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
