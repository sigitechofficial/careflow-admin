import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Download, ImageIcon, MapPin, Trash2, Upload, X } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { canCreateBodyMap } from '@/features/service-users/body-map/body-map-permissions'
import { IncidentBodyMapDialog } from '@/features/incidents/components/IncidentBodyMapDialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import { formatOrganisationIsoDateLong } from '@/shared/lib/organisation-display-format.store'
import {
  useAddIncidentInjury,
  useAddIncidentWitness,
  useAddRelatedCareRecord,
  useDeleteIncidentAttachment,
  useDeleteIncidentInjury,
  useDeleteIncidentWitness,
  useDeleteRelatedCareRecord,
  useIncidentAttachments,
  useLinkRelatedIncident,
  useRelatedIncidents,
  useUnlinkRelatedIncident,
  useUpdateRelatedCareRecord,
  useUploadIncidentAttachment,
} from '@/features/incidents/hooks/useIncidentCare'
import {
  downloadIncidentAttachment,
  fetchIncidentAttachmentObjectUrl,
} from '@/features/incidents/api/incidents-care.api'
import {
  INCIDENT_INJURY_SEVERITY_OPTIONS,
  INCIDENT_PERSON_KIND_OPTIONS,
  INCIDENT_RELATED_RECORD_TYPE_OPTIONS,
  INCIDENT_SEVERITY_BADGE,
  type IncidentAttachmentItem,
  type IncidentInjury,
  type IncidentInjurySeverity,
  type IncidentPersonKind,
  type IncidentRelatedCareRecord,
  type IncidentRelatedRecordType,
  type IncidentWitness,
} from '@/features/incidents/types'
import { toastApiError } from '@/shared/lib/toast'

const selectClass =
  'h-9 rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const INJURY_SEVERITY_BADGE: Record<IncidentInjurySeverity, 'info' | 'warning' | 'destructive' | 'solid-destructive'> = {
  MINOR: 'info',
  MODERATE: 'warning',
  SERIOUS: 'destructive',
  FATAL: 'solid-destructive',
}

