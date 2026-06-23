// TODO: remove — sandbox simulation only
'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PlayCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { simulateTestPaymentAction } from '../actions';

export const SimulatePaymentButton = ({ asaasPaymentId }: { asaasPaymentId: string }) => {
  const [isPending, start] = useTransition();
  const router = useRouter();

  const handle = () =>
    start(async () => {
      const res = await simulateTestPaymentAction(asaasPaymentId);
      if (res.ok) router.refresh();
      else alert(res.error.message);
    });

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 gap-1 rounded-full px-2 text-[12px] text-ink-mute hover:text-terra"
      onClick={handle}
      disabled={isPending}
      title="Simular pagamento (sandbox)"
    >
      <PlayCircle className="size-3.5" />
      {isPending ? '...' : 'Pagar'}
    </Button>
  );
};
