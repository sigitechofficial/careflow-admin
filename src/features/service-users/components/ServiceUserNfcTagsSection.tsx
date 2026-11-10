import * as React from 'react'
import { ChevronDown, ChevronUp, History, Loader2, Nfc, Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { ApiError } from '@/shared/api/api-client'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import {
  useCreateServiceUserNfcTag,
  useDeleteServiceUserNfcTag,
  useServiceUserNfcTagScans,
  useServiceUserNfcTags,
  useUpdateServiceUserNfcTag,
} from '@/features/service-users/hooks/useServiceUserNfcTags'
import type { NfcTagScanResult, NfcTagStatus, ServiceUserNfcTag } from '@/features/service-users/types'
import {
  formatNfcUidTyping,
  normalizeNfcUidInput,
  nfcUidCaretAfterHex,
  nfcUidMaskRemainder,
} from '@/features/service-users/utils/nfc-tag-uid.util'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { InlineConfirm } from '@/shared/ui/inline-confirm'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  formatOrganisationDate,
  formatOrganisationDateTime,
} from '@/shared/lib/organisation-display-format.store'

const STATUS_LABEL: Record<NfcTagStatus, string> = {
  ACTIVE: 'Active',
  LOST: 'Lost',
  RETIRED: 'Retired',
}

const STATUS_VARIANT: Record<NfcTagStatus, 'success' | 'warning' | 'secondary'> = {
  ACTIVE: 'success',
  LOST: 'warning',
  RETIRED: 'secondary',
}

const UID_HELP =
  'Type or paste the UID — colons are added for you. With a USB NFC reader, click the box and tap the tag on the reader.'

/**
 * DOM Care → NFC tags. Tags fixed in the client's home; carers scan one at
 * clock-in to prove they are at the address. One active tag can only belong to
 * one client at a time (enforced by the API).
 */
