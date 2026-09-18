import * as React from 'react'
import { Loader2, Plus, Printer } from 'lucide-react'
import { CarePlanFormAccordion } from '@/features/service-users/care-plan/CarePlanFormAccordion'
import {
  consentShowClosed,
  DEFAULT_CONSENT_CATEGORIES,
  formatConsentDateTime,
  parseConsentRecords,
  setConsentRecords,
  setConsentShowClosed,
  type CarePlanConsentCategory,
  type CarePlanConsentRecord,
} from '@/features/service-users/care-plan/care-plan-consent-meta'
import { mapIaConsentCapacityForCarePlan } from '@/features/service-users/care-plan/care-plan-consent-capacity.util'
import type { CarePlanDraftValues } from '@/features/service-users/care-plan/care-plan-draft-storage'
import { createClientUuid } from '@/shared/lib/create-client-uuid'
import { useCarePlanIaSource } from '@/features/service-users/hooks/useCarePlanIaSource'
import { useInitialAssessmentAnswers } from '@/features/service-users/initial-assessment/hooks/useInitialAssessmentEnterprise'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Switch } from '@/shared/ui/toggle-controls'
import { cn } from '@/shared/lib/utils'

function ConsentCategoryPanel({
  category,
  records,
  disabled,
  onAdd,
  onEdit,
}: {
  category: CarePlanConsentCategory
  records: CarePlanConsentRecord[]
  disabled?: boolean
  onAdd: (categoryId: string) => void
  onEdit: (record: CarePlanConsentRecord) => void
}) {
  return (
    <CarePlanFormAccordion title={category.name} className="mb-2">
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => onAdd(category.id)}
          >
            Add consent
          </Button>
        </div>
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium" style={{ width: '25%' }}>
                  Consent Reason
                </th>
                <th className="px-3 py-2 font-medium" style={{ width: '20%' }}>
                  Date Created
                </th>
                <th className="px-3 py-2 font-medium" style={{ width: '8%' }}>
                  Status
                </th>
                <th className="px-3 py-2 font-medium" style={{ width: '20%' }}>
                  Outcome
                </th>
                <th className="px-3 py-2 font-medium" style={{ width: '14%' }}>
                  Recorded by
                </th>
                <th className="px-3 py-2 font-medium" style={{ width: '13%' }} />
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    No consent records in this category.
                  </td>
                </tr>
              ) : (
                records.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="px-3 py-2">{row.reason}</td>
                    <td className="px-3 py-2">{row.dateCreated}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{row.outcome || '—'}</td>
                    <td className="px-3 py-2">{row.recordedBy}</td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-primary"
                        disabled={disabled}
                        onClick={() => onEdit(row)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </CarePlanFormAccordion>
  )
}

type ConsentFormState = {
  categoryId: string
  reason: string
  outcome: string
  status: 'Open' | 'Closed'
}

const defaultCategoryId = DEFAULT_CONSENT_CATEGORIES[0]?.id ?? '1'

const emptyForm = (categoryId = defaultCategoryId): ConsentFormState => ({
  categoryId,
  reason: '',
  outcome: '',
  status: 'Open',
})

