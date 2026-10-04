import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import {
  deathAfterBirth,
  descriptionSchema,
  distinctParents,
  fallbackErrorMap,
  FAMILY_MEMBER_KINDS,
  familyMemberFieldsSchema,
  idSchema,
  isoDateSchema,
  type FamilyMemberResponse,
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
  FieldLegend,
  FieldSet,
} from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '~/components/ui/native-select';
import { useTranslateMessage } from '~/i18n';
import { applyApiErrors } from '~/lib/form-errors';

const blankToNull = (value: string) => (value.trim() === '' ? null : value);

// Inputs can't hold null: an empty date input or the "unknown" option is '', submitted as null.
const optionalDate = z.string().transform(blankToNull).pipe(isoDateSchema.nullable());
const parentId = z
  .string()
  .transform((value) => (value === '' ? null : Number(value)))
  .pipe(idSchema.nullable());

// The shared fields, adapted to what the inputs hold, plus the shared cross-field rules. Each
// replacement is built from the shared piece, so its checks still run on the client.
const familyMemberFormSchema = familyMemberFieldsSchema
  .extend({
    description: descriptionSchema.transform(blankToNull),
    birthDate: optionalDate,
    deathDate: optionalDate,
    motherId: parentId,
    fatherId: parentId,
  })
  .refine(...deathAfterBirth)
  .refine(...distinctParents);

/** What the inputs hold. */
export type FamilyMemberFormValues = z.input<typeof familyMemberFormSchema>;
/** What a valid submit produces; assignable to both request types. */
export type FamilyMemberFormOutput = z.output<typeof familyMemberFormSchema>;

export const emptyFamilyMemberFormValues: FamilyMemberFormValues = {
  name: '',
  kind: 'human',
  description: '',
  birthDate: '',
  deathDate: '',
  motherId: '',
  fatherId: '',
};

export function toFamilyMemberFormValues(
  familyMember: FamilyMemberResponse,
): FamilyMemberFormValues {
  return {
    name: familyMember.name,
    kind: familyMember.kind,
    description: familyMember.description ?? '',
    birthDate: familyMember.birthDate ?? '',
    deathDate: familyMember.deathDate ?? '',
    motherId: familyMember.motherId === null ? '' : String(familyMember.motherId),
    fatherId: familyMember.fatherId === null ? '' : String(familyMember.fatherId),
  };
}

type FamilyMemberFormProps = {
  defaultValues: FamilyMemberFormValues;
  /** The parent options. */
  familyMembers: FamilyMemberResponse[];
  /** Translated text of the submit button. */
  submitLabel: string;
  /** The family member being edited: not a parent option, and Cancel goes back to their page. */
  familyMemberId?: number;
  /** Throw (e.g. an ApiError) to show the failure in the form. */
  onSubmit: (values: FamilyMemberFormOutput) => Promise<void>;
};

export function FamilyMemberForm({
  defaultValues,
  familyMembers,
  submitLabel,
  familyMemberId,
  onSubmit,
}: FamilyMemberFormProps) {
  const { t } = useTranslation();
  const translate = useTranslateMessage();
  const form = useForm<FamilyMemberFormValues, unknown, FamilyMemberFormOutput>({
    resolver: zodResolver(familyMemberFormSchema, { error: fallbackErrorMap }),
    defaultValues,
  });

  // The api also checks what needs the database (parents exist, not one's own parent); its
  // 400s land on the same fields.
  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      applyApiErrors(error, form.setError);
    }
  });

  const serverError = form.formState.errors.root?.server;
  const parentOptions = familyMembers.filter(({ id }) => id !== familyMemberId);

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        {serverError?.message && (
          <Alert variant="destructive">
            <AlertDescription>{translate(serverError.message)}</AlertDescription>
          </Alert>
        )}
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="family-member-name">
                {t('familyMembers.form.name')}
              </FieldLabel>
              <Input
                {...field}
                id="family-member-name"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              <FieldErrorMessage error={fieldState.error} />
            </Field>
          )}
        />
        <Controller
          name="kind"
          control={form.control}
          render={({ field, fieldState }) => (
            <FieldSet data-invalid={fieldState.invalid}>
              <FieldLegend variant="label">
                {t('familyMembers.form.kind')}
              </FieldLegend>
              {/* Native radios: no Radix RadioGroup (it needs ResizeObserver in jsdom). */}
              <div className="flex gap-6">
                {FAMILY_MEMBER_KINDS.map((kind, index) => (
                  <label
                    key={kind}
                    className="flex min-h-11 cursor-pointer items-center gap-2"
                  >
                    <input
                      ref={index === 0 ? field.ref : undefined}
                      type="radio"
                      name={field.name}
                      value={kind}
                      checked={field.value === kind}
                      onChange={() => field.onChange(kind)}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                      className="size-5 accent-primary"
                    />
                    {t(`familyMemberKind.${kind}`)}
                  </label>
                ))}
              </div>
              <FieldErrorMessage error={fieldState.error} />
            </FieldSet>
          )}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Controller
            name="birthDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="family-member-birth-date">
                  {t('familyMembers.form.birthDate')}
                </FieldLabel>
                <Input
                  {...field}
                  id="family-member-birth-date"
                  type="date"
                  aria-invalid={fieldState.invalid}
                />
                <FieldErrorMessage error={fieldState.error} />
              </Field>
            )}
          />
          <Controller
            name="deathDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="family-member-death-date">
                  {t('familyMembers.form.deathDate')}
                </FieldLabel>
                <Input
                  {...field}
                  id="family-member-death-date"
                  type="date"
                  aria-invalid={fieldState.invalid}
                />
                <FieldErrorMessage error={fieldState.error} />
              </Field>
            )}
          />
          <Controller
            name="motherId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="family-member-mother">
                  {t('familyMembers.mother')}
                </FieldLabel>
                <NativeSelect
                  className="w-full"
                  {...field}
                  id="family-member-mother"
                  aria-invalid={fieldState.invalid}
                >
                  <NativeSelectOption value="">
                    {t('familyMembers.unknownMother')}
                  </NativeSelectOption>
                  {parentOptions.map((option) => (
                    <NativeSelectOption
                      key={option.id}
                      value={String(option.id)}
                    >
                      {option.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldErrorMessage error={fieldState.error} />
              </Field>
            )}
          />
          <Controller
            name="fatherId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="family-member-father">
                  {t('familyMembers.father')}
                </FieldLabel>
                <NativeSelect
                  className="w-full"
                  {...field}
                  id="family-member-father"
                  aria-invalid={fieldState.invalid}
                >
                  <NativeSelectOption value="">
                    {t('familyMembers.unknownFather')}
                  </NativeSelectOption>
                  {parentOptions.map((option) => (
                    <NativeSelectOption
                      key={option.id}
                      value={String(option.id)}
                    >
                      {option.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldErrorMessage error={fieldState.error} />
              </Field>
            )}
          />
        </div>
        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="family-member-description">
                {t('familyMembers.form.description')}
              </FieldLabel>
              <MarkdownEditor
                {...field}
                id="family-member-description"
                aria-describedby="family-member-description-hint"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription id="family-member-description-hint">
                {t('markdown.hint')}
              </FieldDescription>
              <FieldErrorMessage error={fieldState.error} />
            </Field>
          )}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {submitLabel}
          </Button>
          <Button variant="outline" asChild>
            {familyMemberId === undefined ? (
              <Link to="/family-members">{t('common.cancel')}</Link>
            ) : (
              <Link
                to="/family-members/$familyMemberId"
                params={{ familyMemberId }}
              >
                {t('common.cancel')}
              </Link>
            )}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
