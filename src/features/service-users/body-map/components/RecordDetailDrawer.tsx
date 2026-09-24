import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { formatDate, formatDateTime } from '@/shared/lib/utils'
import {
  recordTypeLabel,
  type BodyMapRecordTypeCode,
} from '@/features/service-users/body-map/catalog/record-types'
import { useBodyMapLookups } from '@/features/service-users/body-map/hooks/useBodyMapLookups'
import {
  buildBodyMapMarkerColorCatalog,
  resolveBodyMapMarkerColor,
} from '@/features/service-users/body-map/utils/body-map-marker-colors'
import {
  addBodyMapLink,
  fetchBodyMapAudit,
  uploadBodyMapPhoto,
} from '@/features/service-users/body-map/api'
import { bodyMapKeys } from '@/features/service-users/body-map/keys'
import type { BodyMapLinkedModule, BodyMapRecordRow } from '@/features/service-users/body-map/types'
import { BodyMapMedicationSiteDetail } from '@/features/service-users/body-map/components/BodyMapMedicationSiteDetail'
import { BodyMapRecordInspectionDialog } from '@/features/service-users/body-map/components/BodyMapRecordInspectionDialog'
import { WoundReviewForm } from '@/features/service-users/body-map/components/WoundReviewForm'
import type { BodyMapWoundReviewPayload } from '@/features/service-users/body-map/types'
import { useBodyMapSiteMedications } from '@/features/service-users/body-map/hooks/useBodyMapSiteMedications'
import { canExportBodyMap } from '@/features/service-users/body-map/body-map-permissions'
import { useAuthStore } from '@/features/auth/store'

type Props = {
  record: BodyMapRecordRow | null
  serviceUserId: string
  canUpdate?: boolean
  canReview?: boolean
  canClose?: boolean
  onClose: () => void
  onCloseRecord?: (recordId: string) => void
  onAddReview?: (
    recordId: string,
    payload: BodyMapWoundReviewPayload | { conditionStatus: string; reviewNote?: string },
  ) => void
  closing?: boolean
  reviewing?: boolean
}

function photoSrc(url: string): string {
  return url.startsWith('http') ? url : `${getApiBaseUrl()}${url}`
}

