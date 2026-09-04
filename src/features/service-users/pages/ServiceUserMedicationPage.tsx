import * as React from 'react'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { Loader2, MapPin, Pencil, Plus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  SERVICE_USER_MODULE_PAGE_CLASS,
  ServiceUserModuleHeader,
} from '@/features/service-users/components/ServiceUserModuleHeader'
import { cn } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { AddMedicationDialog } from '@/features/service-users/medication/AddMedicationDialog'
import { EditMedicationDialog } from '@/features/service-users/medication/EditMedicationDialog'
import { MarCalendarTab } from '@/features/service-users/medication/MarCalendarTab'
import { MedicationRecordsTab } from '@/features/service-users/medication/MedicationRecordsTab'
import { MedicationSupplyTab } from '@/features/service-users/medication/MedicationSupplyTab'
import { MedicationPacksTab } from '@/features/service-users/medication/MedicationPacksTab'
import { MedicationEventsListTab } from '@/features/service-users/medication/MedicationEventsListTab'
import { MedicationReviewQueueTab } from '@/features/service-users/medication/MedicationReviewQueueTab'
import { MedicationMarExportTab } from '@/features/service-users/medication/MedicationMarExportTab'
import { MedicationActivityTab } from '@/features/service-users/medication/MedicationActivityTab'
import { MedicationSupportProfileTab } from '@/features/service-users/medication/MedicationSupportProfileTab'
import { RecordDetailDrawer } from '@/features/service-users/medication/RecordDetailDrawer'
import { CorrectRecordDialog } from '@/features/service-users/medication/CorrectRecordDialog'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { PolicyContextPanel } from '@/features/policies/components/PolicyContextPanel'
import type { ServiceUserDetail, ServiceUserMedicationRow } from '@/features/service-users/types'

function displayName(d: ServiceUserDetail | null | undefined): string {
  if (!d) return 'Service user'
  const legal = [d.firstName, d.lastName].filter(Boolean).join(' ').trim()
  if (d.preferredName?.trim()) {
    return legal ? `${legal} (${d.preferredName.trim()})` : d.preferredName.trim()
  }
  return legal || 'Service user'
}
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import {
  useServiceUserArchivedMedications,
  useServiceUserMedications,
} from '@/features/service-users/hooks/useServiceUserMedications'
import { useRestoreServiceUserMedication } from '@/features/service-users/hooks/useServiceUserMedicationMutations'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { serviceUserKeys } from '@/features/service-users/keys'
import {
  currentMedicationChartMonth,
  medicationChartMonthKey,
} from '@/features/service-users/hooks/useMedicationMarChart'
import { BodyMapHandoverPreview } from '@/features/service-users/body-map/components/BodyMapHandoverPreview'
import { useBodyMapSummary } from '@/features/service-users/body-map/hooks/useBodyMap'
type MedicationView =
  | 'records'
  | 'support'
  | 'calendar'
  | 'supply'
  | 'packs'
  | 'events'
  | 'activity'
  | 'reviews'
  | 'export'

const VIEW_TABS: { id: MedicationView; label: string }[] = [
  { id: 'records', label: 'Records' },
  { id: 'support', label: 'Support profile' },
  { id: 'calendar', label: 'MAR calendar' },
  { id: 'supply', label: 'Supply & cycles' },
  { id: 'packs', label: 'Blister packs' },
  { id: 'events', label: 'History' },
  { id: 'activity', label: 'Activity log' },
  { id: 'reviews', label: 'Review queue' },
  { id: 'export', label: 'Export MAR' },
]

