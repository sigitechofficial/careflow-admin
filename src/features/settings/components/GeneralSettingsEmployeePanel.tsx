import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import {
  fetchGeneralSettings,
  updateGeneralSettings,
  type ComplianceApprovalType,
  type ComplianceRequiredBy,
  type DefaultCarerStatus,
  type HolidayUnit,
  type OrganisationGeneralSettings,
  type WellbeingRegularity,
} from '@/lib/general-settings-api'
import { toastApiError, toastSuccess } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NoYesToggle } from '@/components/ui/no-yes-toggle'
import { RadioGroup, RadioGroupItem } from '@/components/ui/toggle-controls'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GeneralSettingsCard, SettingsRow } from '@/features/settings/components/GeneralSettingsCard'
import { useAuthStore } from '@/store/auth.store'

const WELLBEING_MOOD_COLORS = ['#22c55e', '#14b8a6', '#eab308', '#ec4899', '#ef4444'] as const

type EmployeeDraft = {
  defaultCarerStatus: DefaultCarerStatus
  sendEmailWhenEmployeeActive: boolean
  allowMultipleRoles: boolean
  allowWeekendDaysInHoliday: boolean
  mandateComplianceForNewEmployees: boolean
  defaultHolidaysUnit: HolidayUnit
  recruitmentFunctionalityRequired: boolean
  complianceRequiredBy: ComplianceRequiredBy
  complianceApprovalForNewEmployee: ComplianceApprovalType
  calculateSicknessBradfordScale: boolean
  recordServiceUserWellbeing: boolean
  recordEmployeeWellbeing: boolean
  wellbeingRegularity: WellbeingRegularity
  wellbeingLabels: string[]
}

const EMPLOYEE_DEFAULTS: EmployeeDraft = {
  defaultCarerStatus: 'ACTIVE',
  sendEmailWhenEmployeeActive: true,
  allowMultipleRoles: true,
  allowWeekendDaysInHoliday: true,
  mandateComplianceForNewEmployees: false,
  defaultHolidaysUnit: 'DAYS',
  recruitmentFunctionalityRequired: true,
  complianceRequiredBy: 'ROLE_WORK_AREA',
  complianceApprovalForNewEmployee: 'MANAGER_APPROVAL',
  calculateSicknessBradfordScale: false,
  recordServiceUserWellbeing: false,
  recordEmployeeWellbeing: true,
  wellbeingRegularity: 'DAILY',
  wellbeingLabels: ['Very Happy', 'Somewhat Happy', 'Somewhat sad', 'sad', 'Very Sad'],
}

function toEmployeeDraft(s: OrganisationGeneralSettings): EmployeeDraft {
  return {
    defaultCarerStatus: s.defaultCarerStatus,
    sendEmailWhenEmployeeActive: s.sendEmailWhenEmployeeActive,
    allowMultipleRoles: s.allowMultipleRoles,
    allowWeekendDaysInHoliday: s.allowWeekendDaysInHoliday,
    mandateComplianceForNewEmployees: s.mandateComplianceForNewEmployees,
    defaultHolidaysUnit: s.defaultHolidaysUnit,
    recruitmentFunctionalityRequired: s.recruitmentFunctionalityRequired,
    complianceRequiredBy: s.complianceRequiredBy,
    complianceApprovalForNewEmployee: s.complianceApprovalForNewEmployee,
    calculateSicknessBradfordScale: s.calculateSicknessBradfordScale,
    recordServiceUserWellbeing: s.recordServiceUserWellbeing,
    recordEmployeeWellbeing: s.recordEmployeeWellbeing,
    wellbeingRegularity: s.wellbeingRegularity,
    wellbeingLabels: [...s.wellbeingLabels],
  }
}

