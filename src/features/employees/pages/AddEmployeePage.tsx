import * as React from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useForm, Controller, useWatch, type FieldErrors, type FieldPath, type UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, Calendar, Clock, HelpCircle, Filter, Check, Plus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { ApiError } from '@/shared/api/api-client'
import { apiErrorMessage, applyApiConflictFieldErrors } from '@/shared/lib/api-error-message'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import {
  type EmployeeLookupsBundle,
  type LookupRow,
} from '@/features/employees/types'
import { useEmployee, useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import {
  useCreateEmployee,
  useCreateJobTitle,
  usePatchEmploymentMutation,
  usePatchPersonalDetailsMutation,
  useUploadEmployeePhoto,
} from '@/features/employees/hooks/useEmployeeMutations'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { EmployeeEmergencyContactsEditor } from '@/features/employees/components/EmployeeEmergencyContactsEditor'
import { EmployeeDocumentsSection } from '@/features/employees/components/EmployeeDocumentsSection'
import { EmployeeEditOverviewPanel } from '@/features/employees/components/EmployeeEditOverviewPanel'
import { EmployeeFortnightPatternEditor } from '@/features/employees/components/EmployeeFortnightPatternEditor'
import {
  EditEmployeeTabBar,
  parseEditEmployeeTabId,
  type EditEmployeeTabId,
} from '@/features/employees/components/EditEmployeeTabBar'
import { EmployeeEditSkillsPanel } from '@/features/employees/components/EmployeeEditSkillsPanel'
import { EmployeeEditNonCorePanel } from '@/features/employees/components/EmployeeEditNonCorePanel'
import { EmployeeEditHolidaysPanel } from '@/features/employees/components/EmployeeEditHolidaysPanel'
import { EmployeeEditCompliancePanel } from '@/features/employees/components/EmployeeEditCompliancePanel'
import { EmployeeEditPayCardPanel } from '@/features/employees/components/EmployeeEditPayCardPanel'
import { EmployeeEditEarningPanel } from '@/features/employees/components/EmployeeEditEarningPanel'
import { EmployeeEditVisitsPanel } from '@/features/employees/components/EmployeeEditVisitsPanel'
import { EmployeeEditSalaryPanel } from '@/features/employees/components/EmployeeEditSalaryPanel'
import { EmployeeEditLearningPanel } from '@/features/employees/components/EmployeeEditLearningPanel'
import { EmployeeEditSuspensionsPanel } from '@/features/employees/components/EmployeeEditSuspensionsPanel'
import { EmployeeEditIncidentsPanel } from '@/features/employees/components/EmployeeEditIncidentsPanel'
import { EmployeeEditAllocationsPanel } from '@/features/employees/components/EmployeeEditAllocationsPanel'
import { EmployeeAppAccessSection } from '@/features/employees/components/EmployeeAppAccessSection'
import { EmployeeEditReviewsPanel } from '@/features/employees/components/EmployeeEditReviewsPanel'
import { EmployeeZoneBranchAreaMultiSelect } from '@/features/employees/components/EmployeeZoneBranchAreaMultiSelect'
import {
  personalStepSchema,
  employmentStepSchema,
  resolveEmployeeWizardSchema,
  type EmployeeWizardStepId,
} from '@/schemas/add-employee.schema'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import {
  defaultContractedHoursForVisaType,
  effectiveWeeklyHoursCap,
  employmentHoursVisaError,
  isWeeklyHoursCapOverrideActive,
  labelForVisaType,
  maxWeeklyHoursForVisaType,
  normalizeVisaTypeRow,
  resolveEmployeeVisaTypes,
  visaTypeAutoFillsContractedHours,
} from '@/features/settings/employee/employee-visa-defaults'
import {
  mapEmployeeDetailToFormValues,
  type EmployeeFormValues,
} from '@/features/employees/lib/employee-detail-form.util'
import {
  DIAL_CODES,
  formatPhoneForApi,
  sanitizePhoneLocalInput,
  splitPhoneForForm,
} from '@/features/employees/dial-codes'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField, Label } from '@/shared/ui/form-field'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Combobox } from '@/shared/ui/combobox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { NoYesToggle } from '@/shared/ui/no-yes-toggle'
import { AddressPlacesField } from '@/shared/ui/address-places-field'
import {
  employeeAddressPayloadFromForm,
  ensureEmployeeAddressCoordinates,
} from '@/features/employees/utils/ensure-employee-address-coordinates.util'

type TabId = 'personal' | 'employment' | 'working-pattern'

type FormValues = EmployeeFormValues

const defaultValues: FormValues = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  titleId: '',
  genderId: '',
  nationalityId: '',
  ethnicityId: '',
  statusId: '',
  dateOfBirth: '',
  addressLine1: '',
  addressLine2: '',
  town: '',
  county: '',
  country: '',
  postcode: '',
  latitude: '',
  longitude: '',
  homeDialCode: '+44',
  homeTelephone: '',
  mobileDialCode: '+44',
  mobileTelephone: '',
  photoUrl: '',
  workAreaId: '',
  roleId: '',
  locationId: '',
  jobTitleId: '',
  rbacLevelId: '',
  gradeId: '',
  contractTypeId: '',
  travelPaymentTypeId: '',
  baseLocationIds: [],
  zoneIds: [],
  serviceUserAreaIds: [],
  startDate: '',
  endDate: '',
  nationalInsuranceNo: '',
  nmcPinNumber: '',
  employeeNumber: '',
  payrollNumber: '',
  accessAllZones: false,
  visaTypeId: '',
  isInCountry: true,
  contractedWeeklyHours: '',
  maximumWeeklyHours: '',
  minimumWeeklyHours: '',
  weeklyHoursCapOverride: '',
  weeklyHoursCapOverrideReason: '',
  weeklyHoursCapOverrideExpiresAt: '',
  optedOutOf48Hours: false,
  isAgencyStaff: false,
  agencyName: '',
  agencyRating: '',
  isPreferredAgency: false,
  isBlacklisted: false,
  dailyRate: '',
  hourlyDayRate: '',
  hourlyNightRate: '',
  availableForWork: true,
  workingPatternRequired: true,
  workBankHoliday: true,
}

function applyZodErrors(
  result: z.SafeParseError<unknown>,
  setError: UseFormSetError<FormValues>
) {
  for (const iss of result.error.issues) {
    const key = iss.path[0]
    if (typeof key === 'string' && key in defaultValues) {
      setError(key as FieldPath<FormValues>, { type: 'manual', message: iss.message })
    }
  }
}

async function personalPayloadFromStep(p: z.infer<typeof personalStepSchema>) {
  const address = await ensureEmployeeAddressCoordinates(employeeAddressPayloadFromForm(p))
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    titleId: p.titleId,
    genderId: p.genderId,
    email: p.email,
    username: p.username,
    nationalityId: p.nationalityId,
    ethnicityId: p.ethnicityId,
    statusId: p.statusId,
    dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString() : undefined,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    town: address.town,
    county: address.county,
    country: address.country,
    postcode: address.postcode,
    latitude: address.latitude,
    longitude: address.longitude,
    homeTelephone: formatPhoneForApi(p.homeDialCode, p.homeTelephone),
    mobileTelephone: formatPhoneForApi(p.mobileDialCode, p.mobileTelephone),
    photoUrl: p.photoUrl,
  }
}

