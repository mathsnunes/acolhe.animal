import { BrandMark } from '@/components/brand';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-12">
      <div className="mb-8">
        <BrandMark className="text-2xl" />
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
