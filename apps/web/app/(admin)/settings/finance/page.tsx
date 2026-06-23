import { redirect } from 'next/navigation';

import { getFinanceSetupState, getConfirmDataFields } from '@acolhe-animal/domain';

import { requireCtx } from '@/lib/auth-context';
import { NotStartedState } from './states/not-started';
import { ConfirmDataState } from './states/confirm-data';
import { CreatingState } from './states/creating';
import { AwaitingRevenueState } from './states/awaiting-revenue';
import { DocumentsPendingState } from './states/documents-pending';
import { UnderReviewState } from './states/under-review';
import { ApprovedState } from './states/approved';
import { ManagedState } from './states/managed';
import { RejectedState } from './states/rejected';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ step?: string }>;
}

const FinancePage = async ({ searchParams }: Props) => {
  const ctx = await requireCtx();
  if (ctx.actor.type !== 'user' || ctx.actor.role !== 'admin') redirect('/inicio');

  const state = await getFinanceSetupState(ctx);

  if (state.screen === 'not_started' && (await searchParams).step === 'confirm') {
    const fields = await getConfirmDataFields(ctx);
    return <ConfirmDataState fields={fields} />;
  }

  switch (state.screen) {
    case 'not_started':
      return <NotStartedState pixKey={state.pixKey} />;
    case 'creating':
      return <CreatingState />;
    case 'awaiting_revenue':
      return <AwaitingRevenueState />;
    case 'documents_pending':
      return <DocumentsPendingState documents={state.documents} />;
    case 'under_review':
      return <UnderReviewState />;
    case 'approved':
      return <ApprovedState pixKey={state.pixKey} />;
    case 'managed':
      return <ManagedState pixKey={state.pixKey} />;
    case 'rejected':
      return <RejectedState reason={state.reason} />;
  }
};

export default FinancePage;
