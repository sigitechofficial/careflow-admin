import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import {
  createSpecialVisit,
  specialVisitKeys,
  type CreateSpecialVisitBody,
} from '@/features/special-visits/api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Label, Textarea } from '@/shared/ui/form-field'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

/** datetime-local value (treated as UTC) → ISO string. */
function localInputToIso(value: string): string | null {
  return value ? `${value}:00.000Z` : null
}

type Draft = {
  serviceUserId: string
  start: string
  end: string
  title: string
  notes: string
}

export function SpecialVisitFormDialog({
  open,
  onClose,
  employeeId,
  weekStart,
  remainingHours,
}: {
  open: boolean
  onClose: () => void
  employeeId: string
  /** 'YYYY-MM-DD' Monday of the selected week. */
  weekStart: string
  /** Remaining contracted hours for the week (for the soft over-limit warning). */
  remainingHours: number | undefined
}) {
  const qc = useQueryClient()

  const defaultDraft = React.useCallback(
    (): Draft => ({
      serviceUserId: '',
      start: `${weekStart}T09:00`,
      end: `${weekStart}T10:00`,
      title: '',
      notes: '',
    }),
    [weekStart],
  )

  const [draft, setDraft] = React.useState<Draft>(defaultDraft)
  const [error, setError] = React.useState<string | null>(null)
  const [serviceUserSearch, setServiceUserSearch] = React.useState('')
  const [selectedServiceUserName, setSelectedServiceUserName] = React.useState('')

  React.useEffect(() => {
    if (open) {
      setDraft(defaultDraft())
      setError(null)
      setServiceUserSearch('')
      setSelectedServiceUserName('')
    }
  }, [open, defaultDraft])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft(d => ({ ...d, [key]: value }))

  const serviceUsersQuery = useServiceUsers(
    { limit: 50, search: serviceUserSearch.trim() || undefined },
    open,
  )

  const serviceUserOptions = React.useMemo<ComboboxOption[]>(() => {
    const options = (serviceUsersQuery.data?.rows ?? []).map(su => ({
      value: su.id,
      label: [su.firstName, su.lastName].filter(Boolean).join(' ') || 'Unnamed',
      description: su.serviceUserNumber ?? undefined,
    }))
    // Keep the chosen service user visible even when the server-side search excludes them.
    if (draft.serviceUserId && !options.some(o => o.value === draft.serviceUserId)) {
      options.unshift({
        value: draft.serviceUserId,
        label: selectedServiceUserName || 'Selected service user',
        description: undefined,
      })
    }
    return options
  }, [serviceUsersQuery.data?.rows, draft.serviceUserId, selectedServiceUserName])

  const createMutation = useMutation({
    mutationFn: (body: CreateSpecialVisitBody) => createSpecialVisit(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: specialVisitKeys.list(employeeId, weekStart) })
      void qc.invalidateQueries({ queryKey: specialVisitKeys.summary(employeeId, weekStart) })
      toastSuccess('Special visit added')
      onClose()
    },
    onError: e => toastApiError(e, 'Could not add the special visit'),
  })

  const startIso = localInputToIso(draft.start)
  const endIso = localInputToIso(draft.end)
  const durationHours =
    startIso && endIso
      ? (new Date(endIso).getTime() - new Date(startIso).getTime()) / 3_600_000
      : null
  const exceedsRemaining =
    durationHours != null &&
    durationHours > 0 &&
    remainingHours != null &&
    durationHours > remainingHours

  const handleSave = () => {
    setError(null)
    if (!draft.serviceUserId) {
      setError('Select a service user.')
      return
    }
    if (!draft.title.trim()) {
      setError('A title is required.')
      return
    }
    if (!startIso || !endIso) {
      setError('Start and end date/time are required.')
      return
    }
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setError('End date/time must be after start date/time.')
      return
    }
    createMutation.mutate({
      employeeId,
      serviceUserId: draft.serviceUserId,
      startDateTime: startIso,
      endDateTime: endIso,
      title: draft.title.trim(),
      notes: draft.notes.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Add special visit</DialogTitle>
          <DialogDescription>
            Schedule a flexible visit for a service user to fill the carer’s remaining contracted
            hours for the week of {weekStart}.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label required>Service user</Label>
              <Combobox
                options={serviceUserOptions}
                value={draft.serviceUserId}
                onChange={value => {
                  set('serviceUserId', value)
                  setSelectedServiceUserName(
                    serviceUserOptions.find(o => o.value === value)?.label ?? '',
                  )
                }}
                placeholder="Select service user…"
                searchPlaceholder="Search service users…"
                emptyText={
                  serviceUsersQuery.isError
                    ? 'Could not load service users.'
                    : 'No service users found.'
                }
                loading={serviceUsersQuery.isLoading || serviceUsersQuery.isFetching}
                onSearchChange={setServiceUserSearch}
                allowDeselect={false}
                aria-label="Service user"
                data-testid="special-visit-service-user"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label required>Start date/time</Label>
              <Input
                type="datetime-local"
                value={draft.start}
                onChange={e => set('start', e.target.value)}
                data-testid="special-visit-start"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label required>End date/time</Label>
              <Input
                type="datetime-local"
                value={draft.end}
                onChange={e => set('end', e.target.value)}
                data-testid="special-visit-end"
              />
              {exceedsRemaining ? (
                <p className="text-xs text-warning">
                  This exceeds the remaining contracted hours.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label required>Title</Label>
              <Input
                value={draft.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Shadowing, admin, client drop-in…"
                data-testid="special-visit-title"
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={draft.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Optional details…"
                data-testid="special-visit-notes"
              />
            </div>
          </div>

          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={createMutation.isPending}
            data-testid="special-visit-save"
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            Add special visit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
