import * as React from 'react'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { MultiSelect, type MultiSelectOption } from '@/shared/ui/multi-select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'
import { GeneralSettingsCard } from '@/features/settings/components/GeneralSettingsCard'
import { useLocationManagementTree } from '@/features/settings/hooks/useLocationManagement'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { dayKeyFromInstant } from '@/shared/lib/operational-day.util'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { cn } from '@/shared/lib/utils'
import {
  CARER_MESSAGE_BODY_MAX,
  CARER_MESSAGE_TITLE_MAX,
  type CarerMessageAudience,
  type CarerMessageAudienceInput,
  type CarerMessageRow,
} from '@/features/settings/types'
import {
  useAllEmployeesForCarerMessages,
  useCarerMessageHistory,
  useCarerMessagePreview,
  useSendCarerMessage,
} from '@/features/settings/hooks/useCarerMessages'

const FIELD_CLASS =
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const AUDIENCES: { value: CarerMessageAudience; label: string; hint: string }[] = [
  { value: 'ALL', label: 'All carers', hint: 'Every active employee' },
  { value: 'BRANCHES', label: 'Branches', hint: 'Active employees in the chosen branches' },
  { value: 'EMPLOYEES', label: 'Specific carers', hint: 'Only the people you pick' },
]

function audienceLabel(row: CarerMessageRow): string {
  if (row.audience === 'ALL') return 'All carers'
  if (row.audience === 'BRANCHES') return row.branchNames.join(', ') || 'Branches'
  return `${row.pickedCount} picked`
}

