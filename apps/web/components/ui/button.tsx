import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { PendingDots } from './pending-dots';

const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'rounded-full bg-terra text-paper shadow-card hover:brightness-95 hover:-translate-y-px',
        primary: 'rounded-full bg-terra text-paper shadow-card hover:brightness-95 hover:-translate-y-px',
        secondary: 'rounded-full bg-green text-paper hover:brightness-110 hover:-translate-y-px',
        outline: 'rounded-full border border-line bg-transparent text-ink hover:bg-bg-2',
        ghost: 'rounded-full bg-transparent text-ink hover:bg-bg-2',
        destructive: 'rounded-full bg-rose text-paper hover:brightness-95 hover:-translate-y-px',
        link: 'rounded-none text-terra underline-offset-4 hover:underline',
      },
      size: {
        default: 'px-6 py-2.5 text-sm',
        sm: 'px-4 py-2 text-xs',
        lg: 'px-7 py-3 text-sm',
        icon: 'size-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** When true, disables the button and shows pulsing dots in place of its label. */
  pending?: boolean;
}

const Button = ({
  className,
  variant,
  size,
  asChild = false,
  pending = false,
  disabled,
  children,
  ...props
}: ButtonProps) => {
  const Comp = asChild ? Slot : 'button';

  // `pending` only applies to a real button (Slot/asChild forwards a single child).
  if (pending && !asChild) {
    return (
      <button
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        disabled
        aria-busy="true"
        {...props}
      >
        <span className="invisible">{children}</span>
        <span className="absolute inset-0 flex items-center justify-center">
          <PendingDots />
        </span>
      </button>
    );
  }

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled}
      {...props}
    >
      {children}
    </Comp>
  );
};

export { Button, buttonVariants };
export default Button;
