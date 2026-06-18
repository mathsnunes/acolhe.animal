'use client';

import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';

import { FinanceStepper } from '../_components/finance-stepper';
import { AsaasFooter } from '../_components/asaas-footer';
import { DocumentUploadItem } from '../_components/document-upload-item';
import type { DocumentItem } from '@acolhe-animal/domain';

interface Props {
  documents: DocumentItem[];
}

export const DocumentsPendingState = ({ documents }: Props) => {
  const router = useRouter();

  return (
    <div>
      <FinanceStepper activeStep="docs" />
      <div className="card">
        <div className="eyebrow-mute mb-4">— Envio de documentos</div>
        <h2 className="display mb-3 text-2xl">
          Quase lá — faltam <em className="text-terra">documentos</em>
        </h2>
        <p className="mb-4 text-[15px] text-ink-soft">
          Precisamos confirmar a identidade do responsável pela organização. É exigência do Banco Central para qualquer conta que recebe pagamentos.
        </p>

        <div className="mb-4 space-y-3">
          {documents.map((doc) => (
            <DocumentUploadItem
              key={doc.id}
              doc={doc}
              onStatusChange={() => router.refresh()}
            />
          ))}
        </div>

        <div className="flex items-start gap-3 rounded-[10px] bg-terra-bg p-4 text-[13.5px] text-[#7a3d28]">
          <Info className="mt-0.5 size-[18px] shrink-0" />
          <div>
            <strong>Por que dois lugares diferentes?</strong> Alguns documentos a Asaas exige que sejam enviados na página segura dela — a gente abre para você. Os outros você envia direto por aqui.
          </div>
        </div>
        <AsaasFooter />
      </div>
    </div>
  );
};
