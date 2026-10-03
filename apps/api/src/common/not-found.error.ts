// Application-layer error for a missing resource. Services throw it instead of Nest's
// NotFoundException; NotFoundErrorFilter turns it into the HTTP 404.
export class NotFoundError extends Error {
  override name = 'NotFoundError';
}