export function ServiceUserNfcTagsSection({ serviceUserId }: { serviceUserId: string }) {
  const can = useAuthStore((s) => s.can)
  const canRead = can('service_users.dom_care.read') || can('service_users.read')
  const canUpdate = can('service_users.dom_care.update') || can('service_users.update')

  const tagsQuery = useServiceUserNfcTags(serviceUserId, canRead)
  const settingsQuery = useGeneralSettings(canRead)
  const nfcEnabled = settingsQuery.data?.domCheckInNfcEnabled === true

  const createMut = useCreateServiceUserNfcTag(serviceUserId)
  const updateMut = useUpdateServiceUserNfcTag(serviceUserId)
  const deleteMut = useDeleteServiceUserNfcTag(serviceUserId)

  const [adding, setAdding] = React.useState(false)
  // 409 = UID already active on a client; shown under the UID box, not a toast.
  const [uidConflict, setUidConflict] = React.useState<string | null>(null)

  if (!canRead) return null

  const tags = tagsQuery.data ?? []
  const activeCount = tags.filter((t) => t.status === 'ACTIVE').length

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Nfc className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <h2 className="text-sm font-semibold text-sky-600 dark:text-sky-400">NFC tags</h2>
          {activeCount > 0 && (
            <Badge variant="success" size="sm">
              {activeCount} active
            </Badge>
          )}
        </div>
        {canUpdate && !adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add tag
          </Button>
        )}
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Stickers fixed in the client’s home. Carers tap their phone on a tag at clock-in to prove they are
        there.
      </p>

      {!settingsQuery.isLoading && !nfcEnabled && (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          NFC check-in is switched off for the organisation (Settings → General → Dom Care). Tags can be
          registered now, but carers will not be asked to scan them until it is turned on.
        </div>
      )}

      {adding && (
        <AddTagForm
          busy={createMut.isPending}
          uidConflict={uidConflict}
          onUidChange={() => setUidConflict(null)}
          onCancel={() => {
            setUidConflict(null)
            setAdding(false)
          }}
          onSubmit={(body) =>
            createMut.mutate(body, {
              onSuccess: () => {
                toastSuccess('NFC tag registered')
                setUidConflict(null)
                setAdding(false)
              },
              onError: (e) => {
                if (e instanceof ApiError && e.status === 409) {
                  setUidConflict(apiErrorMessage(e, 'This tag is already registered.'))
                  return
                }
                toastApiError(e, 'Could not register tag')
              },
            })
          }
        />
      )}

      {tagsQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : tagsQuery.isError ? (
        <p className="text-sm text-destructive">Could not load NFC tags.</p>
      ) : tags.length === 0 ? (
        !adding && <p className="text-sm text-muted-foreground">No NFC tags registered for this client.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {tags.map((tag) => (
            <TagRow
              key={tag.id}
              serviceUserId={serviceUserId}
              tag={tag}
              canUpdate={canUpdate}
              busy={updateMut.isPending || deleteMut.isPending}
              onStatus={(status, statusReason) =>
                updateMut.mutate(
                  { tagId: tag.id, status, statusReason },
                  {
                    onSuccess: () => toastSuccess('NFC tag updated'),
                    onError: (e) => toastApiError(e, 'Could not update tag'),
                  },
                )
              }
              onDelete={() =>
                deleteMut.mutate(tag.id, {
                  onSuccess: () => toastSuccess('NFC tag removed'),
                  onError: (e) => toastApiError(e, 'Could not remove tag'),
                })
              }
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function AddTagForm({
  busy,
  uidConflict,
  onUidChange,
  onCancel,
  onSubmit,
}: {
  busy: boolean
  uidConflict: string | null
  onUidChange: () => void
  onCancel: () => void
  onSubmit: (body: { uid: string; label: string; locationNote?: string }) => void
}) {
  const [uid, setUid] = React.useState('')
  // Only complain about an incomplete UID once the user leaves the field.
  const [uidBlurred, setUidBlurred] = React.useState(false)
  const [label, setLabel] = React.useState('')
  const [locationNote, setLocationNote] = React.useState('')
  const uidRef = React.useRef<HTMLInputElement>(null)
  const labelRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    uidRef.current?.focus()
  }, [])

  // Put the admin straight back on the UID that clashed.
  React.useEffect(() => {
    if (uidConflict) uidRef.current?.focus()
  }, [uidConflict])

  const normalized = normalizeNfcUidInput(uid)
  const uidError =
    uidConflict ??
    (uidBlurred && uid.trim() && !normalized ? 'Not a complete tag UID (4, 7 or 10 bytes).' : null)
  const canSave = Boolean(normalized && label.trim()) && !busy

  const submit = () => {
    if (!canSave || !normalized) return
    onSubmit({
      uid: normalized,
      label: label.trim(),
      locationNote: locationNote.trim() || undefined,
    })
  }

  return (
    <div className="mb-4 space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="grid grid-cols-1 items-start gap-2 xl:grid-cols-[minmax(140px,200px)_1fr] xl:gap-x-6">
        <label className="text-sm text-muted-foreground xl:pt-2" htmlFor="nfc-uid">
          Tag UID
        </label>
        <div className="space-y-1">
          {/* Faded mask after the typed part shows how many characters are left. */}
          <div className="relative">
            <Input
              id="nfc-uid"
              ref={uidRef}
              value={uid}
              onChange={(e) => {
                // Auto-insert ":" between bytes; keep the caret where the user is typing.
                const input = e.target
                const caret = input.selectionStart ?? input.value.length
                const hexBefore = input.value.slice(0, caret).replace(/[^0-9a-f]/gi, '').length
                const next = formatNfcUidTyping(input.value)
                if (next !== uid) onUidChange()
                setUid(next)
                requestAnimationFrame(() => {
                  const pos = nfcUidCaretAfterHex(next, hexBefore)
                  uidRef.current?.setSelectionRange(pos, pos)
                })
              }}
              inputMode="text"
              spellCheck={false}
              maxLength={29}
              // USB readers "type" the UID and press Enter — jump to the name field.
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  labelRef.current?.focus()
                }
              }}
              className={
                uidError ? 'font-mono tracking-normal focus-visible:border-destructive' : 'font-mono tracking-normal'
              }
              aria-describedby="nfc-uid-help"
              aria-invalid={uidError ? true : undefined}
              error={Boolean(uidError)}
              onBlur={() => setUidBlurred(true)}
              onFocus={() => setUidBlurred(false)}
              autoComplete="off"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre border border-transparent px-3 font-mono text-sm"
            >
              <span className="invisible">{uid}</span>
              <span className="text-muted-foreground">{nfcUidMaskRemainder(uid)}</span>
            </div>
          </div>
          <p
            id="nfc-uid-help"
            className={uidError ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}
          >
            {uidError ?? UID_HELP}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-2 xl:grid-cols-[minmax(140px,200px)_1fr] xl:gap-x-6">
        <label className="text-sm text-muted-foreground xl:pt-2" htmlFor="nfc-label">
          Tag name
        </label>
        <div className="space-y-1">
          <Input
            id="nfc-label"
            ref={labelRef}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="e.g. Main tag"
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            A short name so staff can tell this tag apart from others.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-2 xl:grid-cols-[minmax(140px,200px)_1fr] xl:gap-x-6">
        <label className="text-sm text-muted-foreground xl:pt-2" htmlFor="nfc-location">
          Location in the home (optional)
        </label>
        <div className="space-y-1">
          <Input
            id="nfc-location"
            value={locationNote}
            onChange={(e) => setLocationNote(e.target.value)}
            placeholder="e.g. Hallway, next to the light switch"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">Where the sticker is fixed, so carers can find it.</p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} disabled={!canSave}>
          {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
          Register tag
        </Button>
      </div>
    </div>
  )
}

function TagRow({
  serviceUserId,
  tag,
  canUpdate,
  busy,
  onStatus,
  onDelete,
}: {
  serviceUserId: string
  tag: ServiceUserNfcTag
  canUpdate: boolean
  busy: boolean
  onStatus: (status: NfcTagStatus, statusReason?: string) => void
  onDelete: () => void
}) {
  const meta = [
    `Registered ${formatOrganisationDate(tag.registeredAt)}${tag.registeredByName ? ` by ${tag.registeredByName}` : ''}`,
    tag.lastScannedAt ? `Last scanned ${formatOrganisationDateTime(tag.lastScannedAt)}` : 'Not scanned yet',
  ].join(' · ')
  const [showHistory, setShowHistory] = React.useState(false)

  return (
    <li className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{tag.label}</span>
            <Badge variant={STATUS_VARIANT[tag.status]} size="sm">
              {STATUS_LABEL[tag.status]}
            </Badge>
          </div>
          <p className="font-mono text-xs text-muted-foreground">{tag.uidDisplay}</p>
          {tag.locationNote && <p className="text-sm text-muted-foreground">{tag.locationNote}</p>}
          <p className="text-xs text-muted-foreground">{meta}</p>
          {tag.status !== 'ACTIVE' && tag.statusReason && (
            <p className="text-xs text-muted-foreground">
              {STATUS_LABEL[tag.status]}
              {tag.statusChangedAt ? ` ${formatOrganisationDate(tag.statusChangedAt)}` : ''}:{' '}
              {tag.statusReason}
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-sky-700 hover:underline dark:text-sky-300"
            aria-expanded={showHistory}
          >
            <History className="h-3.5 w-3.5" />
            Scan history
            {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {canUpdate && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {tag.status === 'ACTIVE' ? (
              <>
                <InlineConfirm
                  title="Mark tag as lost?"
                  description="Carers will no longer be able to clock in with this tag."
                  confirmLabel="Mark lost"
                  onConfirm={() => onStatus('LOST', 'Marked lost by office')}
                  disabled={busy}
                >
                  <Button size="sm" variant="outline" disabled={busy}>
                    Mark lost
                  </Button>
                </InlineConfirm>
                <InlineConfirm
                  title="Retire tag?"
                  description="Use this when the tag has been removed or replaced."
                  confirmLabel="Retire"
                  onConfirm={() => onStatus('RETIRED', 'Retired by office')}
                  disabled={busy}
                >
                  <Button size="sm" variant="outline" disabled={busy}>
                    Retire
                  </Button>
                </InlineConfirm>
              </>
            ) : (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus('ACTIVE')}>
                Reactivate
              </Button>
            )}
            <InlineConfirm
              title="Remove tag?"
              description="Only for tags registered by mistake. Use Mark lost / Retire for real tags."
              confirmLabel="Remove"
              destructive
              onConfirm={onDelete}
              disabled={busy}
            >
              <Button size="icon-sm" variant="ghost" disabled={busy} aria-label="Remove tag">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </InlineConfirm>
          </div>
        )}
      </div>
      {showHistory && <TagScanHistory serviceUserId={serviceUserId} tagId={tag.id} />}
    </li>
  )
}

const SCAN_RESULT: Record<
  NfcTagScanResult,
  { label: string; variant: 'success' | 'destructive' | 'warning' }
> = {
  ACCEPTED: { label: 'Clocked in', variant: 'success' },
  WRONG_CLIENT: { label: 'Wrong client', variant: 'destructive' },
  INACTIVE: { label: 'Tag not active', variant: 'warning' },
}

/** Every scan of this tag at clock-in, newest first (last 50). */
function TagScanHistory({ serviceUserId, tagId }: { serviceUserId: string; tagId: string }) {
  const scansQuery = useServiceUserNfcTagScans(serviceUserId, tagId)
  const scans = scansQuery.data ?? []

  return (
    <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
      {scansQuery.isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading scans…
        </div>
      ) : scansQuery.isError ? (
        <p className="text-xs text-destructive">Could not load scan history.</p>
      ) : scans.length === 0 ? (
        <p className="text-xs text-muted-foreground">This tag has not been scanned yet.</p>
      ) : (
        <ul className="space-y-2">
          {scans.map((scan) => {
            const result = SCAN_RESULT[scan.result] ?? {
              label: scan.result,
              variant: 'warning' as const,
            }
            const where = scan.otherClientName
              ? `at ${scan.otherClientName}’s visit`
              : scan.visitName
                ? scan.visitName
                : null
            return (
              <li key={scan.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className="tabular-nums text-foreground">
                  {formatOrganisationDateTime(scan.scannedAt)}
                </span>
                <Badge variant={result.variant} size="sm">
                  {result.label}
                </Badge>
                <span className="text-foreground">{scan.carerName ?? 'Unknown carer'}</span>
                {where && <span className="text-muted-foreground">· {where}</span>}
                {scan.source === 'APP_REPORT' && (
                  <span
                    className="text-muted-foreground"
                    title="Caught by the carer app (may have been offline)"
                  >
                    · reported by app
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
