import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import {
  createMilestoneRequestSchema,
  type MilestoneResponse,
} from '@time-capsule/shared';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { applyApiErrors } from '~/lib/form-errors';

// The shared request schema, adapted to what the inputs hold: a <textarea> can't hold null,
// so the form keeps '' and submits null (the api would store '' as an empty description).
const milestoneFormSchema = createMilestoneRequestSchema.extend({
  description: z
    .string()
    .transform((value) => (value.trim() === '' ? null : value)),
});

/** What the inputs hold. */
export type MilestoneFormValues = z.input<typeof milestoneFormSchema>;
/** What a valid submit produces; assignable to CreateMilestoneRequest and UpdateMilestoneRequest. */
export type MilestoneFormOutput = z.output<typeof milestoneFormSchema>;

export const emptyMilestoneFormValues: MilestoneFormValues = {
  date: '',
  title: '',
  description: '',
};

export function toMilestoneFormValues(
  milestone: MilestoneResponse,
): MilestoneFormValues {
  return {
    date: milestone.date,
    title: milestone.title,
    description: milestone.description ?? '',
  };
}

type MilestoneFormProps = {
  defaultValues: MilestoneFormValues;
  submitLabel: string;
  /** Throw (e.g. an ApiError) to show the failure in the form. */
  onSubmit: (values: MilestoneFormOutput) => Promise<void>;
};

export function MilestoneForm({
  defaultValues,
  submitLabel,
  onSubmit,
}: MilestoneFormProps) {
  const form = useForm<MilestoneFormValues, unknown, MilestoneFormOutput>({
    resolver: zodResolver(milestoneFormSchema),
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
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError.message}</AlertDescription>
          </Alert>
        )}
        <Controller
          name="date"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="milestone-date">Date</FieldLabel>
              {/* Native date input: gives YYYY-MM-DD or '', exactly the wire format. */}
              <Input
                {...field}
                id="milestone-date"
                type="date"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="title"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="milestone-title">Title</FieldLabel>
              <Input
                {...field}
                id="milestone-title"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="milestone-description">
                Description
              </FieldLabel>
              <Textarea
                {...field}
                id="milestone-description"
                rows={4}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <div className="flex gap-2">
          {/* isSubmitting covers the whole async onSubmit: no double submits. */}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {submitLabel}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/milestones">Cancel</Link>
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
