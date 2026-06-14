import { cn } from '@/lib/utils';

/**
 * Animal photo with a warm placeholder when no image exists. Renders the
 * first letter of the name over a muted paw mark so a "raw" portal (org with
 * no uploads yet) still looks intentional rather than broken.
 */
export const AnimalPhoto = ({
  src,
  name,
  className,
  rounded = 'rounded-lg',
}: {
  src?: string | null;
  name: string;
  className?: string;
  rounded?: string;
}) => {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        loading="lazy"
        className={cn('size-full object-cover', rounded, className)}
      />
    );
  }
  return (
    <div
      aria-label={name}
      className={cn(
        'flex size-full items-center justify-center bg-bg-2 text-ink-mute',
        rounded,
        className,
      )}
    >
      <span className="display select-none text-4xl">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
};
