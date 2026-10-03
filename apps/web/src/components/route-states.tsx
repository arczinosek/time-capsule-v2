import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { LoaderCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';

// Router-wide defaults (see router.tsx). A route can override any of them.

/** Shown only after defaultPendingMs (1s) while a loader is still running. */
export function RoutePending() {
  return (
    <div className="flex justify-center py-12" role="status" aria-label="Loading">
      <LoaderCircle className="size-6 animate-spin" />
    </div>
  );
}

/** Loader errors (api unreachable, 500, contract drift). 'Try again' re-runs the loaders. */
export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <Alert variant="destructive">
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{error instanceof Error ? error.message : String(error)}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void router.invalidate()}
        >
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function NotFound({ message }: { message: string }) {
  return (
    <div className="space-y-4">
      <p>{message}</p>
      <Button variant="outline" asChild>
        <Link to="/milestones">Back to milestones</Link>
      </Button>
    </div>
  );
}
