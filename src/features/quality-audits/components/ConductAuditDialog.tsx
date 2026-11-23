import * as React from 'react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { feedbackSelectClass } from '@/features/complaints/components/FeedbackFormDialog'
import { FieldWithInfo } from '@/features/cqc-mock-inspection/components/InfoTip'
import { useBranchOptions } from '@/features/cqc-mock-inspection/components/StartInspectionDialog'
import { useAuditAreas, useAuditTemplates, useStartAudit } from '../hooks'
import { FREQUENCY_LABEL } from '../labels'
import { HELP } from '../help'

const WHOLE_ORG = ''

/** Conduct an audit now (not from a schedule): choose the audit and the branch. */
export function ConductAuditDialog({
  open,
  onOpenChange,
  onStarted,
  templateCode = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStarted: (auditId: string) => void
  templateCode?: string | null
}) {
  const { wholeOrg, options } = useBranchOptions(open)
  const areas = useAuditAreas()
  const templates = useAuditTemplates({}, open)
  const mutation = useStartAudit()
  const [code, setCode] = React.useState('')
  const [locationId, setLocationId] = React.useState(WHOLE_ORG)
  const [item, setItem] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setCode(templateCode ?? '')
    setLocationId(wholeOrg ? WHOLE_ORG : (options[0]?.id ?? WHOLE_ORG))
    setItem('')
    setError(null)
    // Only reset when the dialog opens.
  }, [open])

  // The audits grouped by area, in the areas' order; areas with no audits are left out.
  const groups = React.useMemo(() => {
    const list = templates.data ?? []
    const order = (areas.data ?? []).map(a => ({ code: a.code, name: a.name }))
    const known = new Set(order.map(a => a.code))
    const out = order
      .map(a => ({ label: a.name, items: list.filter(t => t.area?.code === a.code) }))
      .filter(g => g.items.length)
    const rest = list.filter(t => !t.area || !known.has(t.area.code))
    if (rest.length) out.push({ label: 'Other', items: rest })
    return out
  }, [templates.data, areas.data])
  const chosen = (templates.data ?? []).find(t => t.code === code) ?? null
  const usable = !chosen || !chosen.locationIds.length || (locationId !== WHOLE_ORG && chosen.locationIds.includes(locationId))

  const onStart = async () => {
    if (!chosen) return setError('Choose an audit.')
    if (!wholeOrg && !locationId) return setError('Choose your branch.')
    if (!usable) return setError('That audit is not used at this branch.')
    setError(null)
    try {
      const audit = await mutation.mutateAsync({
        templateCode: chosen.code,
        locationId: locationId || undefined,
        auditedItemValue: chosen.auditedItemLabel ? item.trim() || undefined : undefined,
      })
      toastSuccess('Audit started', audit.title)
      onOpenChange(false)
      onStarted(audit.id)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start the audit.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="conduct-audit-dialog">
        <DialogHeader>
          <DialogTitle>Conduct an audit</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <label htmlFor="conduct-template" className="text-sm font-medium text-foreground">
              Audit
            </label>
            <select
              id="conduct-template"
              className={`${feedbackSelectClass} mt-1`}
              value={code}
              onChange={e => setCode(e.target.value)}
              data-testid="conduct-template"
            >
              <option value="">{templates.isLoading ? 'Loading audits…' : groups.length ? 'Choose an audit…' : 'No audits yet'}</option>
              {groups.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.items.map(t => (
                    <option key={t.code} value={t.code}>
                      {t.title}
                      {t.isCustom ? ' (your own)' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {!templates.isLoading && !groups.length ? (
              <p className="mt-1.5 text-xs text-muted-foreground" data-testid="conduct-no-audits">
                There are no audits yet. Create a template under Audit templates.
              </p>
            ) : null}
          </div>
          <FieldWithInfo id="conduct-branch" label="Branch" help={HELP.conductBranch}>
            <select
              id="conduct-branch"
              className={feedbackSelectClass}
              value={locationId}
              onChange={e => setLocationId(e.target.value)}
              data-testid="conduct-branch"
            >
              {wholeOrg ? <option value={WHOLE_ORG}>Whole organisation</option> : null}
              {options.map(o => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </FieldWithInfo>
          {chosen ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm" data-testid="conduct-template-facts">
              {chosen.summary ? <p className="text-foreground">{chosen.summary}</p> : null}
              <p className="mt-1 text-xs text-muted-foreground">
                {chosen.area?.name ?? 'No area'} · {chosen.standardCount} standards in {chosen.sectionCount} section
                {chosen.sectionCount === 1 ? '' : 's'} · usually {FREQUENCY_LABEL[chosen.frequency].toLowerCase()} · about{' '}
                {chosen.estimatedMinutes} min
              </p>
            </div>
          ) : null}
          {chosen?.auditedItemLabel ? (
            <FieldWithInfo id="conduct-item" label={chosen.auditedItemLabel} help={HELP.auditedItem}>
              <Input id="conduct-item" value={item} onChange={e => setItem(e.target.value)} data-testid="conduct-item" />
            </FieldWithInfo>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void onStart()} disabled={mutation.isPending} data-testid="conduct-start">
            {mutation.isPending ? 'Starting…' : 'Start audit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
