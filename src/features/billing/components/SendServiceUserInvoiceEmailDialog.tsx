import * as React from 'react'
import { Loader2, Mail, Send } from 'lucide-react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  fetchServiceUserInvoiceEmailPreview,
  type ServiceUserInvoiceEmailPreview,
} from '@/features/billing/api/invoice-runs.api'
import { useEmailInvoiceToServiceUser } from '@/features/billing/hooks/useInvoiceRuns'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  runId: string | null
  serviceUserId: string | null
  serviceUserName?: string
}

export function SendServiceUserInvoiceEmailDialog({
  open,
  onOpenChange,
  runId,
  serviceUserId,
  serviceUserName,
}: Props) {
  const emailMut = useEmailInvoiceToServiceUser()
  const [preview, setPreview] = React.useState<ServiceUserInvoiceEmailPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = React.useState(false)
  const [previewError, setPreviewError] = React.useState<string | null>(null)
  const [toEmail, setToEmail] = React.useState('')
  const [markSent, setMarkSent] = React.useState(true)

  React.useEffect(() => {
    if (!open || !runId || !serviceUserId) {
      setPreview(null)
      setPreviewError(null)
      setToEmail('')
      return
    }
    let cancelled = false
    setLoadingPreview(true)
    setPreviewError(null)
    void fetchServiceUserInvoiceEmailPreview(runId, serviceUserId)
      .then((data) => {
        if (cancelled) return
        setPreview(data)
        setToEmail(data.defaultToEmail ?? '')
        setMarkSent(data.canMarkSent)
      })
      .catch((e) => {
        if (cancelled) return
        setPreview(null)
        setPreviewError(e instanceof Error ? e.message : 'Could not load email preview')
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, runId, serviceUserId])

  const onSend = () => {
    if (!runId || !serviceUserId) return
    const email = toEmail.trim()
    if (!email) {
      toastApiError(new Error('Enter an email address'))
      return
    }
    emailMut.mutate(
      {
        runId,
        serviceUserId,
        toEmail: email,
        markSent: markSent && Boolean(preview?.canMarkSent),
      },
      {
        onSuccess: (data) => {
          const note =
            data.mode === 'log'
              ? ' (logged locally — configure SMTP to deliver for real)'
              : ''
          toastSuccess(
            data.markedSent
              ? `Invoice emailed to ${data.to} and marked as sent${note}`
              : `Invoice emailed to ${data.to}${note}`,
          )
          onOpenChange(false)
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" aria-hidden />
            Send invoice by email
          </DialogTitle>
          <DialogDescription>
            Email the invoice CSV for {serviceUserName ?? preview?.serviceUserName ?? 'this service user'}
            {preview ? ` (${preview.period})` : ''}.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {loadingPreview ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading recipient…
            </div>
          ) : previewError ? (
            <p className="text-sm text-destructive">{previewError}</p>
          ) : preview ? (
            <>
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium text-foreground">{preview.serviceUserName}</p>
                <p className="text-xs text-muted-foreground">
                  {preview.period} · {preview.subtotal} {preview.currency}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-invoice-email">To email</Label>
                <Input
                  id="su-invoice-email"
                  type="email"
                  autoComplete="email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="billing@example.com"
                />
                {preview.suggestions.length > 1 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {preview.suggestions.map((s) => (
                      <button
                        key={`${s.source}-${s.email}`}
                        type="button"
                        className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary hover:text-foreground"
                        onClick={() => setToEmail(s.email)}
                        title={s.label}
                      >
                        {s.email}
                      </button>
                    ))}
                  </div>
                ) : null}
                {!preview.defaultToEmail ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    No billing contact or service user email on file — enter an address above.
                  </p>
                ) : null}
              </div>
              {preview.canMarkSent ? (
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="rounded border-border"
                    checked={markSent}
                    onChange={(e) => setMarkSent(e.target.checked)}
                  />
                  Also mark this invoice run as sent
                </label>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Email will still send. Approve/lock the run first if you also want to mark it as
                  sent.
                </p>
              )}
            </>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            leftIcon={<Send className="h-3.5 w-3.5" />}
            loading={emailMut.isPending}
            disabled={loadingPreview || Boolean(previewError) || !toEmail.trim()}
            onClick={onSend}
          >
            Send invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
