import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { FinanceStepper } from '../_components/finance-stepper';
import { AsaasFooter } from '../_components/asaas-footer';
import { DisconnectButton } from '../_components/disconnect-button';

export const ApprovedState = () => (
  <div>
    <FinanceStepper activeStep="done" />
    <div className="card text-center">
      <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-[#E4EEE7] text-green-soft">
        <CheckCircle className="size-8" />
      </div>
      <h2 className="display mx-auto mb-3 max-w-[36ch] text-2xl">
        Tudo pronto — seu <em className="text-terra">recebimento gerenciado</em> está ativo
      </h2>
      <p className="mx-auto mb-6 max-w-[48ch] text-[15px] text-ink-soft">
        A conta de recebimento está liberada. Agora falta dizer como seus doadores pagam e para onde o dinheiro vai.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild className="rounded-full">
          <Link href="/config/financeiro">Ver como recebo</Link>
        </Button>
        <Button variant="outline" asChild className="rounded-full">
          <Link href="/config/financeiro?tab=saque">Configurar saque</Link>
        </Button>
      </div>
      <AsaasFooter />
      <DisconnectButton />
    </div>
  </div>
);
