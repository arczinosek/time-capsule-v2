import { FieldError } from '~/components/ui/field';
import { useTranslateMessage } from '~/i18n';

/** shadcn FieldError for a React Hook Form error whose message is an i18n key or raw api text. */
export function FieldErrorMessage({ error }: { error?: { message?: string } }) {
  const translate = useTranslateMessage();
  return error?.message ? (
    <FieldError>{translate(error.message)}</FieldError>
  ) : null;
}
