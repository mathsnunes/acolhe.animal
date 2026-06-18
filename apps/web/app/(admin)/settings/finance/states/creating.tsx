import { FinanceStepper } from '../_components/finance-stepper';
import { AsaasFooter } from '../_components/asaas-footer';

const PulsingDots = () => (
  <div className="flex gap-[7px]">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="size-[10px] animate-pulse rounded-full bg-terra"
        style={{ animationDelay: `${i * 0.3}s` }}
      />
    ))}
  </div>
);

export const CreatingState = () => (
  <div>
    <FinanceStepper activeStep="verify" />
    <div className="card text-center">
      <div className="flex justify-center pb-6 pt-2">
        <PulsingDots />
      </div>
      <h2 className="display mb-2 text-2xl italic text-terra">Criando sua conta de recebimento</h2>
      <p className="mx-auto max-w-[42ch] text-[15px] text-ink-soft">
        Só um instante. Estamos preparando tudo com a nossa parceira de pagamentos.
      </p>
      <AsaasFooter />
    </div>
  </div>
);
