import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { BellRing, CalendarClock, Trash2, Zap } from 'lucide-react'
import { PageHeader, Section } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Banner } from '@/shared/ui/banner'
import { Badge } from '@/shared/ui/badge'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { Skeleton } from '@/shared/ui/misc'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { apiJson } from '@/shared/api/api-client'
import { unwrapEnvelope } from '@/shared/api/envelope'
import { extractApiErrorMessage, toastError, toastSuccess } from '@/shared/lib/toast'
import { formatOpsDateTimeNumeric } from '@/shared/lib/operational-day.util'

type Group = 'Urgent' | 'Visits' | 'Medication'
type TestAlert = { key: string; group: Group; label: string; description: string; popsUp: boolean; opens: string }
type Catalogue = {
  alerts: TestAlert[]
  visit: { id: string; name: string; serviceUser: string; start: string; inProgress: boolean } | null
  openTestExceptions: number
}
type TriggerResult = { visit: { id: string; name: string; serviceUser: string; start: string }; raised: string[]; message: string }

const BASE = '/office-alerts/test'
const KEY = ['office-test-alerts'] as const
const GROUPS: Array<{ group: Group; text: string }> = [
  { group: 'Urgent', text: 'Ring and pop up for the office, like a real emergency.' },
  { group: 'Visits', text: 'Late, missed and short visits.' },
  { group: 'Medication', text: 'Missed, refused and controlled doses.' },
]

/**
 * Administration › Test office alerts (Super Admin): raises SOS, visit and medication alerts on a recent real visit,
 * sent only to you and marked [TEST], so you can click them and check where they take you.
 */
