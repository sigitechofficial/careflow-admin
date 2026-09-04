import * as React from 'react'
import { useBlocker } from '@tanstack/react-router'
import { PolicyConfirmDialog } from '@/features/policies/components/PolicyConfirmDialog'

type Props = {
  dirty: boolean
}

export function PolicyUnsavedChangesGuard({ dirty }: Props) {
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
    <PolicyConfirmDialog
      open={open}
      onOpenChange={next => {
        setOpen(next)
        if (!next && leaveBlocker.status === 'blocked') leaveBlocker.reset()
      }}
      title="Unsaved changes"
      description="You have unsaved changes. Leave this page and discard them?"
      confirmLabel="Leave without saving"
      destructive
      onConfirm={() => {
        setOpen(false)
        if (leaveBlocker.status === 'blocked') leaveBlocker.proceed()
      }}
    />
  )
}
