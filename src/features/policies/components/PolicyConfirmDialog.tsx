import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { buttonVariants } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
  confirmVariant?: 'default' | 'success'
  pending?: boolean
  reasonLabel?: string
  reasonRequired?: boolean
  reasonValue?: string
  onReasonChange?: (value: string) => void
  onConfirm: () => void
  children?: React.ReactNode
}

export function PolicyConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  confirmVariant = 'default',
  pending,
  reasonLabel,
  reasonRequired,
  reasonValue,
  onReasonChange,
  onConfirm,
  children,
}: Props) {
  const reasonMissing = Boolean(reasonRequired && !reasonValue?.trim())

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        {reasonLabel ? (
          <FormField label={reasonLabel} required={reasonRequired} htmlFor="policy-confirm-reason">
            <Textarea
              id="policy-confirm-reason"
              value={reasonValue ?? ''}
              onChange={e => onReasonChange?.(e.target.value)}
              rows={4}
            />
          </FormField>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending || reasonMissing}
            className={cn(
              !destructive && buttonVariants({ variant: confirmVariant }),
            )}
            onClick={event => {
              event.preventDefault()
              onConfirm()
            }}
          >
            {pending ? 'Working…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