/* ---------------- Injuries ---------------- */
export function IncidentInjuriesPanel({
  incidentId,
  injuries,
  canManage,
  serviceUserId,
}: {
  incidentId: string
  injuries: IncidentInjury[]
  canManage: boolean
  serviceUserId?: string | null
}) {
  const add = useAddIncidentInjury(incidentId)
  const del = useDeleteIncidentInjury()
  const permissions = useAuthStore((s) => s.user?.permissions) ?? []
  const canBodyMap = canCreateBodyMap(permissions)
  const [bodyMapOpen, setBodyMapOpen] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [type, setType] = React.useState('')
  const [severity, setSeverity] = React.useState<IncidentInjurySeverity>('MINOR')
  const [region, setRegion] = React.useState('')
  const [side, setSide] = React.useState('')
  const [measurements, setMeasurements] = React.useState('')

  return (
    <div className="space-y-3">
      {injuries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No injuries recorded.</p>
      ) : (
        <ul className="space-y-2">
          {injuries.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {i.injuryType}
                  <Badge variant={INJURY_SEVERITY_BADGE[i.injurySeverity]} size="sm">{i.injurySeverity}</Badge>
                  {i.bodyMapRecordId &&
                    (serviceUserId ? (
                      <Link
                        to="/service-users/$serviceUserId/body-map"
                        params={{ serviceUserId }}
                        search={{ recordId: i.bodyMapRecordId }}
                        title="Open this record on the body map"
                      >
                        <Badge
                          variant="info"
                          size="sm"
                          className="cursor-pointer hover:opacity-80"
                        >
                          <MapPin className="mr-0.5 h-3 w-3" /> On body map
                        </Badge>
                      </Link>
                    ) : (
                      <Badge variant="info" size="sm">
                        <MapPin className="mr-0.5 h-3 w-3" /> On body map
                      </Badge>
                    ))}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[i.bodyRegion, i.side, i.measurements].filter(Boolean).join(' · ') || '—'}
                </p>
                {i.notes && <p className="mt-1 text-xs text-muted-foreground">{i.notes}</p>}
              </div>
              {canManage && (
                <Button size="sm" variant="ghost" aria-label="Remove injury" onClick={() => del.mutate(i.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canManage &&
        (open ? (
          <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
            <Input placeholder="Injury type (e.g. Bruising)" value={type} onChange={(e) => setType(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <select className={selectClass} value={severity} onChange={(e) => setSeverity(e.target.value as IncidentInjurySeverity)}>
                {INCIDENT_INJURY_SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <Input className="w-40" placeholder="Body region" value={region} onChange={(e) => setRegion(e.target.value)} />
              <select className={selectClass} value={side} onChange={(e) => setSide(e.target.value)}>
                <option value="">Side…</option>
                <option value="LEFT">Left</option>
                <option value="RIGHT">Right</option>
                <option value="CENTRE">Centre</option>
              </select>
              <Input className="w-32" placeholder="Measurements" value={measurements} onChange={(e) => setMeasurements(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                loading={add.isPending}
                disabled={!type.trim()}
                onClick={() =>
                  add.mutate(
                    { personKind: 'SERVICE_USER', injurySeverity: severity, injuryType: type.trim(), bodyRegion: region || undefined, side: side || undefined, measurements: measurements || undefined },
                    { onSuccess: () => { setOpen(false); setType(''); setRegion(''); setSide(''); setMeasurements(''); setSeverity('MINOR') } },
                  )
                }
              >
                Add injury
              </Button>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Add injury</Button>
            {serviceUserId && canBodyMap && (
              <Button size="sm" variant="outline" onClick={() => setBodyMapOpen(true)}>
                <MapPin className="mr-1 h-4 w-4" /> Add on body map
              </Button>
            )}
          </div>
        ))}

      {serviceUserId && (
        <IncidentBodyMapDialog
          open={bodyMapOpen}
          onOpenChange={setBodyMapOpen}
          incidentId={incidentId}
          serviceUserId={serviceUserId}
        />
      )}
    </div>
  )
}

/* ---------------- Witnesses ---------------- */
export function IncidentWitnessesPanel({
  incidentId,
  witnesses,
  canManage,
}: {
  incidentId: string
  witnesses: IncidentWitness[]
  canManage: boolean
}) {
  const add = useAddIncidentWitness(incidentId)
  const del = useDeleteIncidentWitness()
  const [open, setOpen] = React.useState(false)
  const [kind, setKind] = React.useState<IncidentPersonKind>('FAMILY')
  const [name, setName] = React.useState('')
  const [statement, setStatement] = React.useState('')

  return (
    <div className="space-y-3">
      {witnesses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No witnesses recorded.</p>
      ) : (
        <ul className="space-y-2">
          {witnesses.map((w) => (
            <li key={w.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{w.personName || 'Unnamed'} <span className="text-xs text-muted-foreground">({w.personKind.toLowerCase().replace(/_/g, ' ')})</span></p>
                {w.statement && <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">{w.statement}</p>}
                {w.statementDate && <p className="mt-1 text-xs text-muted-foreground">Statement dated {formatOrganisationIsoDateLong(w.statementDate)}</p>}
              </div>
              {canManage && (
                <Button size="sm" variant="ghost" aria-label="Remove witness" onClick={() => del.mutate(w.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canManage &&
        (open ? (
          <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
            <div className="flex gap-2">
              <select className={selectClass} value={kind} onChange={(e) => setKind(e.target.value as IncidentPersonKind)}>
                {INCIDENT_PERSON_KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Textarea rows={2} placeholder="Statement" value={statement} onChange={(e) => setStatement(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" loading={add.isPending} onClick={() => add.mutate({ personKind: kind, personName: name || undefined, statement: statement || undefined }, { onSuccess: () => { setOpen(false); setName(''); setStatement('') } })}>
                Add witness
              </Button>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Add witness</Button>
        ))}
    </div>
  )
}

/* ---------------- Related care records ---------------- */
export function IncidentCareRecordsPanel({
  incidentId,
  records,
  canManage,
}: {
  incidentId: string
  records: IncidentRelatedCareRecord[]
  canManage: boolean
}) {
  const add = useAddRelatedCareRecord(incidentId)
  const update = useUpdateRelatedCareRecord()
  const del = useDeleteRelatedCareRecord()
  const [open, setOpen] = React.useState(false)
  const [recordType, setRecordType] = React.useState<IncidentRelatedRecordType>('RISK_ASSESSMENT')
  const [label, setLabel] = React.useState('')

  return (
    <div className="space-y-3">
      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground">No care records linked.</p>
      ) : (
        <ul className="space-y-2">
          {records.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{r.referenceLabel}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge variant={r.status === 'UPDATED' ? 'success' : 'warning'} size="sm">
                    {r.status === 'UPDATED' ? 'Updated' : 'Review required'}
                  </Badge>
                  {r.status === 'UPDATED' && r.updatedByLabel && (
                    <span className="text-xs text-muted-foreground">
                      by {r.updatedByLabel}{r.resolvedAt ? ` · ${formatOrganisationIsoDateLong(r.resolvedAt)}` : ''}
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="flex gap-1">
                  {r.status !== 'UPDATED' && (
                    <Button size="sm" variant="outline" loading={update.isPending} onClick={() => update.mutate({ recordId: r.id, input: { status: 'UPDATED' } })}>
                      Mark reviewed
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" aria-label="Remove link" onClick={() => del.mutate(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {canManage &&
        (open ? (
          <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
            <div className="flex gap-2">
              <select className={selectClass} value={recordType} onChange={(e) => setRecordType(e.target.value as IncidentRelatedRecordType)}>
                {INCIDENT_RELATED_RECORD_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <Input placeholder="Reference (e.g. Falls Risk Assessment)" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" loading={add.isPending} disabled={!label.trim()} onClick={() => add.mutate({ recordType, referenceLabel: label.trim() }, { onSuccess: () => { setOpen(false); setLabel('') } })}>
                Link record
              </Button>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Link care record</Button>
        ))}
    </div>
  )
}

/* ---------------- Related incidents ---------------- */
export function IncidentRelatedPanel({ incidentId, canManage }: { incidentId: string; canManage: boolean }) {
  const { data: links, isLoading } = useRelatedIncidents(incidentId)
  const link = useLinkRelatedIncident(incidentId)
  const unlink = useUnlinkRelatedIncident()
  const [open, setOpen] = React.useState(false)
  const [relatedId, setRelatedId] = React.useState('')

  return (
    <div className="space-y-3">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (links?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">No related incidents linked.</p>
      ) : (
        <ul className="space-y-2">
          {links!.map((l) => (
            <li key={l.linkId} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                {l.restricted ? (
                  <p className="text-sm text-muted-foreground">Restricted incident (no access)</p>
                ) : (
                  <p className="flex items-center gap-1.5 text-sm">
                    <Link to="/incidents/$incidentId" params={{ incidentId: l.relatedIncidentId }} className="font-medium text-primary hover:underline">
                      {l.referenceNumber}
                    </Link>
                    <span className="text-muted-foreground">{l.categoryLabel}</span>
                    {l.severity && <Badge variant={INCIDENT_SEVERITY_BADGE[l.severity]} size="sm">{l.severity}</Badge>}
                  </p>
                )}
                {l.note && <p className="mt-0.5 text-xs text-muted-foreground">{l.note}</p>}
              </div>
              {canManage && (
                <Button size="sm" variant="ghost" aria-label="Unlink" onClick={() => unlink.mutate(l.linkId)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canManage &&
        (open ? (
          <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
            <Input placeholder="Related incident id (UUID)" value={relatedId} onChange={(e) => setRelatedId(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" loading={link.isPending} disabled={!relatedId.trim()} onClick={() => link.mutate({ relatedIncidentId: relatedId.trim() }, { onSuccess: () => { setOpen(false); setRelatedId('') } })}>
                Link incident
              </Button>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
            <p className="text-xs text-muted-foreground">Paste the incident id from its detail page URL.</p>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Link related incident</Button>
        ))}
    </div>
  )
}

/* ---------------- Attachments ---------------- */
function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function isImageAttachment(mimeType: string): boolean {
  return typeof mimeType === 'string' && mimeType.toLowerCase().startsWith('image/')
}

/**
 * Auth-fetched image thumbnail for an incident attachment. Loads the bytes with
 * the bearer token (the download endpoint is permission-checked, so a plain
 * <img src> would 401), shows a small preview, and calls onOpen when clicked.
 */
function AttachmentThumbnail({
  attachment,
  onOpen,
}: {
  attachment: IncidentAttachmentItem
  onOpen: (url: string) => void
}) {
  const [url, setUrl] = React.useState<string | null>(null)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    fetchIncidentAttachmentObjectUrl(attachment)
      .then((u) => {
        if (!active) {
          URL.revokeObjectURL(u)
          return
        }
        objectUrl = u
        setUrl(u)
      })
      .catch(() => active && setFailed(true))
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [attachment])

  if (failed) {
    return (
      <div className="flex h-14 w-14 flex-none items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
        <ImageIcon className="h-5 w-5" />
      </div>
    )
  }
  if (!url) {
    return <div className="h-14 w-14 flex-none animate-pulse rounded-md border border-border bg-muted" />
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(url)}
      className="h-14 w-14 flex-none overflow-hidden rounded-md border border-border transition hover:opacity-80"
      title="Click to enlarge"
    >
      <img src={url} alt={attachment.originalName} className="h-full w-full object-cover" />
    </button>
  )
}

/** Full-screen preview overlay for an image attachment. */
function AttachmentLightbox({
  url,
  name,
  onClose,
}: {
  url: string
  name: string
  onClose: () => void
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${name}`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={url}
        alt={name}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

export function IncidentAttachmentsPanel({ incidentId, canManage }: { incidentId: string; canManage: boolean }) {
  const { data: attachments, isLoading } = useIncidentAttachments(incidentId)
  const upload = useUploadIncidentAttachment(incidentId)
  const del = useDeleteIncidentAttachment()
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [downloading, setDownloading] = React.useState<string | null>(null)
  const [preview, setPreview] = React.useState<{ url: string; name: string } | null>(null)

  async function handleDownload(a: IncidentAttachmentItem) {
    setDownloading(a.id)
    try {
      await downloadIncidentAttachment(a)
    } catch (e) {
      toastApiError(e)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-3">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (attachments?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments.</p>
      ) : (
        <ul className="space-y-2">
          {attachments!.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="flex min-w-0 items-center gap-3">
                {isImageAttachment(a.mimeType) && (
                  <AttachmentThumbnail
                    attachment={a}
                    onOpen={(url) => setPreview({ url, name: a.originalName })}
                  />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{a.originalName}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.category.replace(/_/g, ' ').toLowerCase()} · {formatBytes(a.fileSize)}
                  </p>
                  {a.caption && (
                    <p className="mt-0.5 text-xs italic text-muted-foreground">{a.caption}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" loading={downloading === a.id} onClick={() => handleDownload(a)}>
                  <Download className="mr-1 h-4 w-4" /> Download
                </Button>
                {canManage && (
                  <Button size="sm" variant="ghost" aria-label="Remove attachment" onClick={() => del.mutate(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) upload.mutate({ file, category: 'OTHER' })
              if (fileRef.current) fileRef.current.value = ''
            }}
          />
          <Button size="sm" variant="outline" loading={upload.isPending} onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" /> Upload attachment
          </Button>
        </>
      )}
      {preview && (
        <AttachmentLightbox
          url={preview.url}
          name={preview.name}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
