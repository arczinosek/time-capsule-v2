import {
  Link,
  useRouter,
  type ErrorComponentProps,
  type LinkProps,
} from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { IconBack, IconHourglass } from '~/components/icons/action-icons';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import { useTranslateMessage } from '~/i18n';
import { toErrorMessage } from '~/lib/api-client';

// Router-wide defaults (see router.tsx). A route can override any of them.

/** Shown only after defaultPendingMs (1s) while a loader is still running. */
export function RoutePending() {
  const { t } = useTranslation();
  return (
    <div
      className="flex justify-center py-12"
      role="status"
      aria-label={t('common.loading')}
    >
      <IconHourglass className="size-7 text-brass-ink motion-safe:animate-pulse" />
    </div>
  );
}

/** Loader errors (api unreachable, 500, contract drift). 'Try again' re-runs the loaders. */
export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const translate = useTranslateMessage();
  return (
    <Alert variant="destructive">
      <AlertTitle>{t('error.title')}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{translate(toErrorMessage(error))}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void router.invalidate()}
        >
          {t('common.tryAgain')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/** A not-found message with a way back. Callers pass translated text. */
export function NotFound({
  message,
  to,
  label,
}: {
  message: string;
  to: LinkProps['to'];
  label: string;
}) {
  return (
    <div className="space-y-4 py-6">
      <p className="text-lg">{message}</p>
      <Button variant="outline" asChild>
        <Link to={to}>
          <IconBack />
          {label}
        </Link>
      </Button>
    </div>
  );
}

/** Unknown URLs, and ids rejected by a route's params.parse. */
export function PageNotFound() {
  const { t } = useTranslation();
  return (
    <NotFound
      message={t('error.pageNotFound')}
      to="/milestones"
      label={t('milestones.backToList')}
    />
  );
}
