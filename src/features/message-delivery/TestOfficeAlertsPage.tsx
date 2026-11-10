import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { BellRing, Trash2 } from 'lucide-react'
import { PageHeader, Section } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Banner } from '@/shared/ui/banner'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { Skeleton } from '@/shared/ui/misc'
import { apiJson } from '@/shared/api/api-client'
import { unwrapEnvelope } from '@/shared/api/envelope'
import { extractApiErrorMessage, toastError, toastSuccess } from '@/shared/lib/toast'

type TestAlert = { key: string; group: 'Urgent' | 'Visits' | 'Medication'; label: string; description: string }
type TriggerResult = { visit: { name: string; serviceUser: string; start: string }; raised: string[]; message: string }

const BASE = '/office-alerts/test'
const GROUPS: Array<TestAlert['group']> = ['Urgent', 'Visits', 'Medication']
const GROUP_TEXT: Record<TestAlert['group'], string> = {
  Urgent: 'Ring and pop up for the office, like a real emergency.',
  Visits: 'Late, missed and short visits.',
  Medication: 'MAR alerts.',
}

/**
 * Administration › Test office alerts (Super Admin): raises SOS, visit and medication alerts on a recent real visit,
 * sent only to you and marked [TEST], so you can click them and check where they take you.
 */
export default function TestOfficeAlertsPage() {
  const list = useQuery({
    queryKey: ['office-test-alerts'],
    queryFn: async () => unwrapEnvelope<TestAlert[]>(await apiJson<unknown>(BASE, { method: 'GET' })),
  })
  const [picked, setPicked] = React.useState<Set<string>>(new Set())
  const [last, setLast] = React.useState<TriggerResult | null>(null)

  const send = useMutation({
    mutationFn: async () =>
      unwrapEnvelope<TriggerResult>(await apiJson<unknown>(BASE, { method: 'POST', body: JSON.stringify({ kinds: [...picked] }) })),
    onSuccess: r => {
      setLast(r)
      toastSuccess('Test alerts sent', r.message)
    },
    onError: e => toastError('Test alerts not sent', extractApiErrorMessage(e)),
  })
  const clear = useMutation({
    mutationFn: async () => unwrapEnvelope<{ message: string }>(await apiJson<unknown>(BASE, { method: 'DELETE' })),
    onSuccess: r => {
      setLast(null)
      toastSuccess('Test alerts removed', r.message)
    },
    onError: e => toastError('Not removed', extractApiErrorMessage(e)),
  })

  const items = list.data ?? []
  const toggle = (key: string, on: boolean) =>
    setPicked(p => {
      const next = new Set(p)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })

  return (
    <div className="space-y-6 p-6" data-testid="test-office-alerts-page">
      <PageHeader
        title="Test office alerts"
        description="Raise SOS, visit and medication alerts on a recent real visit, then click them in the bell to check where they take you."
        icon={<BellRing className="h-4 w-4 text-muted-foreground" aria-hidden />}
      />
      <Banner
        variant="info"
        message="Test alerts go only to you, never to other staff, carers or families, and nothing is emailed or texted. Each is marked [TEST]. Visit alerts also appear in Live visits › Exceptions for that visit until you remove them."
      />
      {list.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : list.isError ? (
        <Banner variant="destructive" message={extractApiErrorMessage(list.error)} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {GROUPS.map(g => (
            <Section key={g} title={g} description={GROUP_TEXT[g]}>
              <div className="space-y-2">
                {items
                  .filter(a => a.group === g)
                  .map(a => (
                    <label key={a.key} className="flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 hover:bg-muted/40" data-testid={`test-alert-${a.key}`}>
                      <Checkbox className="mt-0.5" checked={picked.has(a.key)} onCheckedChange={v => toggle(a.key, v === true)} />
                      <span className="text-sm">
                        <span className="font-medium">{a.label}</span>
                        <span className="block text-xs text-muted-foreground">{a.description}</span>
                      </span>
                    </label>
                  ))}
              </div>
            </Section>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => send.mutate()} disabled={!picked.size || send.isPending} data-testid="send-test-alerts">
          <BellRing className="mr-1 h-4 w-4" /> {send.isPending ? 'Sending…' : `Send ${picked.size || ''} to me`.replace('  ', ' ')}
        </Button>
        <Button variant="outline" onClick={() => setPicked(new Set(items.map(i => i.key)))} disabled={!items.length}>
          Select all
        </Button>
        <Button variant="ghost" onClick={() => setPicked(new Set())} disabled={!picked.size}>
          Clear selection
        </Button>
        <Button variant="outline" className="ml-auto" onClick={() => clear.mutate()} disabled={clear.isPending} data-testid="remove-test-alerts">
          <Trash2 className="mr-1 h-4 w-4" /> Remove all test alerts
        </Button>
      </div>
      {last ? (
        <Banner
          variant="success"
          message={`Raised on “${last.visit.name}” (${last.visit.serviceUser}, ${new Date(last.visit.start).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}): ${last.raised.join(', ')}. Open the bell at the top to click them.`}
        />
      ) : null}
    </div>
  )
}
