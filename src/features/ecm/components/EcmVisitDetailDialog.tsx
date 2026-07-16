import * as React from 'react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { EcmVisitDetailPanel } from '@/features/ecm/components/EcmVisitDetailPanel'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string | null
}

export function EcmVisitDetailDialog({ open, onOpenChange, jobId }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>ECM visit detail</DialogTitle>
        </DialogHeader>
        <DialogBody className="overflow-y-auto">
          {jobId ? <EcmVisitDetailPanel jobId={jobId} /> : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
