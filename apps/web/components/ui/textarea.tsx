import * as React from 'react';

import { cn } from '@/lib/utils';

const Textarea = ({ className, ...props }: React.ComponentProps<'textarea'>) => <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-20 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink shadow-sm transition-colors',
        'placeholder:text-ink-mute',
        'focus-visible:outline-none focus-visible:border-terra focus-visible:ring-2 focus-visible:ring-ring/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />;

export { Textarea };
export default Textarea;
