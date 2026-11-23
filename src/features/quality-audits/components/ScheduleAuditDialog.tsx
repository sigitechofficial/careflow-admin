import * as React from 'react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { DateInput } from '@/shared/ui/date-time-input'
import { useAuthStore } from '@/features/auth/store'
import { feedbackSelectClass } from '@/features/complaints/components/FeedbackFormDialog'
import { FieldWithInfo } from '@/features/cqc-mock-inspection/components/InfoTip'
import { useBranchOptions } from '@/features/cqc-mock-inspection/components/StartInspectionDialog'
import type { AuditFrequency } from '../types'
import { useAuditTemplates, useCreateAuditSchedule } from '../hooks'
import { FREQUENCIES, FREQUENCY_LABEL } from '../labels'
import { HELP } from '../help'
import { useAccountableOptions } from './AuditFiltersBar'

const WHOLE_ORG = ''
const today = () => new Date().toISOString().slice(0, 10)

/** Schedule an audit: which one, where, how often, the window and who is accountable. */
export function ScheduleAuditDialog({
  open,
  onOpenChange,
  templateCode = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateCode?: string | null
}) {
  const me = useAuthStore(s => s.user?.id ?? '')
  const { wholeOrg, options } = useBranchOptions(open)
  const templates = useAuditTemplates({}, open)
  const people = useAccountableOptions(open)
  const mutation = useCreateAuditSchedule()
  const [code, setCode] = React.useState('')
  const [locationId, setLocationId] = React.useState(WHOLE_ORG)
  const [frequency, setFrequency] = React.useState<AuditFrequency>('MONTHLY')
  const [early, setEarly] = React.useState('2')
  const [late, setLate] = React.useState('2')
  const [first, setFirst] = React.useState(today())
  const [accountable, setAccountable] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const chosen = (templates.data ?? []).find(t => t.code === code) ?? null

  React.useEffect(() => {
    if (!open) return
    setCode(templateCode ?? '')
    setLocationId(wholeOrg ? WHOLE_ORG : (options[0]?.id ?? WHOLE_ORG))
    setFirst(today())
    setAccountable(me)
    setError(null)
    // Only reset when the dialog opens.
  }, [open])

  // The template's own frequency and window are the starting point.
  React.useEffect(() => {
    if (!chosen) return
    setFrequency(chosen.frequency)
    setEarly(String(chosen.earlyDays))
    setLate(String(chosen.lateDays))
  }, [chosen?.code])

  const days = (v: string) => (/^\d{1,2}$/.test(v) && Number(v) <= 60 ? Number(v) : null)

  const onSave = async () => {
    if (!chosen) return setError('Choose an audit.')
    if (!wholeOrg && !locationId) return setError('Choose your branch.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(first)) return setError('Choose the first due date.')
    const earlyDays = days(early)
    const lateDays = days(late)
    if (earlyDays === null || lateDays === null) return setError('The days early and late must be 0 to 60.')
    setError(null)
    try {
      await mutation.mutateAsync({
        templateCode: chosen.code,
        locationId: locationId || undefined,
        frequency,
        earlyDays,
        lateDays,
        firstDueDate: first,
        accountableUserId: accountable || undefined,
      })
      toastSuccess('Audit scheduled', `${chosen.title}: ${FREQUENCY_LABEL[frequency].toLowerCase()}`)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not schedule the audit.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="schedule-audit-dialog">
        <DialogHeader>
          <DialogTitle>Schedule an audit</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <label htmlFor="schedule-template" className="text-sm font-medium text-foreground">
              Audit
            </label>
            <select
              id="schedule-template"
              className={`${feedbackSelectClass} mt-1`}
              value={code}
              onChange={e => setCode(e.target.value)}
              data-testid="schedule-template"
            >
              <option value="">Choose an audit…</option>
              {(templates.data ?? []).map(t => (
                <option key={t.code} value={t.code}>
                  {t.area?.name ? `${t.area.name}: ` : ''}
                  {t.title}
                  {t.isCustom ? ' (your own)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldWithInfo id="schedule-branch" label="Branch" help={HELP.conductBranch}>
              <select
                id="schedule-branch"
                className={feedbackSelectClass}
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
                data-testid="schedule-branch"
              >
                {wholeOrg ? <option value={WHOLE_ORG}>Whole organisation</option> : null}
                {options.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FieldWithInfo>
            <FieldWithInfo id="schedule-frequency" label="How often" help={HELP.scheduleFirst}>
              <select
                id="schedule-frequency"
                className={feedbackSelectClass}
                value={frequency}
                onChange={e => setFrequency(e.target.value as AuditFrequency)}
                data-testid="schedule-frequency"
              >
                {FREQUENCIES.map(f => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABEL[f]}
                  </option>
                ))}
              </select>
            </FieldWithInfo>
            <FieldWithInfo id="schedule-first" label="First due date" help={HELP.scheduleFirst}>
              <DateInput id="schedule-first" value={first} onChange={e => setFirst(e.target.value)} data-testid="schedule-first" />
            </FieldWithInfo>
            <FieldWithInfo id="schedule-accountable" label="Person accountable" help={HELP.scheduleAccountable}>
              <select
                id="schedule-accountable"
                className={feedbackSelectClass}
                value={accountable}
                onChange={e => setAccountable(e.target.value)}
                data-testid="schedule-accountable"
              >
                {people.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.id === me ? `${p.label} (me)` : p.label}
                  </option>
                ))}
              </select>
            </FieldWithInfo>
          </div>
          <FieldWithInfo id="schedule-early" label="When it can be done" help={HELP.scheduleWindow}>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <span>Can be completed up to</span>
              <Input
                id="schedule-early"
                className="h-8 w-16"
                inputMode="numeric"
                value={early}
                onChange={e => setEarly(e.target.value)}
                aria-label="Days early"
                data-testid="schedule-early"
              />
              <span>day(s) early, or up to</span>
              <Input
                className="h-8 w-16"
                inputMode="numeric"
                value={late}
                onChange={e => setLate(e.target.value)}
                aria-label="Days late"
                data-testid="schedule-late"
              />
              <span>day(s) late, after which it is marked as missed.</span>
            </div>
          </FieldWithInfo>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void onSave()} disabled={mutation.isPending} data-testid="schedule-save">
            {mutation.isPending ? 'Scheduling…' : 'Schedule audit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
