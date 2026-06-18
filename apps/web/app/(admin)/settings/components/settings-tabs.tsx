'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/config', label: 'Geral', exact: true },
  { href: '/config/membros', label: 'Membros', exact: false },
  { href: '/config/financeiro', label: 'Financeiro', exact: false },
];

export const SettingsTabs = () => {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-1 border-b border-line">
      {TABS.map((tab) => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 pb-3 pt-1 text-[14px] font-medium transition-colors ${
              isActive
                ? 'border-b-2 border-terra text-terra'
                : 'text-ink-mute hover:text-ink'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
};
