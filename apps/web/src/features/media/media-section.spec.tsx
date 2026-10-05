import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  MAX_MEDIA_SIZE_BYTES,
  type CreateMediaRequest,
  type MediaResponse,
} from '@time-capsule/shared';
import { http, HttpResponse } from 'msw';
import {
  buildFamilyMemberDetail,
  buildMedia,
  buildMilestone,
} from '~/test/fixtures';
import { renderRoute } from '~/test/render-route';
import { apiUrl, server } from '~/test/server';

const STORAGE_URL = 'http://storage.test/time-capsule-media';

/**
 * The storage server. Not MSW: its XMLHttpRequest interceptor can't read jsdom's FormData
 * (TypeError: reading '_buffer'). This stand-in records each upload's form field names and
 * answers with `status` / `body` (S3 answers a presigned POST with 204).
 */
const storage = {
  status: 204,
  body: '',
  uploads: [] as { url: string; fieldNames: string[] }[],
};

class StorageXMLHttpRequest {
  url = '';
  status = 0;
  responseText = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readonly upload: {
    onprogress: ((event: Partial<ProgressEvent>) => void) | null;
  } = { onprogress: null };

  open(_method: string, url: string) {
    this.url = url;
  }

  send(body: FormData) {
    storage.uploads.push({ url: this.url, fieldNames: [...body.keys()] });
    setTimeout(() => {
      this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 1 });
      this.status = storage.status;
      this.responseText = storage.body;
      this.onload?.();
    });
  }
}

