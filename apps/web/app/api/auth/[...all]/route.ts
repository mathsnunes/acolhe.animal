import { toNextJsHandler } from 'better-auth/next-js';

import { auth } from '@/lib/auth';

/** better-auth mounts all its endpoints under /api/auth/*. */
export const { GET, POST } = toNextJsHandler(auth);
