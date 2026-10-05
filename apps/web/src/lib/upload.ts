// The one request that doesn't go through apiRequest(): the browser sends the file straight to
// the storage server (S3 API), with the presigned POST the api answered to POST /media.
// XMLHttpRequest because fetch() reports no upload progress. React- and i18n-free, like
// api-client.ts: errors carry an i18n key, translated at render.

/** What the UI shows for a failed storage upload. */
export type StorageUploadErrorKey =
  | 'media.upload.tooLarge'
  | 'media.upload.empty'
  | 'media.upload.expired'
  | 'media.upload.network'
  | 'media.upload.failed';

/**
 * The storage server refused the file (`status` and its S3 error `code`), or could not be
 * reached (`status` 0). `key` is the i18n key; `media.upload.failed` takes `{{code}}`.
 */
export class StorageUploadError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly key: StorageUploadErrorKey;

  constructor(status: number, code: string | undefined, s3Message?: string) {
    super(
      status === 0
        ? 'Cannot reach the storage server. Is it running, and does its bucket CORS allow this origin?'
        : `Storage upload failed with status ${status}${code ? ` (${code})` : ''}`,
    );
    this.name = 'StorageUploadError';
    this.status = status;
    this.code = code;
    this.key = toKey(status, code, s3Message);
  }
}

function toKey(
  status: number,
  code: string | undefined,
  s3Message: string | undefined,
): StorageUploadErrorKey {
  if (status === 0) return 'media.upload.network';
  if (code === 'EntityTooLarge') return 'media.upload.tooLarge';
  if (code === 'EntityTooSmall') return 'media.upload.empty';
  if (
    code === 'RequestTimeTooSkewed' ||
    (code === 'AccessDenied' && /expired/i.test(s3Message ?? ''))
  ) {
    return 'media.upload.expired';
  }
  return 'media.upload.failed';
}

/** The `<Code>` and `<Message>` of an S3 XML error body. */
function parseS3Error(body: string): { code?: string; message?: string } {
  return {
    code: /<Code>([^<]*)<\/Code>/.exec(body)?.[1],
    message: /<Message>([^<]*)<\/Message>/.exec(body)?.[1],
  };
}

/**
 * POSTs `file` to the storage server. `onProgress` gets 0..1, and 1 once storage has accepted
 * the file. Rejects with StorageUploadError.
 */
export function uploadToStorage({
  url,
  fields,
  file,
  onProgress,
}: {
  url: string;
  fields: Record<string, string>;
  file: Blob;
  onProgress?: (fraction: number) => void;
}): Promise<void> {
  // Exactly the presigned fields, in their order, then the file last (S3 ignores fields after
  // it). Nothing else: storage rejects any field its signed policy doesn't list.
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  form.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    // An upload listener makes this a preflighted CORS request; the bucket CORS answers it.
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve();
        return;
      }
      const { code, message } = parseS3Error(xhr.responseText);
      reject(new StorageUploadError(xhr.status, code, message));
    };
    // Unreachable, or CORS refused: the browser doesn't say which.
    xhr.onerror = () => reject(new StorageUploadError(0, undefined));
    xhr.send(form);
  });
}
