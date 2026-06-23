'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

import { Button } from '@/components/ui/button';

interface Props {
  pixKey: string;
  orgName: string;
}

export const DonationPixCard = ({ pixKey, orgName }: Props) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
      {/* QR Code */}
      <div className="flex flex-col items-center border-b border-line px-8 py-10">
        <div className="mb-3 rounded-xl bg-white p-4 shadow-sm">
          <QRCodeSVG value={pixKey} size={180} level="M" />
        </div>
        <p className="mt-4 text-center text-[13px] text-ink-mute">
          Escaneie com o app do seu banco para fazer um Pix para {orgName}
        </p>
      </div>

      {/* Copy-paste */}
      <div className="px-6 py-6">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[.1em] text-ink-mute">
          Chave Pix — Pix copia e cola
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-bg px-4 py-3">
          <p className="flex-1 break-all font-mono text-[12px] text-ink">{pixKey}</p>
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            onClick={copy}
            aria-label="Copiar chave Pix"
          >
            {copied ? <Check className="size-4 text-green-soft" /> : <Copy className="size-4" />}
          </Button>
        </div>
        <p className="mt-3 text-center text-[12px] text-ink-mute">
          Cole no campo "Pix copia e cola" do seu banco
        </p>
      </div>
    </div>
  );
};
