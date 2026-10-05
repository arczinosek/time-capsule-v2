import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MediaResponse } from '@time-capsule/shared';
import { useRef, useState } from 'react';
import { setLanguage } from '~/i18n';
import { buildMedia } from '~/test/fixtures';
import { MediaLightbox } from './media-lightbox';

/** Thumbnails that open the lightbox, as the gallery does. */
function Gallery({ media }: { media: MediaResponse[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  return (
    <>
      {media.map((item, position) => (
        <button
          key={item.id}
          type="button"
          onClick={(event) => {
            opener.current = event.currentTarget;
            setIndex(position);
          }}
        >
          {`Thumbnail ${position + 1}`}
        </button>
      ))}
      <MediaLightbox
        media={media}
        label="Seaside trip"
        index={index}
        onIndexChange={setIndex}
        onClose={() => setIndex(null)}
        returnFocusTo={() => opener.current}
      />
    </>
  );
}

const media = [1, 2, 3].map((id) => buildMedia({ id }));

function renderGallery() {
  const user = userEvent.setup();
  render(<Gallery media={media} />);
  return { user };
}

describe('MediaLightbox', () => {
  it('opens on the chosen photo, with a counter and its alt text', async () => {
    const { user } = renderGallery();

    await user.click(screen.getByRole('button', { name: 'Thumbnail 2' }));

    const dialog = await screen.findByRole('dialog', {
      name: 'Photo 2 of 3: Seaside trip',
    });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Photo 2: Seaside trip' })).toHaveAttribute(
      'src',
      media[1]!.url,
    );
    expect(screen.getByText('2 / 3')).toHaveAttribute('aria-live', 'polite');
    // Ours is the only close button: shadcn's built-in one has English sr-only text.
    expect(screen.getAllByRole('button', { name: /close/i })).toHaveLength(1);
  });

  it('pages with the buttons and stops at the ends', async () => {
    const { user } = renderGallery();
    await user.click(screen.getByRole('button', { name: 'Thumbnail 2' }));

    await user.click(await screen.findByRole('button', { name: 'Next photo' }));

    expect(screen.getByRole('dialog', { name: 'Photo 3 of 3: Seaside trip' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next photo' })).toBeDisabled();
    // Focus left the disabled button for the other one, inside the dialog.
    expect(screen.getByRole('button', { name: 'Previous photo' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Previous photo' }));
    await user.click(screen.getByRole('button', { name: 'Previous photo' }));

    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous photo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next photo' })).toHaveFocus();
  });

  it('pages with the arrow keys', async () => {
    const { user } = renderGallery();
    await user.click(screen.getByRole('button', { name: 'Thumbnail 1' }));
    await screen.findByRole('dialog');

    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('pages with a swipe longer than 50 px', async () => {
    const { user } = renderGallery();
    await user.click(screen.getByRole('button', { name: 'Thumbnail 1' }));
    const dialog = await screen.findByRole('dialog');
    // Both lists, as browsers send them (the dialog's scroll lock reads changedTouches).
    const swipe = (from: number, to: number) => {
      const start = [{ clientX: from, clientY: 100 }];
      const end = [{ clientX: to, clientY: 100 }];
      fireEvent.touchStart(dialog, { touches: start, changedTouches: start });
      fireEvent.touchEnd(dialog, { touches: [], changedTouches: end });
    };

    swipe(200, 120); // to the left: next
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    swipe(200, 170); // too short
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    swipe(100, 180); // to the right: previous
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('closes with Close or Escape and gives focus back to the thumbnail', async () => {
    const { user } = renderGallery();
    const thumbnail = screen.getByRole('button', { name: 'Thumbnail 3' });

    await user.click(thumbnail);
    await user.click(await screen.findByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(thumbnail).toHaveFocus();

    await user.click(thumbnail);
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(thumbnail).toHaveFocus();
  });

  it('gives focus back even when a click did not focus the thumbnail (Safari)', async () => {
    const { user } = renderGallery();
    const thumbnail = screen.getByRole('button', { name: 'Thumbnail 2' });

    fireEvent.click(thumbnail); // no focus on click, as in Safari
    expect(thumbnail).not.toHaveFocus();
    await user.click(await screen.findByRole('button', { name: 'Close' }));

    expect(thumbnail).toHaveFocus();
  });

  it('is translated', async () => {
    await setLanguage('pl');
    const { user } = renderGallery();

    await user.click(screen.getByRole('button', { name: 'Thumbnail 1' }));

    expect(
      await screen.findByRole('dialog', { name: 'Zdjęcie 1 z 3: Seaside trip' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Poprzednie zdjęcie' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Następne zdjęcie' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Zamknij' })).toBeInTheDocument();
  });
});
