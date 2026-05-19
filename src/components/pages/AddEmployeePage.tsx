import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm, Controller, useWatch, type FieldPath, type UseFormSetError } from 'react-hook-form'
import { z } from 'zod'
import { ChevronLeft, Calendar, Clock, Search, HelpCircle, Filter, Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api-client'
import { getApiBaseUrl } from '@/lib/api-base'
import { useAuthStore } from '@/store/auth.store'
import {
  createEmployee,
  createJobTitle,
  fetchEmployee,
  fetchEmployeeLookups,
  patchEmployment,
  patchPersonalDetails,
  uploadEmployeePhoto,
  type EmployeeDetail,
  type EmployeeLookupsBundle,
  type LookupRow,
} from '@/lib/employees-api'
import { lookupUkPostcode } from '@/lib/postcode-lookup'
import { resolveMediaUrl } from '@/lib/media-url'
import { EmployeeEmergencyContactsEditor } from '@/components/employee/EmployeeEmergencyContactsEditor'
import { EmployeeDocumentsSection } from '@/components/employee/EmployeeDocumentsSection'
import { EmployeeWeeklyPatternEditor } from '@/components/employee/EmployeeWeeklyPatternEditor'
import { EditEmployeeTabBar, type EditEmployeeTabId } from '@/components/employee/EditEmployeeTabBar'
import { EmployeeEditSkillsPanel } from '@/components/employee/EmployeeEditSkillsPanel'
import { EmployeeEditNonCorePanel } from '@/components/employee/EmployeeEditNonCorePanel'
import { EmployeeEditCompliancePanel } from '@/components/employee/EmployeeEditCompliancePanel'
import { EmployeeEditPlaceholderPanel } from '@/components/employee/EmployeeEditPlaceholderPanel'
import { personalStepSchema, employmentStepSchema } from '@/schemas/add-employee.schema'
import { DIAL_CODES, formatPhoneForApi, splitPhoneForForm } from '@/lib/dial-codes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { NoYesToggle } from '@/components/ui/no-yes-toggle'

type TabId = 'personal' | 'employment' | 'working-pattern'

type FormValues = {
  firstName: string
  lastName: string
  username: string
  email: string
  titleId: string
  genderId: string
  nationalityId: string
  statusId: string
  dateOfBirth: string
  addressLine1: string
  addressLine2: string
  town: string
  country: string
  postcode: string
  homeDialCode: string
  homeTelephone: string
  mobileDialCode: string
  mobileTelephone: string
  photoUrl: string
  workAreaId: string
  roleId: string
  locationId: string
  jobTitleId: string
  rbacLevelId: string
  gradeId: string
  contractTypeId: string
  travelPaymentTypeId: string
  baseLocationId: string
  startDate: string
  endDate: string
  nationalInsuranceNo: string
  nmcPinNumber: string
  employeeNumber: string
  payrollNumber: string
  accessAllZones: boolean
  contractedWeeklyHours: string
  maximumWeeklyHours: string
  minimumWeeklyHours: string
  optedOutOf48Hours: boolean
  isAgencyStaff: boolean
  agencyName: string
  agencyRating: string
  isPreferredAgency: boolean
  isBlacklisted: boolean
  dailyRate: string
  hourlyDayRate: string
  hourlyNightRate: string
  availableForWork: boolean
  workingPatternRequired: boolean
  workBankHoliday: boolean
}

const defaultValues: FormValues = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  titleId: '',
  genderId: '',
  nationalityId: '',
  statusId: '',
  dateOfBirth: '',
  addressLine1: '',
  addressLine2: '',
  town: '',
  country: '',
  postcode: '',
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
  baseLocationId: '',
  startDate: '',
  endDate: '',
  nationalInsuranceNo: '',
  nmcPinNumber: '',
  employeeNumber: '',
  payrollNumber: '',
  accessAllZones: false,
  contractedWeeklyHours: '',
  maximumWeeklyHours: '',
  minimumWeeklyHours: '',
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

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function numToInput(v: unknown): string {
  if (v === null || v === undefined || v === '') return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  return String(v)
}

function employeeDetailToFormValues(emp: EmployeeDetail): FormValues {
  const pd = emp.personalDetail
  const em = emp.employment
  const home = splitPhoneForForm(pd?.homeTelephone ?? undefined)
  const mobile = splitPhoneForForm(pd?.mobileTelephone ?? undefined)
  const base: FormValues = { ...defaultValues }
  if (!pd) return base
  return {
    ...base,
    firstName: pd.firstName ?? '',
    lastName: pd.lastName ?? '',
    username: pd.username ?? '',
    email: pd.email ?? '',
    titleId: pd.titleId ?? '',
    genderId: pd.genderId ?? '',
    nationalityId: pd.nationalityId ?? '',
    statusId: pd.statusId ?? '',
    dateOfBirth: isoToDateInput(pd.dateOfBirth ?? undefined),
    addressLine1: pd.addressLine1 ?? '',
    addressLine2: pd.addressLine2 ?? '',
    town: pd.town ?? '',
    country: pd.country ?? '',
    postcode: pd.postcode ?? '',
    homeDialCode: home.dial,
    homeTelephone: home.local,
    mobileDialCode: mobile.dial,
    mobileTelephone: mobile.local,
    photoUrl: pd.photoUrl ?? '',
    workAreaId: em?.workAreaId ?? '',
    roleId: em?.roleId ?? '',
    locationId: em?.locationId ?? '',
    jobTitleId: em?.jobTitleId ?? '',
    rbacLevelId: em?.rbacLevelId ?? '',
    gradeId: em?.gradeId ?? '',
    contractTypeId: em?.contractTypeId ?? '',
    travelPaymentTypeId: em?.travelPaymentTypeId ?? '',
    baseLocationId: em?.baseLocationId ?? '',
    startDate: isoToDateInput(em?.startDate ?? undefined),
    endDate: isoToDateInput(em?.endDate ?? undefined),
    nationalInsuranceNo: em?.nationalInsuranceNo ?? '',
    nmcPinNumber: em?.nmcPinNumber ?? '',
    employeeNumber: em?.employeeNumber ?? '',
    payrollNumber: em?.payrollNumber ?? '',
    accessAllZones: Boolean(em?.accessAllZones),
    contractedWeeklyHours: numToInput(em?.contractedWeeklyHours),
    maximumWeeklyHours: numToInput(em?.maximumWeeklyHours),
    minimumWeeklyHours: numToInput(em?.minimumWeeklyHours),
    optedOutOf48Hours: Boolean(em?.optedOutOf48Hours),
    isAgencyStaff: Boolean(em?.isAgencyStaff),
    agencyName: em?.agencyName ?? '',
    agencyRating: em?.agencyRating ?? '',
    isPreferredAgency: Boolean(em?.isPreferredAgency),
    isBlacklisted: Boolean(em?.isBlacklisted),
    dailyRate: numToInput(em?.dailyRate),
    hourlyDayRate: numToInput(em?.hourlyDayRate),
    hourlyNightRate: numToInput(em?.hourlyNightRate),
  }
}

function applyZodErrors<T extends Record<string, unknown>>(
  result: z.SafeParseError<T>,
  setError: UseFormSetError<FormValues>
) {
  for (const iss of result.error.issues) {
    const key = iss.path[0]
    if (typeof key === 'string' && key in defaultValues) {
      setError(key as FieldPath<FormValues>, { message: iss.message })
    }
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

function TimeWithClock({ id, disabled }: { id?: string; disabled?: boolean }) {
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

function LookupSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  error,
  tip,
  disabled,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  options: LookupRow[]
  placeholder: string
  error?: string
  tip?: string
  disabled?: boolean
}) {
  const v = value || '__none__'
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Select
        disabled={disabled}
        value={v}
        onValueChange={next => onChange(next === '__none__' ? '' : next)}
      >
        <SelectTrigger id={id} className="min-w-0 flex-1" error={!!error}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— {placeholder} —</SelectItem>
          {options.map(o => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {tip ? <FieldTip text={tip} /> : null}
    </div>
  )
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

type AvailabilityLevel = 'Fully' | 'Partial' | 'None'

function AvailabilityPills({
  value,
  onChange,
  disabled,
}: {
  value: AvailabilityLevel
  onChange: (next: AvailabilityLevel) => void
  disabled?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Day availability"
      className={cn(
        'inline-flex max-w-full flex-wrap gap-0.5 rounded-md border border-border bg-muted/40 p-0.5',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      {(['Fully', 'Partial', 'None'] as const).map(x => (
        <button
          key={x}
          type="button"
          disabled={disabled}
          role="radio"
          aria-checked={value === x}
          onClick={() => onChange(x)}
          className={cn(
            'min-w-[3.25rem] rounded-sm px-2 py-1.5 text-[11px] font-semibold transition-colors',
            value === x
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-background/90 hover:text-foreground'
          )}
        >
          {x}
        </button>
      ))}
    </div>
  )
}

export default function AddEmployeePage({ editEmployeeId }: { editEmployeeId?: string } = {}) {
  const navigate = useNavigate()
  const isEditMode = Boolean(editEmployeeId)
  const [tab, setTab] = React.useState<TabId>('personal')
  const [editTab, setEditTab] = React.useState<EditEmployeeTabId>('personal')
  const [editDisplayName, setEditDisplayName] = React.useState('')
  const [editPhotoUrl, setEditPhotoUrl] = React.useState<string | null>(null)
  const [lookups, setLookups] = React.useState<EmployeeLookupsBundle | null>(null)
  const [lookupsError, setLookupsError] = React.useState<string | null>(null)
  const [lookupsLoading, setLookupsLoading] = React.useState(false)
  const [jobTitleDialogOpen, setJobTitleDialogOpen] = React.useState(false)
  const [newJobTitleName, setNewJobTitleName] = React.useState('')
  const [jobTitleSaving, setJobTitleSaving] = React.useState(false)
  const [jobTitleDialogError, setJobTitleDialogError] = React.useState<string | null>(null)
  const [createdEmployeeId, setCreatedEmployeeId] = React.useState<string | null>(null)
  const [employmentSaved, setEmploymentSaved] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [banner, setBanner] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [employeeBootstrapLoading, setEmployeeBootstrapLoading] = React.useState(Boolean(editEmployeeId))
  const [employeeBootstrapError, setEmployeeBootstrapError] = React.useState<string | null>(null)
  const [patternAvailability, setPatternAvailability] = React.useState<Record<string, AvailabilityLevel>>(() => {
    const initial: Record<string, AvailabilityLevel> = {}
    for (const week of ['Week 1', 'Week 2'] as const) {
      for (const d of days) {
        initial[`${week}|${d}`] = 'None'
      }
    }
    return initial
  })

  const {
    register,
    control,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues })

  const [localPhotoObjectUrl, setLocalPhotoObjectUrl] = React.useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = React.useState(false)
  const [postcodeLookupBusy, setPostcodeLookupBusy] = React.useState(false)
  const pendingPhotoRef = React.useRef<File | null>(null)
  const photoFileInputRef = React.useRef<HTMLInputElement>(null)

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
        setPhotoUploading(true)
        const { photoUrl } = await uploadEmployeePhoto(employeeId, file)
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
      } finally {
        setPhotoUploading(false)
      }
    },
    [setValue],
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
    if (empId && apiConfigured && accessToken?.includes('.')) {
      try {
        setPhotoUploading(true)
        const { photoUrl } = await uploadEmployeePhoto(empId, file)
        setLocalPhotoObjectUrl(prev => {
          if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
          return null
        })
        pendingPhotoRef.current = null
        setValue('photoUrl', photoUrl)
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Photo upload failed.'
        setBanner({ type: 'error', text: msg })
      } finally {
        setPhotoUploading(false)
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
    if (empId && apiConfigured && accessToken?.includes('.')) {
      try {
        setPhotoUploading(true)
        await patchPersonalDetails(empId, { photoUrl: '' })
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Could not remove photo.'
        setBanner({ type: 'error', text: msg })
      } finally {
        setPhotoUploading(false)
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

  const apiConfigured = Boolean(getApiBaseUrl())
  const accessToken = useAuthStore(s => s.accessToken)

  const onLookupPostcode = async () => {
    setBanner(null)
    const raw = getValues('postcode')
    setPostcodeLookupBusy(true)
    try {
      const r = await lookupUkPostcode(raw)
      if (!r.ok) {
        setBanner({ type: 'error', text: r.error })
        return
      }
      if (!getValues('town').trim() && r.adminDistrict) {
        setValue('town', r.adminDistrict, { shouldDirty: true })
      }
      if (!getValues('country').trim()) {
        setValue('country', 'United Kingdom', { shouldDirty: true })
      }
      setBanner({
        type: 'success',
        text: `Matched ${r.postcode}${r.region ? ` (${r.region})` : ''}. Check town and country.`,
      })
    } finally {
      setPostcodeLookupBusy(false)
    }
  }

  const onCreateJobTitle = async () => {
    const trimmed = newJobTitleName.trim()
    if (!trimmed) {
      setJobTitleDialogError('Enter a job title.')
      return
    }
    setJobTitleSaving(true)
    setJobTitleDialogError(null)
    try {
      const row = await createJobTitle(trimmed)
      const data = await fetchEmployeeLookups()
      setLookups(data)
      setValue('jobTitleId', row.id, { shouldDirty: true, shouldValidate: true })
      setJobTitleDialogOpen(false)
      setNewJobTitleName('')
    } catch (e) {
      setJobTitleDialogError(e instanceof ApiError ? e.message : 'Could not add job title.')
    } finally {
      setJobTitleSaving(false)
    }
  }

  React.useEffect(() => {
    if (!apiConfigured) {
      setLookupsError(
        'Add VITE_API_BASE_URL to `.env` (see `.env.example`), restart Vite, then sign in — the app will obtain a real JWT from the Nest API.'
      )
      return
    }
    if (!accessToken?.includes('.')) {
      setLookupsError('Sign in from the login page while the API URL is set — demo tokens cannot call the backend.')
      setLookups(null)
      return
    }
    let cancelled = false
    setLookupsLoading(true)
    setLookupsError(null)
    fetchEmployeeLookups()
      .then(data => {
        if (!cancelled) setLookups(data)
      })
      .catch(e => {
        if (cancelled) return
        let msg = e instanceof ApiError ? e.message : 'Could not load lookups.'
        if (e instanceof ApiError && e.status === 401) {
          msg = 'Unauthorized (401). Sign out and sign in again with valid API credentials.'
        }
        setLookupsError(msg)
        setLookups(null)
      })
      .finally(() => {
        if (!cancelled) setLookupsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [apiConfigured, accessToken])

  React.useEffect(() => {
    if (!editEmployeeId) {
      setEmployeeBootstrapLoading(false)
      setEmployeeBootstrapError(null)
      return
    }
    if (!apiConfigured || !accessToken?.includes('.')) {
      setEmployeeBootstrapLoading(false)
      setEmployeeBootstrapError('Sign in while the API URL is set to edit an employee.')
      return
    }
    let cancelled = false
    setEmployeeBootstrapLoading(true)
    setEmployeeBootstrapError(null)
    fetchEmployee(editEmployeeId)
      .then(emp => {
        if (cancelled) return
        clearPendingPhotoSelection()
        reset(employeeDetailToFormValues(emp))
        setCreatedEmployeeId(editEmployeeId)
        setEmploymentSaved(Boolean(emp.employment))
        const pd = emp.personalDetail
        setEditDisplayName(
          [pd?.firstName, pd?.lastName].filter(Boolean).join(' ').trim() || 'Employee',
        )
        setEditPhotoUrl(pd?.photoUrl ?? null)
      })
      .catch(e => {
        if (cancelled) return
        const msg = e instanceof ApiError ? e.message : 'Could not load employee.'
        setEmployeeBootstrapError(msg)
        setCreatedEmployeeId(null)
      })
      .finally(() => {
        if (!cancelled) setEmployeeBootstrapLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [editEmployeeId, apiConfigured, accessToken, reset, clearPendingPhotoSelection])

  const onSavePersonal = async (raw: FormValues) => {
    clearErrors()
    setBanner(null)
    const parsed = personalStepSchema.safeParse(raw)
    if (!parsed.success) {
      applyZodErrors(parsed, setError)
      setBanner({ type: 'error', text: 'Fix the highlighted fields before continuing.' })
      return
    }
    if (!apiConfigured) {
      setBanner({ type: 'error', text: 'Configure VITE_API_BASE_URL to create an employee on the server.' })
      return
    }
    setSaving(true)
    try {
      const p = parsed.data
      if (isEditMode && editEmployeeId) {
        await patchPersonalDetails(editEmployeeId, {
          firstName: p.firstName,
          lastName: p.lastName,
          titleId: p.titleId,
          genderId: p.genderId,
          email: p.email,
          username: p.username,
          nationalityId: p.nationalityId,
          statusId: p.statusId,
          dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString() : undefined,
          addressLine1: p.addressLine1,
          addressLine2: p.addressLine2,
          town: p.town,
          country: p.country,
          postcode: p.postcode,
          homeTelephone: formatPhoneForApi(p.homeDialCode, p.homeTelephone),
          mobileTelephone: formatPhoneForApi(p.mobileDialCode, p.mobileTelephone),
          photoUrl: p.photoUrl,
        })
        const photoOk = await flushPendingPhoto(editEmployeeId)
        if (!photoOk) {
          return
        }
        setCreatedEmployeeId(editEmployeeId)
        setBanner({ type: 'success', text: 'Personal details saved.' })
        const pd = parsed.data
        setEditDisplayName([pd.firstName, pd.lastName].filter(Boolean).join(' ').trim() || 'Employee')
        if (!isEditMode) setTab('employment')
        return
      }
      const { id } = await createEmployee({
        firstName: p.firstName,
        lastName: p.lastName,
        username: p.username,
        email: p.email,
        titleId: p.titleId,
        genderId: p.genderId,
        nationalityId: p.nationalityId,
        statusId: p.statusId,
      })
      setCreatedEmployeeId(id)
      setEmploymentSaved(false)
      await patchPersonalDetails(id, {
        firstName: p.firstName,
        lastName: p.lastName,
        titleId: p.titleId,
        genderId: p.genderId,
        email: p.email,
        username: p.username,
        nationalityId: p.nationalityId,
        statusId: p.statusId,
        dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString() : undefined,
        addressLine1: p.addressLine1,
        addressLine2: p.addressLine2,
        town: p.town,
        country: p.country,
        postcode: p.postcode,
        homeTelephone: formatPhoneForApi(p.homeDialCode, p.homeTelephone),
        mobileTelephone: formatPhoneForApi(p.mobileDialCode, p.mobileTelephone),
        photoUrl: p.photoUrl,
      })
      const photoOk = await flushPendingPhoto(id)
      if (!photoOk) {
        return
      }
      setBanner({ type: 'success', text: 'Employee created. Complete employment details on the next tab.' })
      setTab('employment')
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Save failed.'
      setBanner({ type: 'error', text: msg })
    } finally {
      setSaving(false)
    }
  }

  const onSaveEmployment = async (raw: FormValues) => {
    clearErrors()
    setBanner(null)
    if (!createdEmployeeId) {
      setBanner({ type: 'error', text: 'Save Personal Details first.' })
      setTab('personal')
      return
    }
    const parsed = employmentStepSchema.safeParse(raw)
    if (!parsed.success) {
      applyZodErrors(parsed, setError)
      setBanner({ type: 'error', text: 'Fix employment fields marked in red.' })
      return
    }
    setSaving(true)
    try {
      const e = parsed.data
      await patchEmployment(createdEmployeeId, {
        workAreaId: e.workAreaId,
        roleId: e.roleId,
        locationId: e.locationId,
        jobTitleId: e.jobTitleId,
        rbacLevelId: e.rbacLevelId,
        gradeId: e.gradeId,
        contractTypeId: e.contractTypeId,
        travelPaymentTypeId: e.travelPaymentTypeId,
        baseLocationId: e.baseLocationId,
        startDate: e.startDate ? new Date(e.startDate).toISOString() : undefined,
        endDate: e.endDate ? new Date(e.endDate).toISOString() : undefined,
        nationalInsuranceNo: e.nationalInsuranceNo,
        nmcPinNumber: e.nmcPinNumber,
        employeeNumber: e.employeeNumber,
        payrollNumber: e.payrollNumber,
        accessAllZones: e.accessAllZones,
        contractedWeeklyHours: e.contractedWeeklyHours,
        maximumWeeklyHours: e.maximumWeeklyHours,
        minimumWeeklyHours: e.minimumWeeklyHours,
        optedOutOf48Hours: e.optedOutOf48Hours,
        isAgencyStaff: e.isAgencyStaff,
        agencyName: e.agencyName,
        agencyRating: e.agencyRating,
        isPreferredAgency: e.isPreferredAgency,
        isBlacklisted: e.isBlacklisted,
        dailyRate: e.dailyRate,
        hourlyDayRate: e.hourlyDayRate,
        hourlyNightRate: e.hourlyNightRate,
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
    } finally {
      setSaving(false)
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

  const L = lookups

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

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm" data-testid="employee-wizard">
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

          <div className="p-5">
            {((isEditMode && editTab === 'personal') || (!isEditMode && tab === 'personal')) && (
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
                      <Input id="firstName" autoComplete="given-name" {...register('firstName')} />
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
                      <Input id="lastName" autoComplete="family-name" {...register('lastName')} />
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
                        />
                      )}
                    />
                  </FormField>

                  <FormField label="Email" htmlFor="email" error={errors.email?.message}>
                    <div className="flex gap-2">
                      <Input id="email" type="email" autoComplete="email" placeholder="name@example.com" {...register('email')} />
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
                      <Input id="username" autoComplete="username" {...register('username')} />
                      <FieldTip text="Login identifier for this employee when portal access is enabled." />
                    </div>
                  </FormField>

                  <FormField label="Date of birth" htmlFor="dateOfBirth" error={errors.dateOfBirth?.message}>
                    <div className="flex gap-2">
                      <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
                      <FieldTip text="Used for age checks and right-to-work screening." />
                    </div>
                  </FormField>

                  <FormField label="Address line 1" htmlFor="addressLine1" error={errors.addressLine1?.message}>
                    <Input id="addressLine1" autoComplete="address-line1" {...register('addressLine1')} />
                  </FormField>
                  <FormField label="Address line 2" htmlFor="addressLine2" error={errors.addressLine2?.message}>
                    <Input id="addressLine2" {...register('addressLine2')} />
                  </FormField>
                  <FormField label="Town" htmlFor="town" error={errors.town?.message}>
                    <Input id="town" {...register('town')} />
                  </FormField>
                  <FormField label="Country" htmlFor="country" error={errors.country?.message}>
                    <Input id="country" {...register('country')} />
                  </FormField>

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
                          disabled={!L}
                          tip="Stored on the employee profile (lookup id). Right-to-work evidence may be required separately."
                        />
                      )}
                    />
                  </FormField>

                  <FormField label="Postcode" htmlFor="postcode" error={errors.postcode?.message}>
                    <div className="flex gap-2">
                      <Input id="postcode" autoComplete="postal-code" placeholder="e.g. SW1A 1AA" {...register('postcode')} />
                      <button
                        type="button"
                        className="inline-flex h-9 w-10 shrink-0 items-center justify-center rounded-md border border-input hover:bg-muted disabled:opacity-50"
                        title="Look up UK postcode (postcodes.io)"
                        aria-label="Look up UK postcode"
                        disabled={postcodeLookupBusy}
                        onClick={() => void onLookupPostcode()}
                      >
                        <Search className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </FormField>
                  <FormField label="Home telephone" htmlFor="homeTelephone" error={errors.homeTelephone?.message}>
                    <Input id="homeTelephone" type="tel" {...register('homeTelephone')} />
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
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger
                              id="mobileDialCode"
                              className="h-9 w-[11rem] shrink-0"
                              aria-label="Mobile country code"
                              error={!!errors.mobileDialCode}
                            >
                              <SelectValue placeholder="Code" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {DIAL_CODES.map(({ code, label }) => (
                                <SelectItem key={code} value={code}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <Input
                        id="mobileTelephone"
                        className="min-w-0 flex-1"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        placeholder="Local number"
                        {...register('mobileTelephone')}
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
                          disabled={!L}
                          tip="Active / inactive flags for roster eligibility."
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
                          disabled={photoUploading || !apiConfigured || !accessToken?.includes('.')}
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

                <div className="border-t border-border pt-5">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Next of Kin / Emergency Contacts</h3>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Contacts are saved to the server per employee (<span className="font-mono">/employees/:id/emergency-contacts</span>).
                  </p>
                  <EmployeeEmergencyContactsEditor
                    employeeId={createdEmployeeId ?? editEmployeeId ?? null}
                    apiReady={apiConfigured && Boolean(accessToken?.includes('.'))}
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
                      apiReady={apiConfigured && Boolean(accessToken?.includes('.'))}
                    />
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      if (!isEditMode || !editEmployeeId || !apiConfigured || !accessToken?.includes('.')) {
                        clearPendingPhotoSelection()
                        reset(defaultValues)
                        setCreatedEmployeeId(null)
                        setEmploymentSaved(false)
                        setBanner(null)
                        return
                      }
                      setEmployeeBootstrapLoading(true)
                      setEmployeeBootstrapError(null)
                      try {
                        const emp = await fetchEmployee(editEmployeeId)
                        clearPendingPhotoSelection()
                        reset(employeeDetailToFormValues(emp))
                        setCreatedEmployeeId(editEmployeeId)
                        setEmploymentSaved(Boolean(emp.employment))
                        setBanner(null)
                      } catch (e) {
                        const msg = e instanceof ApiError ? e.message : 'Could not reload employee.'
                        setEmployeeBootstrapError(msg)
                      } finally {
                        setEmployeeBootstrapLoading(false)
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
            )}

            {((isEditMode && editTab === 'employment') || (!isEditMode && tab === 'employment')) && (
              <form
                id="employee-employment-form"
                className="space-y-6"
                data-testid="employee-employment-form"
                onSubmit={handleSubmit(onSaveEmployment)}
              >
                <h2 className="text-sm font-semibold text-foreground">Employment</h2>

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
                        />
                      )}
                    />
                  </FormField>

                  <FormField label="Start date" htmlFor="startDate" error={errors.startDate?.message}>
                    <div className="flex gap-2">
                      <Input id="startDate" type="date" {...register('startDate')} />
                      <span className="inline-flex h-9 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <Calendar className="h-4 w-4" aria-hidden />
                      </span>
                    </div>
                  </FormField>

                  <FormField label="End date" htmlFor="endDate" error={errors.endDate?.message}>
                    <div className="flex gap-2">
                      <Input id="endDate" type="date" {...register('endDate')} />
                      <span className="inline-flex h-9 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <Calendar className="h-4 w-4" aria-hidden />
                      </span>
                    </div>
                  </FormField>

                  <FormField label="National Insurance No." htmlFor="nationalInsuranceNo" error={errors.nationalInsuranceNo?.message}>
                    <Input id="nationalInsuranceNo" {...register('nationalInsuranceNo')} />
                  </FormField>
                  <FormField label="NMC PIN" htmlFor="nmcPinNumber" error={errors.nmcPinNumber?.message}>
                    <Input id="nmcPinNumber" {...register('nmcPinNumber')} />
                  </FormField>
                  <FormField label="Employee number" htmlFor="employeeNumber" error={errors.employeeNumber?.message}>
                    <Input id="employeeNumber" {...register('employeeNumber')} />
                  </FormField>
                  <FormField label="Payroll number" htmlFor="payrollNumber" error={errors.payrollNumber?.message}>
                    <Input id="payrollNumber" {...register('payrollNumber')} />
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
                        />
                      )}
                    />
                  </FormField>

                  <FormField label="Location" htmlFor="locationId" required error={errors.locationId?.message}>
                    <Controller
                      name="locationId"
                      control={control}
                      render={({ field }) => (
                        <LookupSelect
                          id="locationId"
                          value={field.value}
                          onChange={field.onChange}
                          options={L?.locations ?? []}
                          placeholder="Select location"
                          error={errors.locationId?.message}
                          disabled={!L}
                          tip="Primary site or service location."
                        />
                      )}
                    />
                  </FormField>

                  <FormField label="Base location" htmlFor="baseLocationId" error={errors.baseLocationId?.message}>
                    <Controller
                      name="baseLocationId"
                      control={control}
                      render={({ field }) => (
                        <LookupSelect
                          id="baseLocationId"
                          value={field.value}
                          onChange={field.onChange}
                          options={L?.locations ?? []}
                          placeholder="Select base location"
                          disabled={!L}
                          tip="Optional home site for reporting."
                        />
                      )}
                    />
                  </FormField>

                  <div className="flex items-center justify-between border-t border-border pt-4 lg:col-span-2">
                    <span className="text-sm font-medium">Access all zones</span>
                    <Controller
                      name="accessAllZones"
                      control={control}
                      render={({ field }) => <NoYesToggle value={field.value} onChange={field.onChange} id="accessAllZones" />}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-x-10 gap-y-6 pt-2 lg:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Working hours</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField label="Contracted weekly hours" htmlFor="cw" error={errors.contractedWeeklyHours?.message}>
                        <Input id="cw" inputMode="decimal" {...register('contractedWeeklyHours')} />
                      </FormField>
                      <FormField label="Maximum" htmlFor="maxh" error={errors.maximumWeeklyHours?.message}>
                        <Input id="maxh" inputMode="decimal" {...register('maximumWeeklyHours')} />
                      </FormField>
                      <FormField label="Minimum" htmlFor="minh" error={errors.minimumWeeklyHours?.message}>
                        <Input id="minh" inputMode="decimal" {...register('minimumWeeklyHours')} />
                      </FormField>
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
                          <FormField label="Agency name" htmlFor="agencyName" error={errors.agencyName?.message}>
                            <Input id="agencyName" {...register('agencyName')} />
                          </FormField>
                          <FormField label="Agency rating" htmlFor="agencyRating" error={errors.agencyRating?.message}>
                            <Input id="agencyRating" {...register('agencyRating')} />
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
                            <Input id="dailyRate" inputMode="decimal" {...register('dailyRate')} />
                          </FormField>
                          <FormField label="Hourly day rate" htmlFor="hourlyDayRate" error={errors.hourlyDayRate?.message}>
                            <Input id="hourlyDayRate" inputMode="decimal" {...register('hourlyDayRate')} />
                          </FormField>
                          <FormField label="Hourly night rate" htmlFor="hourlyNightRate" error={errors.hourlyNightRate?.message}>
                            <Input id="hourlyNightRate" inputMode="decimal" {...register('hourlyNightRate')} />
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
                  Use the fortnight grid for quick planning. The <span className="font-medium">standard week</span> block
                  below persists to <span className="font-mono text-xs">EmployeeWorkingPattern</span>.
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

                {availableForWork && workingPatternRequired ? (
                  <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                    {[
                      { title: 'Working pattern', week: 'Week 1' },
                      { title: 'Working pattern', week: 'Week 2' },
                    ].map(w => (
                      <div key={w.week} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-foreground">{w.title}</div>
                          <div className="text-xs text-muted-foreground">{w.week}</div>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border bg-muted/40">
                                {['Day', 'Availability', 'Available start', 'Available end'].map(h => (
                                  <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted-foreground">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {days.map(d => {
                                const key = `${w.week}|${d}`
                                return (
                                  <tr key={d} className="border-b border-border last:border-0">
                                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{d}</td>
                                    <td className="min-w-[12rem] px-3 py-2.5 align-top">
                                      <AvailabilityPills
                                        value={patternAvailability[key] ?? 'None'}
                                        onChange={next =>
                                          setPatternAvailability(prev => ({
                                            ...prev,
                                            [key]: next,
                                          }))
                                        }
                                      />
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <TimeWithClock id={`${key}-start`} />
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <TimeWithClock id={`${key}-end`} />
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                    Turn on <span className="font-medium text-foreground">Available for work</span> and{' '}
                    <span className="font-medium text-foreground">Working pattern required</span> to edit the week grids
                    and times (preview). Save the standard week below when ready.
                  </div>
                )}

                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Standard week (server)</h3>
                  <EmployeeWeeklyPatternEditor
                    employeeId={createdEmployeeId ?? editEmployeeId ?? null}
                    apiReady={apiConfigured && Boolean(accessToken?.includes('.'))}
                    enabled={Boolean(availableForWork && workingPatternRequired)}
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-3 pt-4">
                  {!isEditMode ? (
                    <Button type="button" variant="outline" onClick={() => setTab('employment')}>
                      Back
                    </Button>
                  ) : null}
                  <Button type="button" data-testid="employee-wizard-done" onClick={onFinish}>
                    {isEditMode ? 'Close' : 'Done — return to staff list'}
                  </Button>
                </div>
              </div>
            )}

            {isEditMode && editTab === 'skills' && editEmployeeId ? (
              <EmployeeEditSkillsPanel employeeId={editEmployeeId} />
            ) : null}

            {isEditMode && editTab === 'staff-reviews' ? (
              <EmployeeEditPlaceholderPanel title="Staff Reviews" />
            ) : null}

            {isEditMode && editTab === 'documents' && editEmployeeId ? (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Documents</h2>
                <EmployeeDocumentsSection
                  employeeId={editEmployeeId}
                  apiReady={apiConfigured && Boolean(accessToken?.includes('.'))}
                />
              </div>
            ) : null}

            {isEditMode && editTab === 'non-core-activity' && editEmployeeId ? (
              <EmployeeEditNonCorePanel employeeId={editEmployeeId} />
            ) : null}

            {isEditMode && editTab === 'employment-compliance' && editEmployeeId ? (
              <EmployeeEditCompliancePanel employeeId={editEmployeeId} />
            ) : null}

            {isEditMode &&
            editTab !== 'personal' &&
            editTab !== 'employment' &&
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
