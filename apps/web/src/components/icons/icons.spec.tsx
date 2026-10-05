import { render, screen } from '@testing-library/react';
import * as actionIcons from './action-icons';
import * as categoryIcons from './category-icons';
import { IconFleuron } from './action-icons';
import * as kindIcons from './family-member-kind-icons';
import * as navIcons from './nav-icons';

const icons = Object.entries({
  ...navIcons,
  ...actionIcons,
  ...categoryIcons,
  ...kindIcons,
});

describe('engraved icons', () => {
  it.each(icons)('%s is a decorative 24 × 24 svg in currentColor', (name, Icon) => {
    const { container } = render(<Icon />);

    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).not.toHaveAttribute('role');
    expect(Icon.displayName).toBe(name);
  });

  it.each(icons)('%s hatches with its own pattern', (_name, Icon) => {
    const { container } = render(
      <>
        <Icon />
        <Icon />
      </>,
    );

    const svgs = [...container.querySelectorAll('svg')];
    const patternIds = svgs.map((svg) => svg.querySelector('pattern')!.id);
    expect(new Set(patternIds).size).toBe(2);
    svgs.forEach((svg, index) => {
      const hatched = [...svg.querySelectorAll('[fill^="url("]')];
      expect(hatched.length).toBeGreaterThan(0);
      for (const shape of hatched) {
        // currentColor in a <pattern> resolves where the pattern is: it must be this svg's.
        expect(shape.getAttribute('fill')).toBe(`url(#${patternIds[index]})`);
      }
    });
  });

  it('passes props such as className through to the svg', () => {
    const { container } = render(<IconFleuron className="size-4" data-testid="x" />);

    expect(container.querySelector('svg')).toHaveClass('size-4');
    expect(screen.getByTestId('x')).toBeInTheDocument();
  });
});
