import * as React from 'react'
import { Plus, Printer } from 'lucide-react'
import { CarePlanFormAccordion } from '@/features/service-users/care-plan/CarePlanFormAccordion'
import {
  CARE_PLAN_CONSENT_META,
  consentShowClosed,
  DEFAULT_CONSENT_CATEGORIES,
  formatConsentDateTime,
  parseConsentRecords,
  setConsentRecords,
  setConsentShowClosed,
  type CarePlanConsentCategory,
  type CarePlanConsentRecord,
} from '@/features/service-users/care-plan/care-plan-consent-meta'
import type { CarePlanDraftValues } from '@/features/service-users/care-plan/care-plan-draft-storage'
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

export function CarePlanConsentCapacitySection({
  serviceUserName,
  values,
  onChange,
  disabled,
  recordedByName,
}: {
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
        id: crypto.randomUUID(),
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
    <div className="space-y-4" data-testid="care-plan-consent-capacity">
      <div ref={printRef} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <h3 className="text-lg font-semibold text-foreground">
            {possessive} Consent and Mental Capacity List
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              disabled={disabled}
              onClick={() => openAdd()}
              title="Add new consent"
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
              <Label className="text-sm font-normal text-muted-foreground">Show Closed Consent</Label>
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

        <div className="space-y-2">
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