function employmentPayloadFromStep(e: z.infer<typeof employmentStepSchema>) {
  const toNum = (v: string | undefined) => {
    if (v == null || v === '') return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  const accessAllZones = Boolean(e.accessAllZones)
  const primaryLocationId = e.locationId?.trim() || ''
  const otherBranchIds = accessAllZones
    ? []
    : [...new Set((e.baseLocationIds ?? []).filter(id => id && id !== primaryLocationId))]
  return {
    workAreaId: e.workAreaId,
    roleId: e.roleId,
    locationId: primaryLocationId || undefined,
    jobTitleId: e.jobTitleId,
    rbacLevelId: e.rbacLevelId,
    gradeId: e.gradeId,
    contractTypeId: e.contractTypeId,
    travelPaymentTypeId: e.travelPaymentTypeId,
    baseLocationId: accessAllZones ? null : primaryLocationId || null,
    baseLocationIds: otherBranchIds,
    serviceUserAreaIds: accessAllZones ? [] : (e.serviceUserAreaIds ?? []),
    startDate: e.startDate ? new Date(e.startDate).toISOString() : undefined,
    endDate: e.endDate ? new Date(e.endDate).toISOString() : undefined,
    nationalInsuranceNo: e.nationalInsuranceNo,
    nmcPinNumber: e.nmcPinNumber,
    employeeNumber: e.employeeNumber,
    payrollNumber: e.payrollNumber,
    accessAllZones,
    visaTypeId: e.visaTypeId || null,
    isInCountry: e.isInCountry,
    contractedWeeklyHours: toNum(e.contractedWeeklyHours),
    maximumWeeklyHours: toNum(e.maximumWeeklyHours),
    minimumWeeklyHours: toNum(e.minimumWeeklyHours),
    weeklyHoursCapOverride:
      e.weeklyHoursCapOverride != null && e.weeklyHoursCapOverride !== ''
        ? toNum(String(e.weeklyHoursCapOverride))
        : null,
    weeklyHoursCapOverrideReason: e.weeklyHoursCapOverrideReason?.trim() || null,
    weeklyHoursCapOverrideExpiresAt: e.weeklyHoursCapOverrideExpiresAt
      ? new Date(e.weeklyHoursCapOverrideExpiresAt).toISOString()
      : null,
    optedOutOf48Hours: e.optedOutOf48Hours,
    isAgencyStaff: e.isAgencyStaff,
    agencyName: e.agencyName,
    agencyRating: e.agencyRating,
    isPreferredAgency: e.isPreferredAgency,
    isBlacklisted: e.isBlacklisted,
    dailyRate: toNum(e.dailyRate),
    hourlyDayRate: toNum(e.hourlyDayRate),
    hourlyNightRate: toNum(e.hourlyNightRate),
  }
}

function FieldTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Field information"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-left leading-snug">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

function TimeWithClock({
  id,
  disabled,
  value,
  onChange,
}: {
  id?: string
  disabled?: boolean
  value?: string
  onChange?: (next: string) => void
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  return (
    <div className="flex min-w-0 gap-1.5">
      <Input
        ref={ref}
        id={id}
        className="h-8 min-w-0 flex-1 font-mono text-[13px] tabular-nums"
        type="time"
        step={60}
        disabled={disabled}
        value={value ?? ''}
        onChange={e => onChange?.(e.target.value)}
      />
      <button
        type="button"
        disabled={disabled}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
        aria-label="Open time picker"
        onClick={() => {
          const el = ref.current
          if (!el || disabled) return
          if (typeof el.showPicker === 'function') {
            try {
              el.showPicker()
            } catch {
              el.focus()
            }
          } else {
            el.focus()
          }
        }}
      >
        <Clock className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  )
}

const WIZARD_STEPS: { id: TabId; title: string; subtitle: string }[] = [
  { id: 'personal', title: 'Personal', subtitle: 'Identity & contact' },
  { id: 'employment', title: 'Employment', subtitle: 'Role & contract' },
  { id: 'working-pattern', title: 'Working pattern', subtitle: 'Availability' },
]

function WizardStepTimeline({
  tab,
  onSelect,
  personalComplete,
  employmentComplete,
}: {
  tab: TabId
  onSelect: (id: TabId) => void
  personalComplete: boolean
  employmentComplete: boolean
}) {
  const stepDone = (i: number) => {
    if (i === 0) return personalComplete
    if (i === 1) return employmentComplete
    return false
  }

  const canGoTo = (i: number) => {
    if (i === 0) return true
    if (i === 1) return personalComplete
    return personalComplete
  }

  return (
    <div className="border-b border-border bg-muted/20 px-4 py-5 sm:px-6">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Steps</p>
      <nav className="flex w-full min-w-0 items-start" aria-label="Add employee steps">
        {WIZARD_STEPS.map((step, i) => {
          const isActive = step.id === tab
          const done = stepDone(i)
          const reachable = canGoTo(i)
          const showCheck = done && !isActive

          return (
            <React.Fragment key={step.id}>
              {i > 0 ? (
                <div
                  className={cn(
                    'mt-[15px] h-0.5 min-w-[0.75rem] flex-1 shrink',
                    stepDone(i - 1) ? 'bg-primary' : 'bg-border'
                  )}
                  aria-hidden
                />
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col items-center px-1">
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => reachable && onSelect(step.id)}
                  data-testid={`employee-wizard-step-${step.id}`}
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
                    isActive && 'border-primary bg-primary text-primary-foreground shadow-sm ring-4 ring-primary/20',
                    !isActive && showCheck && 'border-primary bg-primary text-primary-foreground',
                    !isActive && !showCheck && done && 'border-primary/60 bg-primary/10 text-primary',
                    !isActive && !done && 'border-border bg-background text-muted-foreground',
                    !reachable && 'cursor-not-allowed opacity-50'
                  )}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {showCheck ? <Check className="h-4 w-4" strokeWidth={2.5} /> : i + 1}
                </button>
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => reachable && onSelect(step.id)}
                  className={cn(
                    'mt-2 w-full text-center text-sm font-semibold leading-tight',
                    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    !reachable && 'cursor-not-allowed hover:text-muted-foreground'
                  )}
                >
                  {step.title}
                </button>
                <p className="mt-0.5 hidden text-center text-xs text-muted-foreground sm:block">{step.subtitle}</p>
              </div>
            </React.Fragment>
          )
        })}
      </nav>
    </div>
  )
}

function lookupSearchPlaceholder(placeholder: string): string {
  const noun = placeholder.replace(/^select\s+/i, '').trim().toLowerCase()
  return noun ? `Search ${noun}…` : 'Search…'
}

function LookupSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  error,
  tip,
  disabled,
  savedOptionName,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  options: LookupRow[]
  placeholder: string
  error?: string
  tip?: string
  disabled?: boolean
  /** Label when `value` is set but missing from `options` (e.g. after loading saved employee). */
  savedOptionName?: string | null
}) {
  const mergedOptions = React.useMemo(() => {
    if (!value || options.some(o => o.id === value)) return options
    const label = savedOptionName?.trim() || '(saved)'
    return [{ id: value, name: label }, ...options]
  }, [options, value, savedOptionName])

  const comboboxOptions = React.useMemo(
    () => mergedOptions.map(o => ({ value: o.id, label: o.name })),
    [mergedOptions],
  )

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Combobox
        id={id}
        options={comboboxOptions}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        searchPlaceholder={lookupSearchPlaceholder(placeholder)}
        emptyText="No matches."
        disabled={disabled}
        error={!!error}
        allowDeselect
        className="min-w-0 flex-1"
      />
      {tip ? <FieldTip text={tip} /> : null}
    </div>
  )
}

