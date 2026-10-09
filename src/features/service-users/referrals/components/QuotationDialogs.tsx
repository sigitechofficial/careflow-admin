import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import { nowOrgDatetimeLocal, orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'
import { useQuotationMutations } from '@/features/service-users/referrals/useReferrals'
import { useServiceUserVisitPlans } from '@/features/service-users/visit-plan/hooks'
import { EmployeePicker } from '@/features/complaints/components/FeedbackPickers'
import type {
  QuotationAction,
  QuotationChargeFrequency,
  QuotationDetail,
  QuotationPayerType,
  RefName,
  ReferralRow,
} from '@/features/service-users/referrals/referral-types'
import {
  ACCEPTANCE_METHODS,
  CHARGE_FREQUENCY_LABEL,
  DAY_CODES,
  PAYER_TYPE_LABEL,
  WEEKS_PER_MONTH,
  formatGbp,
  lineWeekly,
} from '@/features/service-users/referrals/referral-labels'
import { referralSelectClass, referralTextareaClass } from '@/features/service-users/referrals/components/ReferralFormFields'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'

type LineForm = {
  description: string
  daysOfWeek: string[]
  visitsPerWeek: string
  durationMinutes: string
  numberOfCarers: string
  hourlyRate: string
}
type ChargeForm = { description: string; amount: string; frequency: QuotationChargeFrequency }

const newLine = (): LineForm => ({
  description: '',
  daysOfWeek: [],
  visitsPerWeek: '7',
  durationMinutes: '30',
  numberOfCarers: '1',
  hourlyRate: '',
})

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className ?? 'space-y-1.5'}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function toNumberLine(l: LineForm) {
  return {
    visitsPerWeek: Number(l.visitsPerWeek) || 0,
    durationMinutes: Number(l.durationMinutes) || 0,
    numberOfCarers: Number(l.numberOfCarers) || 0,
    hourlyRate: Number(l.hourlyRate) || 0,
  }
}

