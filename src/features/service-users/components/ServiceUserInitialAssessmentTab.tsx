import * as React from 'react'
import { Calendar, Camera, Eye, EyeOff, Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { type ServiceUserInitialAssessmentData } from '@/features/service-users/types'
import {
  usePatchServiceUserInitialAssessment,
  useUploadServiceUserInitialAssessmentPicture,
} from '@/features/service-users/hooks/useServiceUserMutations'
import { useServiceUserInitialAssessment } from '@/features/service-users/hooks/useServiceUserTabs'
import { INITIAL_ASSESSMENT_CATALOG, INITIAL_ASSESSMENT_ITEM_IDS } from '@/features/service-users/initial-assessment-catalog'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'

function formatDob(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function emptyChecklist(): Record<string, boolean> {
  return Object.fromEntries(INITIAL_ASSESSMENT_ITEM_IDS.map((id) => [id, false]))
}

function mergeChecklist(fromApi: Record<string, boolean> | undefined): Record<string, boolean> {
  const base = emptyChecklist()
  if (!fromApi) return base
  for (const k of Object.keys(fromApi)) {
    if (k in base && typeof fromApi[k] === 'boolean') base[k] = fromApi[k]
  }
  return base
}

function sectionCard() {
  return 'rounded-xl border border-border bg-card p-6 shadow-sm'
}

function sectionTitle(title: string) {
  return <h2 className="mb-4 text-sm font-semibold text-sky-600 dark:text-sky-400">{title}</h2>
}

const cbCls =
  'mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-2 border-red-600 text-red-700 accent-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const areaCls =
  'min-h-[88px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

type Props = {
  serviceUserId: string
  displayName: string
  dateOfBirth: string | null
}

export function ServiceUserInitialAssessmentTab({ serviceUserId, displayName, dateOfBirth }: Props) {
  const can = useAuthStore((s) => s.can)
  const canRead = can('service_users.initial_assessment.read') || can('service_users.read')
  const canUpdate = can('service_users.initial_assessment.update') || can('service_users.update')

  const assessmentQuery = useServiceUserInitialAssessment(serviceUserId, canRead)
  const patchMutation = usePatchServiceUserInitialAssessment(serviceUserId)
  const uploadPicMutation = useUploadServiceUserInitialAssessmentPicture(serviceUserId)

  const [data, setData] = React.useState<ServiceUserInitialAssessmentData | null>(null)
  const [checklist, setChecklist] = React.useState<Record<string, boolean>>(emptyChecklist)
  const [doorVisible, setDoorVisible] = React.useState(false)
  const picRef = React.useRef<HTMLInputElement>(null)

  const loading = assessmentQuery.isLoading
  const saving = patchMutation.isPending
  const uploadingPic = uploadPicMutation.isPending
  const error =
    assessmentQuery.error instanceof ApiError
      ? assessmentQuery.error.message
      : patchMutation.error instanceof ApiError
        ? patchMutation.error.message
        : uploadPicMutation.error instanceof ApiError
          ? uploadPicMutation.error.message
          : assessmentQuery.error || patchMutation.error || uploadPicMutation.error
            ? 'Request failed'
            : null

  React.useEffect(() => {
    if (assessmentQuery.data) {
      setData(assessmentQuery.data)
      setChecklist(mergeChecklist(assessmentQuery.data.checklist))
    }
  }, [assessmentQuery.data])

  const setField = <K extends keyof ServiceUserInitialAssessmentData>(
    key: K,
    value: ServiceUserInitialAssessmentData[K],
  ) => {
    setData((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const toggle = (id: string) => {
    setChecklist((c) => ({ ...c, [id]: !c[id] }))
  }

  const labelText = (template: string) => template.replace(/\{name\}/g, displayName)

  const save = async () => {
    if (!data || !canUpdate) return
    try {
      const d = await patchMutation.mutateAsync({
        numberOfCarers: data.numberOfCarers,
        likesToBeKnownAs: data.likesToBeKnownAs,
        doorCode: data.doorCode,
        accessRisks: data.accessRisks,
        accessInstruction: data.accessInstruction,
        reasonForAdmission: data.reasonForAdmission,
        previousMedicalHistory: data.previousMedicalHistory,
        careInstructions: data.careInstructions,
        checklist,
        culturalReligiousNotes: data.culturalReligiousNotes,
        careCarerNumbersNote: data.careCarerNumbersNote,
        additionalRisksNotes: data.additionalRisksNotes,
        environmentAccessHazardsNotes: data.environmentAccessHazardsNotes,
        hydrationComment: data.hydrationComment,
        nutritionComment: data.nutritionComment,
      })
      setData(d)
      setChecklist(mergeChecklist(d.checklist))
      toastSuccess('Initial assessment saved', 'Your changes have been saved.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    }
  }

  const onPicture = async (file: File | null) => {
    if (!file || !canUpdate) return
    try {
      const d = await uploadPicMutation.mutateAsync(file)
      setData(d)
      setChecklist(mergeChecklist(d.checklist))
      toastSuccess('Picture updated', 'The assessment picture was uploaded.')
    } catch (e) {
      toastApiError(e, 'Picture upload failed')
    } finally {
      if (picRef.current) picRef.current.value = ''
    }
  }

  if (!canRead) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
        You need <span className="font-mono text-xs">service_users.read</span> or{' '}
        <span className="font-mono text-xs">service_users.initial_assessment.read</span> to view this tab.
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    )
  }

  const picHref = data.assessmentPictureUrl ? resolveMediaUrl(data.assessmentPictureUrl) : null

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className={sectionCard()}>
        {sectionTitle('Customer Details')}
        <div className="space-y-5">
          <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
            <label className="text-sm text-muted-foreground">
              Date of Birth <span className="text-destructive">*</span>
            </label>
            <div className="flex max-w-md items-center gap-2">
              <Input readOnly value={formatDob(dateOfBirth)} className="flex-1 bg-muted/40" />
              <Button type="button" variant="default" size="icon" className="shrink-0 bg-teal-900 hover:bg-teal-950" title="Date of birth is edited under Personal Details" disabled>
                <Calendar className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
            <label className="text-sm text-muted-foreground">No. of Carers</label>
            <Input
              type="number"
              min={1}
              max={99}
              className="max-w-[120px]"
              disabled={!canUpdate}
              value={data.numberOfCarers}
              onChange={(e) => {
                const n = Number(e.target.value)
                setField('numberOfCarers', Number.isFinite(n) ? Math.min(99, Math.max(1, n)) : 1)
              }}
            />
          </div>
          <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
            <label className="text-sm text-muted-foreground">Likes to be known as</label>
            <Input
              className="max-w-xl"
              disabled={!canUpdate}
              value={data.likesToBeKnownAs ?? ''}
              onChange={(e) => setField('likesToBeKnownAs', e.target.value === '' ? null : e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
            <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
              <button
                type="button"
                className="rounded p-1 text-foreground hover:bg-muted"
                title={doorVisible ? 'Hide door code' : 'Show door code'}
                onClick={() => setDoorVisible((v) => !v)}
              >
                {doorVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <span>Door Code</span>
            </div>
            <Input
              type={doorVisible ? 'text' : 'password'}
              // Not a login: "off" is ignored on password fields, and the browser then fills the saved
              // login email into the header search box.
              autoComplete="new-password"
              className="max-w-md"
              disabled={!canUpdate}
              value={data.doorCode ?? ''}
              onChange={(e) => setField('doorCode', e.target.value === '' ? null : e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
            <label className="pt-2 text-sm text-muted-foreground">Access Risks</label>
            <textarea
              className={cn(areaCls, !canUpdate && 'opacity-80')}
              disabled={!canUpdate}
              value={data.accessRisks}
              onChange={(e) => setField('accessRisks', e.target.value)}
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
            <label className="pt-2 text-sm text-muted-foreground">Access Instruction</label>
            <textarea
              className={cn(areaCls, !canUpdate && 'opacity-80')}
              disabled={!canUpdate}
              value={data.accessInstruction}
              onChange={(e) => setField('accessInstruction', e.target.value)}
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
            <label className="pt-2 text-sm text-muted-foreground">Reason for Admission</label>
            <textarea
              className={cn(areaCls, !canUpdate && 'opacity-80')}
              disabled={!canUpdate}
              value={data.reasonForAdmission}
              onChange={(e) => setField('reasonForAdmission', e.target.value)}
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
            <label className="pt-2 text-sm text-muted-foreground">Previous Medical History</label>
            <textarea
              className={cn(areaCls, !canUpdate && 'opacity-80')}
              disabled={!canUpdate}
              value={data.previousMedicalHistory}
              onChange={(e) => setField('previousMedicalHistory', e.target.value)}
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
            <label className="pt-2 text-sm text-muted-foreground">Care Instruction</label>
            <textarea
              className={cn(areaCls, !canUpdate && 'opacity-80')}
              disabled={!canUpdate}
              value={data.careInstructions}
              onChange={(e) => setField('careInstructions', e.target.value)}
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
            <label className="text-sm text-muted-foreground">Picture</label>
            <div className="flex max-w-xl items-center gap-2">
              <Input readOnly value={data.assessmentPictureUrl ? 'Image on file' : ''} className="flex-1 bg-muted/30" placeholder="No picture uploaded" />
              <input
                ref={picRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => void onPicture(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                size="icon"
                variant="default"
                className="shrink-0 bg-teal-800 hover:bg-teal-900"
                disabled={!canUpdate || uploadingPic}
                onClick={() => picRef.current?.click()}
                title="Upload picture"
              >
                {uploadingPic ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Camera className="h-4 w-4 text-white" />}
              </Button>
            </div>
            {picHref ? (
              <div className="md:col-start-2">
                <img src={picHref} alt="" className="max-h-48 max-w-xs rounded-md border object-contain" />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {INITIAL_ASSESSMENT_CATALOG.map((section) => (
        <React.Fragment key={section.id}>
          <section className={sectionCard()}>
            {sectionTitle(section.title)}
            {section.id === 'sec_care_assistance_required' && (
              <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
                <label className="pt-2 text-sm text-muted-foreground">Add Carer numbers below</label>
                <textarea
                  className={cn(areaCls, !canUpdate && 'opacity-80')}
                  disabled={!canUpdate}
                  rows={3}
                  value={data.careCarerNumbersNote}
                  onChange={(e) => setField('careCarerNumbersNote', e.target.value)}
                />
              </div>
            )}
            <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
              {section.items.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-start gap-2 text-sm leading-snug text-foreground"
                >
                  <input
                    type="checkbox"
                    className={cbCls}
                    checked={checklist[item.id] ?? false}
                    disabled={!canUpdate}
                    onChange={() => toggle(item.id)}
                  />
                  <span>{labelText(item.label)}</span>
                </label>
              ))}
            </div>
            {section.id === 'sec_environment' && (
              <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
                <label className="pt-2 text-sm text-muted-foreground">Access hazards (details)</label>
                <textarea
                  className={cn(areaCls, !canUpdate && 'opacity-80')}
                  disabled={!canUpdate}
                  rows={3}
                  value={data.environmentAccessHazardsNotes}
                  onChange={(e) => setField('environmentAccessHazardsNotes', e.target.value)}
                />
              </div>
            )}
            {section.id === 'sec_additional_risks' && (
              <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
                <label className="pt-2 text-sm text-muted-foreground">Additional risk notes</label>
                <textarea
                  className={cn(areaCls, !canUpdate && 'opacity-80')}
                  disabled={!canUpdate}
                  rows={3}
                  value={data.additionalRisksNotes}
                  onChange={(e) => setField('additionalRisksNotes', e.target.value)}
                />
              </div>
            )}
            {section.id === 'sec_hydration' && (
              <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
                <label className="pt-2 text-sm text-muted-foreground">Comment</label>
                <textarea
                  className={cn(areaCls, !canUpdate && 'opacity-80')}
                  disabled={!canUpdate}
                  rows={2}
                  value={data.hydrationComment}
                  onChange={(e) => setField('hydrationComment', e.target.value)}
                />
              </div>
            )}
            {section.id === 'sec_nutrition' && (
              <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
                <label className="pt-2 text-sm text-muted-foreground">Any comment (see care plan)</label>
                <textarea
                  className={cn(areaCls, !canUpdate && 'opacity-80')}
                  disabled={!canUpdate}
                  rows={2}
                  value={data.nutritionComment}
                  onChange={(e) => setField('nutritionComment', e.target.value)}
                />
              </div>
            )}
          </section>
          {section.id === 'sec_care_assistance_required' && (
            <section className={sectionCard()}>
              {sectionTitle('Cultural or Religious Implications')}
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
                <label className="pt-2 text-sm text-muted-foreground">Notes</label>
                <textarea
                  className={cn(areaCls, !canUpdate && 'opacity-80')}
                  disabled={!canUpdate}
                  rows={4}
                  placeholder="Any religious or cultural implications to providing the care and support assessed?"
                  value={data.culturalReligiousNotes}
                  onChange={(e) => setField('culturalReligiousNotes', e.target.value)}
                />
              </div>
            </section>
          )}
        </React.Fragment>
      ))}

      {canUpdate && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save assessment
          </Button>
        </div>
      )}
    </div>
  )
}
