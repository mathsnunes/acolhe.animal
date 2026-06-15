'use client';

import { useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Headless read↔edit toggle for "edit on demand" fields. The caller controls the
 * placement of both the read view and the trigger, so it fits a card header
 * ("editar" top-right) as well as an inline row ("trocar" beside a value):
 *
 *   <InlineEdit>
 *     {({ editing, edit, done }) =>
 *       editing ? <Editor onDone={done} /> : <Read onEdit={edit} />}
 *   </InlineEdit>
 *
 * Pair the trigger with {@link EditTrigger} for the consistent small terra link.
 */
export const InlineEdit = ({
  children,
}: {
  children: (api: { editing: boolean; edit: () => void; done: () => void }) => ReactNode;
}) => {
  const [editing, setEditing] = useState(false);
  return <>{children({ editing, edit: () => setEditing(true), done: () => setEditing(false) })}</>;
};

/** The small terra link that opens an inline editor ("editar" / "trocar"). */
export const EditTrigger = ({
  onClick,
  children,
  className,
}: {
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn('text-[11.5px] text-terra transition-opacity hover:opacity-80', className)}
  >
    {children}
  </button>
);
