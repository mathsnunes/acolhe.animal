import { AuthEditorialPane } from '@/components/auth/auth-editorial-pane';

/**
 * Two-pane auth shell: a dark editorial pane on the left (hidden below `lg`) and
 * the form pane on the right (each page renders an `AuthPane`). Reproduces the
 * onboarding mock.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <AuthEditorialPane className="hidden lg:flex" />
      {children}
    </div>
  );
}
