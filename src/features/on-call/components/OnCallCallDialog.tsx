import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { useSaveOnCallCall } from '@/features/on-call/hooks/useOnCall'
import {
  CALLER_TYPE_LABEL,
  CATEGORY_LABEL,
  type OnCallCallCategory,
  type OnCallCallerType,
  type OnCallCallRow,
} from '@/features/on-call/types'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { isoToOrgDatetimeLocal, nowOrgDatetimeLocal, orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'

type Draft = {
  receivedAt: string
  callerType: OnCallCallerType
  callerName: string
  callerPhone: string
  callerEmployeeId: string
  serviceUserId: string
  category: OnCallCallCategory
  summary: string
  actionTaken: string
  followUpRequired: boolean
}

const empty = (): Draft => ({
  receivedAt: nowOrgDatetimeLocal(),
  callerType: 'CARER',
  callerName: '',
  callerPhone: '',
  callerEmployeeId: '',
  serviceUserId: '',
  category: 'OTHER',
  summary: '',
  actionTaken: '',
  followUpRequired: true,
})

const fullName = (r: { fullName?: string | null; firstName?: string | null; lastName?: string | null }) =>
  r.fullName ?? (`${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || 'Unknown')

export function OnCallCallDialog({
  open,
  onClose,
  call,
}: {
  open: boolean
  onClose: () => void
  /** Open call to change; null to log a new one. */
  call: OnCallCallRow | null
}) {
  const [draft, setDraft] = React.useState<Draft>(empty)
  const [error, setError] = React.useState<string | null>(null)
  const [carerSearch, setCarerSearch] = React.useState('')
  const [suSearch, setSuSearch] = React.useState('')
  const [suName, setSuName] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setError(null)
    setCarerSearch('')
    setSuSearch('')
    if (call) {
      setDraft({
        receivedAt: isoToOrgDatetimeLocal(call.receivedAt),
        callerType: call.callerType,
        callerName: call.callerName,
        callerPhone: call.callerPhone ?? '',
        callerEmployeeId: call.callerEmployeeId ?? '',
        serviceUserId: call.serviceUserId ?? '',
        category: call.category,
        summary: call.summary,
        actionTaken: call.actionTaken ?? '',
        followUpRequired: call.followUpRequired,
      })
      setSuName(call.serviceUserName ?? '')
    } else {
      setDraft(empty())
      setSuName('')
    }
  }, [open, call])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(d => ({ ...d, [key]: value }))

  const carersQuery = useEmployees(
    { limit: 50, sortBy: 'name', sortOrder: 'asc', search: carerSearch.trim() || undefined },
    open && draft.callerType === 'CARER',
  )
  const carerOptions = React.useMemo<ComboboxOption[]>(() => {
    const options = (carersQuery.data?.rows ?? []).map(e => ({ value: e.id, label: fullName(e) }))
    if (draft.callerEmployeeId && !options.some(o => o.value === draft.callerEmployeeId)) {
      options.unshift({ value: draft.callerEmployeeId, label: draft.callerName || 'Selected carer' })
    }
    return options
  }, [carersQuery.data?.rows, draft.callerEmployeeId, draft.callerName])

  const suQuery = useServiceUsers({ limit: 50, search: suSearch.trim() || undefined }, open)
  const suOptions = React.useMemo<ComboboxOption[]>(() => {
    const options = (suQuery.data?.rows ?? []).map(s => ({
      value: s.id,
      label: [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Unnamed',
      description: s.serviceUserNumber ?? undefined,
    }))
    if (draft.serviceUserId && !options.some(o => o.value === draft.serviceUserId)) {
      options.unshift({ value: draft.serviceUserId, label: suName || 'Selected service user', description: undefined })
    }
    return options
  }, [suQuery.data?.rows, draft.serviceUserId, suName])

  const mutation = useSaveOnCallCall()

  const save = () => {
    setError(null)
    if (!orgDatetimeLocalToIso(draft.receivedAt)) return setError('Enter when the call came in.')
    if (!draft.callerName.trim()) return setError('Enter who called.')
    if (draft.summary.trim().length < 3) return setError('Describe what the call was about.')
    const body = {
      receivedAt: orgDatetimeLocalToIso(draft.receivedAt),
      callerType: draft.callerType,
      callerName: draft.callerName.trim(),
      // null clears a field when changing a call; the API treats it as "not set" on a new one.
      callerPhone: draft.callerPhone.trim() || null,
      callerEmployeeId: draft.callerType === 'CARER' && draft.callerEmployeeId ? draft.callerEmployeeId : null,
      serviceUserId: draft.serviceUserId || null,
      category: draft.category,
      summary: draft.summary.trim(),
      actionTaken: draft.actionTaken.trim() || null,
      followUpRequired: draft.followUpRequired,
    }
    mutation.mutate(
      { id: call?.id, body },
      {
        onSuccess: () => {
          toastSuccess(call ? 'Call updated' : 'Call recorded')
          onClose()
        },
        onError: e => toastApiError(e, 'Could not save the call'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{call ? 'Change call' : 'Record an out-of-hours call'}</DialogTitle>
          <DialogDescription>Calls left open show in the morning handover for the office.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label required>Call received</Label>
              <Input
                type="datetime-local"
                value={draft.receivedAt}
                onChange={e => set('receivedAt', e.target.value)}
                data-testid="on-call-call-received"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label required>Who called</Label>
              <Select value={draft.callerType} onValueChange={v => set('callerType', v as OnCallCallerType)}>
                <SelectTrigger data-testid="on-call-call-caller-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CALLER_TYPE_LABEL) as OnCallCallerType[]).map(t => (
                    <SelectItem key={t} value={t}>
                      {CALLER_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {draft.callerType === 'CARER' ? (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Carer</Label>
                <Combobox
                  options={carerOptions}
                  value={draft.callerEmployeeId}
                  onChange={value => {
                    const label = carerOptions.find(o => o.value === value)?.label ?? ''
                    setDraft(d => ({ ...d, callerEmployeeId: value, callerName: label || d.callerName }))
                  }}
                  placeholder="Choose the carer…"
                  searchPlaceholder="Search carers…"
                  emptyText={carersQuery.isError ? 'Could not load carers.' : 'No carers found.'}
                  loading={carersQuery.isLoading || carersQuery.isFetching}
                  onSearchChange={setCarerSearch}
                  aria-label="Carer"
                  data-testid="on-call-call-carer"
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label required>Caller name</Label>
              <Input
                maxLength={120}
                value={draft.callerName}
                onChange={e => set('callerName', e.target.value)}
                data-testid="on-call-call-caller-name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Caller phone</Label>
              <Input maxLength={40} value={draft.callerPhone} onChange={e => set('callerPhone', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>About which service user</Label>
              <Combobox
                options={suOptions}
                value={draft.serviceUserId}
                onChange={value => {
                  set('serviceUserId', value)
                  setSuName(suOptions.find(o => o.value === value)?.label ?? '')
                }}
                placeholder="Choose a service user (if any)…"
                searchPlaceholder="Search service users…"
                emptyText={suQuery.isError ? 'Could not load service users.' : 'No service users found.'}
                loading={suQuery.isLoading || suQuery.isFetching}
                onSearchChange={setSuSearch}
                aria-label="Service user"
                data-testid="on-call-call-service-user"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label required>Reason for the call</Label>
              <Select value={draft.category} onValueChange={v => set('category', v as OnCallCallCategory)}>
                <SelectTrigger data-testid="on-call-call-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABEL) as OnCallCallCategory[]).map(c => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label required>What was the call about</Label>
              <Textarea
                rows={3}
                maxLength={2000}
                value={draft.summary}
                onChange={e => set('summary', e.target.value)}
                data-testid="on-call-call-summary"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>What was done</Label>
              <Textarea
                rows={3}
                maxLength={2000}
                value={draft.actionTaken}
                onChange={e => set('actionTaken', e.target.value)}
                data-testid="on-call-call-action"
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={draft.followUpRequired}
                onChange={e => set('followUpRequired', e.target.checked)}
                data-testid="on-call-call-follow-up"
              />
              The office needs to follow this up
            </label>
          </div>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={mutation.isPending} data-testid="on-call-call-save">
            {mutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
