import { redirect } from 'next/navigation';
import { eq, sum } from 'drizzle-orm';

import { requireCtx } from '@/lib/auth-context';
import { donation } from '@acolhe-animal/db';

export const dynamic = 'force-dynamic';

export default async function CashflowPage() {
  const ctx = await requireCtx();
  if (ctx.actor.type !== 'user' || ctx.actor.role !== 'admin') redirect('/inicio');

  const [confirmedTotal] = await ctx.db
    .select({ total: sum(donation.amount) })
    .from(donation)
    .where(eq(donation.organizationId, ctx.organizationId));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <p className="eyebrow mb-1">Arrecadação</p>
        <h1 className="text-2xl font-semibold text-ink">Caixa</h1>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-paper p-6">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[.1em] text-ink-mute">Total recebido</p>
          <p className="text-2xl font-semibold text-ink">
            {Number(confirmedTotal?.total ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="mt-1 text-[12px] text-ink-mute">todas as doações</p>
        </div>
        <div className="rounded-xl border border-line bg-paper p-6">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[.1em] text-ink-mute">Saldo disponível</p>
          <p className="text-2xl font-semibold text-ink">—</p>
          <p className="mt-1 text-[12px] text-ink-mute">consultar no Asaas</p>
        </div>
        <div className="rounded-xl border border-line bg-paper p-6">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[.1em] text-ink-mute">Saques realizados</p>
          <p className="text-2xl font-semibold text-ink">—</p>
          <p className="mt-1 text-[12px] text-ink-mute">em breve</p>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-line bg-paper px-6 py-12 text-center">
        <p className="text-[15px] font-medium text-ink">Ledger detalhado em breve</p>
        <p className="mt-2 text-[13px] text-ink-soft">
          Veja as doações individuais na página{' '}
          <a href="/doacoes" className="text-terra underline">Doações</a>.
        </p>
      </div>
    </div>
  );
}