export function GeneralSettingsEmployeePanel() {
  const canUpdate = useAuthStore(s => s.can('lookups.manage'))
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState<EmployeeDraft | null>(null)
  const [draft, setDraft] = React.useState<EmployeeDraft>(EMPLOYEE_DEFAULTS)

  const apply = React.useCallback((s: OrganisationGeneralSettings) => {
    const d = toEmployeeDraft(s)
    setSaved(d)
    setDraft(d)
  }, [])

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const s = await fetchGeneralSettings()
        if (!cancelled) apply(s)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Could not load employee settings.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apply])

  async function onSave() {
    if (!canUpdate) return
    setSaving(true)
    try {
      const updated = await updateGeneralSettings(draft)
      apply(updated)
      toastSuccess('Saved', 'Employee settings updated.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function onReset() {
    if (saved) setDraft({ ...saved, wellbeingLabels: [...saved.wellbeingLabels] })
    else setDraft(EMPLOYEE_DEFAULTS)
  }

  function setLabel(index: number, value: string) {
    setDraft(d => {
      const wellbeingLabels = [...d.wellbeingLabels]
      wellbeingLabels[index] = value
      return { ...d, wellbeingLabels }
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="general-settings-employee-panel">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <GeneralSettingsCard title="Employee Settings">
            <SettingsRow label="Default Carer Status">
              <Select
                value={draft.defaultCarerStatus}
                onValueChange={v => setDraft(d => ({ ...d, defaultCarerStatus: v as DefaultCarerStatus }))}
                disabled={!canUpdate}
              >
                <SelectTrigger className="h-9 w-[8.5rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </SettingsRow>
            <SettingsRow label="Send email when Employee is active">
              <NoYesToggle
                value={draft.sendEmailWhenEmployeeActive}
                onChange={v => setDraft(d => ({ ...d, sendEmailWhenEmployeeActive: v }))}
                disabled={!canUpdate}
              />
            </SettingsRow>
            <SettingsRow label="Allow multiple roles">
              <NoYesToggle
                value={draft.allowMultipleRoles}
                onChange={v => setDraft(d => ({ ...d, allowMultipleRoles: v }))}
                disabled={!canUpdate}
              />
            </SettingsRow>
            <SettingsRow label="Allow weekend days to be included in holiday">
              <NoYesToggle
                value={draft.allowWeekendDaysInHoliday}
                onChange={v => setDraft(d => ({ ...d, allowWeekendDaysInHoliday: v }))}
                disabled={!canUpdate}
              />
            </SettingsRow>
            <SettingsRow label="Mandate compliance for new employees">
              <NoYesToggle
                value={draft.mandateComplianceForNewEmployees}
                onChange={v => setDraft(d => ({ ...d, mandateComplianceForNewEmployees: v }))}
                disabled={!canUpdate}
              />
            </SettingsRow>
            <SettingsRow label="Default holidays to Hours/Days">
              <NoYesToggle
                value={draft.defaultHolidaysUnit === 'DAYS'}
                onChange={v => setDraft(d => ({ ...d, defaultHolidaysUnit: v ? 'DAYS' : 'HOURS' }))}
                labelOff="Hours"
                labelOn="Days"
                disabled={!canUpdate}
              />
            </SettingsRow>
          </GeneralSettingsCard>

          <GeneralSettingsCard title="Recruitment and Compliance Settings">
            <SettingsRow label="Recruitment functionality required?">
              <NoYesToggle
                value={draft.recruitmentFunctionalityRequired}
                onChange={v => setDraft(d => ({ ...d, recruitmentFunctionalityRequired: v }))}
                disabled={!canUpdate}
              />
            </SettingsRow>
            <div className="space-y-2">
              <p className="text-sm text-foreground">Compliance Required By</p>
              <RadioGroup
                value={draft.complianceRequiredBy}
                onValueChange={v =>
                  setDraft(d => ({ ...d, complianceRequiredBy: v as ComplianceRequiredBy }))
                }
                disabled={!canUpdate}
                className="space-y-2"
              >
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="ROLE_WORK_AREA" />
                  <span className="text-sm">Role/Work Area</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="CITIZENSHIP" />
                  <span className="text-sm">Citizenship</span>
                </label>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-foreground">Compliance Approval Required For New Employee</p>
              <RadioGroup
                value={draft.complianceApprovalForNewEmployee}
                onValueChange={v =>
                  setDraft(d => ({
                    ...d,
                    complianceApprovalForNewEmployee: v as ComplianceApprovalType,
                  }))
                }
                disabled={!canUpdate}
                className="space-y-2"
              >
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="MANAGER_APPROVAL" />
                  <span className="text-sm">Manager Approval Required</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="HR_APPROVAL" />
                  <span className="text-sm">HR Approval Required</span>
                </label>
              </RadioGroup>
            </div>
          </GeneralSettingsCard>

          <GeneralSettingsCard title="Absence Management">
            <SettingsRow label="Calculate sickness using Bradford Scale">
              <NoYesToggle
                value={draft.calculateSicknessBradfordScale}
                onChange={v => setDraft(d => ({ ...d, calculateSicknessBradfordScale: v }))}
                disabled={!canUpdate}
              />
            </SettingsRow>
          </GeneralSettingsCard>
        </div>

        <GeneralSettingsCard title="Daily Journal Setting">
          <SettingsRow label="Record Service User Wellbeing">
            <NoYesToggle
              value={draft.recordServiceUserWellbeing}
              onChange={v => setDraft(d => ({ ...d, recordServiceUserWellbeing: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
          <SettingsRow label="Record Employee Wellbeing">
            <NoYesToggle
              value={draft.recordEmployeeWellbeing}
              onChange={v => setDraft(d => ({ ...d, recordEmployeeWellbeing: v }))}
              disabled={!canUpdate}
            />
          </SettingsRow>
          <SettingsRow label="Regularity">
            <Select
              value={draft.wellbeingRegularity}
              onValueChange={v =>
                setDraft(d => ({ ...d, wellbeingRegularity: v as WellbeingRegularity }))
              }
              disabled={!canUpdate}
            >
              <SelectTrigger className="h-9 w-[8.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
          <div className="space-y-2 pt-1">
            <p className="text-sm font-medium text-foreground">Wellbeing Labels</p>
            {draft.wellbeingLabels.map((label, index) => (
              <div key={index} className="flex items-center gap-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg"
                  style={{ backgroundColor: `${WELLBEING_MOOD_COLORS[index]}22` }}
                  aria-hidden
                >
                  <span
                    className="h-5 w-5 rounded-full"
                    style={{ backgroundColor: WELLBEING_MOOD_COLORS[index] }}
                  />
                </span>
                <Input
                  value={label}
                  disabled={!canUpdate}
                  onChange={e => setLabel(index, e.target.value)}
                  className="h-9 flex-1"
                />
              </div>
            ))}
          </div>
        </GeneralSettingsCard>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onReset} disabled={saving}>
          Reset
        </Button>
        <Button type="button" onClick={() => void onSave()} disabled={!canUpdate || saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </div>
  )
}
