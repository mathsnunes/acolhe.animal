import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { FinanceStepper } from '../_components/finance-stepper';
import { AsaasFooter } from '../_components/asaas-footer';
import { DisconnectButton } from '../_components/disconnect-button';

interface Props {
  reason: string | null;
}

export const RejectedState = ({ reason }: Props) => (
  <div>
    <FinanceStepper activeStep="docs" />
    <div className="card">
      <div className="eyebrow-mute mb-4">— Precisa de ajuste</div>
      <h2 className="display mb-3 text-2xl">
        Um documento <em className="text-terra">precisa ser reenviado</em>
      </h2>
      {reason && (
        <p className="mb-4 text-[15px] text-ink-soft">{reason}</p>
      )}
      <div className="mb-4 flex items-start gap-3 rounded-[10px] bg-[#FBEFEF] p-4 text-[13.5px] text-[#8a4a4a]">
        <AlertTriangle className="mt-0.5 size-[18px] shrink-0" />
        <div>
          Verifique o motivo informado pela Asaas e reenvie o documento corrigido.
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild className="rounded-full">
          <Link href="/config/financeiro">Reenviar documentos</Link>
        </Button>
        <Button variant="ghost">Falar com o suporte</Button>
      </div>
      <AsaasFooter />
      <DisconnectButton />
    </div>
  </div>
);
