import { redirect } from 'next/navigation';

import { listDonations } from '@acolhe-animal/domain';
import { requireCtx } from '@/lib/auth-context';
import { TestChargeButton } from './_components/test-charge-button';
import { SimulatePaymentButton } from './_components/simulate-payment-button';

export const dynamic = 'force-dynamic';

const statusLabel: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
  refunded: 'Devolvida',
  cancelled: 'Cancelada',
};

const statusColor: Record<string, string> = {
  pending: 'text-amber-600 bg-amber-50',
  confirmed: 'text-green-700 bg-green-50',
  refunded: 'text-ink-mute bg-bg',
  cancelled: 'text-red-600 bg-red-50',
};

export default async function DonationsPage() {
  const ctx = await requireCtx();
  if (ctx.actor.type !== 'user' || ctx.actor.role !== 'admin') redirect('/inicio');

  const donations = await listDonations(ctx);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="eyebrow mb-1">Arrecadação</p>
          <h1 className="text-2xl font-semibold text-ink">Doações</h1>
        </div>
        <TestChargeButton />
      </div>

      {donations.length === 0 ? (
        <div className="rounded-xl border border-line bg-paper px-6 py-16 text-center">
          <p className="text-lg font-medium text-ink">Nenhuma doação ainda</p>
          <p className="mt-2 text-[14px] text-ink-soft">
            Use o botão &ldquo;Simular doação&rdquo; para testar o fluxo no sandbox.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-paper">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[.08em] text-ink-mute">
                <th className="px-4 py-3">Doador</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 hidden sm:table-cell">ID Asaas</th>
              <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {donations.map((d) => (
                <tr key={d.id} className="hover:bg-bg/50">
                  <td className="px-4 py-3 font-medium text-ink">{d.donorName}</td>
                  <td className="px-4 py-3 text-ink">
                    {Number(d.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor[d.status] ?? 'text-ink-mute bg-bg'}`}>
                      {statusLabel[d.status] ?? d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {d.createdAt.toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 hidden font-mono text-[11px] text-ink-mute sm:table-cell">
                    {d.asaasPaymentId ?? '—'}
                  </td>
                  <td className="px-2 py-2">
                    {d.status === 'pending' && d.asaasPaymentId && (
                      <SimulatePaymentButton asaasPaymentId={d.asaasPaymentId} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
