import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Skeleton } from '@/shared/ui/misc'
import { Checkbox } from '@/shared/ui/toggle-controls'
import {
  MEDICAL_MONITORING_KEYS,
  MONITORING_KEY_LABELS,
} from '@/features/alerts/api/medical-clinical.types'
import {
  useMedicalClinicalPermissions,
  useMonitoringConfig,
  useMonitoringConfigMutations,
} from '@/features/alerts/hooks/useMedicalClinical'

const KEYS = [
  MEDICAL_MONITORING_KEYS.WEIGHT_CHANGE_THRESHOLD_KG,
  MEDICAL_MONITORING_KEYS.FLUID_TARGET_REQUIRED,
] as const

export function AlertParametersSection({ serviceUserId }: { serviceUserId: string }) {
  const perms = useMedicalClinicalPermissions().monitoring
  const query = useMonitoringConfig(serviceUserId, perms.read)
  const mutations = useMonitoringConfigMutations(serviceUserId)

  const [weight, setWeight] = React.useState('')
  const [weightEnabled, setWeightEnabled] = React.useState(true)
  const [fluidRequired, setFluidRequired] = React.useState(false)
  const [fluidEnabled, setFluidEnabled] = React.useState(true)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    if (!query.data || hydrated) return
    const w = query.data.find((r) => r.configKey === MEDICAL_MONITORING_KEYS.WEIGHT_CHANGE_THRESHOLD_KG)
    const f = query.data.find((r) => r.configKey === MEDICAL_MONITORING_KEYS.FLUID_TARGET_REQUIRED)
    if (w) {
      setWeight(w.numericValue != null ? String(w.numericValue) : '')
      setWeightEnabled(w.enabled)
    }
    if (f) {
      setFluidRequired(Boolean(f.booleanValue))
      setFluidEnabled(f.enabled)
    }
    setHydrated(true)
  }, [query.data, hydrated])

  React.useEffect(() => {
    setHydrated(false)
  }, [serviceUserId])

  async function saveWeight() {
    setFormError(null)
    const n = Number(weight)
    if (!Number.isFinite(n) || n <= 0) {
      setFormError('Weight change threshold must be a positive number (kg)')
      return
    }
    try {
      await mutations.upsert.mutateAsync({
        configKey: MEDICAL_MONITORING_KEYS.WEIGHT_CHANGE_THRESHOLD_KG,
        numericValue: n,
        enabled: weightEnabled,
      })
      toastSuccess('Weight threshold saved')
    } catch (err) {
      toastApiError(err, 'Could not save monitoring configuration')
    }
  }

  async function saveFluid() {
    setFormError(null)
    try {
      await mutations.upsert.mutateAsync({
        configKey: MEDICAL_MONITORING_KEYS.FLUID_TARGET_REQUIRED,
        booleanValue: fluidRequired,
        enabled: fluidEnabled,
      })
      toastSuccess('Fluid target setting saved')
    } catch (err) {
      toastApiError(err, 'Could not save monitoring configuration')
    }
  }

  if (!perms.read) return null

  return (
    <div className="space-y-3" data-testid="alert-parameters-section">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Alert parameters
        </h3>
        <p className="text-xs text-muted-foreground">
          Monitoring preferences for this service user. These configure monitoring only and do not
          automatically create operational alerts yet.
        </p>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : query.isError ? (
        <div className="space-y-2" role="alert">
          <p className="text-sm text-destructive">Unable to load alert parameters</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3 rounded-md border p-3" data-testid="monitoring-weight">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {MONITORING_KEY_LABELS.WEIGHT_CHANGE_THRESHOLD_KG}
              </p>
              {perms.update ? (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={weightEnabled} onCheckedChange={(v) => setWeightEnabled(Boolean(v))} />
                  Enabled
                </label>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Flag when weight changes by at least this many kilograms between readings.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium" htmlFor="weight-threshold">
                  Threshold (kg)
                </label>
                <Input
                  id="weight-threshold"
                  type="number"
                  min={0.01}
                  step={0.1}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  disabled={!perms.update}
                  className="w-28"
                />
              </div>
              {perms.update ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void saveWeight()}
                  disabled={mutations.upsert.isPending}
                >
                  {mutations.upsert.isPending ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Save
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 rounded-md border p-3" data-testid="monitoring-fluid">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{MONITORING_KEY_LABELS.FLUID_TARGET_REQUIRED}</p>
              {perms.update ? (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={fluidEnabled} onCheckedChange={(v) => setFluidEnabled(Boolean(v))} />
                  Enabled
                </label>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Whether a fluid target / fluid chart is required for this person.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={fluidRequired}
                  onCheckedChange={(v) => setFluidRequired(Boolean(v))}
                  disabled={!perms.update}
                />
                Fluid target required
              </label>
              {perms.update ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void saveFluid()}
                  disabled={mutations.upsert.isPending}
                >
                  Save
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      {!query.isLoading && !query.isError ? (
        <p className="text-[11px] text-muted-foreground">
          Supported keys: {KEYS.map((k) => MONITORING_KEY_LABELS[k]).join(' · ')}
        </p>
      ) : null}
    </div>
  )
}