export default function TestOfficeAlertsPage() {
  const qc = useQueryClient()
  const cat = useQuery({ queryKey: KEY, queryFn: async () => unwrapEnvelope<Catalogue>(await apiJson<unknown>(BASE, { method: 'GET' })) })
  const [picked, setPicked] = React.useState<Set<string>>(new Set())
  const [last, setLast] = React.useState<TriggerResult | null>(null)
  const [confirmClear, setConfirmClear] = React.useState(false)

  const send = useMutation({
    mutationFn: async () => unwrapEnvelope<TriggerResult>(await apiJson<unknown>(BASE, { method: 'POST', body: JSON.stringify({ kinds: [...picked] }) })),
    onSuccess: r => {
      setLast(r)
      setPicked(new Set())
      toastSuccess('Test alerts sent', `${r.message} Open the bell at the top to click them.`)
    },
    onError: e => toastError('Test alerts not sent', extractApiErrorMessage(e)),
    onSettled: () => void qc.invalidateQueries({ queryKey: KEY }),
  })
  const clear = useMutation({
    mutationFn: async () => unwrapEnvelope<{ message: string }>(await apiJson<unknown>(BASE, { method: 'DELETE' })),
    onSuccess: r => {
      setLast(null)
      setConfirmClear(false)
      toastSuccess('Test alerts removed', r.message)
    },
    onError: e => toastError('Not removed', extractApiErrorMessage(e)),
    onSettled: () => void qc.invalidateQueries({ queryKey: KEY }),
  })

  const alerts = cat.data?.alerts ?? []
  const visit = cat.data?.visit ?? null
  const toggle = (keys: string[], on: boolean) =>
    setPicked(p => {
      const next = new Set(p)
      for (const k of keys) {
        if (on) next.add(k)
        else next.delete(k)
      }
      return next
    })
  const popUps = alerts.filter(a => a.popsUp && picked.has(a.key)).length

  return (
    <div className="space-y-5 p-6" data-testid="test-office-alerts-page">
      <PageHeader
        title="Test office alerts"
        description="Raise SOS, visit and medication alerts on a recent real visit, then click them in the bell to check what the office sees and where each one leads."
        icon={<BellRing className="h-4 w-4 text-muted-foreground" aria-hidden />}
      />
      <Banner
        variant="info"
        message="Only you get them: never other staff, carers or families, and nothing is emailed, texted or pushed (acknowledging a test SOS doesn’t notify the carer). Each is marked [TEST] and “Test alert”. Visit alerts also show in Live visits › Exceptions on that visit until you remove them."
      />

      {cat.isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : cat.isError ? (
        <Banner variant="destructive" message={extractApiErrorMessage(cat.error)} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm" data-testid="test-alerts-visit">
            <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden />
            {visit ? (
              <span>
                Alerts go on {new Date(visit.start).getTime() > Date.now() ? 'the next visit, ' : ''}<strong>{visit.name}</strong> for {visit.serviceUser}, {formatOpsDateTimeNumeric(visit.start)}
                {visit.inProgress ? <Badge variant="info" size="sm" className="ml-2">In progress</Badge> : null}
              </span>
            ) : (
              <span className="text-destructive">There are no visits on the rota yet, so there is nothing to raise test alerts on. Add a visit first.</span>
            )}
            {cat.data?.openTestExceptions ? (
              <span className="ml-auto text-muted-foreground">{cat.data.openTestExceptions} test alert{cat.data.openTestExceptions === 1 ? '' : 's'} in the exceptions queue</span>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {GROUPS.map(({ group, text }) => {
              const items = alerts.filter(a => a.group === group)
              const allOn = items.length > 0 && items.every(a => picked.has(a.key))
              return (
                <Section
                  key={group}
                  title={group}
                  description={text}
                  action={
                    <Button size="sm" variant="ghost" onClick={() => toggle(items.map(a => a.key), !allOn)}>
                      {allOn ? 'None' : 'All'}
                    </Button>
                  }
                >
                  <div className="space-y-2">
                    {items.map(a => (
                      <label
                        key={a.key}
                        className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-muted/40 ${picked.has(a.key) ? 'border-primary/50 bg-primary/5' : ''}`}
                        data-testid={`test-alert-${a.key}`}
                      >
                        <Checkbox className="mt-0.5" checked={picked.has(a.key)} onCheckedChange={v => toggle([a.key], v === true)} />
                        <span className="text-sm">
                          <span className="flex flex-wrap items-center gap-1.5 font-medium">
                            {a.label}
                            {a.popsUp ? (
                              <Badge variant="warning" size="sm" className="gap-1">
                                <Zap className="h-3 w-3" aria-hidden /> Pops up
                              </Badge>
                            ) : null}
                          </span>
                          <span className="block text-xs text-muted-foreground">{a.description}</span>
                          <span className="block text-xs text-muted-foreground">Click opens: {a.opens}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </Section>
              )
            })}
          </div>
        </>
      )}

      {last ? (
        <div className="space-y-2" data-testid="test-alerts-result">
          <Banner variant="success" message={`Raised on “${last.visit.name}” (${last.visit.serviceUser}, ${formatOpsDateTimeNumeric(last.visit.start)}): ${last.raised.join(', ')}. Open the bell at the top to click them.`} />
          <Button asChild variant="outline" size="sm">
            <Link to="/ecm/live" search={{ tab: 'exceptions', period: 'today', jobId: last.visit.id } as never}>
              Open this visit in Live visits › Exceptions
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="sticky bottom-0 z-20 -mx-6 border-t bg-background/95 px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <span className="min-w-0 flex-1 text-sm text-muted-foreground">
            {picked.size ? `${picked.size} chosen${popUps ? `, ${popUps} will pop up on your screen` : ''}.` : 'Choose the alerts to try.'}
          </span>
          <Button variant="outline" onClick={() => setConfirmClear(true)} disabled={clear.isPending} data-testid="remove-test-alerts">
            <Trash2 className="mr-1 h-4 w-4" /> Remove all test alerts
          </Button>
          <Button onClick={() => send.mutate()} disabled={!picked.size || !visit || send.isPending} data-testid="send-test-alerts">
            <BellRing className="mr-1 h-4 w-4" /> {send.isPending ? 'Sending…' : picked.size ? `Send ${picked.size} to me` : 'Send to me'}
          </Button>
        </div>
      </div>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove all test alerts?</DialogTitle>
            <DialogDescription>
              Deletes every [TEST] visit exception (anyone’s) and your test notifications. Real alerts are not touched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => clear.mutate()} disabled={clear.isPending} data-testid="confirm-remove-test-alerts">
              {clear.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
