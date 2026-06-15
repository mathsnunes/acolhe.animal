'use client';

import { createAuthClient } from 'better-auth/react';
import { phoneNumberClient } from 'better-auth/client/plugins';

/** Browser auth client — sign in/out, OTP, session hooks. */
export const authClient = createAuthClient({
  plugins: [phoneNumberClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
