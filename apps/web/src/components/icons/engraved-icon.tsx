import { useId, type ReactNode, type SVGProps } from 'react';

/** Always decorative (aria-hidden): icons sit next to visible text that names the action. */
export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

export type EngravedIcon = ((props: IconProps) => ReactNode) & {
  displayName: string;
};

/**
 * Builds an engraved (ink outline plus cross-hatching) icon on a 24 × 24 grid. `draw` gets the
 * hatch fill, `url(#…)`, for shaded regions.
 *
 * Every instance defines its own hatch `<pattern>` (ids from useId): `currentColor` inside a
 * pattern resolves where the pattern is defined, so one shared pattern would paint every
 * icon's hatching in the colour of wherever that pattern lives (wrong on buttons and seals).
 * Size is 1em through attributes, so a class (`size-4`, Button's svg rule) always wins.
 */
export function createEngravedIcon(
  displayName: string,
  draw: (hatch: string) => ReactNode,
): EngravedIcon {
  function Icon(props: IconProps) {
    const patternId = `${useId()}hatch`;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
        aria-hidden="true"
        {...props}
      >
        <defs>
          <pattern
            id={patternId}
            width="2.5"
            height="2.5"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="2.5" stroke="currentColor" strokeWidth="0.6" />
          </pattern>
        </defs>
        {draw(`url(#${patternId})`)}
      </svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}
