import { initials } from '@acolhe-animal/shared';

import { cn } from '@/lib/utils';

/**
 * A small initials circle — the standard avatar across admin views (members,
 * candidates, animals). Use this instead of inlining `initials()` + a styled span.
 */

type Size = 'xs' | 'sm' | 'md';
type Tone = 'terra' | 'green';

const SIZE: Record<Size, string> = {
  xs: 'size-[18px] text-[8.5px]',
  sm: 'size-[26px] text-[10px]',
  md: 'size-[34px] text-[11.5px]',
};

const TONE: Record<Tone, string> = {
  terra: 'bg-terra-bg text-terra',
  green: 'bg-green text-paper',
};

export const InitialsAvatar = ({
  name,
  size = 'sm',
  tone = 'terra',
  className,
}: {
  name: string;
  size?: Size;
  tone?: Tone;
  className?: string;
}) => (
  <span
    className={cn(
      'flex shrink-0 items-center justify-center rounded-full font-medium uppercase leading-none',
      SIZE[size],
      TONE[tone],
      className,
    )}
    aria-hidden
  >
    {initials(name)}
  </span>
);
