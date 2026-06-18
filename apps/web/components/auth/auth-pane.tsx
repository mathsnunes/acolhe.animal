import { BrandMark } from '@/components/brand';

/**
 * The right-hand form pane shared by every auth screen: a compact wordmark + an
 * optional top-right slot (mode tabs / back link) above a vertically-centered
 * card. The editorial pane sits to its left (see `(auth)/layout.tsx`).
 */
export const AuthPane = ({ slot, children }: { slot?: React.ReactNode; children: React.ReactNode }) => (
  <section className="flex min-h-dvh flex-col bg-bg px-6 py-8 sm:px-10 lg:px-14">
    <div className="flex min-h-9 items-center gap-4">
      <BrandMark className="text-lg lg:hidden" />
      {slot ? <div className="ml-auto">{slot}</div> : null}
    </div>
    <div className="flex flex-1 items-center justify-center py-8">
      <div className="w-full max-w-md">{children}</div>
    </div>
  </section>
);