export function GeneralSettingsCarerNotificationsPanel() {
  const canSend = useAuthStore(s => s.can('carer_notifications.send'))
  const { formatDate, formatTime } = useOrganisationDisplayFormat()

  const [audience, setAudience] = React.useState<CarerMessageAudience>('ALL')
  const [locationIds, setLocationIds] = React.useState<string[]>([])
  const [employeeIds, setEmployeeIds] = React.useState<string[]>([])
  const [title, setTitle] = React.useState('')
  const [body, setBody] = React.useState('')
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const { data: tree } = useLocationManagementTree(canSend)
  const branchOptions = React.useMemo<MultiSelectOption[]>(() => {
    const seen = new Map<string, string>()
    for (const z of tree?.zones ?? []) {
      for (const b of z.branches ?? []) {
        if (b.locationId && !seen.has(b.locationId)) seen.set(b.locationId, b.locationName ?? b.name)
      }
    }
    return [...seen].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))
  }, [tree])

  const { data: employees = [], isLoading: employeesLoading } = useAllEmployeesForCarerMessages(
    canSend && audience === 'EMPLOYEES',
  )
  const employeeOptions = React.useMemo<MultiSelectOption[]>(
    () =>
      employees
        .filter(e => e.isActive)
        .map(e => ({ value: e.id, label: e.fullName || [e.firstName, e.lastName].filter(Boolean).join(' ') || 'Unnamed' }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [employees],
  )

  const audienceInput: CarerMessageAudienceInput = React.useMemo(
    () => ({
      audience,
      ...(audience === 'BRANCHES' ? { locationIds } : {}),
      ...(audience === 'EMPLOYEES' ? { employeeIds } : {}),
    }),
    [audience, locationIds, employeeIds],
  )
  const audienceReady =
    audience === 'ALL' || (audience === 'BRANCHES' ? locationIds.length > 0 : employeeIds.length > 0)

  const { data: preview, isFetching: previewLoading } = useCarerMessagePreview(
    audienceInput,
    canSend && audienceReady,
  )
  const { data: history = [], isLoading: historyLoading } = useCarerMessageHistory(canSend)
  const sendMutation = useSendCarerMessage()

  const send = () =>
    sendMutation.mutate(
      { ...audienceInput, title: title.trim(), body: body.trim() },
      {
        onSuccess: res => {
      const d = res.data
      toastSuccess(
        res.message,
        `${d.recipientCount} carer(s) chosen · ${d.withAppCount} with the app · ${d.deliveredCount} phone(s) reached`,
      )
          setTitle('')
          setBody('')
        },
        onError: e => toastApiError(e, 'Could not send notification'),
      },
    )

  const canSubmit =
    canSend && audienceReady && title.trim().length > 0 && body.trim().length > 0 && !sendMutation.isPending

  const formatInstant = (iso: string) => {
    const day = dayKeyFromInstant(iso)
    return day ? `${formatDate(day)} ${formatTime(iso)}` : '—'
  }

  if (!canSend) {
    return (
      <GeneralSettingsCard title="Carer notifications">
        <p className="text-sm text-muted-foreground">
          You don&apos;t have permission to send carer notifications. Ask an administrator for the{' '}
          <i>Send carer notifications</i> permission.
        </p>
      </GeneralSettingsCard>
    )
  }

  return (
    <div className="space-y-6" data-testid="general-settings-carer-notifications-panel">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <GeneralSettingsCard title="Send a notification">
          <div className="space-y-2">
            <span className="text-sm font-medium">Send to</span>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Send to">
              {AUDIENCES.map(a => (
                <button
                  key={a.value}
                  type="button"
                  role="radio"
                  aria-checked={audience === a.value}
                  data-testid={`carer-message-audience-${a.value}`}
                  onClick={() => setAudience(a.value)}
                  className={cn(
                    'rounded-md border px-3 py-2 text-left text-sm transition-colors',
                    audience === a.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:bg-muted/50',
                  )}
                >
                  <span className="block font-medium">{a.label}</span>
                  <span className="block text-xs text-muted-foreground">{a.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {audience === 'BRANCHES' && (
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Branches</span>
              <MultiSelect
                options={branchOptions}
                value={locationIds}
                onChange={setLocationIds}
                placeholder="Choose branches"
                searchPlaceholder="Search branches…"
              />
            </label>
          )}

          {audience === 'EMPLOYEES' && (
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Carers</span>
              <MultiSelect
                options={employeeOptions}
                value={employeeIds}
                onChange={setEmployeeIds}
                placeholder={employeesLoading ? 'Loading carers…' : 'Choose carers'}
                searchPlaceholder="Search by name…"
                disabled={employeesLoading}
              />
            </label>
          )}

          <label className="block space-y-1 text-sm">
            <span className="flex justify-between font-medium">
              Title
              <span className="text-xs font-normal text-muted-foreground">
                {title.length}/{CARER_MESSAGE_TITLE_MAX}
              </span>
            </span>
            <Input
              value={title}
              maxLength={CARER_MESSAGE_TITLE_MAX}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Team meeting on Friday"
              data-testid="carer-message-title"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="flex justify-between font-medium">
              Message
              <span className="text-xs font-normal text-muted-foreground">
                {body.length}/{CARER_MESSAGE_BODY_MAX}
              </span>
            </span>
            <textarea
              value={body}
              maxLength={CARER_MESSAGE_BODY_MAX}
              onChange={e => setBody(e.target.value)}
              rows={4}
              className={FIELD_CLASS}
              placeholder="What do carers need to know?"
              data-testid="carer-message-body"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm">
            <span data-testid="carer-message-preview">
              {!audienceReady
                ? audience === 'BRANCHES'
                  ? 'Choose at least one branch.'
                  : 'Choose at least one carer.'
                : previewLoading || !preview
                  ? 'Counting carers…'
                  : `${preview.recipientCount} carer(s) · ${preview.withAppCount} signed in to the app`}
            </span>
            <Button onClick={() => setConfirmOpen(true)} disabled={!canSubmit} data-testid="carer-message-send">
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send notification
            </Button>
          </div>
        </GeneralSettingsCard>

        <GeneralSettingsCard title="How it works">
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>The message arrives as a push notification on the carer app. Tapping it opens the app.</li>
            <li>Only active employees are included, and only those signed in to the carer app on a phone receive it.</li>
            <li>A carer on an older version of the app may not receive it until they update and sign in again.</li>
            <li>Title up to {CARER_MESSAGE_TITLE_MAX} characters, message up to {CARER_MESSAGE_BODY_MAX}.</li>
            <li>Every message sent is listed below with who sent it and how many phones it reached.</li>
            <li>For anything urgent about a visit, call the carer as well.</li>
          </ul>
        </GeneralSettingsCard>
      </div>

      <GeneralSettingsCard title="Sent notifications">
        {historyLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="carer-message-history">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Sent</th>
                  <th className="px-2 py-2 font-medium">Notification</th>
                  <th className="px-2 py-2 font-medium">Sent to</th>
                  <th className="px-2 py-2 text-right font-medium">Carers</th>
                  <th className="px-2 py-2 text-right font-medium">With app</th>
                  <th className="px-2 py-2 text-right font-medium">Phones reached</th>
                  <th className="px-2 py-2 font-medium">Sent by</th>
                </tr>
              </thead>
              <tbody>
                {history.map(r => (
                  <tr key={r.id} className="border-b align-top last:border-0">
                    <td className="whitespace-nowrap px-2 py-2 text-muted-foreground">{formatInstant(r.createdAt)}</td>
                    <td className="px-2 py-2">
                      <span className="block font-medium">{r.title}</span>
                      <span className="block text-muted-foreground">{r.body}</span>
                    </td>
                    <td className="px-2 py-2">{audienceLabel(r)}</td>
                    <td className="px-2 py-2 text-right">{r.recipientCount}</td>
                    <td className="px-2 py-2 text-right">{r.withAppCount}</td>
                    <td className="px-2 py-2 text-right">{r.deliveredCount}</td>
                    <td className="px-2 py-2">{r.sentBy ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GeneralSettingsCard>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this notification?</AlertDialogTitle>
            <AlertDialogDescription>
              “{title.trim()}” will be sent to {preview?.recipientCount ?? 0} carer(s); {preview?.withAppCount ?? 0} of
              them are signed in to the app. It can&apos;t be recalled once sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="carer-message-confirm"
              onClick={() => {
                setConfirmOpen(false)
                send()
              }}
            >
              Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
