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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
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

function funderKey(funderId: string | null | undefined): string {
  return funderId ?? 'direct'
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
  const [selectedFunderKey, setSelectedFunderKey] = React.useState<string>('')
  const [toEmail, setToEmail] = React.useState('')
  const [markSent, setMarkSent] = React.useState(true)

  React.useEffect(() => {
    if (!open || !runId || !serviceUserId) {
      setPreview(null)
      setPreviewError(null)
      setSelectedFunderKey('')
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
        const funders = data.funders ?? []
        const preferred =
          funders.find((f) => funderKey(f.funderId) === funderKey(data.defaultFunderId)) ??
          funders[0] ??
          null
        const key = preferred ? funderKey(preferred.funderId) : ''
        setSelectedFunderKey(key)
        setToEmail(preferred?.defaultToEmail ?? data.defaultToEmail ?? '')
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

  const selectedShare =
    preview?.funders?.find((f) => funderKey(f.funderId) === selectedFunderKey) ?? null
  const amountLabel = selectedShare?.subtotal ?? preview?.subtotal
  const needsFunder = Boolean(preview?.requiresFunderSelection)

  const onFunderChange = (key: string) => {
    setSelectedFunderKey(key)
    const share = preview?.funders?.find((f) => funderKey(f.funderId) === key)
    setToEmail(share?.defaultToEmail ?? '')
  }

  const onSend = () => {
    if (!runId || !serviceUserId) return
    if (needsFunder && !selectedFunderKey) {
      toastApiError(new Error('Choose which funder to email'))
      return
    }
    const email = toEmail.trim()
    if (!email) {
      toastApiError(new Error('Enter an email address'))
      return
    }
    emailMut.mutate(
      {
        runId,
        serviceUserId,
        funderId:
          needsFunder || (preview?.funders?.length ?? 0) > 0
            ? selectedFunderKey || undefined
            : undefined,
        toEmail: email,
        markSent: markSent && Boolean(preview?.canMarkSent),
      },
      {
        onSuccess: (data) => {
          const note =
            data.mode === 'log'
              ? ' (logged locally — configure SMTP to deliver for real)'
              : ''
          const funderNote = data.funderName ? ` (${data.funderName})` : ''
          toastSuccess(
            data.markedSent
              ? `Invoice emailed to ${data.to}${funderNote} and marked as sent${note}`
              : `Invoice emailed to ${data.to}${funderNote}${note}`,
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
            {preview ? ` (${preview.period})` : ''}
            {needsFunder ? '. Choose a funder to send only their share.' : '.'}
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
                  {preview.period} · {amountLabel} {preview.currency}
                  {selectedShare && needsFunder ? ` · ${selectedShare.funderName}` : ''}
                </p>
                {needsFunder ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Full invoice total: {preview.subtotal} {preview.currency}
                  </p>
                ) : null}
              </div>

              {(preview.funders?.length ?? 0) > 1 ? (
                <div className="space-y-1.5">
                  <Label htmlFor="su-invoice-funder">Funder</Label>
                  <Select value={selectedFunderKey} onValueChange={onFunderChange}>
                    <SelectTrigger id="su-invoice-funder">
                      <SelectValue placeholder="Select funder" />
                    </SelectTrigger>
                    <SelectContent>
                      {preview.funders.map((f) => (
                        <SelectItem key={funderKey(f.funderId)} value={funderKey(f.funderId)}>
                          {f.funderName} — {f.subtotal} {preview.currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

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
                {!toEmail.trim() ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    No funding billing contact email on file — enter an address above.
                  </p>
                ) : selectedShare ? (
                  <p className="text-xs text-muted-foreground">
                    Prefills from {selectedShare.funderName} funding billing contact.
                  </p>
                ) : null}
              </div>
              {preview.canMarkSent ? (
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="rounded border-input"
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
            disabled={
              loadingPreview ||
              Boolean(previewError) ||
              !toEmail.trim() ||
              (needsFunder && !selectedFunderKey)
            }
            onClick={onSend}
          >
            Send invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