function IaConsentCapacityPanel({ serviceUserId }: { serviceUserId: string }) {
  const iaSource = useCarePlanIaSource(serviceUserId)
  const submissionId = iaSource.submission?.id ?? null
  const answersQuery = useInitialAssessmentAnswers(
    serviceUserId,
    submissionId,
    iaSource.canRead && Boolean(submissionId),
  )

  const iaDisplay = React.useMemo(
    () =>
      mapIaConsentCapacityForCarePlan(answersQuery.data ?? [], {
        submittedAt: iaSource.submission?.submittedAt,
        submissionMetadata: iaSource.submission?.metadata ?? null,
      }),
    [answersQuery.data, iaSource.submission?.submittedAt, iaSource.submission?.metadata],
  )

  const iaLoading =
    iaSource.submissionsQuery.isLoading || (Boolean(submissionId) && answersQuery.isLoading)

  return (
    <section className="space-y-3" aria-labelledby="care-plan-ia-consent-heading">
      <div>
        <h3 id="care-plan-ia-consent-heading" className="text-sm font-semibold text-foreground">
          Information from Initial Assessment
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Read-only consent and mental capacity from the latest eligible Initial Assessment. Not stored
          on this care plan draft.
        </p>
      </div>

      {iaLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading assessment consent…
        </div>
      ) : !submissionId || !iaDisplay.hasContent ? (
        <p
          className="rounded-sm border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground"
          data-testid="care-plan-ia-consent-empty"
        >
          No consent or mental capacity information from Initial Assessment
        </p>
      ) : (
        <div
          className="rounded-lg border border-border/80 bg-card shadow-sm"
          data-testid="care-plan-ia-consent-panel"
        >
          <div className="flex">
            <div className="w-1 shrink-0 rounded-l-lg bg-sky-500" aria-hidden />
            <div className="min-w-0 flex-1 px-4 py-3.5">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                <h4 className="text-[15px] font-semibold tracking-tight text-foreground">
                  Consent & mental capacity
                </h4>
                <span className="mt-0.5 shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Read-only
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" size="sm" className="font-normal text-muted-foreground">
                  From Initial Assessment
                </Badge>
              </div>

              <dl className="mt-3 space-y-3">
                {iaDisplay.consentStatus ? (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Consent status
                    </dt>
                    <dd
                      className="mt-0.5 text-sm leading-relaxed text-foreground/90"
                      data-testid="care-plan-ia-consent-status"
                    >
                      {iaDisplay.consentStatus}
                    </dd>
                  </div>
                ) : null}

                {iaDisplay.mentalCapacityOutcome ? (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Mental capacity outcome
                    </dt>
                    <dd
                      className="mt-0.5 text-sm leading-relaxed text-foreground/90"
                      data-testid="care-plan-ia-capacity-outcome"
                    >
                      {iaDisplay.mentalCapacityOutcome}
                    </dd>
                  </div>
                ) : null}

                {iaDisplay.mcaSummary ? (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      MCA summary
                    </dt>
                    <dd
                      className="mt-0.5 text-sm leading-relaxed text-foreground/90"
                      data-testid="care-plan-ia-mca-summary"
                    >
                      {iaDisplay.mcaSummary}
                    </dd>
                  </div>
                ) : null}

                {iaDisplay.relevantInformation.length > 0 ? (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Relevant consent information
                    </dt>
                    <dd className="mt-1.5">
                      <ul
                        className="space-y-1.5 text-sm text-foreground/90"
                        data-testid="care-plan-ia-consent-info"
                      >
                        {iaDisplay.relevantInformation.map((item) => (
                          <li key={`${item.label}:${item.value}`} className="flex flex-wrap gap-x-2">
                            <span className="font-medium text-muted-foreground">{item.label}</span>
                            <span>{item.value}</span>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                ) : null}

                {iaDisplay.assessmentDateLabel ? (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Assessment date
                    </dt>
                    <dd
                      className="mt-0.5 text-sm text-foreground/90"
                      data-testid="care-plan-ia-consent-date"
                    >
                      {iaDisplay.assessmentDateLabel}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <p
                className={cn('mt-3 text-xs text-muted-foreground')}
                data-testid="care-plan-ia-consent-source"
              >
                {iaDisplay.sourceLabel}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export function CarePlanConsentCapacitySection({
  serviceUserId,
  serviceUserName,
  values,
  onChange,
  disabled,
  recordedByName,
}: {
  serviceUserId: string
  serviceUserName: string
  values: CarePlanDraftValues
  onChange: (v: CarePlanDraftValues) => void
  disabled?: boolean
  recordedByName: string
}) {
  const printRef = React.useRef<HTMLDivElement>(null)
  const allRecords = React.useMemo(() => parseConsentRecords(values), [values])
  const showClosed = consentShowClosed(values)

  const visibleRecords = React.useMemo(
    () => (showClosed ? allRecords : allRecords.filter((r) => r.status !== 'Closed')),
    [allRecords, showClosed],
  )

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<ConsentFormState>(emptyForm())

  const openAdd = (categoryId?: string) => {
    setEditingId(null)
    setForm(emptyForm(categoryId ?? defaultCategoryId))
    setDialogOpen(true)
  }

  const openEdit = (record: CarePlanConsentRecord) => {
    setEditingId(record.id)
    setForm({
      categoryId: record.categoryId,
      reason: record.reason,
      outcome: record.outcome,
      status: record.status,
    })
    setDialogOpen(true)
  }

  const saveRecord = () => {
    const reason = form.reason.trim()
    if (!reason) return
    const { date, time } = formatConsentDateTime()
    const dateCreated = `${date} ${time}`

    if (editingId) {
      const next = allRecords.map((r) =>
        r.id === editingId
          ? {
              ...r,
              categoryId: form.categoryId,
              reason,
              outcome: form.outcome.trim(),
              status: form.status,
            }
          : r,
      )
      onChange(setConsentRecords(values, next))
    } else {
      const row: CarePlanConsentRecord = {
        id: createClientUuid(),
        categoryId: form.categoryId,
        reason,
        dateCreated,
        status: form.status,
        outcome: form.outcome.trim(),
        recordedBy: recordedByName,
      }
      onChange(setConsentRecords(values, [...allRecords, row]))
    }
    setDialogOpen(false)
  }

  const handlePrint = () => {
    const el = printRef.current
    if (!el) return
    const win = window.open('', '_blank', 'noopener,noreferrer')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>${serviceUserName} — Consent List</title>
      <style>body{font-family:system-ui,sans-serif;padding:16px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f4f4f4}</style></head><body>`)
    win.document.write(`<h1>${serviceUserName}'s Consent and Mental Capacity List</h1>`)
    win.document.write(el.innerHTML)
    win.document.write('</body></html>')
    win.document.close()
    win.focus()
    win.print()
  }

  const possessive = serviceUserName.endsWith('s') ? `${serviceUserName}'` : `${serviceUserName}'s`

  return (
    <div className="space-y-8" data-testid="care-plan-consent-capacity">
      <IaConsentCapacityPanel serviceUserId={serviceUserId} />

      <section className="space-y-4" aria-labelledby="care-plan-manual-consent-heading">
        <div ref={printRef} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3
                id="care-plan-manual-consent-heading"
                className="text-lg font-semibold text-foreground"
              >
                Care Plan Consent Records
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {possessive} plan-specific consents. Saved with draft / publish.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="sm"
                disabled={disabled}
                onClick={() => openAdd()}
                title="Add new consent"
                data-testid="care-plan-manual-consent-add"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handlePrint}
                title={`Print ${serviceUserName} consent list`}
              >
                <Printer className="mr-1 h-4 w-4" />
                Print
              </Button>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-normal text-muted-foreground">
                  Show Closed Consent
                </Label>
                <Switch
                  checked={showClosed}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    onChange(setConsentShowClosed(values, checked))
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-2" data-testid="care-plan-manual-consent-list">
            {DEFAULT_CONSENT_CATEGORIES.map((category) => (
              <ConsentCategoryPanel
                key={category.id}
                category={category}
                records={visibleRecords.filter((r) => r.categoryId === category.id)}
                disabled={disabled}
                onAdd={openAdd}
                onEdit={openEdit}
              />
            ))}
          </div>
        </div>
      </section>

      {dialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-dialog-title"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
            <h4 id="consent-dialog-title" className="text-base font-semibold">
              {editingId ? 'View / edit consent' : 'Add new consent'}
            </h4>
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={form.categoryId}
                  disabled={disabled}
                  onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_CONSENT_CATEGORIES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="consent-reason">Consent reason</Label>
                <Input
                  id="consent-reason"
                  value={form.reason}
                  disabled={disabled}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="consent-outcome">Outcome</Label>
                <Input
                  id="consent-outcome"
                  value={form.outcome}
                  disabled={disabled}
                  onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  disabled={disabled}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as 'Open' | 'Closed' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={disabled || !form.reason.trim()} onClick={saveRecord}>
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
