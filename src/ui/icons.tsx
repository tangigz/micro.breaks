// Line icons, 1.75 px stroke, round caps and joins (Lucide style, spec › Icons).
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

const Base = ({ size = 20, children, ...rest }: P) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

export const SunIcon = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </Base>
);

export const MoonIcon = (p: P) => (
  <Base {...p}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </Base>
);

export const PlayIcon = (p: P) => (
  <Base {...p} fill="currentColor" stroke="none">
    <polygon points="7 4 19 12 7 20 7 4" />
  </Base>
);

export const ChevronRightIcon = (p: P) => (
  <Base strokeWidth={2} {...p}>
    <path d="m9 6 6 6-6 6" />
  </Base>
);

export const ArrowRightIcon = (p: P) => (
  <Base strokeWidth={2} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
);

export const TimerIcon = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2 2M10 2h4" />
  </Base>
);

export const BellOffIcon = (p: P) => (
  <Base {...p}>
    <path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5" />
    <path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    <path d="m2 2 20 20" />
  </Base>
);
