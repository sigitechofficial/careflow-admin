import * as React from 'react'
import { Loader2, Check, AlertTriangle, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { ServiceUserMedicationRow } from '@/features/service-users/types'
import { useServiceUserMedications } from '@/features/service-users/hooks/useServiceUserMedications'
import { useCreateMedicationPack } from '@/features/service-users/hooks/useServiceUserMedicationMutations'
import { AddIndividualMedicationForm } from '@/features/service-users/medication/AddIndividualMedicationForm'
import {
  useAddMedicationPackCompartment,
  useAddMedicationPackMember,
  usePublishMedicationPack,
} from '@/features/service-users/hooks/useMedicationPackLifecycle'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { useServiceUserAllergies } from '@/features/service-users/hooks/useServiceUserTabs'
import { useAuthStore } from '@/features/auth/store'
import {
  ADMINISTRATION_ROUNDS,
  DEFAULT_SELECTED_ROUNDS,
  PACK_TYPES,
  PACK_TYPE_HINTS,
  WIZARD_STEPS,
  emptyPackWizardDetails,
  type WizardStep,
  type PackWizardDetails,
} from '@/features/service-users/medication/blister-pack-wizard.constants'
import {
  computeCycleEnd,
  computeDurationSummary,
  computeGenerationPreview,
  formatDisplayDate,
  medMatchesRound,
  medScheduleRounds,
  roundLabelFromCodes,
} from '@/features/service-users/medication/blister-pack-wizard.utils'

type MemberTab = 'existing' | 'new'

export function AddBlisterPackWizard({
  open,
  onOpenChange,
  serviceUserId,
  serviceUserName,
  onCompleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  serviceUserName?: string
  onCompleted?: () => void
}) {
  const authUser = useAuthStore(s => s.user)
  const profileQuery = useServiceUser(serviceUserId, open)
  const allergiesQuery = useServiceUserAllergies(serviceUserId, open)

  const [step, setStep] = React.useState<WizardStep>(1)
  const [details, setDetails] = React.useState<PackWizardDetails>(() => emptyPackWizardDetails())
  const [selectedRoundCodes, setSelectedRoundCodes] = React.useState<Set<string>>(
    () => new Set(DEFAULT_SELECTED_ROUNDS),
  )
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [memberTab, setMemberTab] = React.useState<MemberTab>('existing')
  const [confirmAccurate, setConfirmAccurate] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  const medsQuery = useServiceUserMedications(serviceUserId)
  const createPack = useCreateMedicationPack()
  const addMember = useAddMedicationPackMember(serviceUserId)
  const addCompartment = useAddMedicationPackCompartment(serviceUserId)
  const publishPack = usePublishMedicationPack(serviceUserId)

  React.useEffect(() => {
    if (!open) return
    const profile = profileQuery.data
    const checkerName =
      [authUser?.firstName, authUser?.lastName].filter(Boolean).join(' ') ||
      authUser?.displayName ||
      ''
    setStep(1)
    setDetails(
      emptyPackWizardDetails({
        nhsNumber: profile?.nhsNumber?.trim() ?? '',
        prescriptionCheckedBy: checkerName,
      }),
    )
    setSelectedRoundCodes(new Set(DEFAULT_SELECTED_ROUNDS))
    setSelectedIds(new Set())
    setMemberTab('existing')
    setConfirmAccurate(false)
    setSubmitting(false)
  }, [open, profileQuery.data, authUser?.firstName, authUser?.lastName, authUser?.displayName])

  const allRows = medsQuery.data?.rows ?? []
  const eligible = React.useMemo(
    () =>
      allRows.filter(
        m =>
          (m.medicationKind ?? 'REGULAR') !== 'PRN' &&
          !m.isControlledMedication &&
          String(m.status) === 'ACTIVE' &&
          !m.medicationPack,
      ),
    [allRows],
  )
  const ineligibleCount = allRows.filter(
    m =>
      String(m.status) === 'ACTIVE' &&
      ((m.medicationKind ?? 'REGULAR') === 'PRN' || m.isControlledMedication),
  ).length

  const selectedMeds = eligible.filter(m => selectedIds.has(m.id))
  const selectedRounds = ADMINISTRATION_ROUNDS.filter(r => selectedRoundCodes.has(r.code))
  const cycleEnd = computeCycleEnd(details.startDate, details.cycleDurationDays)
  const genPreview = computeGenerationPreview(details, selectedRoundCodes, selectedMeds)
  const allergies = allergiesQuery.data ?? []

  const toggleMed = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleRound = (code: string) => {
    setSelectedRoundCodes(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const canProceed = React.useMemo(() => {
    switch (step) {
      case 1:
        return (
          details.name.trim().length > 0 &&
          details.pharmacyName.trim().length > 0 &&
          Boolean(details.startDate) &&
          details.cycleDurationDays >= 1 &&
          (!details.prescriptionChecked || details.prescriptionCheckedBy.trim().length > 0)
        )
      case 2:
        return selectedRoundCodes.size > 0
      case 3:
        return selectedIds.size > 0
      case 4:
      case 6:
        return true
      case 5:
        return (
          details.adminRules.mcaCapacity &&
          details.adminRules.mcaBestInterests &&
          details.adminRules.mcaPrescriberList
        )
      case 7:
        return confirmAccurate
      default:
        return true
    }
  }, [step, details, selectedRoundCodes, selectedIds, confirmAccurate])

  const buildPackBody = () => {
    const endDate = cycleEnd || undefined
    const { adminRules, packNotes, ...rest } = details
    return {
      name: rest.name.trim(),
      description: packNotes.trim() || undefined,
      packType: rest.packType,
      roundLabel: roundLabelFromCodes(selectedRoundCodes) || undefined,
      pharmacyName: rest.pharmacyName.trim() || undefined,
      pharmacyPhone: rest.pharmacyPhone.trim() || undefined,
      gpName: rest.gpName.trim() || undefined,
      gpSurgery: rest.gpSurgery.trim() || undefined,
      nhsNumber: rest.nhsNumber.trim() || undefined,
      startDate: rest.startDate || undefined,
      endDate,
      cycleDurationDays: rest.cycleDurationDays,
      reviewDate: rest.reviewDate || undefined,
      prescriptionChecked: rest.prescriptionChecked,
      prescriptionCheckedBy: rest.prescriptionChecked ? rest.prescriptionCheckedBy.trim() : undefined,
      prescriptionCheckedAt:
        rest.prescriptionChecked && rest.prescriptionCheckedAt
          ? rest.prescriptionCheckedAt
          : undefined,
      generateAheadDays: rest.generateAheadDays,
      adminRules: {
        mcaCapacity: adminRules.mcaCapacity,
        mcaBestInterests: adminRules.mcaBestInterests,
        mcaPrescriberList: adminRules.mcaPrescriberList,
        witnessRound: adminRules.witnessRound || undefined,
        covert: adminRules.covert,
        prnOverride: adminRules.prnOverride,
        lateAllowed: adminRules.lateAllowed,
        lateHours: adminRules.lateHours,
        reviewMode: adminRules.reviewMode,
        riskNotes: adminRules.riskNotes.trim() || undefined,
      },
    }
  }

  const handleMedicationCreated = async (med: ServiceUserMedicationRow) => {
    await medsQuery.refetch()
    setSelectedIds(prev => new Set(prev).add(med.id))
    setMemberTab('existing')
  }

  const handleFinish = async (publish: boolean) => {
    if (publish && !confirmAccurate) return
    setSubmitting(true)
    try {
      const pack = await createPack.mutateAsync({
        serviceUserId,
        body: buildPackBody(),
      })
      let sortOrder = 0
      for (const round of selectedRounds) {
        await addCompartment.mutateAsync({
          packId: pack.id,
          body: {
            label: round.name,
            dueTime: round.time,
            windowStart: round.windowStart,
            windowEnd: round.windowEnd,
            sortOrder: sortOrder++,
          },
        })
      }
      for (const med of selectedMeds) {
        await addMember.mutateAsync({ packId: pack.id, serviceUserMedicationId: med.id })
      }
      if (publish) {
        await publishPack.mutateAsync({ packId: pack.id })
      }
      toastSuccess(
        publish
          ? `Pack published with ${selectedMeds.length} medicine(s) and ${selectedRounds.length} compartment(s)`
          : `Draft pack saved with ${selectedMeds.length} medicine(s)`,
      )
      onCompleted?.()
      onOpenChange(false)
    } catch (e) {
      toastApiError(e, publish ? 'Could not publish the blister pack' : 'Could not save draft pack')
    } finally {
      setSubmitting(false)
    }
  }

  const titleSuffix = serviceUserName ? ` — ${serviceUserName}` : ''

  return (
    <Dialog open={open} onOpenChange={o => !submitting && onOpenChange(o)}>
      <DialogContent size="lg" className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add blister pack{titleSuffix}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select existing chart medicines or create new ones · 7-step setup
          </p>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-1 border-b border-border px-5 py-3">
          {WIZARD_STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold',
                    step === s.id
                      ? 'bg-teal-700 text-white'
                      : step > s.id
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {step > s.id ? <Check className="h-3 w-3" /> : s.id}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium',
                    step === s.id ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {s.short}
                </span>
              </div>
              {i < WIZARD_STEPS.length - 1 && (
                <div className="hidden h-px w-3 bg-border sm:block" />
              )}
            </React.Fragment>
          ))}
        </div>

        <DialogBody className="space-y-4">
          {step === 1 && (
            <StepAbout details={details} onChange={setDetails} cycleEnd={cycleEnd} />
          )}
          {step === 2 && (
            <StepCompartments
              selectedRoundCodes={selectedRoundCodes}
              onToggle={toggleRound}
            />
          )}
          {step === 3 && (
            <StepMedicines
              memberTab={memberTab}
              onMemberTab={setMemberTab}
              serviceUserId={serviceUserId}
              packStartDate={details.startDate}
              eligible={eligible}
              selectedIds={selectedIds}
              onToggle={toggleMed}
              ineligibleCount={ineligibleCount}
              loading={medsQuery.isLoading}
              selectedRounds={selectedRounds}
              onMedicationCreated={handleMedicationCreated}
            />
          )}
          {step === 4 && (
            <StepReviewMatrix
              details={details}
              cycleEnd={cycleEnd}
              selectedMeds={selectedMeds}
              selectedRounds={selectedRounds}
            />
          )}
          {step === 5 && (
            <StepSafety
              details={details}
              selectedRounds={selectedRounds}
              onChange={setDetails}
            />
          )}
          {step === 6 && (
            <StepGeneration
              details={details}
              cycleEnd={cycleEnd}
              onChange={setDetails}
              preview={genPreview}
            />
          )}
          {step === 7 && (
            <StepPreview
              details={details}
              cycleEnd={cycleEnd}
              selectedMeds={selectedMeds}
              selectedRounds={selectedRounds}
              preview={genPreview}
              allergies={allergies}
              confirmAccurate={confirmAccurate}
              onConfirmAccurate={setConfirmAccurate}
            />
          )}
        </DialogBody>

        <DialogFooter className="flex-wrap gap-2">
          {step > 1 && (
            <Button
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => setStep((step - 1) as WizardStep)}
            >
              Back
            </Button>
          )}
          <Button variant="outline" size="sm" disabled={submitting} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step < 7 && (
            <Button
              size="sm"
              disabled={!canProceed}
              onClick={() => setStep((step + 1) as WizardStep)}
            >
              Continue
            </Button>
          )}
          {step === 7 && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={submitting || selectedMeds.length === 0}
                onClick={() => void handleFinish(false)}
              >
                {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save as draft
              </Button>
              <Button
                size="sm"
                disabled={submitting || !canProceed || selectedMeds.length === 0}
                onClick={() => void handleFinish(true)}
              >
                {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Publish pack
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StepBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-950 dark:text-violet-300">
      {children}
    </span>
  )
}

function StepAbout({
  details,
  onChange,
  cycleEnd,
}: {
  details: PackWizardDetails
  onChange: React.Dispatch<React.SetStateAction<PackWizardDetails>>
  cycleEnd: string
}) {
  const packTypeHint = PACK_TYPE_HINTS[details.packType]
  const set = (patch: Partial<PackWizardDetails>) => onChange(d => ({ ...d, ...patch }))

  return (
    <div className="space-y-4">
      <div>
        <StepBadge>Step 1</StepBadge>
        <h3 className="mt-1 text-base font-semibold">About this pack</h3>
        <p className="text-sm text-muted-foreground">
          Start from the pharmacy label — name, pharmacy, GP, and cycle dates. These appear on the MCA
          contents record.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Labelled label="Pack name" required className="sm:col-span-2">
          <Input value={details.name} onChange={e => set({ name: e.target.value })} />
        </Labelled>
        <Labelled label="Pack type" className="sm:col-span-2">
          <Select
            value={details.packType}
            onValueChange={v => set({ packType: v as PackWizardDetails['packType'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PACK_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1.5 rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
            <strong className="text-foreground">{packTypeHint.title}</strong> — {packTypeHint.body}
            <span className="mt-1 block">
              <strong>When to choose:</strong> {packTypeHint.when}
            </span>
          </p>
        </Labelled>
        <Labelled label="Pharmacy name" required>
          <Input value={details.pharmacyName} onChange={e => set({ pharmacyName: e.target.value })} />
        </Labelled>
        <Labelled label="Pharmacy phone">
          <Input value={details.pharmacyPhone} onChange={e => set({ pharmacyPhone: e.target.value })} />
        </Labelled>
        <Labelled label="Prescribing GP">
          <Input value={details.gpName} onChange={e => set({ gpName: e.target.value })} />
        </Labelled>
        <Labelled label="GP surgery">
          <Input value={details.gpSurgery} onChange={e => set({ gpSurgery: e.target.value })} />
        </Labelled>
        <Labelled label="NHS number">
          <Input value={details.nhsNumber} onChange={e => set({ nhsNumber: e.target.value })} />
        </Labelled>
        <Labelled label="Pack start date" required>
          <Input type="date" value={details.startDate} onChange={e => set({ startDate: e.target.value })} />
        </Labelled>
        <Labelled label="Cycle duration (days)" required>
          <Input
            type="number"
            min={1}
            max={90}
            value={details.cycleDurationDays}
            onChange={e => {
              const cycleDurationDays = Math.max(1, parseInt(e.target.value, 10) || 28)
              set({ cycleDurationDays, generateAheadDays: cycleDurationDays })
            }}
          />
          <span className="text-xs text-muted-foreground">
            How long this physical tray lasts — most pharmacy blister packs are 28 days.
          </span>
        </Labelled>
        <Labelled label="Medication review date">
          <Input type="date" value={details.reviewDate} onChange={e => set({ reviewDate: e.target.value })} />
        </Labelled>
      </div>
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
        {details.startDate ? (
          <>
            <strong>{computeDurationSummary(details.startDate, details.cycleDurationDays)}</strong>
            <span className="mt-1 block text-xs opacity-90">
              Physical tray from pharmacy · Step 6 will create pending MAR rows for this window.
              {cycleEnd && (
                <> Next delivery expected ~{formatDisplayDate(addOneDay(cycleEnd))}.</>
              )}
            </span>
          </>
        ) : (
          <>
            <strong>Pack duration: {details.cycleDurationDays} days</strong> · set start date to calculate
            cycle end
          </>
        )}
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={details.prescriptionChecked}
            onChange={e => set({ prescriptionChecked: e.target.checked })}
            className="h-4 w-4 accent-teal-600"
          />
          Prescription checked against pharmacy label
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Labelled label="Checked by">
            <Input
              value={details.prescriptionCheckedBy}
              onChange={e => set({ prescriptionCheckedBy: e.target.value })}
              disabled={!details.prescriptionChecked}
            />
          </Labelled>
          <Labelled label="Checked date">
            <Input
              type="date"
              value={details.prescriptionCheckedAt}
              onChange={e => set({ prescriptionCheckedAt: e.target.value })}
              disabled={!details.prescriptionChecked}
            />
          </Labelled>
        </div>
      </div>
      <Labelled label="Pack notes">
        <textarea
          className="flex min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={details.packNotes}
          onChange={e => set({ packNotes: e.target.value })}
          placeholder="Special handling instructions for carers…"
        />
      </Labelled>
    </div>
  )
}

function StepCompartments({
  selectedRoundCodes,
  onToggle,
}: {
  selectedRoundCodes: Set<string>
  onToggle: (code: string) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <StepBadge>Step 2</StepBadge>
        <h3 className="mt-1 text-base font-semibold">Define compartments (time slots)</h3>
        <p className="text-sm text-muted-foreground">
          Which compartments exist in this pharmacy tray? Each creates a slot on MAR with due time and
          window.
        </p>
      </div>
      <div className="space-y-2">
        {ADMINISTRATION_ROUNDS.map(round => {
          const checked = selectedRoundCodes.has(round.code)
          return (
            <button
              type="button"
              key={round.code}
              onClick={() => onToggle(round.code)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                checked
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30'
                  : 'border-border hover:bg-muted/40',
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                  checked ? 'border-teal-600 bg-teal-600 text-white' : 'border-border',
                )}
              >
                {checked && <Check className="h-3.5 w-3.5" />}
              </span>
              <span className="text-lg">{round.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{round.name}</div>
                <div className="font-mono text-sm text-muted-foreground">
                  {round.time} · window {round.windowStart} – {round.windowEnd}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
        <strong>Model A:</strong> Carers record each medicine separately on MAR — not one code for the
        whole compartment. Pack groups rows visually; events stay per medicine × round.
      </div>
    </div>
  )
}

function StepMedicines({
  memberTab,
  onMemberTab,
  serviceUserId,
  packStartDate,
  eligible,
  selectedIds,
  onToggle,
  ineligibleCount,
  loading,
  selectedRounds,
  onMedicationCreated,
}: {
  memberTab: MemberTab
  onMemberTab: (tab: MemberTab) => void
  serviceUserId: string
  packStartDate: string
  eligible: ServiceUserMedicationRow[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  ineligibleCount: number
  loading: boolean
  selectedRounds: typeof ADMINISTRATION_ROUNDS
  onMedicationCreated: (med: ServiceUserMedicationRow) => void | Promise<void>
}) {
  return (
    <div className="space-y-4">
      <div>
        <StepBadge>Step 3</StepBadge>
        <h3 className="mt-1 text-base font-semibold">Add medicines to this pack</h3>
        <p className="text-sm text-muted-foreground">
          Link medicines from the chart or create new ones. PRN, controlled drugs, covert &amp; liquids stay
          standalone.
        </p>
      </div>
      {selectedRounds.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
          <span className="font-medium">Pack compartments: </span>
          {selectedRounds.map(r => `${r.emoji} ${r.name}`).join(' · ')}
        </div>
      )}
      <div className="flex gap-2 border-b border-border">
        {(['existing', 'new'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => onMemberTab(tab)}
            className={cn(
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              memberTab === tab
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab === 'existing' ? 'Select from chart' : 'Create new medicine'}
          </button>
        ))}
      </div>
      {memberTab === 'existing' && (
        <>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading medicines…
            </div>
          )}
          {!loading && eligible.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No eligible medicines found. Add scheduled (non-PRN, non-controlled) medications first, or
              use Create new medicine.
            </div>
          )}
          <div className="space-y-2">
            {eligible.map(med => {
              const checked = selectedIds.has(med.id)
              const slots = medScheduleRounds(med)
              return (
                <button
                  type="button"
                  key={med.id}
                  onClick={() => onToggle(med.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                    checked
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30'
                      : 'border-border hover:bg-muted/40',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                      checked ? 'border-teal-600 bg-teal-600 text-white' : 'border-border',
                    )}
                  >
                    {checked && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-medium">{med.medicationName}</span>
                      {med.strength && (
                        <span className="text-sm text-muted-foreground">{med.strength}</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {[med.dose, med.frequencyText].filter(Boolean).join(' · ') || 'No dose set'}
                    </div>
                    {slots.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {slots.map(s => (
                          <Badge key={s.code} variant="secondary" size="sm">
                            {s.emoji} {s.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
          {ineligibleCount > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              {ineligibleCount} active medicine(s) excluded (PRN or controlled drug).
            </p>
          )}
        </>
      )}
      {memberTab === 'new' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Same form as <strong>Add medication</strong> — saves to the chart and selects it for this pack.
          </p>
          <AddIndividualMedicationForm
            key={`wizard-new-med-${packStartDate}`}
            serviceUserId={serviceUserId}
            enabled={memberTab === 'new'}
            defaultStartDate={packStartDate}
            saveLabel="Add to chart & link"
            formId="blister-wizard-add-med-form"
            onSaved={onMedicationCreated}
          />
        </div>
      )}
    </div>
  )
}

function StepReviewMatrix({
  details,
  cycleEnd,
  selectedMeds,
  selectedRounds,
}: {
  details: PackWizardDetails
  cycleEnd: string
  selectedMeds: ServiceUserMedicationRow[]
  selectedRounds: typeof ADMINISTRATION_ROUNDS
}) {
  return (
    <div className="space-y-4">
      <div>
        <StepBadge>Step 4</StepBadge>
        <h3 className="mt-1 text-base font-semibold">Review contents &amp; schedules</h3>
        <p className="text-sm text-muted-foreground">
          Reconcile each medicine against the selected compartments. Manifest lines are copied at publish.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        {details.startDate ? (
          <>
            <strong className="text-foreground">Cycle 1 coverage:</strong> {details.cycleDurationDays}{' '}
            days ({formatDisplayDate(details.startDate)} – {formatDisplayDate(cycleEnd)}) ·{' '}
            {selectedMeds.length} medicine{selectedMeds.length !== 1 ? 's' : ''} in this pack
          </>
        ) : (
          'Set pack start date and duration in step 1 to see cycle coverage.'
        )}
      </div>
      {selectedMeds.length === 0 ? (
        <p className="text-sm text-muted-foreground">No medicines selected — go back to step 3.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">Medicine</th>
                {selectedRounds.map(r => (
                  <th key={r.code} className="px-3 py-2 text-center font-medium">
                    {r.emoji} {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedMeds.map(med => (
                <tr key={med.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-medium">{med.medicationName}</div>
                    <div className="text-xs text-muted-foreground">
                      {[med.strength, med.dose].filter(Boolean).join(' · ')}
                    </div>
                  </td>
                  {selectedRounds.map(round => {
                    const match = medMatchesRound(med, round)
                    return (
                      <td key={round.code} className="px-3 py-2 text-center">
                        {match ? (
                          <Check className="mx-auto h-4 w-4 text-teal-600" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StepSafety({
  details,
  selectedRounds,
  onChange,
}: {
  details: PackWizardDetails
  selectedRounds: typeof ADMINISTRATION_ROUNDS
  onChange: React.Dispatch<React.SetStateAction<PackWizardDetails>>
}) {
  const rules = details.adminRules
  const setRules = (patch: Partial<typeof rules>) =>
    onChange(d => ({ ...d, adminRules: { ...d.adminRules, ...patch } }))

  return (
    <div className="space-y-4">
      <div>
        <StepBadge>Step 5</StepBadge>
        <h3 className="mt-1 text-base font-semibold">Safety &amp; administration rules</h3>
        <p className="text-sm text-muted-foreground">
          Pack-wide rules for compliance and carer workflow — not per-medicine doses.
        </p>
      </div>
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
        <strong>Two checks before publish:</strong> (1) <strong>MCA assessment</strong> — legal
        documentation that using a pharmacy tray is appropriate. (2){' '}
        <strong>Administration rules</strong> — what carers and managers must do when giving medicines from
        this pack each day.
      </div>
      <div className="text-xs font-bold uppercase tracking-wide text-indigo-600">MCA assessment</div>
      <p className="text-xs text-muted-foreground">
        Required for CQC / NICE NG67 before first use of a Multi-Compartment Compliance Aid (MCA).
      </p>
      <CheckboxLabel
        checked={rules.mcaCapacity}
        onChange={v => setRules({ mcaCapacity: v })}
        label="Capacity assessed — person lacks capacity for this treatment decision"
      />
      <CheckboxLabel
        checked={rules.mcaBestInterests}
        onChange={v => setRules({ mcaBestInterests: v })}
        label="Best interests decision documented"
      />
      <CheckboxLabel
        checked={rules.mcaPrescriberList}
        onChange={v => setRules({ mcaPrescriberList: v })}
        label="GP / prescriber signed dated medicine list on file"
      />
      <div className="text-xs font-bold uppercase tracking-wide text-indigo-600">Administration rules</div>
      <p className="text-xs text-muted-foreground">
        Controlled drugs (CDs) are not allowed in blister packs — add CDs as standalone medicines instead.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Labelled label="Witness at administration" className="sm:col-span-2">
          <Select value={rules.witnessRound || '__none__'} onValueChange={v => setRules({ witnessRound: v === '__none__' ? '' : v })}>
            <SelectTrigger>
              <SelectValue placeholder="None — standard pack (recommended)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None — standard pack (recommended)</SelectItem>
              {selectedRounds.map(r => (
                <SelectItem key={r.code} value={r.name}>
                  {r.emoji} {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Hint>
            Controlled drugs are never in blister packs. CD witness capture happens on standalone CD
            records, not here.
          </Hint>
        </Labelled>
        <Labelled label="Covert medication">
          <Select value={rules.covert} onValueChange={v => setRules({ covert: v as 'no' | 'yes' })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">No</SelectItem>
              <SelectItem value="yes">Yes — separate approval on file</SelectItem>
            </SelectContent>
          </Select>
        </Labelled>
        <Labelled label="PRN outside pack schedule">
          <Select value={rules.prnOverride} onValueChange={v => setRules({ prnOverride: v as 'no' | 'yes' })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">Not allowed outside pack</SelectItem>
              <SelectItem value="yes">Allowed with manager approval</SelectItem>
            </SelectContent>
          </Select>
        </Labelled>
        <Labelled label="Allow late recording">
          <Select value={rules.lateAllowed} onValueChange={v => setRules({ lateAllowed: v as 'yes' | 'no' })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes — carer may record after window</SelectItem>
              <SelectItem value="no">No — manager only</SelectItem>
            </SelectContent>
          </Select>
        </Labelled>
        <Labelled label="Late max (hours)">
          <Input
            type="number"
            min={0}
            value={rules.lateHours}
            onChange={e => setRules({ lateHours: Math.max(0, parseInt(e.target.value, 10) || 0) })}
            disabled={rules.lateAllowed !== 'yes'}
          />
        </Labelled>
        <Labelled label="Manager review" className="sm:col-span-2">
          <Select value={rules.reviewMode} onValueChange={v => setRules({ reviewMode: v as 'exceptions' | 'always' })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exceptions">Exceptions only (refused / missed / partial)</SelectItem>
              <SelectItem value="always">Always — every administration</SelectItem>
            </SelectContent>
          </Select>
        </Labelled>
        <Labelled label="Risk notes for carers" className="sm:col-span-2">
          <textarea
            className="flex min-h-[48px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={rules.riskNotes}
            onChange={e => setRules({ riskNotes: e.target.value })}
            placeholder="e.g. Swallow whole with water · choking risk · check mouth after giving"
          />
          <Hint>Shown at the top of the carer compartment screen when they open a time slot.</Hint>
        </Labelled>
      </div>
    </div>
  )
}

function StepGeneration({
  details,
  cycleEnd,
  onChange,
  preview,
}: {
  details: PackWizardDetails
  cycleEnd: string
  onChange: React.Dispatch<React.SetStateAction<PackWizardDetails>>
  preview: ReturnType<typeof computeGenerationPreview>
}) {
  return (
    <div className="space-y-4">
      <div>
        <StepBadge>Step 6</StepBadge>
        <h3 className="mt-1 text-base font-semibold">Generation window</h3>
        <p className="text-sm text-muted-foreground">
          Step 1 defines the physical pack cycle. Step 6 defines how many pending MAR administrations to
          create for each medicine&apos;s schedule inside that window.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <div className="text-xs font-medium text-muted-foreground">Generation starts (from step 1)</div>
          <div className="font-medium">{details.startDate ? formatDisplayDate(details.startDate) : '—'}</div>
          <div className="text-xs text-muted-foreground">Same as pack start date</div>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <div className="text-xs font-medium text-muted-foreground">Generation ends (from step 1)</div>
          <div className="font-medium">{cycleEnd ? formatDisplayDate(cycleEnd) : '—'}</div>
          <div className="text-xs text-muted-foreground">Pack start + cycle duration</div>
        </div>
      </div>
      <Labelled label="Generate pending administrations for (days)">
        <Input
          type="number"
          min={1}
          className="w-32"
          value={details.generateAheadDays}
          onChange={e =>
            onChange(d => ({
              ...d,
              generateAheadDays: Math.max(1, parseInt(e.target.value, 10) || d.cycleDurationDays),
            }))
          }
        />
        <span className="text-xs text-muted-foreground">
          Usually matches cycle duration ({details.cycleDurationDays} days).
        </span>
      </Labelled>
      {details.startDate && cycleEnd && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
          <strong>
            Pack cycle: {details.cycleDurationDays} days · {formatDisplayDate(details.startDate)} –{' '}
            {formatDisplayDate(cycleEnd)}
          </strong>
          <span className="mt-1 block text-xs opacity-90">
            MAR records will cover this window · Next delivery expected ~{formatDisplayDate(addOneDay(cycleEnd))}
          </span>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="border-b border-border bg-muted/50 px-3 py-2 text-sm font-medium">
          MAR generation preview
        </div>
        <div className="p-3 text-sm">
          {!preview || !preview.lines.length ? (
            <p className="text-muted-foreground">
              Set pack start in <strong>step 1</strong> and select medicines in <strong>step 3</strong> to
              preview pending administrations.
            </p>
          ) : (
            <>
              <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <Stat label="Members" value={String(preview.memberCount)} />
                <Stat label="Compartments" value={String(preview.compartmentCount)} />
                <Stat label="Rows/day" value={String(preview.rowsPerDay)} />
                <Stat label="Total events" value={String(preview.totalEvents)} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-1 text-left">Medicine</th>
                      <th className="py-1 text-left">Schedule</th>
                      <th className="py-1 text-left">Calculation</th>
                      <th className="py-1 text-right">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.lines.map(line => (
                      <tr key={line.name} className="border-b border-border last:border-0">
                        <td className="py-1.5 font-medium">{line.name}</td>
                        <td className={cn('py-1.5', line.kind === 'warn' && 'text-amber-700')}>
                          {line.kind === 'warn' && '⚠ '}
                          {line.detail}
                        </td>
                        <td className="py-1.5 text-muted-foreground">
                          {line.kind === 'ok' ? `${line.perDay}/day × ${preview.generateDays} days` : '—'}
                        </td>
                        <td className="py-1.5 text-right font-medium">
                          {line.kind === 'ok' ? line.events : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                First record: {preview.firstRecord} · Last record: {preview.lastRecord}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StepPreview({
  details,
  cycleEnd,
  selectedMeds,
  selectedRounds,
  preview,
  allergies,
  confirmAccurate,
  onConfirmAccurate,
}: {
  details: PackWizardDetails
  cycleEnd: string
  selectedMeds: ServiceUserMedicationRow[]
  selectedRounds: typeof ADMINISTRATION_ROUNDS
  preview: ReturnType<typeof computeGenerationPreview>
  allergies: { allergyName: string }[]
  confirmAccurate: boolean
  onConfirmAccurate: (v: boolean) => void
}) {
  const allergyNames = allergies.map(a => a.allergyName).filter(Boolean)

  return (
    <div className="space-y-4">
      <div>
        <StepBadge>Step 7</StepBadge>
        <h3 className="mt-1 text-base font-semibold">Preview &amp; confirm</h3>
        <p className="text-sm text-muted-foreground">
          Review the MCA contents record and MAR impact before publishing Cycle 1 as ACTIVE.
        </p>
      </div>
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
        <strong>{details.name}</strong> · {PACK_TYPES.find(t => t.value === details.packType)?.label}
        <br />
        {details.pharmacyName && <>Pharmacy: {details.pharmacyName} · </>}
        {details.startDate && (
          <>
            Cycle: {formatDisplayDate(details.startDate)} – {formatDisplayDate(cycleEnd)} ({details.cycleDurationDays}{' '}
            days)
          </>
        )}
        {details.reviewDate && <> · Review: {formatDisplayDate(details.reviewDate)}</>}
      </div>
      {preview && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          <strong>MAR impact:</strong> {preview.totalEvents} pending administration
          {preview.totalEvents !== 1 ? 's' : ''} across {preview.memberCount} medicine
          {preview.memberCount !== 1 ? 's' : ''} · {preview.compartmentCount} compartment
          {preview.compartmentCount !== 1 ? 's' : ''} · {preview.generateDays}-day generation window
        </div>
      )}
      {allergyNames.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Allergies on file:</strong> {allergyNames.join(', ')} — verify none are in this pack.
          </div>
        </div>
      )}
      {details.adminRules.riskNotes.trim() && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <strong>Carer risk notes:</strong> {details.adminRules.riskNotes}
          </div>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="border-b border-border bg-muted/50 px-3 py-2 text-sm font-medium">
          MCA contents record (draft)
        </div>
        <div className="overflow-x-auto p-3">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-1 text-left">#</th>
                <th className="py-1 text-left">Medicine</th>
                <th className="py-1 text-left">Strength</th>
                <th className="py-1 text-left">Dose</th>
                <th className="py-1 text-left">Schedule</th>
              </tr>
            </thead>
            <tbody>
              {selectedMeds.map((med, i) => {
                const slots = medScheduleRounds(med).filter(r => selectedRounds.some(sr => sr.code === r.code))
                return (
                  <tr key={med.id} className="border-b border-border last:border-0">
                    <td className="py-1.5">{i + 1}</td>
                    <td className="py-1.5 font-medium">{med.medicationName}</td>
                    <td className="py-1.5 text-muted-foreground">{med.strength ?? '—'}</td>
                    <td className="py-1.5 text-muted-foreground">{med.dose ?? '—'}</td>
                    <td className="py-1.5 text-muted-foreground">
                      {slots.map(s => s.name).join(' & ') || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3 text-sm">
        <input
          type="checkbox"
          checked={confirmAccurate}
          onChange={e => onConfirmAccurate(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-teal-600"
        />
        <span>
          I confirm the MCA contents record is accurate and matches the pharmacy prescription
        </span>
      </label>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-background px-2 py-1">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  )
}

function CheckboxLabel({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-teal-600"
      />
      {label}
    </label>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
      {children}
    </p>
  )
}

function Labelled({
  label,
  required,
  className,
  children,
}: {
  label: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}

function addOneDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}