export default function ServiceUserMedicationPage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const serviceUserId = params.serviceUserId ?? ''
  const search = useSearch({ strict: false }) as { view?: string }
  const navigate = useNavigate()
  const apiConfigured = Boolean(getApiBaseUrl())
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.user?.permissions)

  const view: MedicationView =
    search.view === 'support' ||
    search.view === 'calendar' ||
    search.view === 'supply' ||
    search.view === 'packs' ||
    search.view === 'events' ||
    search.view === 'activity' ||
    search.view === 'reviews' ||
    search.view === 'export'
      ? search.view
      : 'records'

  const [reviewEventId, setReviewEventId] = React.useState<string | null>(null)
  const [reviewDetailOpen, setReviewDetailOpen] = React.useState(false)
  const [reviewCorrectOpen, setReviewCorrectOpen] = React.useState(false)
  const [reviewMedLabel, setReviewMedLabel] = React.useState('')

  const canAddMedication = React.useMemo(() => {
    const p = (permissions ?? []) as string[]
    return p.includes('service_users.update') || p.includes('service_users.medications.create')
  }, [permissions])

  const canEditMedication = React.useMemo(() => {
    const p = (permissions ?? []) as string[]
    return (
      p.includes('service_users.update') ||
      p.includes('service_users.medications.update') ||
      p.includes('service_users.medications.delete')
    )
  }, [permissions])

  const canRestoreMedication = canEditMedication

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editMedication, setEditMedication] = React.useState<ServiceUserMedicationRow | null>(null)

  const profileQuery = useServiceUser(serviceUserId)
  const bodyMapSummaryQuery = useBodyMapSummary(serviceUserId)
  const medAlerts = bodyMapSummaryQuery.data?.medicationAlerts
  const medicationsQuery = useServiceUserMedications(serviceUserId, { includeInactive: true })
  const archivedQuery = useServiceUserArchivedMedications(serviceUserId)
  const restoreMutation = useRestoreServiceUserMedication()

  const detail = profileQuery.data ?? null
  const rows = medicationsQuery.data?.rows ?? []
  const archivedRows = archivedQuery.data?.rows ?? []
  const loading =
    profileQuery.isLoading || medicationsQuery.isLoading || archivedQuery.isLoading
  const error =
    profileQuery.error instanceof Error
      ? profileQuery.error.message
      : medicationsQuery.error instanceof Error
        ? medicationsQuery.error.message
        : null

  const reloadMedications = React.useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: [...serviceUserKeys.detail(serviceUserId), 'medications'],
    })
    await queryClient.invalidateQueries({
      queryKey: medicationChartMonthKey(serviceUserId, currentMedicationChartMonth()),
    })
  }, [queryClient, serviceUserId])

  const restoreMedication = React.useCallback(
    async (medication: ServiceUserMedicationRow) => {
      if (
        !window.confirm(
          `Restore "${medication.medicationName}" to the active medication list and MAR?`,
        )
      ) {
        return
      }
      try {
        await restoreMutation.mutateAsync({
          serviceUserId,
          medicationId: medication.id,
        })
        toastSuccess('Medication restored')
        await reloadMedications()
      } catch (e) {
        toastApiError(e, 'Could not restore medication')
      }
    },
    [restoreMutation, reloadMedications, serviceUserId],
  )

  const setView = (next: MedicationView) => {
    void navigate({
      to: '/service-users/$serviceUserId/medication',
      params: { serviceUserId },
      search:
        next === 'records'
          ? {}
          : {
              view: next as
                | 'support'
                | 'calendar'
                | 'supply'
                | 'packs'
                | 'events'
                | 'activity'
                | 'reviews'
                | 'export',
            },
      replace: true,
    })
  }

  if (!serviceUserId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Missing service user id.{' '}
        <Link to="/service-users/all" className="text-primary underline">
          Back to list
        </Link>
      </div>
    )
  }

  return (
    <div className={SERVICE_USER_MODULE_PAGE_CLASS}>
      <ServiceUserModuleHeader
        serviceUserId={serviceUserId}
        detail={detail}
        actions={
          <>
            {canAddMedication && (
              <Button
                type="button"
                size="sm"
                className="gap-1 bg-teal-700 text-white hover:bg-teal-800"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add medication
              </Button>
            )}
            <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5">
              <Link to="/service-users/$serviceUserId/view" params={{ serviceUserId }}>
                <Pencil className="h-3.5 w-3.5" />
                Edit profile
              </Link>
            </Button>
          </>
        }
      />

      <ServiceUserModuleTabs serviceUserId={serviceUserId} />

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <PolicyContextPanel
          className="mb-4"
          moduleType="MEDICATION"
          recordId={editMedication?.id}
        />
        <div className="mb-4">
          <BodyMapHandoverPreview serviceUserId={serviceUserId} compact />
        </div>
        <div className="mb-4 flex flex-wrap gap-2 border-b border-border">
          {VIEW_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                view === tab.id
                  ? 'border-teal-600 text-teal-800 dark:border-teal-400 dark:text-teal-200'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {(medAlerts?.missingBodyMapSiteCount ?? 0) > 0 ||
        (medAlerts?.overduePatchChangeCount ?? 0) > 0 ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
            <p className="flex items-center gap-1.5 font-semibold">
              <MapPin className="h-4 w-4" />
              Body map — medication alerts
            </p>
            {(medAlerts?.missingBodyMapSiteCount ?? 0) > 0 ? (
              <p className="mt-1">
                {medAlerts!.missingBodyMapSiteCount} site-specific medicine
                {medAlerts!.missingBodyMapSiteCount === 1 ? '' : 's'} on MAR without a body map
                site.
              </p>
            ) : null}
            {(medAlerts?.overduePatchChangeCount ?? 0) > 0 ? (
              <p className="mt-1">
                {medAlerts!.overduePatchChangeCount} patch change
                {medAlerts!.overduePatchChangeCount === 1 ? '' : 's'} overdue on the body map.
              </p>
            ) : null}
            <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-indigo-700" asChild>
              <Link to="/service-users/$serviceUserId/body-map" params={{ serviceUserId }}>
                Open body map →
              </Link>
            </Button>
          </div>
        ) : null}

        {!apiConfigured && (
          <p className="text-sm text-muted-foreground">API base URL is not configured.</p>
        )}
        {loading && view === 'records' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}
        {error && !loading && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {!error && apiConfigured && view === 'records' && !loading && (
          <MedicationRecordsTab
            serviceUserId={serviceUserId}
            rows={rows}
            archivedRows={archivedRows}
            canAddMedication={canAddMedication}
            canEditMedication={canEditMedication}
            canRestoreMedication={canRestoreMedication}
            restoringMedicationId={
              restoreMutation.isPending ? restoreMutation.variables?.medicationId ?? null : null
            }
            onAddClick={() => setDialogOpen(true)}
            onEditMedication={m => setEditMedication(m)}
            onRestoreMedication={m => void restoreMedication(m)}
          />
        )}

        {!error && apiConfigured && view === 'support' && (
          <MedicationSupportProfileTab serviceUserId={serviceUserId} />
        )}
        {!error && apiConfigured && view === 'calendar' && (
          <MarCalendarTab serviceUserId={serviceUserId} />
        )}
        {!error && apiConfigured && view === 'supply' && (
          <MedicationSupplyTab serviceUserId={serviceUserId} />
        )}
        {!error && apiConfigured && view === 'packs' && (
          <MedicationPacksTab serviceUserId={serviceUserId} serviceUserName={displayName(detail)} />
        )}
        {!error && apiConfigured && view === 'events' && (
          <MedicationEventsListTab serviceUserId={serviceUserId} />
        )}
        {!error && apiConfigured && view === 'activity' && (
          <MedicationActivityTab serviceUserId={serviceUserId} />
        )}
        {!error && apiConfigured && view === 'export' && (
          <MedicationMarExportTab serviceUserId={serviceUserId} />
        )}
        {!error && apiConfigured && view === 'reviews' && (
          <MedicationReviewQueueTab
            serviceUserId={serviceUserId}
            onOpenEvent={id => {
              setReviewEventId(id)
              setReviewMedLabel('')
              setReviewDetailOpen(true)
            }}
          />
        )}
      </div>

      <RecordDetailDrawer
        open={reviewDetailOpen}
        onOpenChange={setReviewDetailOpen}
        serviceUserId={serviceUserId}
        eventId={reviewEventId}
        onCorrect={() => {
          setReviewDetailOpen(false)
          setReviewCorrectOpen(true)
        }}
      />
      <CorrectRecordDialog
        open={reviewCorrectOpen}
        onOpenChange={setReviewCorrectOpen}
        serviceUserId={serviceUserId}
        eventId={reviewEventId}
        medicationLabel={reviewMedLabel || 'Medication'}
        onCorrected={() => setReviewEventId(null)}
      />

      <AddMedicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        serviceUserId={serviceUserId}
        canSave={canAddMedication}
        onSaved={reloadMedications}
      />
      <EditMedicationDialog
        open={editMedication != null}
        onOpenChange={open => {
          if (!open) setEditMedication(null)
        }}
        serviceUserId={serviceUserId}
        medication={editMedication}
        canEdit={canEditMedication}
        onSaved={reloadMedications}
      />
    </div>
  )
}
