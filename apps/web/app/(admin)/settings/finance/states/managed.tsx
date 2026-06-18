import { CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { AsaasFooter } from '../_components/asaas-footer';

interface Props {
  pixKey: string;
}

export const ManagedState = ({ pixKey }: Props) => (
  <div className="space-y-4">
    <div className="flex gap-3 rounded-[10px] bg-[#E4EEE7] p-4 text-[13.5px] text-green-soft">
      <CheckCircle className="mt-0.5 size-[18px] shrink-0" />
      <div>
        <strong>Recebimento gerenciado ativo.</strong> Cada doação que entra é registrada automaticamente e aparece no seu Caixa.
      </div>
    </div>

    <div className="card">
      <div className="eyebrow-mute mb-4">— Como seus doadores pagam</div>
      <h2 className="display mb-4 text-xl">
        Duas formas, as duas <em className="text-terra">registradas</em>
      </h2>

      <div className="flex gap-4 border-t border-line py-4">
        <div>
          <div className="font-medium">Botão "Doar" no portal</div>
          <div className="mt-1 text-[13px] text-ink-mute">Gera um QR Code para cada doação. É o caminho mais completo — a doação nasce já identificada.</div>
        </div>
      </div>

      <div className="flex gap-4 border-t border-line py-4">
        <div>
          <div className="font-medium">
            Chave Pix da conta{' '}
            <span className="ml-1 rounded-full bg-[#E4EEE7] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[.06em] text-green-soft">
              copia e cola
            </span>
          </div>
          <div className="mt-1 font-mono text-[13px] text-ink-soft">{pixKey}</div>
          <div className="mt-1 text-[13px] text-ink-mute">A chave da sua conta de recebimento. Pix que cair aqui também é registrado.</div>
        </div>
      </div>
    </div>

    <div className="flex gap-3 rounded-[10px] bg-[#FBEFEF] p-4 text-[13.5px] text-[#8a4a4a]">
      <AlertTriangle className="mt-0.5 size-[18px] shrink-0" />
      <div>
        <strong>Já divulgava uma chave Pix antiga?</strong> Doações que chegarem na sua chave antiga (cartaz, Instagram, etc.) <strong>não</strong> aparecem aqui — elas não passam pela conta de recebimento. Divulgue a chave nova ou o botão "Doar" para ter tudo registrado.
      </div>
    </div>

    <p className="text-[13.5px] text-ink-mute">
      Configurou como recebe. Agora veja{' '}
      <Link href="/config/financeiro?tab=saque" className="font-medium text-terra underline underline-offset-2">
        para onde o dinheiro vai →
      </Link>
    </p>
    <AsaasFooter />
  </div>
);
