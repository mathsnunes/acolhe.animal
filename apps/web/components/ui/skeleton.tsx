import * as React from 'react';

import { cn } from '@/lib/utils';

const Skeleton = ({ className, ...props }: React.ComponentProps<'div'>) => <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-bg-2', className)}
      {...props}
    />;

export { Skeleton };
export default Skeleton;