export function RecordDetailDrawer({
  record,
  serviceUserId,
  canUpdate = true,
  canReview = true,
  canClose = true,
  onClose,
  onCloseRecord,
  onAddReview,
  closing,
  reviewing,
}: Props) {
  const qc = useQueryClient()
  const permissions = useAuthStore(s => s.user?.permissions) ?? []
  const canExport = canExportBodyMap(permissions)
  const [inspectionOpen, setInspectionOpen] = React.useState(false)
  const [reviewOpen, setReviewOpen] = React.useState(false)
  const [conditionStatus, setConditionStatus] = React.useState('UNCHANGED')
  const [reviewNote, setReviewNote] = React.useState('')
  const [consentGranted, setConsentGranted] = React.useState(false)
  const [photoCaption, setPhotoCaption] = React.useState('')
  const [linkModule, setLinkModule] = React.useState<BodyMapLinkedModule>('CARE_PLAN')
  const [linkLabel, setLinkLabel] = React.useState('')
  const [linkMedicationId, setLinkMedicationId] = React.useState('')
  const fileRef = React.useRef<HTMLInputElement>(null)
  const { eligibleMedications } = useBodyMapSiteMedications(serviceUserId, Boolean(record))

  // Resolve the pin number badge colour from the SAME backend-driven catalog the
  // map pins use, so the badge matches the pin exactly (even if colours are
  // customised in the DB) instead of drifting from the hardcoded tailwind map.
  const lookupsQuery = useBodyMapLookups()
  const markerColorCatalog = React.useMemo(
    () => buildBodyMapMarkerColorCatalog(lookupsQuery.data?.recordTypes),
    [lookupsQuery.data],
  )

  const auditQuery = useQuery({
    queryKey: record ? bodyMapKeys.audit(record.id) : ['body-map', 'audit', 'none'],
    queryFn: () => fetchBodyMapAudit(record!.id),
    enabled: Boolean(record?.id),
  })

  React.useEffect(() => {
    const medId = record?.medicationSite?.serviceUserMedicationId
    if (medId) setLinkMedicationId(medId)
  }, [record?.id, record?.medicationSite?.serviceUserMedicationId])

  const linkMutation = useMutation({
    mutationFn: () => {
      if (linkModule === 'MAR') {
        const medId = linkMedicationId.trim()
        if (!medId) {
          throw new Error('Select a medication chart line to link to MAR')
        }
        const med = eligibleMedications.find(m => m.id === medId)
        return addBodyMapLink(record!.id, {
          linkedModule: 'MAR',
          linkedRecordId: medId,
          label: linkLabel.trim() || med?.medicationName,
        })
      }
      return addBodyMapLink(record!.id, {
        linkedModule: linkModule,
        linkedRecordId: serviceUserId,
        label: linkLabel.trim() || undefined,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bodyMapKeys.list(serviceUserId) })
      toastSuccess('Link added')
      setLinkLabel('')
      if (linkModule === 'MAR') setLinkMedicationId('')
    },
    onError: e => toastApiError(e, 'Could not add link'),
  })

  const uploadMutation = useMutation({
    mutationFn: ({ file, caption }: { file: File; caption?: string }) =>
      uploadBodyMapPhoto(record!.id, file, 'GRANTED', caption),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: bodyMapKeys.list(serviceUserId) })
      toastSuccess('Photo uploaded')
      setPhotoCaption('')
      setConsentGranted(false)
      if (fileRef.current) fileRef.current.value = ''
    },
    onError: e => toastApiError(e, 'Could not upload photo'),
  })

  if (!record) {
    return (
      <aside className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
        Select a record or marker to view details
      </aside>
    )
  }

  const obs = record.observationDetails as Record<string, unknown> | null
  const sg = record.safeguardingCheck
  const wound = record.woundAssessment
  const pressure = record.pressureAssessment
  const links = record.links ?? []
  const photos = record.photos ?? []

  const linkHref = (mod: BodyMapLinkedModule) => {
    switch (mod) {
      case 'MAR':
        return {
          to: '/service-users/$serviceUserId/medication' as const,
          params: { serviceUserId },
        }
      case 'CARE_PLAN':
        return {
          to: '/service-users/$serviceUserId/care-plan' as const,
          params: { serviceUserId },
        }
      case 'SCHEDULED_VISIT':
        return {
          to: '/scheduling/visits/$jobId' as const,
          params: { jobId: record.scheduledJobId ?? '' },
        }
      default:
        return { to: '/service-users/$serviceUserId' as const, params: { serviceUserId } }
    }
  }

  return (
    <aside className="flex h-full flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            {recordTypeLabel(record.recordType as BodyMapRecordTypeCode)}
            {record.canvasDisplayNumber != null ? (
              <span
                className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white"
                style={{ backgroundColor: resolveBodyMapMarkerColor(markerColorCatalog, record) }}
              >
                {record.canvasDisplayNumber}
              </span>
            ) : null}
          </h3>
          <p className="text-xs text-muted-foreground">
            {record.status.replace(/_/g, ' ')} · {record.riskLevel} risk
            {record.safeguardingTriggered ? ' · Safeguarding' : ''}
            {record.managerReviewRequired ? ' · Manager review' : ''}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
        {record.subType ? (
          <p>
            <span className="font-medium text-muted-foreground">Sub-type: </span>
            {record.subType}
          </p>
        ) : null}
        {record.markers[0] ? (
          <p>
            <span className="font-medium text-muted-foreground">Location: </span>
            {record.markers[0].bodyPart}
            {record.markers[0].specificLocation ? ` — ${record.markers[0].specificLocation}` : ''} (
            {record.markers[0].bodyView.toLowerCase()})
            {record.canvasDisplayNumber != null ? (
              <span className="font-medium text-muted-foreground">
                {' '}· Pin #{record.canvasDisplayNumber}
              </span>
            ) : null}
          </p>
        ) : null}
        {record.description ? (
          <div>
            <p className="font-medium text-muted-foreground">Observation</p>
            <p className="mt-1 whitespace-pre-wrap">{record.description}</p>
          </div>
        ) : null}
        {obs?.painLevel != null ? (
          <p>
            <span className="font-medium text-muted-foreground">Pain: </span>
            {String(obs.painLevel)}/10
          </p>
        ) : null}
        {record.causeSummary ? (
          <div>
            <p className="font-medium text-muted-foreground">Cause</p>
            <p className="mt-1 whitespace-pre-wrap">{record.causeSummary}</p>
          </div>
        ) : null}
        {record.actionSummary ? (
          <div>
            <p className="font-medium text-muted-foreground">Action</p>
            <p className="mt-1 whitespace-pre-wrap">{record.actionSummary}</p>
          </div>
        ) : null}
        {record.nextReviewAt ? (
          <p>
            <span className="font-medium text-muted-foreground">Review due: </span>
            {formatDateTime(record.nextReviewAt)}
          </p>
        ) : null}

        {wound ? (
          <div className="rounded-lg border border-violet-200 bg-violet-50/80 p-3 text-xs">
            <p className="font-semibold text-violet-900">Wound assessment</p>
            {wound.woundLifecycleLabel ? (
              <p className="mt-1 inline-flex rounded-full bg-violet-200/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-950">
                {wound.woundLifecycleLabel}
              </p>
            ) : null}
            <ul className="mt-2 space-y-1 text-violet-950">
              {wound.woundType ? <li>Type: {wound.woundType}</li> : null}
              {wound.exudate ? <li>Exudate: {wound.exudate}</li> : null}
              {wound.dressing ? <li>Dressing: {wound.dressing}</li> : null}
              {wound.measurements ? <li>Size: {wound.measurements}</li> : null}
              {wound.nextDressingChange ? (
                <li>
                  Next change:{' '}
                  {formatDate(wound.nextDressingChange)}
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {record.recordType === 'MEDICATION' ? (
          <BodyMapMedicationSiteDetail record={record} serviceUserId={serviceUserId} />
        ) : null}

        {pressure ? (
          <div className="rounded-lg border border-orange-200 bg-orange-50/80 p-3 text-xs">
            <p className="font-semibold text-orange-900">Pressure assessment</p>
            <ul className="mt-2 space-y-1 text-orange-950">
              {pressure.riskTool ? <li>Risk tool: {pressure.riskTool}</li> : null}
              {pressure.blanching ? <li>Blanching: {pressure.blanching}</li> : null}
              {pressure.skinIntact ? <li>Skin intact: {pressure.skinIntact}</li> : null}
              {pressure.repositioningRecorded ? (
                <li>Repositioning: {pressure.repositioningRecorded}</li>
              ) : null}
              {pressure.pressureEquipment ? (
                <li>Equipment: {pressure.pressureEquipment}</li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {sg ? (
          <div className="rounded-lg border border-red-200 bg-red-50/80 p-3 text-xs">
            <p className="font-semibold text-red-900">Safeguarding checklist</p>
            <ul className="mt-2 space-y-1 text-red-950">
              {sg.causeKnown ? <li>Cause known: {sg.causeKnown}</li> : null}
              {sg.explanationConsistent ? (
                <li>Explanation consistent: {sg.explanationConsistent}</li>
              ) : null}
              {sg.immediateRisk ? <li>Immediate risk: {sg.immediateRisk}</li> : null}
              {sg.managerInformed ? <li>Manager informed: {sg.managerInformed}</li> : null}
              {sg.referralRequired ? <li>Referral: {sg.referralRequired}</li> : null}
              {sg.incidentRequired ? <li>Incident report: {sg.incidentRequired}</li> : null}
              {sg.managerNotes ? <li className="mt-1 whitespace-pre-wrap">{sg.managerNotes}</li> : null}
            </ul>
            <p className="mt-2 text-muted-foreground">
              Completed {formatDateTime(sg.completedAt)}
            </p>
          </div>
        ) : null}

        {photos.length > 0 ? (
          <div>
            <p className="font-medium text-muted-foreground">Photos</p>
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {photos.map(p => (
                <li key={p.id}>
                  <a href={photoSrc(p.fileUrl)} target="_blank" rel="noreferrer">
                    <img
                      src={photoSrc(p.fileUrl)}
                      alt={p.caption ?? 'Body map photo'}
                      className="h-20 w-full rounded-md border border-border object-cover"
                    />
                  </a>
                  {p.caption ? <p className="mt-0.5 text-[10px] text-muted-foreground">{p.caption}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {(record.recordType === 'PRESSURE' || record.recordType === 'WOUND') &&
        !links.some(l => l.linkedModule === 'CARE_PLAN') ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Link this {record.recordType === 'WOUND' ? 'wound' : 'pressure area'} to a care plan
            (§7.1 / §8) using the link controls below.
          </div>
        ) : null}

        <div>
          <p className="font-medium text-muted-foreground">Linked records</p>
          {links.length > 0 ? (
            <ul className="mt-1 space-y-1 text-xs">
              {links.map(l => (
                <li key={l.id}>
                  {l.linkedModule === 'MAR' ? (
                    <Link
                      to="/service-users/$serviceUserId/medication"
                      params={{ serviceUserId }}
                      className="text-indigo-700 hover:underline"
                    >
                      {l.label ?? 'MAR chart line'}
                    </Link>
                  ) : l.linkedModule === 'SCHEDULED_VISIT' ? (
                    <Link
                      to="/scheduling/visits/$jobId"
                      params={{ jobId: record.scheduledJobId ?? l.linkedRecordId }}
                      className="text-indigo-700 hover:underline"
                    >
                      {l.label ?? 'Scheduled visit'}
                    </Link>
                  ) : (
                    <Link
                      {...linkHref(l.linkedModule)}
                      className="text-indigo-700 hover:underline"
                    >
                      {l.label ?? l.linkedModule.replace(/_/g, ' ')}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">No links yet</p>
          )}
          {record.status !== 'CLOSED' && canUpdate ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <select
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                value={linkModule}
                onChange={e => setLinkModule(e.target.value as BodyMapLinkedModule)}
              >
                <option value="CARE_PLAN">Care plan</option>
                <option value="MAR">MAR / eMAR</option>
                <option value="INCIDENT">Incident</option>
                <option value="RISK_ASSESSMENT">Risk assessment</option>
                <option value="REFERRAL">Referral</option>
                <option value="CARE_NOTE">Care note</option>
                <option value="SCHEDULED_VISIT">Scheduled visit</option>
              </select>
              {linkModule === 'MAR' ? (
                <select
                  className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
                  value={linkMedicationId}
                  onChange={e => setLinkMedicationId(e.target.value)}
                >
                  <option value="">Select medication…</option>
                  {eligibleMedications.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.medicationName}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="min-w-0 flex-1 rounded-md border border-input px-2 py-1 text-xs"
                  placeholder="Label (optional)"
                  value={linkLabel}
                  onChange={e => setLinkLabel(e.target.value)}
                />
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  linkMutation.isPending || (linkModule === 'MAR' && !linkMedicationId.trim())
                }
                onClick={() => linkMutation.mutate()}
              >
                Link
              </Button>
            </div>
          ) : null}
        </div>

        {record.status !== 'CLOSED' && canUpdate ? (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-xs font-semibold text-muted-foreground">Add photo (consent required)</p>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={consentGranted}
                onChange={e => setConsentGranted(e.target.checked)}
              />
              Consent granted to photograph this area
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="block w-full text-xs"
              disabled={!consentGranted || uploadMutation.isPending}
            />
            <Textarea
              className="text-xs"
              rows={2}
              placeholder="Caption (optional)"
              value={photoCaption}
              onChange={e => setPhotoCaption(e.target.value)}
              disabled={!consentGranted}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!consentGranted || uploadMutation.isPending}
              onClick={() => {
                const file = fileRef.current?.files?.[0]
                if (!file) return
                uploadMutation.mutate({
                  file,
                  caption: photoCaption.trim() || undefined,
                })
              }}
            >
              {uploadMutation.isPending ? 'Uploading…' : 'Upload photo'}
            </Button>
          </div>
        ) : null}

        {record.reviews.length > 0 ? (
          <div>
            <p className="font-medium text-muted-foreground">Reviews</p>
            <ul className="mt-1 space-y-2">
              {record.reviews.map(r => {
                const wr = r.reviewDetails as {
                  progressionComparison?: string
                  painChange?: string
                } | null
                return (
                  <li key={r.id} className="rounded-md bg-muted/50 px-2 py-1.5 text-xs">
                    {r.conditionStatus} — {formatDateTime(r.reviewedAt)}
                    {wr?.progressionComparison ? (
                      <span className="mt-1 block">
                        Progression: {wr.progressionComparison.toLowerCase()}
                      </span>
                    ) : null}
                    {wr?.painChange ? <span className="block">Pain: {wr.painChange}</span> : null}
                    {r.reviewNote ? <span className="mt-1 block">{r.reviewNote}</span> : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        {auditQuery.data?.entries?.length ? (
          <div>
            <p className="font-medium text-muted-foreground">Audit trail</p>
            <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto text-xs">
              {auditQuery.data.entries.map(e => (
                <li key={e.id} className="text-muted-foreground">
                  {e.action} · {e.actorName ?? 'System'} ·{' '}
                  {formatDateTime(e.createdAt)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {reviewOpen && canReview && onAddReview ? (
          record.recordType === 'WOUND' ? (
            <WoundReviewForm
              woundAssessment={record.woundAssessment}
              disabled={reviewing}
              onSubmit={payload => {
                onAddReview(record.id, payload)
                setReviewOpen(false)
              }}
            />
          ) : (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <label className="block text-xs font-medium">
                Condition
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  value={conditionStatus}
                  onChange={e => setConditionStatus(e.target.value)}
                >
                  <option value="IMPROVING">Improving</option>
                  <option value="UNCHANGED">Unchanged</option>
                  <option value="WORSENING">Worsening</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </label>
              <label className="block text-xs font-medium">
                Review note
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                />
              </label>
              <Button
                type="button"
                size="sm"
                disabled={reviewing}
                onClick={() => {
                  onAddReview(record.id, { conditionStatus, reviewNote })
                  setReviewOpen(false)
                  setReviewNote('')
                }}
              >
                {reviewing ? 'Saving…' : 'Save review'}
              </Button>
            </div>
          )
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
        {canExport ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setInspectionOpen(true)}
          >
            CQC record view
          </Button>
        ) : null}
        {record.status !== 'CLOSED' && canReview && onAddReview ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reviewing}
              onClick={() => {
                onAddReview(record.id, {
                  conditionStatus: 'UNCHANGED',
                  reviewNote: 'Checked — no change',
                })
              }}
            >
              Checked, no change
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setReviewOpen(v => !v)}>
              Add review
            </Button>
          </>
        ) : null}
        {record.status !== 'CLOSED' && canClose && onCloseRecord ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={closing}
            onClick={() => onCloseRecord(record.id)}
          >
            {closing ? 'Closing…' : 'Close record'}
          </Button>
        ) : null}
      </div>
      <BodyMapRecordInspectionDialog
        recordId={record.id}
        open={inspectionOpen}
        onOpenChange={setInspectionOpen}
      />
    </aside>
  )
}
