import { StorageUploadError, uploadToStorage } from './upload';

// Not MSW: its XMLHttpRequest interceptor turns the request into a Node fetch Request, which
// can't read jsdom's FormData (TypeError: reading '_buffer'). A stand-in XMLHttpRequest
// captures what upload.ts sends and answers like the storage server would.

const STORAGE_URL = 'http://storage.test/time-capsule-media';

const fields = {
  bucket: 'time-capsule-media',
  'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
  'X-Amz-Credential': 'key/20261004/us-east-1/s3/aws4_request',
  'X-Amz-Date': '20261004T100000Z',
  key: 'media/2f1c',
  Policy: 'eyJjb25kaXRpb25zIjpbXX0=',
  'X-Amz-Signature': 'abc',
  'Content-Type': 'image/png',
};

const s3Error = (code: string, message = '') =>
  `<?xml version="1.0" encoding="UTF-8"?><Error><Code>${code}</Code><Message>${message}</Message></Error>`;

class FakeXMLHttpRequest {
  static last: FakeXMLHttpRequest | undefined;
  method = '';
  url = '';
  body: FormData | undefined;
  status = 0;
  responseText = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readonly upload: {
    onprogress: ((event: Partial<ProgressEvent>) => void) | null;
  } = { onprogress: null };

  constructor() {
    FakeXMLHttpRequest.last = this;
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  send(body: FormData) {
    this.body = body;
  }

  /** Storage answers. */
  respond(status: number, responseText = '') {
    this.status = status;
    this.responseText = responseText;
    this.onload?.();
  }
}

function sent(): FakeXMLHttpRequest {
  const xhr = FakeXMLHttpRequest.last;
  if (!xhr) throw new Error('no request was sent');
  return xhr;
}

function upload(onProgress?: (fraction: number) => void) {
  return uploadToStorage({
    url: STORAGE_URL,
    fields,
    file: new File(['png'], 'photo.png', { type: 'image/png' }),
    onProgress,
  });
}

async function rejectionOf(promise: Promise<unknown>): Promise<StorageUploadError> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  if (!(error instanceof StorageUploadError)) {
    throw new Error(`expected a StorageUploadError, got ${String(error)}`);
  }
  return error;
}

describe('uploadToStorage', () => {
  beforeEach(() => {
    FakeXMLHttpRequest.last = undefined;
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs exactly the presigned fields in order, then the file, and reports progress', async () => {
    const onProgress = vi.fn();
    const expectedNames = [...Object.keys(fields), 'file'];

    const done = upload(onProgress);
    const xhr = sent();
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 4 });
    xhr.respond(204);
    await done;

    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe(STORAGE_URL);
    expect([...xhr.body!.keys()]).toEqual(expectedNames);
    expect(xhr.body!.get('Content-Type')).toBe('image/png');
    expect(xhr.body!.get('file')).toBeInstanceOf(File);
    expect(onProgress.mock.calls).toEqual([[0.25], [1]]);
  });

  it.each([
    [400, 'EntityTooLarge', '', 'media.upload.tooLarge'],
    [400, 'EntityTooSmall', '', 'media.upload.empty'],
    [403, 'AccessDenied', 'Request has expired', 'media.upload.expired'],
    [403, 'RequestTimeTooSkewed', '', 'media.upload.expired'],
  ])('maps a %i %s to %s', async (status, code, message, expectedKey) => {
    const done = upload();
    sent().respond(status, s3Error(code, message));

    const error = await rejectionOf(done);

    expect(error.key).toBe(expectedKey);
    expect(error.status).toBe(status);
  });

  it('keeps the code of any other refusal for the generic message', async () => {
    const done = upload();
    sent().respond(403, s3Error('AccessDenied', 'Policy check failed'));

    const error = await rejectionOf(done);

    expect(error).toMatchObject({
      key: 'media.upload.failed',
      code: 'AccessDenied',
      status: 403,
    });
  });

  it('reports an unreachable storage server (or a CORS refusal)', async () => {
    const done = upload();
    sent().onerror?.();

    const error = await rejectionOf(done);

    expect(error).toMatchObject({ key: 'media.upload.network', status: 0 });
  });
});
