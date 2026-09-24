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
  useUsualParameterMutations,
  useUsualParameters,
} from '@/features/alerts/hooks/useMedicalClinical'
import { useObservationTypes } from '@/features/service-users/hooks/useServiceUserObservations'
import { cn } from '@/shared/lib/utils'
import {
  ClinicalBand,
  ClinicalSubBand,
  clinicalFieldClass,
} from '@/features/alerts/medical-safety/ClinicalRecordPrimitives'

const USUAL_PARAM_CODES = [
  { code: 'HEIGHT', label: 'Height' },
  { code: 'BLOOD_PRESSURE', label: 'Blood Pressure' },
  { code: 'BLOOD_SUGAR', label: 'Blood Sugar' },
  { code: 'RESPIRATION', label: 'Respiration Rate' },
  { code: 'PULSE', label: 'Pulse Rate' },
  { code: 'TEMPERATURE', label: 'Temperature' },
  { code: 'OXYGEN_SATURATION', label: 'Oxygen Saturation' },
  { code: 'RESPIRATORY_CONDITION', label: 'Respiratory Condition' },
] as const

export function ServiceUserParametersClinical({ serviceUserId }: { serviceUserId: string }) {
  const monPerms = useMedicalClinicalPermissions().monitoring
  const usualPerms = useMedicalClinicalPermissions().usual
  const monQuery = useMonitoringConfig(serviceUserId, monPerms.read)
  const usualQuery = useUsualParameters(serviceUserId, usualPerms.read)
  const typesQuery = useObservationTypes()
  const monMut = useMonitoringConfigMutations(serviceUserId)
  const usualMut = useUsualParameterMutations(serviceUserId)

  const [weight, setWeight] = React.useState('')
  const [weightEnabled, setWeightEnabled] = React.useState(true)
  const [fluidRequired, setFluidRequired] = React.useState(false)
  const [fluidEnabled, setFluidEnabled] = React.useState(true)
  const [hydrated, setHydrated] = React.useState(false)
  const [usualDraft, setUsualDraft] = React.useState<
    Record<string, { usual: string; lower: string; upper: string; enabled: boolean }>
  >({})

  React.useEffect(() => {
    if (!monQuery.data || hydrated) return
    const w = monQuery.data.find((r) => r.configKey === MEDICAL_MONITORING_KEYS.WEIGHT_CHANGE_THRESHOLD_KG)
    const f = monQuery.data.find((r) => r.configKey === MEDICAL_MONITORING_KEYS.FLUID_TARGET_REQUIRED)
    if (w) {
      setWeight(w.numericValue != null ? String(w.numericValue) : '')
      setWeightEnabled(w.enabled)
    }
    if (f) {
      setFluidRequired(Boolean(f.booleanValue))
      setFluidEnabled(f.enabled)
    }
    setHydrated(true)
  }, [monQuery.data, hydrated])

  React.useEffect(() => {
    setHydrated(false)
  }, [serviceUserId])

  React.useEffect(() => {
    if (!usualQuery.data || !typesQuery.data) return
    const next: Record<string, { usual: string; lower: string; upper: string; enabled: boolean }> =
      {}
    for (const item of USUAL_PARAM_CODES) {
      const type = typesQuery.data.find((t) => t.code === item.code)
      if (!type) continue
      const row = usualQuery.data.find((u) => u.observationTypeId === type.id)
      next[item.code] = {
        usual:
          row?.usualNumericValue != null
            ? String(row.usualNumericValue)
            : row?.usualTextValue ?? '',
        lower: row?.lowerBand != null ? String(row.lowerBand) : '',
        upper: row?.upperBand != null ? String(row.upperBand) : '',
        enabled: row?.enabled ?? false,
      }
    }
    setUsualDraft(next)
  }, [usualQuery.data, typesQuery.data])

  if (!monPerms.read && !usualPerms.read) return null

  async function saveMonitoring() {
    try {
      const n = Number(weight)
      if (weight.trim() && (!(n > 0) || !Number.isFinite(n))) {
        toastApiError(new Error('Weight threshold must be a positive number'), 'Invalid value')
        return
      }
      if (weight.trim()) {
        await monMut.upsert.mutateAsync({
          configKey: MEDICAL_MONITORING_KEYS.WEIGHT_CHANGE_THRESHOLD_KG,
          numericValue: n,
          enabled: weightEnabled,
        })
      }
      await monMut.upsert.mutateAsync({
        configKey: MEDICAL_MONITORING_KEYS.FLUID_TARGET_REQUIRED,
        booleanValue: fluidRequired,
        enabled: fluidEnabled,
      })
      toastSuccess('Alert parameters saved')
    } catch (err) {
      toastApiError(err, 'Could not save alert parameters')
    }
  }

  async function saveUsual() {
    try {
      for (const item of USUAL_PARAM_CODES) {
        const type = typesQuery.data?.find((t) => t.code === item.code)
        const draft = usualDraft[item.code]
        if (!type || !draft) continue
        if (!draft.enabled && !draft.usual && !draft.lower && !draft.upper) continue
        const numeric = draft.usual.trim() && !Number.isNaN(Number(draft.usual))
          ? Number(draft.usual)
          : null
        await usualMut.upsert.mutateAsync({
          observationTypeId: type.id,
          enabled: draft.enabled,
          usualNumericValue: numeric,
          usualTextValue: numeric == null && draft.usual.trim() ? draft.usual.trim() : null,
          lowerBand: draft.lower.trim() ? Number(draft.lower) : null,
          upperBand: draft.upper.trim() ? Number(draft.upper) : null,
        })
      }
      toastSuccess('Usual parameters saved')
    } catch (err) {
      toastApiError(err, 'Could not save usual parameters')
    }
  }

  return (
    <ClinicalBand title="Service User Parameters" testId="service-user-parameters">
      {monPerms.read ? (
        <ClinicalSubBand title="Alert Parameters" testId="alert-parameters-section">
          {monQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : monQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load alert parameters</p>
          ) : (
            <div className="space-y-2 text-[13px]">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Monitoring rules for this person. Weight and fluid flags appear on the matching
                Observations tabs — they do not create separate alert records.
              </p>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="weight-kg">
                    {MONITORING_KEY_LABELS.WEIGHT_CHANGE_THRESHOLD_KG} (kg)
                  </label>
                  <Input
                    id="weight-kg"
                    type="number"
                    min={0.01}
                    step={0.1}
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    disabled={!monPerms.update}
                    className={cn(clinicalFieldClass, 'mt-1 max-w-[10rem]')}
                  />
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={weightEnabled}
                    onCheckedChange={(v) => setWeightEnabled(Boolean(v))}
                    disabled={!monPerms.update}
                    className="h-3.5 w-3.5 rounded-none shadow-none"
                  />
                  Enabled
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {MONITORING_KEY_LABELS.FLUID_TARGET_REQUIRED}
                </span>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={fluidRequired}
                    onCheckedChange={(v) => setFluidRequired(Boolean(v))}
                    disabled={!monPerms.update}
                    className="h-3.5 w-3.5 rounded-none shadow-none"
                  />
                  Required
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={fluidEnabled}
                    onCheckedChange={(v) => setFluidEnabled(Boolean(v))}
                    disabled={!monPerms.update}
                    className="h-3.5 w-3.5 rounded-none shadow-none"
                  />
                  Enabled
                </label>
              </div>
              {monPerms.update ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-none"
                    onClick={() => void saveMonitoring()}
                    disabled={monMut.upsert.isPending}
                  >
                    {monMut.upsert.isPending ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Save alert parameters
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </ClinicalSubBand>
      ) : null}

      {usualPerms.read ? (
        <div className="mt-3">
          <ClinicalSubBand title="Usual Parameters" testId="usual-parameters-section">
            <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">
              Baseline / reference values — not actual observation readings. Shown on the Observations
              tab for matching vital types; out-of-range readings warn but still save.
            </p>
            {usualQuery.isLoading || typesQuery.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="overflow-x-auto border border-slate-300 dark:border-border bg-white dark:bg-card">
                <table className="w-full min-w-[36rem] text-left text-[13px]">
                  <thead className="bg-[#eef4f4] text-xs text-slate-700 dark:bg-muted dark:text-slate-200">
                    <tr>
                      <th className="px-2 py-1.5 font-semibold">Parameter</th>
                      <th className="px-2 py-1.5 font-semibold">Usual</th>
                      <th className="px-2 py-1.5 font-semibold">Lower</th>
                      <th className="px-2 py-1.5 font-semibold">Upper</th>
                      <th className="px-2 py-1.5 font-semibold">On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {USUAL_PARAM_CODES.map((item) => {
                      const type = typesQuery.data?.find((t) => t.code === item.code)
                      const draft = usualDraft[item.code]
                      if (!type) {
                        return (
                          <tr key={item.code} className="border-t border-slate-300 text-slate-500 dark:border-border dark:text-slate-400">
                            <td className="px-2 py-1">{item.label}</td>
                            <td className="px-2 py-1.5 text-xs" colSpan={4}>
                              Observation type not available in catalogue
                            </td>
                          </tr>
                        )
                      }
                      return (
                        <tr key={item.code} className="border-t border-slate-300 dark:border-border">
                          <td className="px-2 py-1 font-medium">{item.label}</td>
                          <td className="px-2 py-1">
                            <Input
                              value={draft?.usual ?? ''}
                              onChange={(e) =>
                                setUsualDraft((prev) => ({
                                  ...prev,
                                  [item.code]: {
                                    usual: e.target.value,
                                    lower: prev[item.code]?.lower ?? '',
                                    upper: prev[item.code]?.upper ?? '',
                                    enabled: prev[item.code]?.enabled ?? true,
                                  },
                                }))
                              }
                              disabled={!usualPerms.update}
                              className={cn(clinicalFieldClass, 'h-7')}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              type="number"
                              value={draft?.lower ?? ''}
                              onChange={(e) =>
                                setUsualDraft((prev) => ({
                                  ...prev,
                                  [item.code]: {
                                    usual: prev[item.code]?.usual ?? '',
                                    lower: e.target.value,
                                    upper: prev[item.code]?.upper ?? '',
                                    enabled: prev[item.code]?.enabled ?? true,
                                  },
                                }))
                              }
                              disabled={!usualPerms.update}
                              className={cn(clinicalFieldClass, 'h-7')}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              type="number"
                              value={draft?.upper ?? ''}
                              onChange={(e) =>
                                setUsualDraft((prev) => ({
                                  ...prev,
                                  [item.code]: {
                                    usual: prev[item.code]?.usual ?? '',
                                    lower: prev[item.code]?.lower ?? '',
                                    upper: e.target.value,
                                    enabled: prev[item.code]?.enabled ?? true,
                                  },
                                }))
                              }
                              disabled={!usualPerms.update}
                              className={cn(clinicalFieldClass, 'h-7')}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Checkbox
                              checked={draft?.enabled ?? false}
                              onCheckedChange={(v) =>
                                setUsualDraft((prev) => ({
                                  ...prev,
                                  [item.code]: {
                                    usual: prev[item.code]?.usual ?? '',
                                    lower: prev[item.code]?.lower ?? '',
                                    upper: prev[item.code]?.upper ?? '',
                                    enabled: Boolean(v),
                                  },
                                }))
                              }
                              disabled={!usualPerms.update}
                              className="h-3.5 w-3.5 rounded-none shadow-none"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {usualPerms.update ? (
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-none"
                  onClick={() => void saveUsual()}
                  disabled={usualMut.upsert.isPending}
                >
                  Save usual parameters
                </Button>
              </div>
            ) : null}
          </ClinicalSubBand>
        </div>
      ) : null}
    </ClinicalBand>
  )
}
