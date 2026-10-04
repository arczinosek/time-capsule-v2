import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import {
  createPlaceRequestSchema,
  descriptionSchema,
  fallbackErrorMap,
  idSchema,
  type LocationResponse,
  type PlaceResponse,
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
import {
  NativeSelect,
  NativeSelectOption,
} from '~/components/ui/native-select';
import { CreateLocationDialog } from '~/features/locations/create-location-dialog';
import { useTranslateMessage } from '~/i18n';
import { applyApiErrors } from '~/lib/form-errors';

// The shared request schema, adapted to what the inputs hold. Each replacement is built from
// the shared piece, so its checks still run on the client.
const placeFormSchema = createPlaceRequestSchema.extend({
  description: descriptionSchema.transform((value) =>
    value.trim() === '' ? null : value,
  ),
  // The empty option means "no location".
  locationId: z
    .string()
    .transform((value) => (value === '' ? null : Number(value)))
    .pipe(idSchema.nullable()),
});

/** What the inputs hold. */
export type PlaceFormValues = z.input<typeof placeFormSchema>;
/** What a valid submit produces; assignable to both request types. */
export type PlaceFormOutput = z.output<typeof placeFormSchema>;

export const emptyPlaceFormValues: PlaceFormValues = {
  name: '',
  description: '',
  locationId: '',
};

export function toPlaceFormValues(place: PlaceResponse): PlaceFormValues {
  return {
    name: place.name,
    description: place.description ?? '',
    locationId: place.location === null ? '' : String(place.location.id),
  };
}

type PlaceFormProps = {
  defaultValues: PlaceFormValues;
  /** The location options; those owned by another place are left out. */
  locations: LocationResponse[];
  /** Translated text of the submit button. */
  submitLabel: string;
  /** The place being edited: its own location stays an option, and Cancel goes to its page. */
  placeId?: number;
  /** Throw (e.g. an ApiError) to show the failure in the form. */
  onSubmit: (values: PlaceFormOutput) => Promise<void>;
};

export function PlaceForm({
  defaultValues,
  locations,
  submitLabel,
  placeId,
  onSubmit,
}: PlaceFormProps) {
  const { t } = useTranslation();
  const translate = useTranslateMessage();
  const form = useForm<PlaceFormValues, unknown, PlaceFormOutput>({
    resolver: zodResolver(placeFormSchema, { error: fallbackErrorMap }),
    defaultValues,
  });

  // The api also checks that the location exists and is free; its 400s land on the field.
  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      applyApiErrors(error, form.setError);
    }
  });

  const serverError = form.formState.errors.root?.server;
  const locationOptions = locations.filter(
    ({ place }) => place === null || place.id === placeId,
  );

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
              <FieldLabel htmlFor="place-name">{t('places.form.name')}</FieldLabel>
              <Input
                {...field}
                id="place-name"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              <FieldErrorMessage error={fieldState.error} />
            </Field>
          )}
        />
        <Controller
          name="locationId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="place-location">
                {t('places.form.location')}
              </FieldLabel>
              <div className="flex flex-wrap gap-2">
                <NativeSelect
                  className="min-w-48 flex-1"
                  {...field}
                  id="place-location"
                  aria-invalid={fieldState.invalid}
                >
                  <NativeSelectOption value="">
                    {t('places.form.noLocation')}
                  </NativeSelectOption>
                  {locationOptions.map((location) => (
                    <NativeSelectOption key={location.id} value={String(location.id)}>
                      {location.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <CreateLocationDialog
                  onCreated={(location) =>
                    form.setValue('locationId', String(location.id), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              </div>
              <FieldErrorMessage error={fieldState.error} />
            </Field>
          )}
        />
        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="place-description">
                {t('places.form.description')}
              </FieldLabel>
              <MarkdownEditor
                {...field}
                id="place-description"
                aria-describedby="place-description-hint"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription id="place-description-hint">
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
            {placeId === undefined ? (
              <Link to="/places">{t('common.cancel')}</Link>
            ) : (
              <Link to="/places/$placeId" params={{ placeId }}>
                {t('common.cancel')}
              </Link>
            )}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
