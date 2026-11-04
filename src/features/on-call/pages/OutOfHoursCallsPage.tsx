import * as React from 'react'
import { Loader2, Pencil, PhoneIncoming, Plus } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { useCloseOnCallCall, useOnCallCalls } from '@/features/on-call/hooks/useOnCall'
import {
  CALLER_TYPE_LABEL,
  CATEGORY_LABEL,
  type OnCallCallRow,
  type OnCallCallStatus,
} from '@/features/on-call/types'
import { OnCallCallDialog } from '@/features/on-call/components/OnCallCallDialog'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { ContentCard } from '@/shared/ui/content-section'
import { Label, Textarea } from '@/shared/ui/form-field'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import { cn } from '@/shared/lib/utils'

const VIEWS: { value: OnCallCallStatus | 'ALL'; label: string }[] = [
  { value: 'OPEN', label: 'Open — morning handover' },
  { value: 'ALL', label: 'All calls' },
]

export default function OutOfHoursCallsPage() {
  const canLog = useAuthStore(s => s.can('on_call.log'))
  const [view, setView] = React.useState<OnCallCallStatus | 'ALL'>('OPEN')
  const [dialog, setDialog] = React.useState<{ open: boolean; call: OnCallCallRow | null }>({ open: false, call: null })
  const [closing, setClosing] = React.useState<OnCallCallRow | null>(null)
  const [closingNote, setClosingNote] = React.useState('')

  const callsQuery = useOnCallCalls(view)
  const closeMutation = useCloseOnCallCall()
  const closeCall = () => {
    if (!closing) return
    closeMutation.mutate(
      { id: closing.id, closingNote: closingNote.trim() },
      {
        onSuccess: () => {
          toastSuccess('Call closed')
          setClosing(null)
        },
        onError: e => toastApiError(e, 'Could not close the call'),
      },
    )
  }

  const rows = callsQuery.data ?? []

  return (
    <div className="flex flex-col gap-4" data-testid="out-of-hours-calls-page">
      <PageHeader
        title="Out-of-hours calls"
        description="Calls taken by on-call while the office is closed. Open calls are the morning handover for the office."
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PhoneIncoming className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Out-of-hours calls' }]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-border p-0.5" role="tablist">
          {VIEWS.map(v => (
            <button
              key={v.value}
              type="button"
              role="tab"
              aria-selected={view === v.value}
              className={cn(
                'rounded px-3 py-1.5 text-sm',
                view === v.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
              onClick={() => setView(v.value)}
              data-testid={`on-call-calls-view-${v.value}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        {canLog ? (
          <Button type="button" size="sm" className="ml-auto" onClick={() => setDialog({ open: true, call: null })} data-testid="on-call-log-call">
            <Plus className="mr-1.5 h-4 w-4" />
            Record a call
          </Button>
        ) : null}
      </div>

      <ContentCard className="overflow-hidden p-0">
        {callsQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          </div>
        ) : callsQuery.isError ? (
          <p className="p-4 text-sm text-destructive">Could not load the calls.</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {view === 'OPEN' ? 'No open calls — nothing to hand over.' : 'No calls recorded yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-muted/95">
                <tr className="border-b border-border">
                  {['Received', 'Caller', 'About', 'Reason', 'What happened', 'Taken by', 'Status', ''].map(h => (
                    <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-b border-border align-top last:border-0" data-testid={`on-call-call-${row.id}`}>
                    <td className="whitespace-nowrap px-3 py-2.5">{formatOrganisationDateTime(row.receivedAt)}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-foreground">{row.callerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {CALLER_TYPE_LABEL[row.callerType]}
                        {row.callerPhone ? ` · ${row.callerPhone}` : ''}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">{row.serviceUserName ?? '—'}</td>
                    <td className="px-3 py-2.5">{CATEGORY_LABEL[row.category]}</td>
                    <td className="max-w-[22rem] px-3 py-2.5">
                      <p className="whitespace-pre-wrap">{row.summary}</p>
                      {row.actionTaken ? (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">Done: {row.actionTaken}</p>
                      ) : null}
                      {row.status === 'CLOSED' && row.closingNote ? (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                          Closed{row.closedByName ? ` by ${row.closedByName}` : ''}: {row.closingNote}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">{row.takenByName ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {row.status === 'OPEN' ? (
                        <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                          {row.followUpRequired ? 'Open — follow up' : 'Open'}
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                          Closed
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      {canLog && row.status === 'OPEN' ? (
                        <span className="inline-flex gap-1">
                          <Button type="button" size="sm" variant="ghost" aria-label="Change call" onClick={() => setDialog({ open: true, call: row })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setClosingNote('')
                              setClosing(row)
                            }}
                            data-testid={`on-call-close-${row.id}`}
                          >
                            Close
                          </Button>
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>

      <OnCallCallDialog open={dialog.open} call={dialog.call} onClose={() => setDialog({ open: false, call: null })} />

      <Dialog open={!!closing} onOpenChange={o => !o && setClosing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close call</DialogTitle>
            <DialogDescription>Say what was done so the call can be closed.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Label required>What was done</Label>
            <Textarea
              rows={3}
              maxLength={1000}
              value={closingNote}
              onChange={e => setClosingNote(e.target.value)}
              data-testid="on-call-closing-note"
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setClosing(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={closingNote.trim().length < 3 || closeMutation.isPending}
              onClick={closeCall}
              data-testid="on-call-close-save"
            >
              {closeMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Close call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
