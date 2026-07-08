import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toastApiError } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Combobox } from '@/shared/ui/combobox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useValidateInvoiceTemplate } from '@/features/billing/hooks/useInvoiceTemplates'
import type { InvoiceTemplate } from '@/features/billing/types/invoice-templates.types'
import { listServiceUsers } from '@/features/service-users/api/service-users.api'
import { useServiceUserEnterpriseFundings } from '@/features/service-users/hooks/useServiceUserTabs'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: InvoiceTemplate | null
}

function serviceUserLabel(row: {
  preferredName?: string | null
  firstName?: string | null
  lastName?: string | null
  serviceUserNumber?: string | null
  id: string
}): string {
  const name =
    row.preferredName?.trim() ||
    `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() ||
    'Unnamed service user'
  return row.serviceUserNumber ? `${name} (${row.serviceUserNumber})` : name
}

export function InvoiceTemplateValidateDialog({ open, onOpenChange, template }: Props) {
  const validateMutation = useValidateInvoiceTemplate()
  const [serviceUserId, setServiceUserId] = React.useState('')
  const [fundingId, setFundingId] = React.useState('')
  const [result, setResult] = React.useState<Awaited<
    ReturnType<typeof validateMutation.mutateAsync>
  > | null>(null)

  const serviceUsersQuery = useQuery({
    queryKey: ['billing', 'invoice-template-validate-service-users'],
    queryFn: () => listServiceUsers({ limit: 100, showInactive: false }),
    enabled: open,
  })

  const fundingsQuery = useServiceUserEnterpriseFundings(serviceUserId, open && !!serviceUserId)

  React.useEffect(() => {
    if (!open) {
      setServiceUserId('')
      setFundingId('')
      setResult(null)
    }
  }, [open])

  React.useEffect(() => {
    setFundingId('')
    setResult(null)
  }, [serviceUserId])

  const serviceUserOptions = React.useMemo(
    () =>
      (serviceUsersQuery.data?.rows ?? []).map(row => ({
        value: row.id,
        label: serviceUserLabel(row),
      })),
    [serviceUsersQuery.data],
  )

  const fundingOptions = React.useMemo(
    () =>
      (fundingsQuery.data?.rows ?? []).map(row => {
        const funder = row.funder?.name ?? 'No funder'
        const packageOrRef = row.packageName ?? row.fundingReference ?? row.fundingType.name
        const primary = row.isPrimary ? ' · Primary' : ''
        return {
          value: row.id,
          label: `${funder} — ${packageOrRef}${primary}`,
        }
      }),
    [fundingsQuery.data],
  )

  const onValidate = async () => {
    if (!template || !serviceUserId) {
      toastApiError(new Error('Please select a service user'), 'Validation')
      return
    }
    try {
      const data = await validateMutation.mutateAsync({
        templateId: template.id,
        serviceUserId,
        fundingId: fundingId || undefined,
      })
      setResult(data)
    } catch (err) {
      toastApiError(err, 'Validation failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Validate template fields</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {template ? (
            <p className="text-sm text-muted-foreground">
              Check required fields for{' '}
              <span className="font-medium text-foreground">{template.name}</span> against a service user
              before running an invoice export.
            </p>
          ) : null}

          <div>
            <p className="mb-1 text-sm font-medium">Service user *</p>
            <Combobox
              options={serviceUserOptions}
              value={serviceUserId}
              onChange={setServiceUserId}
              placeholder={
                serviceUsersQuery.isLoading ? 'Loading service users…' : 'Select service user'
              }
              disabled={serviceUsersQuery.isLoading}
            />
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">Funding contract</p>
            <Combobox
              options={fundingOptions}
              value={fundingId}
              onChange={setFundingId}
              placeholder={
                !serviceUserId
                  ? 'Select a service user first'
                  : fundingsQuery.isLoading
                    ? 'Loading funding contracts…'
                    : fundingOptions.length
                      ? 'Optional — defaults to primary'
                      : 'No funding contracts found'
              }
              disabled={!serviceUserId || fundingsQuery.isLoading}
              allowDeselect
            />
            {serviceUserId && !fundingsQuery.isLoading && fundingOptions.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                No funding records for this service user — validation will use available profile data only.
              </p>
            ) : null}
          </div>

          {result ? (
            <div
              className={
                result.isValid
                  ? 'rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900'
                  : 'rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm'
              }
            >
              {result.isValid ? (
                <p>All {result.requiredFieldCount} required fields are present.</p>
              ) : (
                <ul className="space-y-1">
                  {result.issues.map(issue => (
                    <li key={issue.fieldKey}>· {issue.message}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            disabled={validateMutation.isPending || !serviceUserId}
            onClick={() => void onValidate()}
          >
            {validateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run validation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
