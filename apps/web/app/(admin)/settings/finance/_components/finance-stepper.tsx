import { Stepper } from '@/components/ui/stepper';

type StepKey = 'data' | 'verify' | 'docs' | 'review' | 'done';

const STEPS = [
  { key: 'data',   label: 'Dados' },
  { key: 'verify', label: 'Verificação' },
  { key: 'docs',   label: 'Documentos' },
  { key: 'review', label: 'Análise' },
  { key: 'done',   label: 'Pronto' },
] as const;

interface Props {
  activeStep: StepKey;
}

export const FinanceStepper = ({ activeStep }: Props) => (
  <Stepper
    steps={STEPS}
    activeIndex={STEPS.findIndex((s) => s.key === activeStep)}
    className="mb-8"
  />
);
