import * as React from 'react'
import { useBlocker } from '@tanstack/react-router'
import { VisitPlanConfirmGate } from '@/features/service-users/visit-plan/components/VisitPlanConfirmGate'

type Props = {
  /** True while the visit schedule has changes that are not saved yet. */
  dirty: boolean
}

/**
 * Asks before the user leaves the visit plan with unsaved schedule changes — in-app navigation
 * shows a dialog; a browser refresh or tab close shows the browser's own "Leave page?" prompt.
 */
export function VisitPlanUnsavedChangesGuard({ dirty }: Props) {
  const [open, setOpen] = React.useState(false)
  const leaveBlocker = useBlocker({
    shouldBlockFn: () => dirty,
    enableBeforeUnload: () => dirty,
    withResolver: true,
  })

  React.useEffect(() => {
    if (leaveBlocker.status === 'blocked') setOpen(true)
  }, [leaveBlocker.status])

  return (
    <VisitPlanConfirmGate
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next && leaveBlocker.status === 'blocked') leaveBlocker.reset()
      }}
      title="Unsaved changes"
      description="The visit schedule has changes that are not saved yet. Leave this page and discard them?"
      confirmLabel="Leave without saving"
      cancelLabel="Stay on this page"
      onConfirm={() => {
        setOpen(false)
        if (leaveBlocker.status === 'blocked') leaveBlocker.proceed()
      }}
    />
  )
}
