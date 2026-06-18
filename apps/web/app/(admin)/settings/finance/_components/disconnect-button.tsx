'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Unplug } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { disconnectAsaasAction } from '../actions';

export const DisconnectButton = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await disconnectAsaasAction();
      if (!result.ok) {
        setError(result.error.message);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="mt-6 border-t border-line pt-6">
      {error && <p className="mb-3 text-[13px] text-rose-600">{error}</p>}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-ink-mute hover:text-rose-600" disabled={isPending}>
            <Unplug className="mr-2 size-4" />
            Desconectar conta Asaas
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar conta Asaas?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove o vínculo entre o Acolhe.animal e a sua conta de recebimento. A conta continua existindo no Asaas — você pode reconectar depois. Doações que já entraram não são afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-rose-600 hover:bg-rose-700"
              disabled={isPending}
            >
              {isPending ? 'Desconectando…' : 'Sim, desconectar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
