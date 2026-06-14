import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = ({ className, type, ...props }: React.ComponentProps<'input'>) => <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-10 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink shadow-sm transition-colors',
        'placeholder:text-ink-mute',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink',
        'focus-visible:outline-none focus-visible:border-terra focus-visible:ring-2 focus-visible:ring-ring/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />;

export { Input };
export default Input;
