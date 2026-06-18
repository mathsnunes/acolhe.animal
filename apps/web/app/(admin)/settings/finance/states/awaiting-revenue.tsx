'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { FinanceStepper } from '../_components/finance-stepper';
import { AsaasFooter } from '../_components/asaas-footer';
import { checkStatusAction } from '../actions';

const PulsingDots = () => (
  <div className="flex gap-[7px]">
    {[0, 1, 2].map((i) => (
      <span key={i} className="size-[10px] animate-pulse rounded-full bg-terra" style={{ animationDelay: `${i * 0.3}s` }} />
    ))}
  </div>
);

export const AwaitingRevenueState = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCheck = () => {
    startTransition(async () => {
      await checkStatusAction();
      router.refresh();
    });
  };

  return (
    <div>
      <FinanceStepper activeStep="verify" />
      <div className="card text-center">
        <div className="flex justify-center pb-6 pt-2">
          <PulsingDots />
        </div>
        <h2 className="display mb-2 text-2xl italic text-terra">Verificando seus dados na Receita Federal</h2>
        <p className="mx-auto mb-6 max-w-[46ch] text-[15px] text-ink-soft">
          Conferindo o CNPJ da organização. Isso costuma levar menos de um minuto — pode deixar essa tela aberta.
        </p>
        <Button variant="outline" size="sm" onClick={handleCheck} disabled={isPending}>
          {isPending ? 'Verificando…' : 'Verificar status agora'}
        </Button>
        <AsaasFooter />
      </div>
    </div>
  );
};
