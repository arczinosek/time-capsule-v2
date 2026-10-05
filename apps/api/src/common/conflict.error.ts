import type { MessageKey } from '@time-capsule/shared';

// Application-layer error for a request that is valid but clashes with the current state
// (e.g. an owner already at its photo cap). Services throw it with an i18n key;
// ConflictErrorFilter answers 409 with Nest's ConflictException body, whose `message` (the key)
// the web translates.
export class ConflictError extends Error {
  override name = 'ConflictError';

  constructor(readonly key: MessageKey) {
    super(key);
  }
}