export default function AddEmployeePage({ editEmployeeId }: { editEmployeeId?: string } = {}) {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { tab?: string; complianceType?: string }
  const isEditMode = Boolean(editEmployeeId)
  const [tab, setTab] = React.useState<TabId>('personal')
  const editTab: EditEmployeeTabId = isEditMode
    ? (parseEditEmployeeTabId(search.tab) ?? 'overview')
    : 'personal'
  const setEditTab = React.useCallback(
    (next: EditEmployeeTabId) => {
      if (!editEmployeeId) return
      void navigate({
        to: '/employee/$employeeId/edit',
        params: { employeeId: editEmployeeId },
        search: { tab: next },
        replace: true,
      })
    },
    [editEmployeeId, navigate],
  )
  const [editDisplayName, setEditDisplayName] = React.useState('')
  const [editPhotoUrl, setEditPhotoUrl] = React.useState<string | null>(null)
  const [jobTitleDialogOpen, setJobTitleDialogOpen] = React.useState(false)
  const [newJobTitleName, setNewJobTitleName] = React.useState('')
  const [jobTitleDialogError, setJobTitleDialogError] = React.useState<string | null>(null)
  const [createdEmployeeId, setCreatedEmployeeId] = React.useState<string | null>(null)
  const [employmentSaved, setEmploymentSaved] = React.useState(false)
  const [banner, setBanner] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const activeWizardStepRef = React.useRef<EmployeeWizardStepId | string>('personal')
  activeWizardStepRef.current = isEditMode ? editTab : tab

  const {
    register,
    control,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues,
    mode: 'onTouched',
    reValidateMode: 'onChange',
    resolver: async (values, context, options) => {
      const schema = resolveEmployeeWizardSchema(activeWizardStepRef.current as EmployeeWizardStepId)
      return zodResolver(schema)(values, context, options)
    },
  })

  /** Branch error to show after jumping to the Personal tab (the tab change clears errors first). */
  const pendingBranchErrorRef = React.useRef<string | null>(null)
  const branchSectionRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    clearErrors()
    if (pendingBranchErrorRef.current) {
      setError('locationId', { type: 'manual', message: pendingBranchErrorRef.current })
      pendingBranchErrorRef.current = null
      requestAnimationFrame(() => branchSectionRef.current?.scrollIntoView({ block: 'center' }))
    }
  }, [tab, editTab, clearErrors, setError])

  const [localPhotoObjectUrl, setLocalPhotoObjectUrl] = React.useState<string | null>(null)
  const pendingPhotoRef = React.useRef<File | null>(null)
  const photoFileInputRef = React.useRef<HTMLInputElement>(null)
  const hydratedDataTokenRef = React.useRef<string | null>(null)
  const prevVisaTypeIdRef = React.useRef<string | undefined>(undefined)

  const apiConfigured = Boolean(getApiBaseUrl())
  const accessToken = useAuthStore(s => s.accessToken)
  const apiReady = apiConfigured && Boolean(accessToken?.includes('.'))

  const createEmployeeMutation = useCreateEmployee()
  const patchPersonalMutation = usePatchPersonalDetailsMutation()
  const patchEmploymentMutation = usePatchEmploymentMutation()
  const uploadPhotoMutation = useUploadEmployeePhoto()
  const createJobTitleMutation = useCreateJobTitle()

  const lookupsQuery = useEmployeeLookups(apiReady)
  const employeeQuery = useEmployee(editEmployeeId ?? '', apiReady && Boolean(editEmployeeId))

  const L: EmployeeLookupsBundle | null = lookupsQuery.data ?? null
  const lookupsLoading = lookupsQuery.isLoading && apiReady
  const employeeBootstrapLoading = Boolean(editEmployeeId) && employeeQuery.isLoading

  const lookupsError = !apiConfigured
    ? 'Add VITE_API_BASE_URL to `.env` (see `.env.example`), restart Vite, then sign in — the app will obtain a real JWT from the Nest API.'
    : !accessToken?.includes('.')
      ? 'Sign in from the login page while the API URL is set — demo tokens cannot call the backend.'
      : lookupsQuery.error
        ? (() => {
            const e = lookupsQuery.error
            let msg = e instanceof ApiError ? e.message : 'Could not load lookups.'
            if (e instanceof ApiError && e.status === 401) {
              msg = 'Unauthorized (401). Sign out and sign in again with valid API credentials.'
            }
            return msg
          })()
        : null

  const employeeBootstrapError =
    editEmployeeId && apiReady && employeeQuery.error
      ? employeeQuery.error instanceof ApiError
        ? employeeQuery.error.message
        : 'Could not load employee.'
      : editEmployeeId && !apiReady
        ? 'Sign in while the API URL is set to edit an employee.'
        : null

  const saving =
    createEmployeeMutation.isPending ||
    patchPersonalMutation.isPending ||
    patchEmploymentMutation.isPending
  const photoUploading = uploadPhotoMutation.isPending
  const jobTitleSaving = createJobTitleMutation.isPending

  const watchedPhotoUrl = watch('photoUrl')

  const clearPendingPhotoSelection = React.useCallback(() => {
    setLocalPhotoObjectUrl(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
    pendingPhotoRef.current = null
    if (photoFileInputRef.current) {
      photoFileInputRef.current.value = ''
    }
  }, [])

  const flushPendingPhoto = React.useCallback(
    async (employeeId: string): Promise<boolean> => {
      const file = pendingPhotoRef.current
      if (!file) return true
      try {
        const { photoUrl } = await uploadPhotoMutation.mutateAsync({ employeeId, file })
        pendingPhotoRef.current = null
        setLocalPhotoObjectUrl(prev => {
          if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
          return null
        })
        setValue('photoUrl', photoUrl)
        return true
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Photo upload failed.'
        setBanner({ type: 'error', text: msg })
        return false
      }
    },
    [setValue, uploadPhotoMutation],
  )

  const onPhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const okTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!okTypes.includes(file.type)) {
      setBanner({ type: 'error', text: 'Choose a JPEG, PNG, WebP, or GIF image.' })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setBanner({ type: 'error', text: 'Image must be 2 MB or smaller.' })
      return
    }
    setBanner(null)
    const empId = createdEmployeeId ?? editEmployeeId ?? null
    if (empId && apiReady) {
      try {
        const { photoUrl } = await uploadPhotoMutation.mutateAsync({ employeeId: empId, file })
        setLocalPhotoObjectUrl(prev => {
          if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
          return null
        })
        pendingPhotoRef.current = null
        setValue('photoUrl', photoUrl)
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Photo upload failed.'
        setBanner({ type: 'error', text: msg })
      }
      return
    }
    setLocalPhotoObjectUrl(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    pendingPhotoRef.current = file
  }

  const onClearPhoto = async () => {
    setBanner(null)
    clearPendingPhotoSelection()
    setValue('photoUrl', '')
    const empId = createdEmployeeId ?? editEmployeeId ?? null
    if (empId && apiReady) {
      try {
        await patchPersonalMutation.mutateAsync({ employeeId: empId, body: { photoUrl: '' } })
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Could not remove photo.'
        setBanner({ type: 'error', text: msg })
      }
    }
  }

  React.useEffect(() => {
    return () => {
      if (localPhotoObjectUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(localPhotoObjectUrl)
      }
    }
  }, [localPhotoObjectUrl])

  const availableForWork = useWatch({ control, name: 'availableForWork' })
  const workingPatternRequired = useWatch({ control, name: 'workingPatternRequired' })
  const isAgencyStaff = useWatch({ control, name: 'isAgencyStaff' })
  const visaTypeId = useWatch({ control, name: 'visaTypeId' })
  const generalSettingsQuery = useGeneralSettings(apiReady)
  const visaTypes = React.useMemo(() => {
    const base = resolveEmployeeVisaTypes(generalSettingsQuery.data?.employeeVisaTypes).map(
      normalizeVisaTypeRow,
    )
    if (!visaTypeId || base.some(vt => vt.id === visaTypeId)) return base
    return [
      {
        id: visaTypeId,
        label: labelForVisaType(base, visaTypeId) ?? visaTypeId,
        maxWeeklyHours: 40,
        defaultContractedHours: null,
      },
      ...base,
    ]
  }, [generalSettingsQuery.data?.employeeVisaTypes, visaTypeId])

  const visaMaxHours = maxWeeklyHoursForVisaType(visaTypes, visaTypeId)
  const weeklyHoursCapOverride = useWatch({ control, name: 'weeklyHoursCapOverride' })
  const weeklyHoursCapOverrideReason = useWatch({ control, name: 'weeklyHoursCapOverrideReason' })
  const weeklyHoursCapOverrideExpiresAt = useWatch({ control, name: 'weeklyHoursCapOverrideExpiresAt' })
  const hoursCapOverride = React.useMemo(
    () => ({
      weeklyHoursCapOverride,
      weeklyHoursCapOverrideReason,
      weeklyHoursCapOverrideExpiresAt,
    }),
    [weeklyHoursCapOverride, weeklyHoursCapOverrideReason, weeklyHoursCapOverrideExpiresAt],
  )
  const effectiveVisaCap = effectiveWeeklyHoursCap(visaTypes, visaTypeId, hoursCapOverride)
  const overrideActive = isWeeklyHoursCapOverrideActive(hoursCapOverride)
  const contractedWeeklyHours = useWatch({ control, name: 'contractedWeeklyHours' })
  const maximumWeeklyHours = useWatch({ control, name: 'maximumWeeklyHours' })
  const accessAllZones = useWatch({ control, name: 'accessAllZones' })
  const baseLocationIds = useWatch({ control, name: 'baseLocationIds' })
  const locationId = useWatch({ control, name: 'locationId' })
  const zoneIds = useWatch({ control, name: 'zoneIds' })
  const serviceUserAreaIds = useWatch({ control, name: 'serviceUserAreaIds' })

  const visaHoursError = React.useMemo(
    () =>
      employmentHoursVisaError(visaTypes, visaTypeId, {
        contractedWeeklyHours,
        maximumWeeklyHours,
      }, hoursCapOverride),
    [visaTypes, visaTypeId, contractedWeeklyHours, maximumWeeklyHours, hoursCapOverride],
  )

  const savedPersonal = employeeQuery.data?.personalDetail
  const savedEmployment = employeeQuery.data?.employment

  React.useEffect(() => {
    if (!accessAllZones) return
    if ((baseLocationIds?.length ?? 0) > 0) {
      setValue('baseLocationIds', [], { shouldDirty: true })
    }
    if ((serviceUserAreaIds?.length ?? 0) > 0) {
      setValue('serviceUserAreaIds', [], { shouldDirty: true })
    }
  }, [accessAllZones, baseLocationIds, serviceUserAreaIds, setValue])

  React.useEffect(() => {
    if (!visaTypeId) {
      prevVisaTypeIdRef.current = undefined
      return
    }
    if (prevVisaTypeIdRef.current === undefined) {
      prevVisaTypeIdRef.current = visaTypeId
      return
    }
    if (prevVisaTypeIdRef.current === visaTypeId) return
    prevVisaTypeIdRef.current = visaTypeId
    if (!visaTypeAutoFillsContractedHours(visaTypes, visaTypeId)) return
    const hours = defaultContractedHoursForVisaType(visaTypes, visaTypeId)
    if (hours === undefined) return
    setValue('contractedWeeklyHours', String(hours), { shouldDirty: true })
    setValue('minimumWeeklyHours', String(Math.min(hours, 16)), { shouldDirty: true })
    setValue('maximumWeeklyHours', String(hours), { shouldDirty: true })
  }, [visaTypeId, visaTypes, setValue])

  React.useEffect(() => {
    hydratedDataTokenRef.current = null
    prevVisaTypeIdRef.current = undefined
  }, [editEmployeeId])

  React.useEffect(() => {
    if (!editEmployeeId || !employeeQuery.data) return
    const token = `${editEmployeeId}:${employeeQuery.dataUpdatedAt}`
    if (hydratedDataTokenRef.current === token) return
    clearPendingPhotoSelection()
    reset(mapEmployeeDetailToFormValues(employeeQuery.data, defaultValues, splitPhoneForForm))
    prevVisaTypeIdRef.current = employeeQuery.data.employment?.visaTypeId ?? undefined
    setCreatedEmployeeId(editEmployeeId)
    setEmploymentSaved(Boolean(employeeQuery.data.employment))
    const pd = employeeQuery.data.personalDetail
    setEditDisplayName(
      [pd?.firstName, pd?.lastName].filter(Boolean).join(' ').trim() || 'Employee',
    )
    setEditPhotoUrl(pd?.photoUrl ?? null)
    hydratedDataTokenRef.current = token
  }, [
    editEmployeeId,
    employeeQuery.data,
    employeeQuery.dataUpdatedAt,
    reset,
    clearPendingPhotoSelection,
  ])

  const onCreateJobTitle = async () => {
    const trimmed = newJobTitleName.trim()
    if (!trimmed) {
      setJobTitleDialogError('Enter a job title.')
      return
    }
    setJobTitleDialogError(null)
    try {
      const row = await createJobTitleMutation.mutateAsync(trimmed)
      setValue('jobTitleId', row.id, { shouldDirty: true, shouldValidate: true })
      setJobTitleDialogOpen(false)
      setNewJobTitleName('')
    } catch (e) {
      setJobTitleDialogError(e instanceof ApiError ? e.message : 'Could not add job title.')
    }
  }

  const onSavePersonal = async () => {
    setBanner(null)
    // handleSubmit + personalStepSchema strips non-personal fields from the callback arg.
    // Always read location scope from the full form so Access all zones / branches / areas persist.
    const form = getValues()
    const parsed = personalStepSchema.safeParse(form)
    if (!parsed.success) {
      applyZodErrors(parsed, setError)
      setBanner({ type: 'error', text: 'Fix the highlighted fields before continuing.' })
      return
    }
    if (!apiConfigured) {
      setBanner({ type: 'error', text: 'Configure VITE_API_BASE_URL to create an employee on the server.' })
      return
    }
    try {
      const p = parsed.data
      const personalBody = await personalPayloadFromStep(p)
      const accessAllZones = Boolean(form.accessAllZones)
      const primaryLocationId = form.locationId?.trim() || ''
      const otherBranchIds = accessAllZones
        ? []
        : [...new Set((form.baseLocationIds ?? []).filter(id => id && id !== primaryLocationId))]
      const locationEmploymentBody = {
        locationId: primaryLocationId || undefined,
        // Sync legacy singular field so it cannot resurrect a second branch on reload.
        baseLocationId: accessAllZones ? null : primaryLocationId || null,
        baseLocationIds: otherBranchIds,
        serviceUserAreaIds: accessAllZones ? [] : (form.serviceUserAreaIds ?? []),
        accessAllZones,
      }
      // Once the wizard has created the employee, saving Personal again updates that record instead of creating another.
      const existingEmployeeId = isEditMode ? editEmployeeId : createdEmployeeId
      if (existingEmployeeId) {
        await patchPersonalMutation.mutateAsync({ employeeId: existingEmployeeId, body: personalBody })
        // Always persist location scope on a repeat personal save so zone/branch/area
        // selections stay in sync with what the Personal tab shows.
        await patchEmploymentMutation.mutateAsync({
          employeeId: existingEmployeeId,
          body: locationEmploymentBody,
        })
        const photoOk = await flushPendingPhoto(existingEmployeeId)
        if (!photoOk) {
          return
        }
        setCreatedEmployeeId(existingEmployeeId)
        setBanner({ type: 'success', text: 'Personal details saved.' })
        setEditDisplayName([p.firstName, p.lastName].filter(Boolean).join(' ').trim() || 'Employee')
        if (!isEditMode) setTab('employment')
        return
      }
      const { id } = await createEmployeeMutation.mutateAsync({
        firstName: p.firstName,
        lastName: p.lastName,
        username: p.username,
        email: p.email,
        titleId: p.titleId,
        genderId: p.genderId,
        nationalityId: p.nationalityId,
        ethnicityId: p.ethnicityId,
        statusId: p.statusId,
      })
      setCreatedEmployeeId(id)
      setEmploymentSaved(false)
      await patchPersonalMutation.mutateAsync({ employeeId: id, body: personalBody })
      if (
        primaryLocationId ||
        accessAllZones ||
        (form.serviceUserAreaIds?.length ?? 0) > 0 ||
        otherBranchIds.length > 0
      ) {
        await patchEmploymentMutation.mutateAsync({
          employeeId: id,
          body: locationEmploymentBody,
        })
      }
      const photoOk = await flushPendingPhoto(id)
      if (!photoOk) {
        return
      }
      setBanner({ type: 'success', text: 'Employee created. Complete employment details on the next tab.' })
      setTab('employment')
    } catch (e) {
      applyApiConflictFieldErrors(e, (name, err) => setError(name, err))
      setBanner({ type: 'error', text: apiErrorMessage(e, 'Save failed.') })
    }
  }

  /** The branch picker is on the Personal tab, so a missing branch on Employment save takes the user there. */
  const goToPersonalForBranch = (message: string) => {
    pendingBranchErrorRef.current = message
    setBanner({
      type: 'error',
      text: 'Select a branch under Zones, branches & service areas, then save Employment again.',
    })
    if (isEditMode) setEditTab('personal')
    else setTab('personal')
  }

  const onEmploymentInvalid = (formErrors: FieldErrors<FormValues>) => {
    const branchMessage = formErrors.locationId?.message
    if (branchMessage) goToPersonalForBranch(branchMessage)
  }

  const onSaveEmployment = async () => {
    setBanner(null)
    if (!createdEmployeeId) {
      setBanner({ type: 'error', text: 'Save Personal Details first.' })
      setTab('personal')
      return
    }
    // Same as personal: resolver strips unknown keys; read full form for location scope.
    const form = getValues()
    const parsed = employmentStepSchema.safeParse(form)
    if (!parsed.success) {
      const branchIssue = parsed.error.issues.find(i => i.path[0] === 'locationId')
      if (branchIssue) {
        goToPersonalForBranch(branchIssue.message)
        return
      }
      applyZodErrors(parsed, setError)
      setBanner({ type: 'error', text: 'Fix employment fields marked in red.' })
      return
    }
    const visaErr = employmentHoursVisaError(visaTypes, parsed.data.visaTypeId, {
      contractedWeeklyHours: parsed.data.contractedWeeklyHours,
      maximumWeeklyHours: parsed.data.maximumWeeklyHours,
    }, {
      weeklyHoursCapOverride: parsed.data.weeklyHoursCapOverride,
      weeklyHoursCapOverrideReason: parsed.data.weeklyHoursCapOverrideReason,
      weeklyHoursCapOverrideExpiresAt: parsed.data.weeklyHoursCapOverrideExpiresAt,
    })
    if (visaErr) {
      setBanner({ type: 'error', text: visaErr })
      return
    }
    try {
      await patchEmploymentMutation.mutateAsync({
        employeeId: createdEmployeeId,
        body: employmentPayloadFromStep(parsed.data),
      })
      setEmploymentSaved(true)
      setBanner({
        type: 'success',
        text: isEditMode
          ? 'Employment saved.'
          : 'Employment saved. Configure the working pattern on the next tab.',
      })
      if (!isEditMode) setTab('working-pattern')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Employment save failed.'
      setBanner({ type: 'error', text: msg })
    }
  }

  const onFinish = () => {
    if (isEditMode) {
      navigate({ to: '/employee/staff-list' })
      return
    }
    if (!createdEmployeeId) {
      setBanner({ type: 'error', text: 'Create the employee from Personal Details before finishing.' })
      setTab('personal')
      return
    }
    navigate({ to: '/employee/staff-list' })
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {banner ? (
          <div
            role="status"
            className={cn(
              'rounded-lg border px-4 py-3 text-sm',
              banner.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                : 'border-destructive/40 bg-destructive/10 text-destructive'
            )}
          >
            {banner.text}
          </div>
        ) : null}

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="space-y-1.5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3" data-testid="employee-wizard-title">
                {isEditMode && (localPhotoObjectUrl ?? resolveMediaUrl(editPhotoUrl ?? watchedPhotoUrl)) ? (
                  <img
                    src={localPhotoObjectUrl ?? resolveMediaUrl(editPhotoUrl ?? watchedPhotoUrl) ?? undefined}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
                  />
                ) : (
                  <Filter className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-semibold text-foreground">
                  {isEditMode ? (
                    <>
                      Edit Employee
                      {editDisplayName ? (
                        <span className="ml-2 font-normal text-muted-foreground">{editDisplayName}</span>
                      ) : null}
                    </>
                  ) : (
                    'Add Employee'
                  )}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                data-testid="employee-wizard-return-staff-list"
                onClick={() => navigate({ to: '/employee/staff-list' })}
              >
                <ChevronLeft className="h-4 w-4" />
                Return to Manage employee
              </Button>
            </div>
            {!isEditMode ? (
              <p className="text-sm text-muted-foreground">
                Enter personal details (then emergency contacts and documents), then employment, then save your weekly
                pattern.
              </p>
            ) : null}
            {employeeBootstrapLoading ? (
              <p className="text-xs text-muted-foreground">Loading employee…</p>
            ) : null}
            {employeeBootstrapError ? (
              <p className="text-xs text-amber-800 dark:text-amber-200">{employeeBootstrapError}</p>
            ) : null}
            {lookupsLoading ? (
              <p className="text-xs text-muted-foreground">Loading reference data…</p>
            ) : null}
            {lookupsError ? <p className="text-xs text-amber-800 dark:text-amber-200">{lookupsError}</p> : null}
            {!isEditMode && createdEmployeeId ? (
              <p className="text-xs text-muted-foreground">
                Draft employee ID: <span className="font-mono text-foreground">{createdEmployeeId}</span>
              </p>
            ) : null}
            {isEditMode && createdEmployeeId && !employeeBootstrapError ? (
              <p className="text-xs text-muted-foreground">
                Employee ID: <span className="font-mono text-foreground">{createdEmployeeId}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            'overflow-hidden rounded-xl border border-border bg-card shadow-sm',
            isEditMode && 'md:flex md:items-stretch',
          )}
          data-testid="employee-wizard"
        >
          {isEditMode ? (
            <EditEmployeeTabBar activeTab={editTab} onTabChange={setEditTab} />
          ) : (
            <WizardStepTimeline
              tab={tab}
              personalComplete={Boolean(createdEmployeeId)}
              employmentComplete={employmentSaved}
              onSelect={id => setTab(id)}
            />
          )}

          <div className="min-w-0 flex-1 p-4 md:p-5">
            {((isEditMode && editTab === 'personal') || (!isEditMode && tab === 'personal')) && (
              <div className="space-y-6">
              <form
                id="employee-personal-form"
                className="space-y-6"
                data-testid="employee-personal-form"
                onSubmit={handleSubmit(onSavePersonal)}
              >
                <h2 className="text-sm font-semibold text-foreground">Personal Details</h2>

                <div className="grid grid-cols-1 gap-y-4 gap-x-10 lg:grid-cols-2">
                  <FormField
                    label="First name"
                    htmlFor="firstName"
                    required
                    error={errors.firstName?.message}
                    hint="Legal first name as it should appear on records."
                  >
                    <div className="flex gap-2">
                      <Input
                        id="firstName"
                        autoComplete="given-name"
                        error={!!errors.firstName}
                        {...register('firstName')}
                      />
                      <FieldTip text="Shown on care rosters and ID badges. Max 100 characters." />
                    </div>
                  </FormField>

                  <FormField
                    label="Last name"
                    htmlFor="lastName"
                    required
                    error={errors.lastName?.message}
                  >
                    <div className="flex gap-2">
                      <Input
                        id="lastName"
                        autoComplete="family-name"
                        error={!!errors.lastName}
                        {...register('lastName')}
                      />
                      <FieldTip text="Family name or surname. Required for HR and payroll matching." />
                    </div>
                  </FormField>

                  <FormField label="Title" htmlFor="titleId" error={errors.titleId?.message}>
                    <Controller
                      name="titleId"
                      control={control}
                      render={({ field }) => (
                        <LookupSelect
                          id="titleId"
                          value={field.value}
                          onChange={field.onChange}
                          options={L?.titles ?? []}
                          placeholder="Select title"
                          error={errors.titleId?.message}
                          tip="Courtesy title for correspondence."
                          disabled={!L}
                          savedOptionName={savedPersonal?.title?.name}
                        />
                      )}
                    />
                  </FormField>

                  <FormField label="Gender" htmlFor="genderId" error={errors.genderId?.message}>
                    <Controller
                      name="genderId"
                      control={control}
                      render={({ field }) => (
                        <LookupSelect
                          id="genderId"
                          value={field.value}
                          onChange={field.onChange}
                          options={L?.genders ?? []}
                          placeholder="Select gender"
                          error={errors.genderId?.message}
                          tip="Used for equality monitoring only; optional where not collected."
                          disabled={!L}
                          savedOptionName={savedPersonal?.gender?.name}
                        />
                      )}
                    />
                  </FormField>

                  <FormField label="Email" htmlFor="email" error={errors.email?.message}>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="name@example.com"
                        error={!!errors.email}
                        {...register('email')}
                      />
                      <FieldTip text="Optional. Must be unique in the system if provided." />
                    </div>
                  </FormField>

                  <FormField
                    label="Username"
                    htmlFor="username"
                    required
                    error={errors.username?.message}
                    hint="Letters, numbers, dot, underscore, or hyphen only."
                  >
                    <div className="flex gap-2">
                      <Input
                        id="username"
                        autoComplete="username"
                        error={!!errors.username}
                        {...register('username')}
                      />
                      <FieldTip text="Login identifier for this employee when portal access is enabled." />
                    </div>
                  </FormField>

                  <FormField label="Date of birth" htmlFor="dateOfBirth" error={errors.dateOfBirth?.message}>
                    <div className="flex gap-2">
                      <Input
                        id="dateOfBirth"
                        type="date"
                        error={!!errors.dateOfBirth}
                        {...register('dateOfBirth')}
                      />
                      <FieldTip text="Used for age checks and right-to-work screening." />
                    </div>
                  </FormField>

                  <div className="lg:col-span-2">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">
                      Address (optional — includes map coordinates)
                    </h3>
                    <AddressPlacesField
                      coordinatesReadOnly
                      value={{
                        addressLine1: watch('addressLine1') ?? '',
                        addressLine2: watch('addressLine2') ?? '',
                        town: watch('town') ?? '',
                        county: watch('county') ?? '',
                        country: watch('country') ?? '',
                        postcode: watch('postcode') ?? '',
                        latitude: watch('latitude') ?? '',
                        longitude: watch('longitude') ?? '',
                      }}
                      onChange={patch => {
                        for (const [key, val] of Object.entries(patch)) {
                          setValue(key as FieldPath<FormValues>, val ?? '', { shouldDirty: true })
                        }
                      }}
                    />
                  </div>

                  <FormField label="Nationality" htmlFor="nationalityId" error={errors.nationalityId?.message}>
                    <Controller
                      name="nationalityId"
                      control={control}
                      render={({ field }) => (
                        <LookupSelect
                          id="nationalityId"
                          value={field.value}
                          onChange={field.onChange}
                          options={L?.nationalities ?? []}
                          placeholder="Select nationality"
                          error={errors.nationalityId?.message}
                          disabled={!L}
                          tip="Stored on the employee profile (lookup id). Right-to-work evidence may be required separately."
                          savedOptionName={savedPersonal?.nationality?.name}
                        />
                      )}
                    />
                  </FormField>

                  <FormField label="Ethnicity" htmlFor="ethnicityId" error={errors.ethnicityId?.message}>
                    <Controller
                      name="ethnicityId"
                      control={control}
                      render={({ field }) => (
                        <LookupSelect
                          id="ethnicityId"
                          value={field.value}
                          onChange={field.onChange}
                          options={L?.ethnicities ?? []}
                          placeholder="Select ethnicity"
                          error={errors.ethnicityId?.message}
                          disabled={!L}
                          tip="Optional. Uses the same ethnicity list as service users (Settings → Lookup data → Ethnicities)."
                          savedOptionName={savedPersonal?.ethnicity?.name}
                        />
                      )}
                    />
                  </FormField>

                  <FormField label="Home telephone" htmlFor="homeTelephone" error={errors.homeTelephone?.message}>
                    <Controller
                      name="homeTelephone"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="homeTelephone"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="Digits only"
                          error={!!errors.homeTelephone}
                          value={field.value}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          onChange={e => field.onChange(sanitizePhoneLocalInput(e.target.value))}
                        />
                      )}
                    />
                  </FormField>
                  <FormField
                    label="Mobile telephone"
                    htmlFor="mobileTelephone"
                    hint="Country code and local number; stored together for the profile."
                    error={errors.mobileDialCode?.message ?? errors.mobileTelephone?.message}
                  >
                    <div className="flex min-w-0 gap-2">
                      <Controller
                        name="mobileDialCode"
                        control={control}
                        render={({ field }) => (
                          <Combobox
                            id="mobileDialCode"
                            aria-label="Mobile country code"
                            options={DIAL_CODES.map(({ code, label }) => ({ value: code, label }))}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Code"
                            searchPlaceholder="Search country code…"
                            allowDeselect={false}
                            error={!!errors.mobileDialCode}
                            className="h-9 w-[11rem] shrink-0"
                          />
                        )}
                      />
                      <Controller
                        name="mobileTelephone"
                        control={control}
                        render={({ field }) => (
                          <Input
                            id="mobileTelephone"
                            className="min-w-0 flex-1"
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel-national"
                            placeholder="Digits only"
                            error={!!errors.mobileTelephone}
                            value={field.value}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            onChange={e => field.onChange(sanitizePhoneLocalInput(e.target.value))}
                          />
                        )}
                      />
                    </div>
                  </FormField>
                  <FormField label="Status" htmlFor="statusId" error={errors.statusId?.message}>
                    <Controller
                      name="statusId"
                      control={control}
                      render={({ field }) => (
                        <LookupSelect
                          id="statusId"
                          value={field.value}
                          onChange={field.onChange}
                          options={L?.employeeStatuses ?? []}
                          placeholder="Select status"
                          error={errors.statusId?.message}
                          disabled={!L}
                          tip="Active / inactive flags for roster eligibility."
                          savedOptionName={savedPersonal?.status?.name}
                        />
                      )}
                    />
                  </FormField>
                  <FormField label="Photo" htmlFor="employee-photo-file" error={errors.photoUrl?.message}>
                    <input type="hidden" {...register('photoUrl')} />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <input
                          ref={photoFileInputRef}
                          id="employee-photo-file"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                          disabled={photoUploading || !apiReady}
                          onChange={onPhotoFileChange}
                        />
                        <p className="text-xs text-muted-foreground">
                          JPEG, PNG, WebP, or GIF — max 2 MB.
                          {!createdEmployeeId && !editEmployeeId
                            ? ' Save personal details once first; your selected image uploads right after that.'
                            : null}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={photoUploading || (!watchedPhotoUrl && !localPhotoObjectUrl)}
                            onClick={() => void onClearPhoto()}
                          >
                            Remove photo
                          </Button>
                          <FieldTip text="Photo is stored on the server and linked to this employee profile." />
                        </div>
                      </div>
                      {(localPhotoObjectUrl ?? resolveMediaUrl(watchedPhotoUrl)) ? (
                        <div className="shrink-0 rounded-lg border border-border bg-muted/30 p-2">
                          <img
                            src={localPhotoObjectUrl ?? resolveMediaUrl(watchedPhotoUrl) ?? undefined}
                            alt=""
                            className="mx-auto h-24 w-24 rounded-md object-cover"
                          />
                        </div>
                      ) : null}
                    </div>
                  </FormField>
                </div>

                <div className="space-y-3 border-t border-border pt-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">Access all zones</span>
                    <FieldTip text="When Yes, the carer can work at any branch. Zone, branch and service area selections below are not used." />
                    <Controller
                      name="accessAllZones"
                      control={control}
                      render={({ field }) => (
                        <NoYesToggle
                          id="accessAllZones"
                          value={field.value}
                          onChange={v => {
                            field.onChange(v)
                            if (v) {
                              setValue('baseLocationIds', [], { shouldDirty: true })
                              setValue('serviceUserAreaIds', [], { shouldDirty: true })
                              setValue('zoneIds', [], { shouldDirty: true })
                            }
                          }}
                        />
                      )}
                    />
                  </div>

                  <div ref={branchSectionRef} className={cn('space-y-3', accessAllZones && 'opacity-60')}>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        Zones, branches &amp; service areas
                      </h3>
                      <FieldTip text="An employee can work across multiple zones, branches and monitoring areas. The first selected branch is the primary location." />
                    </div>
                    {errors.locationId?.message ? (
                      <p className="text-sm text-destructive" role="alert">
                        {errors.locationId.message}
                      </p>
                    ) : null}
                    <EmployeeZoneBranchAreaMultiSelect
                      disabled={Boolean(accessAllZones)}
                      value={{
                        zoneIds: zoneIds ?? [],
                        locationIds: [
                          ...new Set([
                            ...(locationId ? [locationId] : []),
                            ...((baseLocationIds ?? []).filter(id => id && id !== locationId)),
                          ]),
                        ],
                        serviceUserAreaIds: serviceUserAreaIds ?? [],
                      }}
                      onChange={(next, meta) => {
                        const dirty = meta?.source !== 'hydrate'
                        const uniqueLocations = [...new Set(next.locationIds.filter(Boolean))]
                        const [primary, ...rest] = uniqueLocations
                        setValue('zoneIds', next.zoneIds, { shouldDirty: dirty })
                        setValue('locationId', primary ?? '', {
                          shouldDirty: dirty,
                          shouldValidate: dirty,
                        })
                        setValue('baseLocationIds', rest, { shouldDirty: dirty })
                        setValue('serviceUserAreaIds', next.serviceUserAreaIds, {
                          shouldDirty: dirty,
                        })
                      }}
                    />
                    {accessAllZones ? (
                      <p className="text-xs text-muted-foreground">
                        Not used while Access all zones is Yes.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="border-t border-border pt-5">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Next of Kin / Emergency Contacts</h3>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Contacts are saved to the server per employee (<span className="font-mono">/employees/:id/emergency-contacts</span>).
                  </p>
                  <EmployeeEmergencyContactsEditor
                    employeeId={createdEmployeeId ?? editEmployeeId ?? null}
                    apiReady={apiReady}
                  />
                </div>

                {!isEditMode ? (
                  <div className="border-t border-border pt-5">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Employee documents</h3>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Upload insurance certificates, right-to-work evidence, training records, and other HR files (
                      <span className="font-mono">POST /employees/:id/documents</span>). Requires document permissions
                      (read / upload / delete) on your account.
                    </p>
                    <EmployeeDocumentsSection
                      employeeId={createdEmployeeId ?? editEmployeeId ?? null}
                      apiReady={apiReady}
                    />
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      if (!isEditMode || !editEmployeeId || !apiReady) {
                        clearPendingPhotoSelection()
                        reset(defaultValues)
                        setCreatedEmployeeId(null)
                        setEmploymentSaved(false)
                        setBanner(null)
                        return
                      }
                      try {
                        const result = await employeeQuery.refetch()
                        if (result.data) {
                          clearPendingPhotoSelection()
                          hydratedDataTokenRef.current = null
                          reset(mapEmployeeDetailToFormValues(result.data, defaultValues, splitPhoneForForm))
                          prevVisaTypeIdRef.current = result.data.employment?.visaTypeId ?? undefined
                          hydratedDataTokenRef.current = `${editEmployeeId}:${employeeQuery.dataUpdatedAt}`
                          setCreatedEmployeeId(editEmployeeId)
                          setEmploymentSaved(Boolean(result.data.employment))
                          setBanner(null)
                        }
                      } catch (e) {
                        const msg = e instanceof ApiError ? e.message : 'Could not reload employee.'
                        setBanner({ type: 'error', text: msg })
                      }
                    }}
                  >
                    {isEditMode ? 'Reload from server' : 'Reset form'}
                  </Button>
                  <Button
                    type="submit"
                    data-testid="employee-save-personal"
                    disabled={saving || !apiConfigured || (isEditMode && employeeBootstrapLoading)}
                  >
                    {saving ? 'Saving…' : isEditMode ? 'Save' : 'Save & continue'}
                  </Button>
                </div>
              </form>
              {isEditMode && editEmployeeId ? (
                <EmployeeAppAccessSection
                  employeeId={editEmployeeId}
                  defaultEmail={watch('email') || savedPersonal?.email}
                />
              ) : null}
              </div>
            )}

            {((isEditMode && editTab === 'employment') || (!isEditMode && tab === 'employment')) && (
              <form
                id="employee-employment-form"
                className="space-y-6"
                data-testid="employee-employment-form"
                onSubmit={handleSubmit(onSaveEmployment, onEmploymentInvalid)}
              >
                <h2 className="text-sm font-semibold text-foreground">Employment</h2>
                <p className="text-xs text-muted-foreground">
                  Zones, branches and service areas are set on the{' '}
                  <span className="font-medium text-foreground">Personal</span> tab
                  {locationId
                    ? ' (branch selected).'
                    : accessAllZones
                      ? ' (access all zones).'
                      : ' — select at least one branch there before saving employment.'}
                </p>
                {errors.locationId?.message ? (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.locationId.message}
                  </p>
                ) : null}

                <div className="grid grid-cols-1 gap-y-4 gap-x-10 lg:grid-cols-2">
                  <FormField label="Work area" htmlFor="workAreaId" required error={errors.workAreaId?.message}>
                    <Controller
                      name="workAreaId"
                      control={control}
                      render={({ field }) => (
                        <LookupSelect
                          id="workAreaId"
                          value={field.value}
                          onChange={field.onChange}
                          options={L?.workAreas ?? []}
                          placeholder="Select work area"
                          error={errors.workAreaId?.message}
                          disabled={!L}
                          tip="Primary operational area (kitchen, care floor, etc.)."
                          savedOptionName={savedEmployment?.workArea?.name}
                        />
                      )}
                    />
                  </FormField>

                  <FormField label="Role" htmlFor="roleId" required error={errors.roleId?.message}>
                    <Controller
                      name="roleId"
                      control={control}
                      render={({ field }) => (
                        <LookupSelect
                          id="roleId"
                          value={field.value}
                          onChange={field.onChange}
                          options={L?.roles ?? []}
                          placeholder="Select role"
                          error={errors.roleId?.message}
                          disabled={!L}
                          tip="Employee designation used across scheduling and payroll."
                          savedOptionName={savedEmployment?.role?.name}
                        />
                      )}
                    />
                  </FormField>

                  <FormField label="Job title" htmlFor="jobTitleId" error={errors.jobTitleId?.message}>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <Controller
                          name="jobTitleId"
                          control={control}
                          render={({ field }) => (
                            <LookupSelect
                              id="jobTitleId"
                              value={field.value}
                              onChange={field.onChange}
                              options={L?.jobTitles ?? []}
                              placeholder="Select job title"
                              disabled={!L}
                              tip="Descriptive job title for HR records."
                              savedOptionName={savedEmployment?.jobTitle?.name}
                            />
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="mt-0 h-9 w-9 shrink-0"
                        disabled={!L}
                        title="Add new job title"
                        aria-label="Add new job title"
                        onClick={() => {
                          setJobTitleDialogError(null)
                          setNewJobTitleName('')
                          setJobTitleDialogOpen(true)
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormField>

                  <FormField label="RBAC level" htmlFor="rbacLevelId" error={errors.rbacLevelId?.message}>
                    <Controller
                      name="rbacLevelId"
                      control={control}
                      render={({ field }) => (
                        <LookupSelect
                          id="rbacLevelId"
                          value={field.value}
                          onChange={field.onChange}
                          options={L?.rbacLevels ?? []}
                          placeholder="Select RBAC level"
                          disabled={!L}
                          tip="When employment is saved, if this employee’s personal email matches a login user, that user’s managed app roles are updated from this RBAC level (Super Admin accounts are never changed). See docs/phases/EMPLOYEE_MANAGEMENT.md."
                          savedOptionName={savedEmployment?.rbacLevel?.name}
                        />
                      )}
                    />
                  </FormField>

                  <FormField label="Start date" htmlFor="startDate" error={errors.startDate?.message}>
                    <div className="flex gap-2">
                      <Input id="startDate" type="date" error={!!errors.startDate} {...register('startDate')} />
                      <span className="inline-flex h-9 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <Calendar className="h-4 w-4" aria-hidden />
                      </span>
                    </div>
                  </FormField>

                  <FormField label="End date" htmlFor="endDate" error={errors.endDate?.message}>
                    <div className="flex gap-2">
                      <Input id="endDate" type="date" error={!!errors.endDate} {...register('endDate')} />
                      <span className="inline-flex h-9 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <Calendar className="h-4 w-4" aria-hidden />
                      </span>
                    </div>
                  </FormField>

                  <FormField label="National Insurance No." htmlFor="nationalInsuranceNo" error={errors.nationalInsuranceNo?.message}>
                    <Input
                      id="nationalInsuranceNo"
                      placeholder="e.g. QQ 12 34 56 C"
                      error={!!errors.nationalInsuranceNo}
                      {...register('nationalInsuranceNo')}
                    />
                  </FormField>
                  <FormField label="NMC PIN" htmlFor="nmcPinNumber" error={errors.nmcPinNumber?.message}>
                    <Input id="nmcPinNumber" error={!!errors.nmcPinNumber} {...register('nmcPinNumber')} />
                  </FormField>
                  <FormField label="Employee number" htmlFor="employeeNumber" error={errors.employeeNumber?.message}>
                    <Input id="employeeNumber" error={!!errors.employeeNumber} {...register('employeeNumber')} />
                  </FormField>
                  <FormField label="Payroll number" htmlFor="payrollNumber" error={errors.payrollNumber?.message}>
                    <Input id="payrollNumber" error={!!errors.payrollNumber} {...register('payrollNumber')} />
                  </FormField>

                  <FormField label="Grade" htmlFor="gradeId" error={errors.gradeId?.message}>
                    <Controller
                      name="gradeId"
                      control={control}
                      render={({ field }) => (
                        <LookupSelect
                          id="gradeId"
                          value={field.value}
                          onChange={field.onChange}
                          options={L?.grades ?? []}
                          placeholder="Select grade"
                          disabled={!L}
                          savedOptionName={savedEmployment?.grade?.name}
                        />
                      )}
                    />
                  </FormField>

                  <FormField label="Contract type" htmlFor="contractTypeId" error={errors.contractTypeId?.message}>
                    <Controller
                      name="contractTypeId"
                      control={control}
                      render={({ field }) => (
                        <LookupSelect
                          id="contractTypeId"
                          value={field.value}
                          onChange={field.onChange}
                          options={L?.contractTypes ?? []}
                          placeholder="Select contract type"
                          disabled={!L}
                          savedOptionName={savedEmployment?.contractType?.name}
                        />
                      )}
                    />
                  </FormField>

                  <FormField label="Travel payment" htmlFor="travelPaymentTypeId" error={errors.travelPaymentTypeId?.message}>
                    <Controller
                      name="travelPaymentTypeId"
                      control={control}
                      render={({ field }) => (
                        <LookupSelect
                          id="travelPaymentTypeId"
                          value={field.value}
                          onChange={field.onChange}
                          options={L?.travelPaymentTypes ?? []}
                          placeholder="Select travel payment"
                          disabled={!L}
                          savedOptionName={savedEmployment?.travelPaymentType?.name}
                        />
                      )}
                    />
                  </FormField>

                </div>

                <div className="grid grid-cols-1 gap-x-10 gap-y-6 pt-2 lg:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Immigration status & working hours</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        label="Immigration status"
                        htmlFor="visaTypeId"
                        error={errors.visaTypeId?.message}
                      >
                        <Controller
                          name="visaTypeId"
                          control={control}
                          render={({ field }) => (
                            <Combobox
                              id="visaTypeId"
                              data-testid="employee-visa-type"
                              options={visaTypes.map(vt => ({ value: vt.id, label: vt.label }))}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Select immigration status"
                              searchPlaceholder="Search immigration status…"
                              emptyText="No immigration status match."
                              error={!!errors.visaTypeId}
                              allowDeselect
                            />
                          )}
                        />
                      </FormField>
                      {effectiveVisaCap != null && visaTypeId ? (
                        <p className="text-xs text-muted-foreground md:col-span-2">
                          {overrideActive ? (
                            <>
                              Effective allowed limit: {effectiveVisaCap} hours per week (approved override
                              {visaMaxHours != null ? `; status default ${visaMaxHours}h` : ''}).
                            </>
                          ) : (
                            <>
                              Allowed limit for this status: {effectiveVisaCap} hours per week (configured in
                              Settings).
                            </>
                          )}
                        </p>
                      ) : null}
                      {visaHoursError ? (
                        <p className="text-xs text-destructive md:col-span-2" role="alert">
                          {visaHoursError}
                        </p>
                      ) : null}
                      <div className="flex items-center justify-between md:col-span-2">
                        <span className="text-sm font-medium">Currently in the country</span>
                        <Controller
                          name="isInCountry"
                          control={control}
                          render={({ field }) => (
                            <NoYesToggle
                              id="isInCountry"
                              value={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                      </div>
                      <FormField label="Contracted weekly hours" htmlFor="cw" error={errors.contractedWeeklyHours?.message}>
                        <Input
                          id="cw"
                          inputMode="decimal"
                          error={!!errors.contractedWeeklyHours}
                          {...register('contractedWeeklyHours')}
                        />
                      </FormField>
                      <FormField label="Maximum" htmlFor="maxh" error={errors.maximumWeeklyHours?.message}>
                        <Input
                          id="maxh"
                          inputMode="decimal"
                          error={!!errors.maximumWeeklyHours}
                          {...register('maximumWeeklyHours')}
                        />
                      </FormField>
                      <FormField label="Minimum" htmlFor="minh" error={errors.minimumWeeklyHours?.message}>
                        <Input
                          id="minh"
                          inputMode="decimal"
                          error={!!errors.minimumWeeklyHours}
                          {...register('minimumWeeklyHours')}
                        />
                      </FormField>
                      <div className="md:col-span-2 rounded-lg border border-border/80 bg-muted/20 p-4 space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">
                            Approved extra weekly hours
                          </h4>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Documented approval for this person to work above their usual contracted /
                            immigration status limit (e.g. holiday cover). When set, visit plans and hours
                            approvals use this as the allowed weekly threshold until it expires. Rostering
                            also warns against this cap.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            label="Override cap (hours/week)"
                            htmlFor="weeklyHoursCapOverride"
                            error={errors.weeklyHoursCapOverride?.message}
                          >
                            <Input
                              id="weeklyHoursCapOverride"
                              inputMode="decimal"
                              placeholder="Leave blank for status default"
                              error={!!errors.weeklyHoursCapOverride}
                              {...register('weeklyHoursCapOverride')}
                            />
                          </FormField>
                          <FormField
                            label="Expires (optional)"
                            htmlFor="weeklyHoursCapOverrideExpiresAt"
                            error={errors.weeklyHoursCapOverrideExpiresAt?.message}
                          >
                            <Input
                              id="weeklyHoursCapOverrideExpiresAt"
                              type="date"
                              error={!!errors.weeklyHoursCapOverrideExpiresAt}
                              {...register('weeklyHoursCapOverrideExpiresAt')}
                            />
                          </FormField>
                          <FormField
                            label="Reason / approval note"
                            htmlFor="weeklyHoursCapOverrideReason"
                            error={errors.weeklyHoursCapOverrideReason?.message}
                            className="md:col-span-2"
                          >
                            <Input
                              id="weeklyHoursCapOverrideReason"
                              placeholder="Required when override cap is set"
                              error={!!errors.weeklyHoursCapOverrideReason}
                              {...register('weeklyHoursCapOverrideReason')}
                            />
                          </FormField>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:col-span-2">
                        <span className="text-sm font-medium">Opted out of 48h week</span>
                        <Controller
                          name="optedOutOf48Hours"
                          control={control}
                          render={({ field }) => <NoYesToggle value={field.value} onChange={field.onChange} id="optedOutOf48Hours" />}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Agencies</h3>
                    <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2">
                      <div className="flex items-center justify-between md:col-span-2">
                        <span className="text-sm font-medium">Agency staff</span>
                        <Controller
                          name="isAgencyStaff"
                          control={control}
                          render={({ field }) => (
                            <NoYesToggle
                              id="isAgencyStaff"
                              value={field.value}
                              onChange={(v) => {
                                field.onChange(v)
                                if (!v) {
                                  setValue('agencyName', '', { shouldDirty: true })
                                  setValue('agencyRating', '', { shouldDirty: true })
                                  setValue('isPreferredAgency', false, { shouldDirty: true })
                                  setValue('isBlacklisted', false, { shouldDirty: true })
                                  setValue('dailyRate', '', { shouldDirty: true })
                                  setValue('hourlyDayRate', '', { shouldDirty: true })
                                  setValue('hourlyNightRate', '', { shouldDirty: true })
                                }
                              }}
                            />
                          )}
                        />
                      </div>
                      {isAgencyStaff ? (
                        <>
                          <FormField
                            label="Agency name"
                            htmlFor="agencyName"
                            required
                            error={errors.agencyName?.message}
                          >
                            <Input id="agencyName" error={!!errors.agencyName} {...register('agencyName')} />
                          </FormField>
                          <FormField label="Agency rating" htmlFor="agencyRating" error={errors.agencyRating?.message}>
                            <Input id="agencyRating" error={!!errors.agencyRating} {...register('agencyRating')} />
                          </FormField>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Preferred</span>
                            <Controller
                              name="isPreferredAgency"
                              control={control}
                              render={({ field }) => <NoYesToggle value={field.value} onChange={field.onChange} id="isPreferredAgency" />}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Blacklisted</span>
                            <Controller
                              name="isBlacklisted"
                              control={control}
                              render={({ field }) => <NoYesToggle value={field.value} onChange={field.onChange} id="isBlacklisted" />}
                            />
                          </div>
                          <FormField label="Daily rate" htmlFor="dailyRate" error={errors.dailyRate?.message}>
                            <Input
                              id="dailyRate"
                              inputMode="decimal"
                              error={!!errors.dailyRate}
                              {...register('dailyRate')}
                            />
                          </FormField>
                          <FormField label="Hourly day rate" htmlFor="hourlyDayRate" error={errors.hourlyDayRate?.message}>
                            <Input
                              id="hourlyDayRate"
                              inputMode="decimal"
                              error={!!errors.hourlyDayRate}
                              {...register('hourlyDayRate')}
                            />
                          </FormField>
                          <FormField label="Hourly night rate" htmlFor="hourlyNightRate" error={errors.hourlyNightRate?.message}>
                            <Input
                              id="hourlyNightRate"
                              inputMode="decimal"
                              error={!!errors.hourlyNightRate}
                              {...register('hourlyNightRate')}
                            />
                          </FormField>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
                  {isEditMode ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate({ to: '/employee/staff-list' })}
                    >
                      Close
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => setTab('personal')}>
                      Back
                    </Button>
                  )}
                  <Button type="submit" data-testid="employee-save-employment" disabled={saving || !createdEmployeeId}>
                    {saving ? 'Saving…' : isEditMode ? 'Save' : 'Save employment'}
                  </Button>
                </div>
              </form>
            )}

            {((isEditMode && editTab === 'working-pattern') || (!isEditMode && tab === 'working-pattern')) && (
              <div className="space-y-6" data-testid="employee-working-pattern-section">
                <p className="text-sm text-muted-foreground">
                  Configure a standard week or fortnight pattern. Saved rows are used by Schedule Jobs rota availability
                  and visit-plan carer suggestions.
                </p>

                <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    <span className="text-sm font-medium leading-snug sm:max-w-[60%]">Available for work</span>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Controller
                        name="availableForWork"
                        control={control}
                        render={({ field }) => (
                          <NoYesToggle
                            id="availableForWork"
                            value={field.value}
                            onChange={field.onChange}
                            disabled={employeeBootstrapLoading && isEditMode}
                          />
                        )}
                      />
                      <FieldTip text="If NO, the employee will not appear on availability-driven rosters." />
                    </div>
                  </div>

                  {availableForWork ? (
                    <>
                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                        <span className="text-sm font-medium leading-snug sm:max-w-[60%]">Working pattern required</span>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Controller
                            name="workingPatternRequired"
                            control={control}
                            render={({ field }) => (
                              <NoYesToggle
                                id="workingPatternRequired"
                                value={field.value}
                                onChange={field.onChange}
                                disabled={employeeBootstrapLoading && isEditMode}
                              />
                            )}
                          />
                          <FieldTip text="When YES, schedulers expect explicit weekly patterns." />
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                        <span className="text-sm font-medium leading-snug sm:max-w-[60%]">Work bank holiday</span>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Controller
                            name="workBankHoliday"
                            control={control}
                            render={({ field }) => (
                              <NoYesToggle
                                id="workBankHoliday"
                                value={field.value}
                                onChange={field.onChange}
                                disabled={employeeBootstrapLoading && isEditMode}
                              />
                            )}
                          />
                          <FieldTip text="Default willingness to work UK bank holidays." />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-muted/15 p-4 text-sm text-muted-foreground">
                      Set <span className="font-medium text-foreground">Available for work</span> to{' '}
                      <span className="font-medium text-foreground">Yes</span> to configure pattern options and the grid
                      below.
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <EmployeeFortnightPatternEditor
                    employeeId={createdEmployeeId ?? editEmployeeId ?? null}
                    apiReady={apiReady}
                    enabled={Boolean(availableForWork && workingPatternRequired)}
                    employmentStartDate={watch('startDate') || undefined}
                  />
                </div>

                {!isEditMode ? (
                  <div className="flex flex-wrap justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setTab('employment')}>
                      Back
                    </Button>
                    <Button type="button" data-testid="employee-wizard-done" onClick={onFinish}>
                      Done — return to staff list
                    </Button>
                  </div>
                ) : null}
              </div>
            )}

            {isEditMode && editTab === 'overview' && editEmployeeId ? (
              <EmployeeEditOverviewPanel
                employee={employeeQuery.data}
                loading={employeeBootstrapLoading}
                onEdit={setEditTab}
              />
            ) : null}

            {isEditMode && editTab === 'pay-card' && editEmployeeId ? (
              <EmployeeEditPayCardPanel employeeId={editEmployeeId} />
            ) : null}

            {isEditMode && editTab === 'earning' && editEmployeeId ? (
              <EmployeeEditEarningPanel employeeId={editEmployeeId} />
            ) : null}

            {isEditMode && editTab === 'visits' && editEmployeeId ? (
              <EmployeeEditVisitsPanel employeeId={editEmployeeId} />
            ) : null}

            {isEditMode && editTab === 'salary' && editEmployeeId ? (
              <EmployeeEditSalaryPanel employeeId={editEmployeeId} />
            ) : null}

            {isEditMode && editTab === 'skills' && editEmployeeId ? (
              <EmployeeEditSkillsPanel employeeId={editEmployeeId} />
            ) : null}

            {isEditMode && editTab === 'staff-reviews' && editEmployeeId ? (
              <EmployeeEditReviewsPanel employeeId={editEmployeeId} />
            ) : null}

            {isEditMode && editTab === 'documents' && editEmployeeId ? (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Documents</h2>
                <EmployeeDocumentsSection
                  employeeId={editEmployeeId}
                  apiReady={apiReady}
                />
              </div>
            ) : null}

            {isEditMode && editTab === 'non-core-activity' && editEmployeeId ? (
              <EmployeeEditNonCorePanel employeeId={editEmployeeId} />
            ) : null}

            {isEditMode && editTab === 'holidays' && editEmployeeId ? (
              <EmployeeEditHolidaysPanel employeeId={editEmployeeId} />
            ) : null}

            {isEditMode && editTab === 'employment-compliance' && editEmployeeId ? (
              <EmployeeEditCompliancePanel
                employeeId={editEmployeeId}
                initialComplianceTypeCode={search.complianceType}
              />
            ) : null}

            {isEditMode && editTab === 'learning' && editEmployeeId ? (
              <EmployeeEditLearningPanel employeeId={editEmployeeId} />
            ) : null}

            {isEditMode && editTab === 'suspensions' && editEmployeeId ? (
              <EmployeeEditSuspensionsPanel employeeId={editEmployeeId} />
            ) : null}

            {isEditMode && editTab === 'incidents' && editEmployeeId ? (
              <EmployeeEditIncidentsPanel employeeId={editEmployeeId} />
            ) : null}

            {isEditMode && editTab === 'allocation' && editEmployeeId ? (
              <EmployeeEditAllocationsPanel employeeId={editEmployeeId} />
            ) : null}

            {isEditMode &&
            editTab !== 'personal' &&
            editTab !== 'employment' &&
            editTab !== 'pay-card' &&
            editTab !== 'earning' &&
            editTab !== 'visits' &&
            editTab !== 'salary' &&
            editTab !== 'learning' &&
            editTab !== 'working-pattern' ? (
              <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  data-testid="employee-edit-close"
                  onClick={() => navigate({ to: '/employee/staff-list' })}
                >
                  Close
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog
        open={jobTitleDialogOpen}
        onOpenChange={open => {
          setJobTitleDialogOpen(open)
          if (!open) {
            setNewJobTitleName('')
            setJobTitleDialogError(null)
          }
        }}
      >
        <DialogContent size="sm" className="gap-0 p-0">
          <DialogHeader>
            <DialogTitle>Add job title</DialogTitle>
            <DialogDescription>
              Creates a new title for this tenant. It appears in the list immediately and is selected for this employee.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            {jobTitleDialogError ? (
              <p className="text-sm text-destructive" role="alert">
                {jobTitleDialogError}
              </p>
            ) : null}
            <Input
              id="new-job-title-name"
              placeholder="e.g. Senior Care Assistant"
              value={newJobTitleName}
              onChange={e => setNewJobTitleName(e.target.value)}
              maxLength={120}
              disabled={jobTitleSaving}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void onCreateJobTitle()
                }
              }}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setJobTitleDialogOpen(false)}
              disabled={jobTitleSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void onCreateJobTitle()} disabled={jobTitleSaving}>
              {jobTitleSaving ? 'Adding…' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
