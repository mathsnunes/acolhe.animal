# Flow — phone + OTP authentication

Phone is the primary identifier; email is optional. OTP over WhatsApp (Evolution API in prod; in
dev/mock the code prints to the console). See `stack-arquitetura.md` › Autenticação.

```mermaid
sequenceDiagram
  participant U as User
  participant Web as apps/web (login)
  participant BA as better-auth (lib/auth.ts)
  participant MSG as integrations/messaging
  participant DB as Postgres (user/account/verification)

  Note over U,Web: Sign-up / recovery
  U->>Web: enter phone
  Web->>BA: send-otp(phoneNumber)
  BA->>MSG: sendText(phone, "code …")  (mock: console.log)
  MSG-->>U: WhatsApp with the code
  U->>Web: code + password
  Web->>BA: verify / signUp
  BA->>DB: create user (identity) + account (bcrypt password hash)

  Note over U,Web: Login
  U->>Web: phone + password
  Web->>BA: signIn.phoneNumber
  BA->>DB: look up account by user, compare hash (bcrypt)
  BA-->>Web: session (cookie)
```

Key points:
- **Identity ≠ credential**: `user` holds who the person is; `account` holds the password (bcrypt
  hash) and future OAuth providers.
- Hashing is **bcrypt** (configured in `lib/auth.ts`), the same used by the seed — which is why the
  seeded user's login works.
- The web layer resolves the session in `lib/auth-context.ts` and builds the `Ctx`. **Dev shortcut**:
  with no session in `development`, it logs in the seeded admin (never in production).
- Email, when present, is an alternative OTP channel and a tax-receipt channel.
