import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { listMedicationEvents } from '@/features/service-users/api/medication-mar.api'
import { patchBodyMapMedicationSiteAdministration } from '@/features/service-users/body-map/api'
import { bodyMapKeys } from '@/features/service-users/body-map/keys'
import { Button } from '@/shared/ui/button'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  formatMarAdministrationEventLabel,
  MAR_LINK_ON_SAVE,
  type MarAdministrationLinkChoice,
} from '@/features/service-users/body-map/utils/mar-administration-event-label'
import { formatGbDateTime } from '@/features/service-users/medication/medication-event-display'
import { administrationStatusToDisplayCode } from '@/features/service-users/medication/mar-status-utils'

type LinkedEvent = {
  id: string
  status: string
  statusCode?: string | null
  actualDateTime?: string | null
}

type Props = {
  serviceUserId: string
  medicationId: string
  bodyMapRecordId: string
  linkedEventId?: string | null
  linkedEvent?: LinkedEvent | null
  /** When recording a new administration in MAR dialog */
  mode?: 'manage' | 'on-record'
  statusCode?: string | null
  onRecordLinkChoice?: (choice: MarAdministrationLinkChoice) => void
  recordLinkChoice?: MarAdministrationLinkChoice
}

export function BodyMapMarAdministrationLink({
  serviceUserId,
  medicationId,
  bodyMapRecordId,
  linkedEventId,
  linkedEvent,
  mode = 'manage',
  statusCode,
  onRecordLinkChoice,
  recordLinkChoice: controlledChoice,
}: Props) {
  const qc = useQueryClient()
  const [localChoice, setLocalChoice] = React.useState<MarAdministrationLinkChoice>('')

  const eventsQuery = useQuery({
    queryKey: [
      ...bodyMapKeys.all,
      'mar-events-picker',
      serviceUserId,
      medicationId,
    ] as const,
    queryFn: ({ signal }) =>
      listMedicationEvents(
        serviceUserId,
        { medicationId, page: 1, limit: 30 },
        { signal },
      ),
    enabled: Boolean(serviceUserId && medicationId),
  })

  const recordChoice = controlledChoice ?? localChoice
  const setRecordChoice = (next: MarAdministrationLinkChoice) => {
    setLocalChoice(next)
    onRecordLinkChoice?.(next)
  }

  React.useEffect(() => {
    if (mode !== 'on-record') return
    if (controlledChoice !== undefined) return
    if (statusCode === 'G' && !localChoice) {
      setLocalChoice(MAR_LINK_ON_SAVE)
    }
  }, [mode, statusCode, controlledChoice, localChoice])

  const patchMutation = useMutation({
    mutationFn: (eventId: string | null) =>
      patchBodyMapMedicationSiteAdministration(bodyMapRecordId, eventId),
    onSuccess: (_data, eventId) => {
      void qc.invalidateQueries({ queryKey: bodyMapKeys.all })
      toastSuccess(
        eventId === null
          ? 'MAR dose link cleared'
          : 'MAR dose linked to body map site',
      )
    },
    onError: err => toastApiError(err, 'Could not update MAR dose link'),
  })

  const events = eventsQuery.data?.data ?? []
  const linkedLabel = linkedEvent
    ? `${formatGbDateTime(linkedEvent.actualDateTime)} · ${
        linkedEvent.statusCode?.trim() ||
        administrationStatusToDisplayCode(linkedEvent.status) ||
        linkedEvent.status
      }`
    : null

  const applyManageLink = () => {
    if (!recordChoice || recordChoice === MAR_LINK_ON_SAVE) return
    void patchMutation.mutateAsync(recordChoice)
  }

  const clearLink = () => {
    setRecordChoice('')
    void patchMutation.mutateAsync(null)
  }

  if (mode === 'on-record') {
    const showOnSave = statusCode === 'G'
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-2.5 text-xs text-blue-950">
        <p className="font-semibold text-blue-900">MAR dose at body site</p>
        <p className="mt-1 text-blue-800/90">
          CQC expects external medicines to show which MAR entry matches where on the body it was
          applied.
        </p>
        {linkedLabel ? (
          <p className="mt-2">
            Currently linked: <span className="font-medium">{linkedLabel}</span>
          </p>
        ) : null}
        {eventsQuery.isLoading ? (
          <p className="mt-2 flex items-center gap-1 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading recent MAR entries…
          </p>
        ) : (
          <label className="mt-2 block">
            <span className="mb-1 block font-medium">Link to MAR entry</span>
            <select
              className="w-full rounded-md border border-blue-200 bg-white px-2 py-1.5 text-xs text-slate-900"
              value={recordChoice}
              onChange={e => setRecordChoice(e.target.value as MarAdministrationLinkChoice)}
            >
              <option value="">No link for this save</option>
              {showOnSave ? (
                <option value={MAR_LINK_ON_SAVE}>
                  Link to this administration when I save (Given)
                </option>
              ) : null}
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {formatMarAdministrationEventLabel(ev)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3 border-t border-blue-200/80 pt-3">
      <p className="font-semibold text-blue-900">MAR dose at site</p>
      {linkedLabel ? (
        <p className="mt-1">
          Linked: <span className="font-medium">{linkedLabel}</span>
        </p>
      ) : (
        <p className="mt-1 text-blue-800/90">No MAR administration linked yet.</p>
      )}
      {eventsQuery.isLoading ? (
        <p className="mt-2 flex items-center gap-1 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading recent MAR entries…
        </p>
      ) : (
        <label className="mt-2 block">
          <span className="mb-1 block font-medium">Select MAR entry</span>
          <select
            className="w-full rounded-md border border-blue-200 bg-white px-2 py-1.5 text-xs text-slate-900"
            value={
              recordChoice && recordChoice !== MAR_LINK_ON_SAVE
                ? recordChoice
                : linkedEventId ?? ''
            }
            onChange={e => setRecordChoice(e.target.value)}
            disabled={patchMutation.isPending}
          >
            <option value="">Choose administration…</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>
                {formatMarAdministrationEventLabel(ev)}
                {ev.id === linkedEventId ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 text-xs"
          disabled={
            patchMutation.isPending ||
            !recordChoice ||
            recordChoice === MAR_LINK_ON_SAVE ||
            recordChoice === linkedEventId
          }
          onClick={() => void applyManageLink()}
        >
          {patchMutation.isPending ? 'Saving…' : 'Save link'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          disabled={patchMutation.isPending || !linkedEventId}
          onClick={() => void clearLink()}
        >
          Clear link
        </Button>
      </div>
    </div>
  )
}
