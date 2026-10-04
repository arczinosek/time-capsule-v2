import { zodResolver } from '@hookform/resolvers/zod';
import {
  createLocationRequestSchema,
  fallbackErrorMap,
  latitudeSchema,
  longitudeSchema,
  type LocationResponse,
} from '@time-capsule/shared';
import type { ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { FieldErrorMessage } from '~/components/field-error-message';
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
import { parseCoordinate, type Point } from './coordinates';
import { LocationPicker } from './lazy-maps';

// Coordinates are typed as text (a decimal comma is fine), then checked by the shared schema.
const coordinateInput = (schema: typeof latitudeSchema) =>
  z.string().transform(parseCoordinate).pipe(schema);

const locationFormSchema = createLocationRequestSchema.extend({
  latitude: coordinateInput(latitudeSchema),
  longitude: coordinateInput(longitudeSchema),
});

/** What the inputs hold. */
export type LocationFormValues = z.input<typeof locationFormSchema>;
/** What a valid submit produces; assignable to both request types. */
export type LocationFormOutput = z.output<typeof locationFormSchema>;

export const emptyLocationFormValues: LocationFormValues = {
  name: '',
  latitude: '',
  longitude: '',
};

export function toLocationFormValues(
  location: LocationResponse,
): LocationFormValues {
  return {
    name: location.name,
    latitude: String(location.latitude),
    longitude: String(location.longitude),
  };
}

/** The point the fields describe, when both are valid coordinates. */
function toPoint(latitude: string, longitude: string): Point | null {
  const parsedLatitude = latitudeSchema.safeParse(parseCoordinate(latitude));
  const parsedLongitude = longitudeSchema.safeParse(parseCoordinate(longitude));
  return parsedLatitude.success && parsedLongitude.success
    ? { latitude: parsedLatitude.data, longitude: parsedLongitude.data }
    : null;
}

type LocationFormProps = {
  defaultValues: LocationFormValues;
  /** Translated text of the submit button. */
  submitLabel: string;
  /** The way out: a Link on a page, a DialogClose in a dialog. */
  cancel: ReactNode;
  /** Throw (e.g. an ApiError) to show the failure in the form. */
  onSubmit: (values: LocationFormOutput) => Promise<void>;
};

export function LocationForm({
  defaultValues,
  submitLabel,
  cancel,
  onSubmit,
}: LocationFormProps) {
  const { t } = useTranslation();
  const translate = useTranslateMessage();
  const form = useForm<LocationFormValues, unknown, LocationFormOutput>({
    resolver: zodResolver(locationFormSchema, { error: fallbackErrorMap }),
    defaultValues,
  });
  const [latitude, longitude] = useWatch({
    control: form.control,
    name: ['latitude', 'longitude'],
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      applyApiErrors(error, form.setError);
    }
  });

  const setPoint = (point: Point) => {
    const options = { shouldValidate: true, shouldDirty: true };
    form.setValue('latitude', String(point.latitude), options);
    form.setValue('longitude', String(point.longitude), options);
  };

  const serverError = form.formState.errors.root?.server;

  return (
    <form
      onSubmit={(event) => {
        // In a dialog the form is portalled out of another form, but React still bubbles the
        // submit to that outer form's onSubmit.
        event.stopPropagation();
        void submit(event);
      }}
      noValidate
    >
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
              <FieldLabel htmlFor="location-name">
                {t('locations.form.name')}
              </FieldLabel>
              <Input
                {...field}
                id="location-name"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              <FieldErrorMessage error={fieldState.error} />
            </Field>
          )}
        />
        <Field>
          <LocationPicker value={toPoint(latitude, longitude)} onChange={setPoint} />
          <FieldDescription>{t('map.pickerHint')}</FieldDescription>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Controller
            name="latitude"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="location-latitude">
                  {t('form.coordinates.latitude')}
                </FieldLabel>
                {/* Text, not type=number: that one rejects a decimal comma in some browsers. */}
                <Input
                  {...field}
                  id="location-latitude"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-describedby="location-coordinates-hint"
                  aria-invalid={fieldState.invalid}
                />
                <FieldErrorMessage error={fieldState.error} />
              </Field>
            )}
          />
          <Controller
            name="longitude"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="location-longitude">
                  {t('form.coordinates.longitude')}
                </FieldLabel>
                <Input
                  {...field}
                  id="location-longitude"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-describedby="location-coordinates-hint"
                  aria-invalid={fieldState.invalid}
                />
                <FieldErrorMessage error={fieldState.error} />
              </Field>
            )}
          />
        </div>
        <FieldDescription id="location-coordinates-hint">
          {t('form.coordinates.hint')}
        </FieldDescription>
        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {submitLabel}
          </Button>
          {cancel}
        </div>
      </FieldGroup>
    </form>
  );
}