/** Create or edit a draft quotation. Sent / accepted ones are revised, never edited. */
export function QuotationEditorDialog({
  serviceUserId,
  open,
  onOpenChange,
  editing,
  referrals,
  defaultReferralId,
  defaultPayerName,
  onSaved,
}: {
  serviceUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: QuotationDetail | null
  referrals: ReferralRow[]
  defaultReferralId?: string | null
  defaultPayerName?: string
  onSaved?: (id: string) => void
}) {
  const m = useQuotationMutations(serviceUserId)
  const visitPlans = useServiceUserVisitPlans(serviceUserId).data ?? []
  const saving = m.create.isPending || m.update.isPending

  const [referralId, setReferralId] = React.useState('')
  const [visitPlanId, setVisitPlanId] = React.useState('')
  const [responsible, setResponsible] = React.useState<RefName | null>(null)
  const [payerType, setPayerType] = React.useState<QuotationPayerType>('SERVICE_USER')
  const [payerName, setPayerName] = React.useState('')
  const [payerRelationship, setPayerRelationship] = React.useState('')
  const [payerEmail, setPayerEmail] = React.useState('')
  const [payerPhone, setPayerPhone] = React.useState('')
  const [payerAddress, setPayerAddress] = React.useState('')
  const [validUntil, setValidUntil] = React.useState('')
  const [startDate, setStartDate] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [terms, setTerms] = React.useState('')
  const [lines, setLines] = React.useState<LineForm[]>([newLine()])
  const [charges, setCharges] = React.useState<ChargeForm[]>([])
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setReferralId(editing?.referral?.id ?? defaultReferralId ?? '')
    setVisitPlanId(editing?.visitPlanId ?? '')
    setResponsible(editing?.responsibleEmployee ?? null)
    setPayerType(editing?.payerType ?? 'SERVICE_USER')
    setPayerName(editing?.payerName ?? defaultPayerName ?? '')
    setPayerRelationship(editing?.payerRelationship ?? '')
    setPayerEmail(editing?.payerEmail ?? '')
    setPayerPhone(editing?.payerPhone ?? '')
    setPayerAddress(editing?.payerAddress ?? '')
    if (editing) {
      setValidUntil(editing.validUntil ?? '')
    } else {
      // Default validity: 30 days.
      const d = new Date()
      d.setDate(d.getDate() + 30)
      setValidUntil(d.toISOString().slice(0, 10))
    }
    setStartDate(editing?.startDate ?? '')
    setNotes(editing?.notes ?? '')
    setTerms(editing?.terms ?? '')
    setLines(
      editing?.lines.length
        ? editing.lines.map(l => ({
            description: l.description,
            daysOfWeek: l.daysOfWeek,
            visitsPerWeek: String(l.visitsPerWeek),
            durationMinutes: String(l.durationMinutes),
            numberOfCarers: String(l.numberOfCarers),
            hourlyRate: String(l.hourlyRate),
          }))
        : [newLine()],
    )
    setCharges(
      (editing?.charges ?? []).map(c => ({ description: c.description, amount: String(c.amount), frequency: c.frequency })),
    )
    setError(null)
  }, [open, editing, defaultReferralId, defaultPayerName])

  const totals = React.useMemo(() => {
    let hours = 0
    let care = 0
    for (const l of lines) {
      const w = lineWeekly(toNumberLine(l))
      hours += w.hours
      care += w.cost
    }
    const sum = (f: QuotationChargeFrequency) =>
      charges.filter(c => c.frequency === f).reduce((s, c) => s + (Number(c.amount) || 0), 0)
    const weekly = care + sum('WEEKLY') + sum('MONTHLY') / WEEKS_PER_MONTH
    return { hours, care, weekly, monthly: weekly * WEEKS_PER_MONTH, oneOff: sum('ONE_OFF') }
  }, [lines, charges])

  const updateLine = (i: number, patch: Partial<LineForm>) =>
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const updateCharge = (i: number, patch: Partial<ChargeForm>) =>
    setCharges(prev => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))

  const onSave = async () => {
    const usedLines = lines.filter(l => l.description.trim() || l.hourlyRate)
    for (const l of usedLines) {
      if (!l.description.trim()) return setError('Each service needs a description.')
      if (!(Number(l.hourlyRate) >= 0) || l.hourlyRate === '') return setError('Enter an hourly rate for each service.')
      if (!(Number(l.visitsPerWeek) >= 1) || !(Number(l.durationMinutes) >= 5) || !(Number(l.numberOfCarers) >= 1)) {
        return setError('Visits per week, duration and carers must be filled in.')
      }
    }
    const usedCharges = charges.filter(c => c.description.trim() || c.amount)
    if (usedCharges.some(c => !c.description.trim() || c.amount === '')) {
      return setError('Each additional charge needs a description and amount.')
    }
    const body = {
      referralId: referralId || null,
      visitPlanId: visitPlanId || null,
      responsibleEmployeeId: responsible?.id ?? null,
      payerType,
      payerName: payerName.trim(),
      payerRelationship: payerRelationship.trim(),
      payerEmail: payerEmail.trim(),
      payerPhone: payerPhone.trim(),
      payerAddress: payerAddress.trim(),
      validUntil: validUntil || null,
      startDate: startDate || null,
      notes: notes.trim(),
      terms: terms.trim(),
      lines: usedLines.map(l => ({ description: l.description.trim(), daysOfWeek: l.daysOfWeek, ...toNumberLine(l) })),
      charges: usedCharges.map(c => ({ description: c.description.trim(), amount: Number(c.amount), frequency: c.frequency })),
    }
    setError(null)
    try {
      const saved = editing
        ? await m.update.mutateAsync({ id: editing.id, body })
        : await m.create.mutateAsync(body)
      toastSuccess(editing ? 'Quotation saved' : 'Quotation created', `${saved.referenceNumber} rev ${saved.revision}`)
      onSaved?.(saved.id)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="full">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Edit ${editing.referenceNumber} (revision ${editing.revision}, draft)` : 'New private care quotation'}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-5" data-testid="quotation-editor">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Referral">
              <select className={referralSelectClass} value={referralId} onChange={e => setReferralId(e.target.value)} data-testid="quotation-referral">
                <option value="">— None —</option>
                {referrals.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.referenceNumber}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Care package (visit plan)">
              <select className={referralSelectClass} value={visitPlanId} onChange={e => setVisitPlanId(e.target.value)}>
                <option value="">— Not yet created —</option>
                {visitPlans.map(vp => (
                  <option key={vp.id} value={vp.id}>
                    {vp.status} · from {String(vp.effectiveFrom).slice(0, 10)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Responsible employee">
              <EmployeePicker value={responsible} onChange={setResponsible} placeholder="Optional" testId="quotation-responsible" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Proposed start">
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </Field>
              <Field label="Valid until">
                <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} data-testid="quotation-valid-until" />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Payer</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Who pays">
                <select
                  className={referralSelectClass}
                  value={payerType}
                  onChange={e => setPayerType(e.target.value as QuotationPayerType)}
                  data-testid="quotation-payer-type"
                >
                  {Object.entries(PAYER_TYPE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Payer name">
                <Input value={payerName} onChange={e => setPayerName(e.target.value)} data-testid="quotation-payer-name" />
              </Field>
              {payerType !== 'SERVICE_USER' ? (
                <Field label="Relationship">
                  <Input value={payerRelationship} onChange={e => setPayerRelationship(e.target.value)} placeholder="e.g. Son" />
                </Field>
              ) : null}
              <Field label="Email">
                <Input type="email" value={payerEmail} onChange={e => setPayerEmail(e.target.value)} />
              </Field>
              <Field label="Phone">
                <Input value={payerPhone} onChange={e => setPayerPhone(e.target.value)} />
              </Field>
              <Field label="Invoice address" className="space-y-1.5 sm:col-span-2">
                <Input value={payerAddress} onChange={e => setPayerAddress(e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Proposed care services</h3>
              <Button type="button" size="sm" variant="outline" onClick={() => setLines(p => [...p, newLine()])} data-testid="quotation-add-line">
                <Plus className="mr-1 h-4 w-4" /> Add service
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Service</th>
                    <th className="px-2 py-2 font-medium">Days</th>
                    <th className="w-20 px-2 py-2 font-medium">Visits / wk</th>
                    <th className="w-20 px-2 py-2 font-medium">Minutes</th>
                    <th className="w-16 px-2 py-2 font-medium">Carers</th>
                    <th className="w-24 px-2 py-2 font-medium">£ / hour</th>
                    <th className="w-24 px-2 py-2 text-right font-medium">Hours / wk</th>
                    <th className="w-24 px-2 py-2 text-right font-medium">£ / week</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => {
                    const w = lineWeekly(toNumberLine(l))
                    return (
                      <tr key={i} className="border-b border-border last:border-0 align-top" data-testid="quotation-line">
                        <td className="px-2 py-1.5">
                          <Input value={l.description} onChange={e => updateLine(i, { description: e.target.value })} placeholder="e.g. Morning personal care" />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex flex-wrap gap-0.5">
                            {DAY_CODES.map(d => {
                              const on = l.daysOfWeek.includes(d)
                              return (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() =>
                                    updateLine(i, { daysOfWeek: on ? l.daysOfWeek.filter(x => x !== d) : [...l.daysOfWeek, d] })
                                  }
                                  className={cn(
                                    'rounded px-1.5 py-1 text-[11px] font-medium',
                                    on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70',
                                  )}
                                >
                                  {d.slice(0, 2)}
                                </button>
                              )
                            })}
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min={1} value={l.visitsPerWeek} onChange={e => updateLine(i, { visitsPerWeek: e.target.value })} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min={5} step={5} value={l.durationMinutes} onChange={e => updateLine(i, { durationMinutes: e.target.value })} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min={1} max={4} value={l.numberOfCarers} onChange={e => updateLine(i, { numberOfCarers: e.target.value })} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min={0} step="0.01" value={l.hourlyRate} onChange={e => updateLine(i, { hourlyRate: e.target.value })} data-testid="quotation-line-rate" />
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums">{w.hours.toFixed(2)}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums">{formatGbp(w.cost)}</td>
                        <td className="px-1 py-1.5">
                          <button
                            type="button"
                            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Remove"
                            onClick={() => setLines(p => (p.length > 1 ? p.filter((_, idx) => idx !== i) : [newLine()]))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Additional charges</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setCharges(p => [...p, { description: '', amount: '', frequency: 'WEEKLY' }])}
                data-testid="quotation-add-charge"
              >
                <Plus className="mr-1 h-4 w-4" /> Add charge
              </Button>
            </div>
            {charges.length ? (
              <div className="space-y-2">
                {charges.map((c, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[1fr_140px_140px_40px]" data-testid="quotation-charge">
                    <Input value={c.description} onChange={e => updateCharge(i, { description: e.target.value })} placeholder="e.g. Mileage, assessment fee" />
                    <Input type="number" min={0} step="0.01" value={c.amount} onChange={e => updateCharge(i, { amount: e.target.value })} placeholder="£" />
                    <select
                      className={referralSelectClass}
                      value={c.frequency}
                      onChange={e => updateCharge(i, { frequency: e.target.value as QuotationChargeFrequency })}
                    >
                      {Object.entries(CHARGE_FREQUENCY_LABEL).map(([v, lbl]) => (
                        <option key={v} value={v}>
                          {lbl}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Remove"
                      onClick={() => setCharges(p => p.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No additional charges.</p>
            )}
          </section>

          <section className="grid gap-3 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-4" data-testid="quotation-totals">
            <div>
              <div className="text-xs text-muted-foreground">Carer-hours per week</div>
              <div className="font-semibold tabular-nums">{totals.hours.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Estimated weekly cost</div>
              <div className="font-semibold tabular-nums">{formatGbp(totals.weekly)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Estimated monthly cost</div>
              <div className="font-semibold tabular-nums">{formatGbp(totals.monthly)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">One-off charges</div>
              <div className="font-semibold tabular-nums">{formatGbp(totals.oneOff)}</div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <Field label="Notes (internal)">
              <textarea rows={2} className={referralTextareaClass} value={notes} onChange={e => setNotes(e.target.value)} />
            </Field>
            <Field label="Terms shown to the payer">
              <textarea
                rows={2}
                className={referralTextareaClass}
                value={terms}
                onChange={e => setTerms(e.target.value)}
                placeholder="e.g. Invoiced weekly in arrears; 7 days' notice to cancel"
              />
            </Field>
          </section>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void onSave()} data-testid="quotation-save">
            {saving ? 'Saving…' : 'Save draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const ACTION_TITLE: Record<QuotationAction, string> = {
  SEND: 'Mark as sent',
  ACCEPT: 'Record acceptance',
  DECLINE: 'Record decline',
  WITHDRAW: 'Withdraw quotation',
}

export function QuotationStatusDialog({
  serviceUserId,
  quotation,
  action,
  onOpenChange,
}: {
  serviceUserId: string
  quotation: QuotationDetail
  action: QuotationAction | null
  onOpenChange: (open: boolean) => void
}) {
  const m = useQuotationMutations(serviceUserId)
  const [at, setAt] = React.useState('')
  const [acceptedByName, setAcceptedByName] = React.useState('')
  const [method, setMethod] = React.useState(ACCEPTANCE_METHODS[0])
  const [note, setNote] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!action) return
    setAt(nowOrgDatetimeLocal())
    setAcceptedByName(quotation.payerName ?? '')
    setMethod(ACCEPTANCE_METHODS[0])
    setNote('')
    setError(null)
  }, [action, quotation])
  if (!action) return null

  const onSave = async () => {
    if (action === 'ACCEPT' && !acceptedByName.trim()) return setError('Enter who accepted the quotation.')
    if (action === 'WITHDRAW' && !note.trim()) return setError('Give a reason for withdrawing.')
    try {
      await m.status.mutateAsync({
        id: quotation.id,
        body: {
          action,
          at: at ? orgDatetimeLocalToIso(at) : undefined,
          ...(action === 'ACCEPT' ? { acceptedByName: acceptedByName.trim(), acceptanceMethod: method } : {}),
          note: note.trim() || undefined,
        },
      })
      toastSuccess(ACTION_TITLE[action], `${quotation.referenceNumber} rev ${quotation.revision}`)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed.')
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            {ACTION_TITLE[action]} — {quotation.referenceNumber} rev {quotation.revision}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3" data-testid="quotation-status-dialog">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {action !== 'WITHDRAW' ? (
            <Field label="Date & time">
              <Input type="datetime-local" value={at} onChange={e => setAt(e.target.value)} />
            </Field>
          ) : null}
          {action === 'ACCEPT' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Accepted by *">
                <Input value={acceptedByName} onChange={e => setAcceptedByName(e.target.value)} data-testid="quotation-accepted-by" />
              </Field>
              <Field label="How">
                <select className={referralSelectClass} value={method} onChange={e => setMethod(e.target.value)}>
                  {ACCEPTANCE_METHODS.map(x => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ) : null}
          <Field label={action === 'WITHDRAW' ? 'Reason *' : action === 'DECLINE' ? 'Reason' : 'Note'}>
            <textarea
              rows={2}
              className={referralTextareaClass}
              value={note}
              onChange={e => setNote(e.target.value)}
              data-testid="quotation-status-note"
            />
          </Field>
          {action === 'ACCEPT' ? (
            <p className="text-xs text-muted-foreground">
              Earlier revisions of this quotation are kept unchanged and marked as superseded.
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={m.status.isPending} onClick={() => void onSave()} data-testid="quotation-status-save">
            {ACTION_TITLE[action]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