const s3Error = (code: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><Error><Code>${code}</Code><Message></Message></Error>`;

const png = (name: string) => new File(['png'], name, { type: 'image/png' });

/** Ready photos linked elsewhere: what the PUT can link besides the milestone's own. */
let libraryMedia: MediaResponse[] = [];

beforeEach(() => {
  libraryMedia = [];
  storage.status = 204;
  storage.body = '';
  storage.uploads = [];
  vi.stubGlobal('XMLHttpRequest', StorageXMLHttpRequest);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Milestone 1 ("Seaside trip") with `media`, served statefully: confirm adds the photo, the
 * PUT replaces the set (or answers 409 stale when its base isn't the current set), so the
 * refetched page shows what the api would answer.
 */
function serveMilestone(media: MediaResponse[] = []) {
  let current = buildMilestone({ id: 1, title: 'Seaside trip', media });
  let nextMediaId = 100;
  const calls = {
    create: [] as CreateMediaRequest[],
    confirm: [] as number[],
    remove: [] as number[],
    put: [] as unknown[],
    /** Another tab confirms a photo: the page on screen doesn't know it yet. */
    confirmElsewhere: (item: MediaResponse) => {
      current = { ...current, media: [...current.media, item] };
    },
  };
  server.use(
    http.get(apiUrl('/milestones/1'), () => HttpResponse.json(current)),
    http.post(apiUrl('/media'), async ({ request }) => {
      calls.create.push((await request.json()) as CreateMediaRequest);
      const mediaId = nextMediaId++;
      return HttpResponse.json(
        {
          mediaId,
          url: STORAGE_URL,
          fields: { key: `media/${mediaId}`, 'Content-Type': 'image/png' },
        },
        { status: 201 },
      );
    }),
    http.post(apiUrl('/media/:id/confirm'), ({ params }) => {
      const id = Number(params.id);
      calls.confirm.push(id);
      const confirmed = buildMedia({ id });
      current = { ...current, media: [...current.media, confirmed] };
      return HttpResponse.json(confirmed);
    }),
    http.delete(apiUrl('/media/:id'), ({ params }) => {
      calls.remove.push(Number(params.id));
      return new HttpResponse(null, { status: 204 });
    }),
    http.put(apiUrl('/milestones/1/media'), async ({ request }) => {
      const body = (await request.json()) as {
        mediaIds: number[];
        baseMediaIds: number[];
      };
      calls.put.push(body);
      if (
        JSON.stringify(body.baseMediaIds) !==
        JSON.stringify(current.media.map(({ id }) => id))
      ) {
        return HttpResponse.json(
          {
            statusCode: 409,
            message: 'validation.media.stale',
            error: 'Conflict',
          },
          { status: 409 },
        );
      }
      const library = [...current.media, ...libraryMedia];
      current = {
        ...current,
        media: body.mediaIds.map(
          (id) => library.find((item) => item.id === id) ?? buildMedia({ id }),
        ),
      };
      return HttpResponse.json(current.media);
    }),
  );
  return calls;
}

const photos = (count: number) =>
  Array.from({ length: count }, (_, index) => buildMedia({ id: index + 1 }));

describe('MediaSection on the milestone page', () => {
  it('uploads two photos: POST /media, storage, confirm, then shows them', async () => {
    const calls = serveMilestone();
    const { user } = renderRoute('/milestones/1');

    const input = await screen.findByLabelText('Add photos');
    expect(screen.getByText('0 / 10')).toBeInTheDocument();
    expect(screen.getByText('No photos yet.')).toBeInTheDocument();

    await user.upload(input, [png('a.png'), png('b.png')]);

    expect(
      await screen.findByRole('img', { name: 'Photo 2: Seaside trip' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Photo 1: Seaside trip' }),
    ).toHaveAttribute('loading', 'lazy');
    expect(screen.getByText('2 / 10')).toBeInTheDocument();

    const expectedCreate: CreateMediaRequest = {
      target: { type: 'milestone', id: 1 },
      contentType: 'image/png',
      size: 3,
    };
    expect(calls.create).toEqual([expectedCreate, expectedCreate]);
    // Exactly the presigned fields, then the file.
    const expectedUploads = [
      { url: STORAGE_URL, fieldNames: ['key', 'Content-Type', 'file'] },
      { url: STORAGE_URL, fieldNames: ['key', 'Content-Type', 'file'] },
    ];
    expect(storage.uploads).toEqual(expectedUploads);
    expect(calls.confirm).toEqual([100, 101]);
    expect(calls.remove).toEqual([]);
  });

  it('refuses a PDF before calling the api', async () => {
    const calls = serveMilestone();
    const { user } = renderRoute('/milestones/1', { applyAccept: false });

    await user.upload(
      await screen.findByLabelText('Add photos'),
      new File(['%PDF'], 'scan.pdf', { type: 'application/pdf' }),
    );

    expect(
      await screen.findByText('Only JPEG, PNG, WebP and GIF images are allowed'),
    ).toBeInTheDocument();
    expect(calls.create).toEqual([]);
    expect(storage.uploads).toEqual([]);
  });

  it('refuses a file over 20 MB before calling the api', async () => {
    const calls = serveMilestone();
    const { user } = renderRoute('/milestones/1');
    const big = png('big.png');
    Object.defineProperty(big, 'size', { value: MAX_MEDIA_SIZE_BYTES + 1 });

    await user.upload(await screen.findByLabelText('Add photos'), big);

    expect(
      await screen.findByText('The file is too large (max 20 MB)'),
    ).toBeInTheDocument();
    expect(calls.create).toEqual([]);
  });

  it('with 9 photos, uploads one of two picked files and refuses the other at the cap', async () => {
    const calls = serveMilestone(photos(9));
    const { user } = renderRoute('/milestones/1');

    await user.upload(await screen.findByLabelText('Add photos'), [
      png('a.png'),
      png('b.png'),
    ]);

    expect(
      await screen.findByText('A milestone can have at most 10 photos'),
    ).toBeInTheDocument();
    expect(await screen.findByText('10 / 10')).toBeInTheDocument();
    expect(calls.create).toHaveLength(1);
    expect(calls.confirm).toEqual([100]);
    // Full: no more picking, from disk or from the library.
    expect(screen.getByLabelText('Add photos')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Choose from the library' }),
    ).toBeDisabled();
  });

  it("shows the api's 409 (cap reached by uploads elsewhere)", async () => {
    serveMilestone();
    server.use(
      http.post(apiUrl('/media'), () =>
        HttpResponse.json(
          {
            statusCode: 409,
            message: 'validation.media.capMilestone',
            error: 'Conflict',
          },
          { status: 409 },
        ),
      ),
    );
    const { user } = renderRoute('/milestones/1');

    await user.upload(await screen.findByLabelText('Add photos'), png('a.png'));

    expect(
      await screen.findByText('A milestone can have at most 10 photos'),
    ).toBeInTheDocument();
    expect(storage.uploads).toEqual([]);
  });

  it("shows storage's EntityTooLarge and releases the reserved slot", async () => {
    const calls = serveMilestone();
    storage.status = 400;
    storage.body = s3Error('EntityTooLarge');
    const { user } = renderRoute('/milestones/1');

    await user.upload(await screen.findByLabelText('Add photos'), png('a.png'));

    expect(
      await screen.findByText('The file is too large (max 20 MB).'),
    ).toBeInTheDocument();
    await waitFor(() => expect(calls.remove).toEqual([100]));
    expect(calls.confirm).toEqual([]);
    expect(screen.getByText('0 / 10')).toBeInTheDocument();
  });

  it('removes a photo after confirming: PUT with the remaining ids', async () => {
    const calls = serveMilestone(photos(3));
    const { user } = renderRoute('/milestones/1');

    await user.click(
      await screen.findByRole('button', { name: 'Remove photo 2' }),
    );
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Remove this photo?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

    expect(await screen.findByText('2 / 10')).toBeInTheDocument();
    const expectedPuts = [{ mediaIds: [1, 3], baseMediaIds: [1, 2, 3] }];
    expect(calls.put).toEqual(expectedPuts);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('moves a photo later: PUT with the reordered ids', async () => {
    const calls = serveMilestone(photos(3));
    const { user } = renderRoute('/milestones/1');

    await user.click(
      await screen.findByRole('button', { name: 'Move photo 1 later' }),
    );

    const expectedPuts = [{ mediaIds: [2, 1, 3], baseMediaIds: [1, 2, 3] }];
    await waitFor(() => expect(calls.put).toEqual(expectedPuts));
    // The answer is the new order: photo 2 comes first now.
    await waitFor(() =>
      expect(
        screen.getByRole('img', { name: 'Photo 1: Seaside trip' }),
      ).toHaveAttribute('src', expect.stringContaining('/media/2.png')),
    );
    expect(
      screen.getAllByRole('img').map((img) => img.getAttribute('src')),
    ).toEqual([
      expect.stringContaining('/media/2.png'),
      expect.stringContaining('/media/1.png'),
      expect.stringContaining('/media/3.png'),
    ]);
    expect(
      screen.getByRole('button', { name: 'Move photo 1 earlier' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Move photo 3 later' }),
    ).toBeDisabled();
  });

  it('on a stale 409, refetches the photos and explains, changing nothing', async () => {
    const calls = serveMilestone(photos(2));
    const { user } = renderRoute('/milestones/1');
    const moveLater = await screen.findByRole('button', {
      name: 'Move photo 1 later',
    });
    calls.confirmElsewhere(buildMedia({ id: 3 }));

    await user.click(moveLater);

    expect(
      await screen.findByText(
        'The photos changed in the meantime. Refreshed; please try again.',
      ),
    ).toBeInTheDocument();
    // Refetched: the photo from the other tab shows up, the order is unchanged.
    expect(await screen.findByText('3 / 10')).toBeInTheDocument();
    expect(
      screen.getAllByRole('img').map((img) => img.getAttribute('src')),
    ).toEqual([
      expect.stringContaining('/media/1.png'),
      expect.stringContaining('/media/2.png'),
      expect.stringContaining('/media/3.png'),
    ]);
    const expectedPuts = [{ mediaIds: [2, 1], baseMediaIds: [1, 2] }];
    expect(calls.put).toEqual(expectedPuts);
  });

  it('disables moving, removing and the library while an upload is in progress', async () => {
    serveMilestone(photos(2));
    let finishUpload: () => void = () => {};
    const uploadHeld = new Promise<void>((resolve) => {
      finishUpload = resolve;
    });
    server.use(
      http.post(apiUrl('/media/:id/confirm'), async () => {
        await uploadHeld;
        // No response: falls through to serveMilestone's stateful confirm.
      }),
    );
    const { user } = renderRoute('/milestones/1');

    await user.upload(await screen.findByLabelText('Add photos'), png('a.png'));

    const controls = () => [
      screen.getByRole('button', { name: 'Move photo 1 later' }),
      screen.getByRole('button', { name: 'Remove photo 1' }),
      screen.getByRole('button', { name: 'Choose from the library' }),
    ];
    for (const control of controls()) expect(control).toBeDisabled();

    finishUpload();

    expect(await screen.findByText('3 / 10')).toBeInTheDocument();
    for (const control of controls()) expect(control).toBeEnabled();
  });

  it('links a photo from the library, which hides the ones already linked', async () => {
    const linked = buildMedia({ id: 1 });
    libraryMedia = [buildMedia({ id: 21 }), buildMedia({ id: 22 })];
    const calls = serveMilestone([linked]);
    server.use(
      http.get(apiUrl('/media'), () =>
        HttpResponse.json([linked, ...libraryMedia]),
      ),
    );
    const { user } = renderRoute('/milestones/1');

    await user.click(
      await screen.findByRole('button', { name: 'Choose from the library' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Photo library' });
    await within(dialog).findByRole('button', { name: 'Add library photo 1' });
    expect(
      within(dialog).getAllByRole('button', { name: /Add library photo/ }),
    ).toHaveLength(2);
    // The shadcn close button's text is English: replaced by a translated Cancel.
    expect(
      screen.queryByRole('button', { name: /close/i }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole('button', { name: 'Add library photo 2' }),
    );

    expect(await screen.findByText('2 / 10')).toBeInTheDocument();
    const expectedPuts = [{ mediaIds: [1, 22], baseMediaIds: [1] }];
    expect(calls.put).toEqual(expectedPuts);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("doesn't load the library until it is opened", async () => {
    const listMedia = vi.fn(() => HttpResponse.json([]));
    serveMilestone();
    server.use(http.get(apiUrl('/media'), listMedia));
    renderRoute('/milestones/1');

    expect(await screen.findByText('0 / 10')).toBeInTheDocument();
    expect(listMedia).not.toHaveBeenCalled();
  });

  it('shows a placeholder when a photo fails to load', async () => {
    serveMilestone(photos(1));
    renderRoute('/milestones/1');

    fireEvent.error(
      await screen.findByRole('img', { name: 'Photo 1: Seaside trip' }),
    );

    expect(
      await screen.findByText('This photo cannot be loaded.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Photo 1: Seaside trip')).toBeInTheDocument();
  });
});

describe('MediaSection on the family-member page', () => {
  it('counts against the family-member cap', async () => {
    server.use(
      http.get(apiUrl('/family-members/5'), () =>
        HttpResponse.json(buildFamilyMemberDetail({ id: 5, name: 'Ola' })),
      ),
      http.get(apiUrl('/media'), () => HttpResponse.json([])),
    );

    const { user } = renderRoute('/family-members/5');

    expect(await screen.findByText('0 / 100')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Photos' })).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Choose from the library' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Photo library' });
    expect(
      await within(dialog).findByText('No other photos in the library.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /close/i }),
    ).not.toBeInTheDocument();
  });
});
