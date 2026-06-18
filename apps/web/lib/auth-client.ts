'use client';

import { createAuthClient } from 'better-auth/react';
import { emailOTPClient, phoneNumberClient } from 'better-auth/client/plugins';

/** Browser auth client — sign in/out, phone OTP, email-OTP recovery, session hooks. */
export const authClient = createAuthClient({
  plugins: [phoneNumberClient(), emailOTPClient()],
});

export const { signIn, signOut, signUp, useSession, phoneNumber, emailOtp } = authClient;
