// TODO: remove — sandbox simulation only
'use client';

import { useState, useTransition } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { createTestDonationAction } from '../actions';

export const TestChargeButton = () => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('10');
  const [result, setResult] = useState<{ qrCodePayload: string; qrCodeImageBase64: string; paymentId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const handleCreate = () => {
    setError(null);
    start(async () => {
      const res = await createTestDonationAction({ amount: Number(amount) });
      if (res.ok) {
        setResult(res.data);
      } else {
        setError(res.error.message);
      }
    });
  };

  const reset = () => { setResult(null); setError(null); setOpen(false); };

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-full" onClick={() => setOpen(true)}>
        Simular doação (sandbox)
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Simular doação Pix</DialogTitle>
            <DialogDescription>
              Cria uma cobrança real no sandbox Asaas. Use o QR code para testar o fluxo completo.
            </DialogDescription>
          </DialogHeader>

          {!result ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-ink-mute">Valor (R$)</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              {error && <p className="text-[13px] text-red-500">{error}</p>}
              <Button className="w-full rounded-full" onClick={handleCreate} disabled={isPending}>
                {isPending ? 'Gerando...' : 'Gerar QR Code Pix'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <QRCodeSVG value={result.qrCodePayload} size={160} level="M" />
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-[.1em] text-ink-mute">Pix copia e cola</p>
                <p className="break-all rounded-lg bg-bg px-3 py-2 font-mono text-[11px] text-ink">
                  {result.qrCodePayload}
                </p>
              </div>
              <p className="text-center text-[12px] text-ink-mute">
                ID Asaas: <span className="font-mono">{result.paymentId}</span>
              </p>
              <Button variant="outline" className="w-full rounded-full" onClick={reset}>Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
