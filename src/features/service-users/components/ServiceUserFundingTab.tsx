import * as React from 'react'
import { Ban, CheckCircle, Info, Loader2, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import type {
  CreateEnterpriseServiceUserFundingBody,
  EnterpriseFundingStatus,
  EnterpriseFunderRow,
  EnterpriseFundingTypeRow,
  EnterpriseServiceUserFundingRow,
} from '@/features/service-users/types'
import {
  useApproveServiceUserEnterpriseFunding,
  useCreateServiceUserEnterpriseFunding,
  useDeleteServiceUserEnterpriseFunding,
  useEndServiceUserEnterpriseFunding,
  usePatchServiceUserFundingRefs,
  useSetPrimaryServiceUserEnterpriseFunding,
  useUpdateServiceUserEnterpriseFunding,
} from '@/features/service-users/hooks/useServiceUserMutations'
import {
  useEnterpriseFunders,
  useEnterpriseFundingTypes,
  useServiceUserEnterpriseFundings,
} from '@/features/service-users/hooks/useServiceUserTabs'
import { useChargeCards } from '@/features/billing/hooks/useChargeCards'
import { useInvoiceTemplates } from '@/features/billing/hooks/useInvoiceTemplates'
import type { ChargeCard } from '@/features/billing/types/billing-cards.types'
import type { InvoiceTemplate } from '@/features/billing/types/invoice-templates.types'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Switch, Checkbox } from '@/shared/ui/toggle-controls'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'
import { cn, formatDate } from '@/shared/lib/utils'
import { Combobox } from '@/shared/ui/combobox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'

function FundingFieldLabel({
  label,
  tooltip,
  required,
  className,
}: {
  label: string
  tooltip: string
  required?: boolean
  className?: string
}) {
  return (
    <span className={cn('flex items-center gap-1 text-sm font-medium', className)}>
      {label}
      {required ? <span className="text-destructive">*</span> : null}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`About ${label}`}
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm text-left text-xs leading-snug">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </span>
  )
}

const FUNDING_FIELD_TOOLTIPS = {
  payerMode:
    'Single Funder: one payer for this arrangement. Mixed Funding: select multiple funders and set each share of the invoice (split %).',
  fundingTypeId:
    'Classification of who pays (e.g. local authority, NHS, private). Required for each funding line.',
  funderId: 'The payer organisation invoiced for this share of care. Required for billing readiness.',
  status: 'Lifecycle of this funding line — e.g. pending approval, active, suspended, or ended.',
  startDate: 'Date this funding arrangement becomes effective.',
  endDate: 'Date funding ends. Leave blank if the contract is open-ended.',
  fundingReference: 'External reference from the funder or council (package ID, client number).',
  approvalReference: 'Approval or assessment reference from the commissioning body.',
  packageName: 'Care package or contract name shown on invoices and reports.',
  weeklyBudget: 'Maximum weekly amount authorised by the funder for this package (informational). Visit charges come from the charge card.',
  splitPercent:
    'Share of invoice lines allocated to this funder when multiple funders apply. Combined splits must total 100% for Mixed Funding.',
  splitPriority: 'Billing order when multiple funders apply — 1 is invoiced first; highest number receives the remainder.',
  purchaseOrderNumber: 'Purchase order number that must appear on invoices for this funder.',
  purchaseOrderExpiresAt: 'Date after which the purchase order is no longer valid for billing.',
  authorisedWeeklyHours: 'Maximum care hours per week authorised under this contract.',
  defaultChargeCardId:
    'Rate card used to price visits for this funding line (hourly, fixed, night duty, etc.). Overrides the funder default when set.',
  defaultInvoiceTemplateId:
    'Funder export profile for this contract. Used when rendering PDF, Excel, CSV, or API invoice files.',
  billingContactName: 'Person or team named on invoices. Required for billing readiness.',
  billingContactEmail: 'Email address for sending invoices to this funder or appointee.',
  billingContactPhone: 'Phone number for billing queries.',
  invoiceGroupingRule: 'How invoice lines are grouped — e.g. one invoice per service user or per PO.',
  reviewDate: 'Date when this funding arrangement should be reviewed.',
  notes: 'Internal notes for staff. Not shown on invoices.',
  isPrimary:
    'Primary funding is used first when resolving charge cards and is highlighted on the funding list. At least one active funding must stay primary.',
} as const

type FundingPayerMode = 'SINGLE' | 'MIXED'

type MixedFunderShare = {
  funderId: string
  splitPercent: string
}

function chargeCardOptionLabel(card: ChargeCard): string {
  return `${card.name} (${card.code})`
}

function invoiceTemplateOptionLabel(template: InvoiceTemplate): string {
  return `${template.name} (${template.templateType})`
}

const STATUS_OPTIONS: EnterpriseFundingStatus[] = [
  'PENDING',
  'APPROVED',
  'ACTIVE',
  'SUSPENDED',
  'ENDED',
  'REJECTED',
  'UNKNOWN',
]

function fmtDate(iso: string | null | undefined): string {
  return formatDate(iso)
}

function fmtMoney(v: string | null | undefined): string {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return v
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function isSplitEligibleFunding(row: EnterpriseServiceUserFundingRow): boolean {
  return row.status !== 'ENDED' && row.status !== 'REJECTED' && row.status !== 'SUSPENDED'
}

function isPrimaryEligibleFunding(row: EnterpriseServiceUserFundingRow): boolean {
  return row.status !== 'ENDED' && row.status !== 'REJECTED'
}

function parseSplitPercentValue(v: string | null | undefined): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

function nextSplitPriority(fundings: EnterpriseServiceUserFundingRow[]): number {
  const priorities = fundings.filter(isSplitEligibleFunding).map((r) => r.splitPriority ?? 1)
  return priorities.length ? Math.max(...priorities) + 1 : 1
}

type FundingForm = {
  payerMode: FundingPayerMode
  mixedShares: MixedFunderShare[]
  fundingTypeId: string
  funderId: string
  status: EnterpriseFundingStatus
  fundingReference: string
  approvalReference: string
  packageName: string
  startDate: string
  endDate: string
  weeklyBudget: string
  contributionAmount: string
  splitPercent: string
  splitPriority: string
  purchaseOrderNumber: string
  purchaseOrderExpiresAt: string
  authorisedWeeklyHours: string
  billingContactName: string
  billingContactEmail: string
  billingContactPhone: string
  invoiceGroupingRule: string
  defaultChargeCardId: string
  defaultInvoiceTemplateId: string
  isPrimary: boolean
  reviewDate: string
  notes: string
}

function emptyForm(): FundingForm {
  return {
    payerMode: 'SINGLE',
    mixedShares: [],
    fundingTypeId: '',
    funderId: '',
    status: 'UNKNOWN',
    fundingReference: '',
    approvalReference: '',
    packageName: '',
    startDate: '',
    endDate: '',
    weeklyBudget: '',
    contributionAmount: '',
    splitPercent: '',
    splitPriority: '1',
    purchaseOrderNumber: '',
    purchaseOrderExpiresAt: '',
    authorisedWeeklyHours: '',
    billingContactName: '',
    billingContactEmail: '',
    billingContactPhone: '',
    invoiceGroupingRule: '',
    defaultChargeCardId: '',
    defaultInvoiceTemplateId: '',
    isPrimary: false,
    reviewDate: '',
    notes: '',
  }
}

function rowToForm(row: EnterpriseServiceUserFundingRow): FundingForm {
  return {
    payerMode: 'SINGLE',
    mixedShares: [],
    fundingTypeId: row.fundingTypeId,
    funderId: row.funderId ?? '',
    status: row.status,
    fundingReference: row.fundingReference ?? '',
    approvalReference: row.approvalReference ?? '',
    packageName: row.packageName ?? '',
    startDate: row.startDate ? row.startDate.slice(0, 10) : '',
    endDate: row.endDate ? row.endDate.slice(0, 10) : '',
    weeklyBudget: row.weeklyBudget ?? '',
    contributionAmount: row.contributionAmount ?? '',
    splitPercent: row.splitPercent ?? '',
    splitPriority: String(row.splitPriority ?? 1),
    purchaseOrderNumber: row.purchaseOrderNumber ?? '',
    purchaseOrderExpiresAt: row.purchaseOrderExpiresAt ? row.purchaseOrderExpiresAt.slice(0, 10) : '',
    authorisedWeeklyHours:
      row.authorisedWeeklyHours != null ? String(row.authorisedWeeklyHours) : '',
    billingContactName: row.billingContactName ?? '',
    billingContactEmail: row.billingContactEmail ?? '',
    billingContactPhone: row.billingContactPhone ?? '',
    invoiceGroupingRule: row.invoiceGroupingRule ?? '',
    defaultChargeCardId: row.defaultChargeCardId ?? row.defaultChargeCard?.id ?? '',
    defaultInvoiceTemplateId:
      row.defaultInvoiceTemplateId ?? row.defaultInvoiceTemplate?.id ?? '',
    isPrimary: row.isPrimary,
    reviewDate: row.reviewDate ? row.reviewDate.slice(0, 10) : '',
    notes: row.notes ?? '',
  }
}

/** Open edit with the same Single / Mixed layout as Add, seeded from existing rows. */
function rowToEditForm(
  row: EnterpriseServiceUserFundingRow,
  allRows: EnterpriseServiceUserFundingRow[],
): { form: FundingForm; groupIds: string[] } {
  const splitRows = allRows.filter((r) => {
    if (!isSplitEligibleFunding(r)) return false
    const pct = parseSplitPercentValue(r.splitPercent)
    return pct != null && pct > 0 && Boolean(r.funderId)
  })
  const isMixed = splitRows.length >= 2
  if (!isMixed) {
    return { form: rowToForm(row), groupIds: [row.id] }
  }
  const base = rowToForm(row)
  return {
    form: {
      ...base,
      payerMode: 'MIXED',
      funderId: '',
      splitPercent: '',
      mixedShares: splitRows.map((r) => ({
        funderId: r.funderId!,
        splitPercent: r.splitPercent != null ? String(Number(r.splitPercent)) : '',
      })),
      isPrimary: splitRows.some((r) => r.isPrimary),
    },
    groupIds: splitRows.map((r) => r.id),
  }
}

function formToBody(f: FundingForm): CreateEnterpriseServiceUserFundingBody {
  return {
    fundingTypeId: f.fundingTypeId,
    funderId: f.funderId || null,
    status: f.status,
    fundingReference: f.fundingReference || null,
    approvalReference: f.approvalReference || null,
    packageName: f.packageName || null,
    startDate: f.startDate || null,
    endDate: f.endDate || null,
    weeklyBudget: f.weeklyBudget === '' ? null : Number(f.weeklyBudget),
    splitPercent: f.splitPercent === '' ? null : Number(f.splitPercent),
    splitPriority: f.splitPriority === '' ? 1 : Number(f.splitPriority),
    purchaseOrderNumber: f.purchaseOrderNumber || null,
    purchaseOrderExpiresAt: f.purchaseOrderExpiresAt || null,
    authorisedWeeklyHours: f.authorisedWeeklyHours === '' ? null : Number(f.authorisedWeeklyHours),
    billingContactName: f.billingContactName || null,
    billingContactEmail: f.billingContactEmail || null,
    billingContactPhone: f.billingContactPhone || null,
    invoiceGroupingRule: f.invoiceGroupingRule || null,
    defaultChargeCardId: f.defaultChargeCardId || null,
    defaultInvoiceTemplateId: f.defaultInvoiceTemplateId || null,
    isPrimary: f.isPrimary,
    reviewDate: f.reviewDate || null,
    notes: f.notes || null,
  }
}

function mixedShareToBody(
  f: FundingForm,
  share: MixedFunderShare,
  splitPriority: number,
  isPrimary: boolean,
): CreateEnterpriseServiceUserFundingBody {
  return {
    ...formToBody({
      ...f,
      payerMode: 'MIXED',
      funderId: share.funderId,
      splitPercent: share.splitPercent,
      splitPriority: String(splitPriority),
      isPrimary,
    }),
  }
}

function sumMixedSharePercents(shares: MixedFunderShare[]): number {
  return shares.reduce((sum, share) => {
    const pct = parseSplitPercentValue(share.splitPercent)
    return pct != null ? sum + pct : sum
  }, 0)
}

function toggleMixedFunder(
  shares: MixedFunderShare[],
  funderId: string,
  checked: boolean,
): MixedFunderShare[] {
  if (checked) {
    if (shares.some((s) => s.funderId === funderId)) return shares
    return [...shares, { funderId, splitPercent: '' }]
  }
  return shares.filter((s) => s.funderId !== funderId)
}

function setMixedSharePercent(
  shares: MixedFunderShare[],
  funderId: string,
  splitPercent: string,
): MixedFunderShare[] {
  return shares.map((s) => (s.funderId === funderId ? { ...s, splitPercent } : s))
}

export function ServiceUserFundingTab({
  serviceUserId,
  displayName,
  contacts: _contacts,
  initialNhsNumber,
  initialSocialServicesRef,
  onDetailPatch,
}: {
  serviceUserId: string
  displayName: string
  contacts: unknown[]
  initialNhsNumber?: string | null
  initialSocialServicesRef?: string | null
  onDetailPatch: (patch: { nhsNumber?: string | null; socialServicesRef?: string | null }) => void
}) {
  const can = useAuthStore((s) => s.can)
  const canRead = can('service_users.funding.read') || can('service_users.read')
  const canUpdateRefs = can('service_users.funding.update') || can('service_users.update')
  const canCreate = can('service_users.funding.create') || can('service_users.update')
  const canEdit = can('service_users.funding.update') || can('service_users.update')
  const canDelete = can('service_users.funding.delete')
  const canApprove = can('service_users.funding.approve')
  const canSetPrimary = can('service_users.funding.set_primary')

  const fundingsQuery = useServiceUserEnterpriseFundings(serviceUserId, canRead)
  const typesQuery = useEnterpriseFundingTypes(canRead)
  const fundersQuery = useEnterpriseFunders(canRead)
  const chargeCardsQuery = useChargeCards()
  const invoiceTemplatesQuery = useInvoiceTemplates()
  const createMutation = useCreateServiceUserEnterpriseFunding(serviceUserId)
  const updateMutation = useUpdateServiceUserEnterpriseFunding(serviceUserId)
  const deleteMutation = useDeleteServiceUserEnterpriseFunding(serviceUserId)
  const patchRefsMutation = usePatchServiceUserFundingRefs(serviceUserId)
  const setPrimaryMutation = useSetPrimaryServiceUserEnterpriseFunding(serviceUserId)
  const approveMutation = useApproveServiceUserEnterpriseFunding(serviceUserId)
  const endMutation = useEndServiceUserEnterpriseFunding(serviceUserId)

  const loading =
    fundingsQuery.isLoading ||
    typesQuery.isLoading ||
    fundersQuery.isLoading ||
    chargeCardsQuery.isLoading ||
    invoiceTemplatesQuery.isLoading
  const rows = fundingsQuery.data?.rows ?? []
  const types = typesQuery.data ?? []
  const funders = fundersQuery.data ?? []
  const chargeCards = chargeCardsQuery.data ?? []
  const invoiceTemplates = invoiceTemplatesQuery.data ?? []
  const [nhsNumber, setNhsNumber] = React.useState(initialNhsNumber ?? '')
  const [socialRef, setSocialRef] = React.useState(initialSocialServicesRef ?? '')

  React.useEffect(() => {
    setNhsNumber(initialNhsNumber ?? '')
    setSocialRef(initialSocialServicesRef ?? '')
  }, [initialNhsNumber, initialSocialServicesRef])

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  /** Funding row ids belonging to the arrangement being edited (1 for Single, N for Mixed). */
  const [editingGroupIds, setEditingGroupIds] = React.useState<string[]>([])
  const [form, setForm] = React.useState<FundingForm>(() => emptyForm())
  const saving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const chargeCardOptions = React.useMemo(() => {
    const options = chargeCards.map(card => ({
      value: card.id,
      label: chargeCardOptionLabel(card),
    }))
    if (form.defaultChargeCardId && !options.some(o => o.value === form.defaultChargeCardId)) {
      const saved = rows
        .map(r => r.defaultChargeCard)
        .find(c => c?.id === form.defaultChargeCardId)
      const label = saved ? chargeCardOptionLabel(saved as ChargeCard) : '(saved charge card)'
      return [{ value: form.defaultChargeCardId, label }, ...options]
    }
    return options
  }, [chargeCards, form.defaultChargeCardId, rows])

  const invoiceTemplateOptions = React.useMemo(() => {
    const options = invoiceTemplates.map(template => ({
      value: template.id,
      label: invoiceTemplateOptionLabel(template),
    }))
    if (form.defaultInvoiceTemplateId && !options.some(o => o.value === form.defaultInvoiceTemplateId)) {
      const saved = rows
        .map(r => r.defaultInvoiceTemplate)
        .find(t => t?.id === form.defaultInvoiceTemplateId)
      const label = saved
        ? invoiceTemplateOptionLabel(saved as InvoiceTemplate)
        : '(saved invoice template)'
      return [{ value: form.defaultInvoiceTemplateId, label }, ...options]
    }
    return options
  }, [invoiceTemplates, form.defaultInvoiceTemplateId, rows])

  const [endOpen, setEndOpen] = React.useState(false)
  const [endTarget, setEndTarget] = React.useState<EnterpriseServiceUserFundingRow | null>(null)
  const [endDate, setEndDate] = React.useState('')
  const [endReason, setEndReason] = React.useState('')

  const [deleteTarget, setDeleteTarget] = React.useState<EnterpriseServiceUserFundingRow | null>(null)

  const openCreate = () => {
    const primaryEligible = rows.filter(isPrimaryEligibleFunding)
    setEditingId(null)
    setEditingGroupIds([])
    setForm({
      ...emptyForm(),
      splitPriority: String(nextSplitPriority(rows)),
      isPrimary: primaryEligible.length === 0,
    })
    setDialogOpen(true)
  }

  const splitEligibleRows = React.useMemo(
    () => rows.filter(isSplitEligibleFunding),
    [rows],
  )

  const configuredSplitRows = React.useMemo(
    () =>
      splitEligibleRows.filter((row) => {
        const pct = parseSplitPercentValue(row.splitPercent)
        return pct != null && pct > 0
      }),
    [splitEligibleRows],
  )

  const listSplitTotal = React.useMemo(
    () => configuredSplitRows.reduce((sum, row) => sum + Number(row.splitPercent), 0),
    [configuredSplitRows],
  )

  const mixedSplitTotal = React.useMemo(
    () => sumMixedSharePercents(form.mixedShares),
    [form.mixedShares],
  )

  const isMixedMode = form.payerMode === 'MIXED'

  const openEdit = (row: EnterpriseServiceUserFundingRow) => {
    const { form: nextForm, groupIds } = rowToEditForm(row, rows)
    setEditingId(row.id)
    setEditingGroupIds(groupIds)
    setForm(nextForm)
    setDialogOpen(true)
  }

  const setPayerMode = (mode: FundingPayerMode) => {
    setForm((f) => {
      if (mode === f.payerMode) return f
      if (mode === 'MIXED') {
        return {
          ...f,
          payerMode: 'MIXED',
          funderId: '',
          splitPercent: '',
          mixedShares:
            f.funderId !== ''
              ? [{ funderId: f.funderId, splitPercent: '' }]
              : f.mixedShares.length
                ? f.mixedShares
                : [],
        }
      }
      return {
        ...f,
        payerMode: 'SINGLE',
        mixedShares: [],
        funderId: f.mixedShares[0]?.funderId ?? f.funderId,
        splitPercent: '',
        splitPriority: '1',
      }
    })
  }

  const saveFunding = async () => {
    if (!form.fundingTypeId) {
      toastApiError(new Error('Funding type is required'), 'Validation')
      return
    }

    if (isMixedMode) {
      if (form.mixedShares.length < 2) {
        toastApiError(
          new Error('Mixed Funding requires at least two funders'),
          'Validation',
        )
        return
      }
      for (const share of form.mixedShares) {
        const pct = parseSplitPercentValue(share.splitPercent)
        if (pct == null || pct <= 0 || pct > 100) {
          toastApiError(
            new Error('Each selected funder needs a split % between 0 and 100 (greater than 0)'),
            'Validation',
          )
          return
        }
      }
      if (Math.abs(mixedSplitTotal - 100) > 0.001) {
        toastApiError(
          new Error(
            `Mixed Funding splits must total 100% (currently ${mixedSplitTotal.toFixed(1)}%)`,
          ),
          'Validation',
        )
        return
      }

      try {
        if (!editingId) {
          const basePriority = nextSplitPriority(rows)
          let shareIndex = 0
          for (const share of form.mixedShares) {
            await createMutation.mutateAsync(
              mixedShareToBody(
                form,
                share,
                basePriority + shareIndex,
                form.isPrimary ? shareIndex === 0 : false,
              ),
            )
            shareIndex += 1
          }
          toastSuccess(
            'Mixed funding created',
            `${form.mixedShares.length} funder lines saved with invoice splits.`,
          )
        } else {
          const groupRows = rows.filter((r) => editingGroupIds.includes(r.id))
          const byFunder = new Map(
            groupRows
              .filter((r) => r.funderId)
              .map((r) => [r.funderId as string, r] as const),
          )
          let shareIndex = 0
          for (const share of form.mixedShares) {
            const existing = byFunder.get(share.funderId)
            const body = mixedShareToBody(
              form,
              share,
              shareIndex + 1,
              form.isPrimary ? shareIndex === 0 : false,
            )
            if (existing) {
              await updateMutation.mutateAsync({ fundingId: existing.id, body })
              byFunder.delete(share.funderId)
            } else {
              await createMutation.mutateAsync(body)
            }
            shareIndex += 1
          }
          for (const leftover of byFunder.values()) {
            if (canDelete) {
              await deleteMutation.mutateAsync(leftover.id)
            } else {
              await updateMutation.mutateAsync({
                fundingId: leftover.id,
                body: {
                  ...formToBody({
                    ...form,
                    funderId: leftover.funderId ?? '',
                    splitPercent: '',
                    splitPriority: '1',
                    isPrimary: false,
                  }),
                  status: 'ENDED',
                  endDate: form.endDate || new Date().toISOString().slice(0, 10),
                },
              })
            }
          }
          toastSuccess(
            'Mixed funding updated',
            `${form.mixedShares.length} funder lines saved with invoice splits.`,
          )
        }
        setDialogOpen(false)
        void fundingsQuery.refetch()
      } catch (e) {
        toastApiError(
          e,
          editingId
            ? 'Save failed — some funder lines may already have been updated'
            : 'Save failed — some funder lines may already have been created',
        )
        void fundingsQuery.refetch()
      }
      return
    }

    try {
      const body = formToBody({
        ...form,
        // Single Funder lines never store a split % (same as Add).
        splitPercent: '',
        splitPriority: '1',
      })
      const editingRow = editingId ? rows.find((row) => row.id === editingId) : null
      const wasSolePrimary =
        Boolean(
          editingRow?.isPrimary
          && rows.filter(isPrimaryEligibleFunding).filter((row) => row.isPrimary).length === 1,
        )
      if (editingId) {
        await updateMutation.mutateAsync({ fundingId: editingId, body })
        // If this row used to be part of a Mixed group, remove the other funder lines.
        for (const groupId of editingGroupIds) {
          if (groupId === editingId) continue
          if (canDelete) {
            await deleteMutation.mutateAsync(groupId)
          }
        }
        if (wasSolePrimary && !form.isPrimary) {
          toastSuccess('Funding updated. Another funding was set as primary.')
        } else {
          toastSuccess('Funding updated')
        }
      } else {
        await createMutation.mutateAsync(body)
        toastSuccess('Funding created')
      }
      setDialogOpen(false)
      void fundingsQuery.refetch()
    } catch (e) {
      toastApiError(e, 'Save failed')
    }
  }

  const onSetPrimary = async (row: EnterpriseServiceUserFundingRow) => {
    try {
      await setPrimaryMutation.mutateAsync(row.id)
      toastSuccess('Primary funding updated')
      void fundingsQuery.refetch()
    } catch (e) {
      toastApiError(e, 'Could not set primary')
    }
  }

  const onApprove = async (row: EnterpriseServiceUserFundingRow) => {
    try {
      await approveMutation.mutateAsync({ fundingId: row.id, body: {} })
      toastSuccess('Funding approved')
      void fundingsQuery.refetch()
    } catch (e) {
      toastApiError(e, 'Approve failed')
    }
  }

  const confirmEnd = async () => {
    if (!endTarget || !endDate) return
    try {
      await endMutation.mutateAsync({
        fundingId: endTarget.id,
        body: {
          endDate,
          reason: endReason || null,
        },
      })
      toastSuccess('Funding ended')
      setEndOpen(false)
      setEndTarget(null)
      void fundingsQuery.refetch()
    } catch (e) {
      toastApiError(e, 'End funding failed')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toastSuccess('Funding removed')
      setDeleteTarget(null)
    } catch (e) {
      toastApiError(e, 'Delete failed')
    }
  }

  const saveRefs = async () => {
    try {
      const data = await patchRefsMutation.mutateAsync({
        nhsNumber: nhsNumber || null,
        socialServicesRef: socialRef || null,
      })
      onDetailPatch({ nhsNumber: data.nhsNumber, socialServicesRef: data.socialServicesRef })
      toastSuccess('References saved')
    } catch (e) {
      toastApiError(e, 'Could not save references')
    }
  }

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view funding. Required: <span className="font-mono text-xs">service_users.funding.read</span> or{' '}
        <span className="font-mono text-xs">service_users.read</span>.
      </p>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Funding references</h3>
        <p className="mt-1 text-sm text-muted-foreground">NHS number and Social Services reference for {displayName}.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">NHS number</p>
            <Input value={nhsNumber} onChange={(e) => setNhsNumber(e.target.value)} disabled={!canUpdateRefs} placeholder="Optional" />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">Social Services ref</p>
            <Input value={socialRef} onChange={(e) => setSocialRef(e.target.value)} disabled={!canUpdateRefs} placeholder="Optional" />
          </div>
        </div>
        {canUpdateRefs ? (
          <Button className="mt-3" type="button" variant="secondary" onClick={() => void saveRefs()}>
            Save references
          </Button>
        ) : null}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Funding arrangements</h3>
            <p className="mt-1 text-sm text-muted-foreground">Who pays for care, funding type, approval, and package details.</p>
          </div>
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add funding
            </Button>
          ) : null}
        </div>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No funding records yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {configuredSplitRows.length >= 2 ? (
              <div
                className={cn(
                  'rounded-lg border p-3 text-sm',
                  listSplitTotal > 100
                    ? 'border-destructive/50 bg-destructive/5'
                    : listSplitTotal < 100
                      ? 'border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-teal-600/30 bg-teal-50/50 dark:bg-teal-950/20',
                )}
              >
                <p className="font-medium text-foreground">Invoice split</p>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  {[...configuredSplitRows]
                    .sort((a, b) => (a.splitPriority ?? 1) - (b.splitPriority ?? 1))
                    .map((row) => (
                      <li key={row.id}>
                        {row.funder?.name ?? row.fundingType.name}: {row.splitPercent}% (priority{' '}
                        {row.splitPriority ?? 1})
                      </li>
                    ))}
                </ul>
                <p
                  className={cn(
                    'mt-2 text-xs',
                    listSplitTotal > 100 && 'text-destructive',
                    listSplitTotal < 100 && listSplitTotal > 0 && 'text-amber-800 dark:text-amber-200',
                    listSplitTotal === 100 && 'text-teal-800 dark:text-teal-200',
                  )}
                >
                  Total: {listSplitTotal}%
                  {listSplitTotal < 100
                    ? ' — lowest-priority funder receives the remainder on invoices'
                    : listSplitTotal > 100
                      ? ' — exceeds 100%; adjust split percentages'
                      : ''}
                </p>
              </div>
            ) : splitEligibleRows.length >= 2 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                Multiple funders are active. Set <span className="font-medium text-foreground">Split %</span> and{' '}
                <span className="font-medium text-foreground">Split priority</span> on each funding line to split
                invoice charges.
              </p>
            ) : null}
            {rows.map((row) => (
              <div
                key={row.id}
                className={cn(
                  'rounded-lg border border-border bg-card p-4 shadow-sm',
                  row.isPrimary && 'ring-1 ring-teal-600/40',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{row.fundingType.name}</span>
                      {row.isPrimary ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900">
                          <Star className="h-3 w-3" /> Primary
                        </span>
                      ) : null}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{row.status}</span>
                    </div>
                    {row.funder ? <p className="mt-1 text-sm text-muted-foreground">Funder: {row.funder.name}</p> : null}
                    {row.packageName ? <p className="text-sm text-muted-foreground">Package: {row.packageName}</p> : null}
                    {row.splitPercent ? (
                      <p className="text-sm text-muted-foreground">
                        Split: {row.splitPercent}% · Priority {row.splitPriority ?? 1}
                      </p>
                    ) : null}
                    {row.defaultChargeCard ? (
                      <p className="text-sm text-muted-foreground">Charge card: {row.defaultChargeCard.name}</p>
                    ) : row.funder?.defaultChargeCard ? (
                      <p className="text-sm text-muted-foreground">
                        Charge card (funder): {row.funder.defaultChargeCard.name}
                      </p>
                    ) : null}
                    {row.defaultInvoiceTemplate ? (
                      <p className="text-sm text-muted-foreground">
                        Invoice template: {row.defaultInvoiceTemplate.name}
                      </p>
                    ) : null}
                    {row.billingContactName ? (
                      <p className="text-sm text-muted-foreground">Billing: {row.billingContactName}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {fmtDate(row.startDate)} → {fmtDate(row.endDate)}
                      {row.weeklyBudget != null && row.weeklyBudget !== ''
                        ? ` · Weekly ${fmtMoney(row.weeklyBudget)}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canEdit ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(row)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    ) : null}
                    {canSetPrimary && !row.isPrimary && row.status !== 'ENDED' ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => void onSetPrimary(row)}>
                        <Star className="mr-1 h-3.5 w-3.5" />
                        Set primary
                      </Button>
                    ) : null}
                    {canApprove && row.status !== 'ENDED' && row.status !== 'ACTIVE' && row.status !== 'APPROVED' ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => void onApprove(row)}>
                        <CheckCircle className="mr-1 h-3.5 w-3.5" />
                        Approve
                      </Button>
                    ) : null}
                    {canEdit && row.status !== 'ENDED' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEndTarget(row)
                          setEndDate(new Date().toISOString().slice(0, 10))
                          setEndReason('')
                          setEndOpen(true)
                        }}
                      >
                        <Ban className="mr-1 h-3.5 w-3.5" />
                        End
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(row)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit funding' : 'Add funding'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4 max-h-[70vh] overflow-y-auto">
            <TooltipProvider delayDuration={200}>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Funding details</h4>
            <div>
                <FundingFieldLabel
                  className="mb-1"
                  label="Funding arrangement"
                  tooltip={FUNDING_FIELD_TOOLTIPS.payerMode}
                  required
                />
                <Select
                  value={form.payerMode}
                  onValueChange={(v) => setPayerMode(v as FundingPayerMode)}
                >
                  <SelectTrigger data-testid="funding-payer-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGLE">Single Funder</SelectItem>
                    <SelectItem value="MIXED">Mixed Funding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            <div>
              <FundingFieldLabel
                className="mb-1"
                label="Funding type"
                tooltip={FUNDING_FIELD_TOOLTIPS.fundingTypeId}
                required
              />
              <Select value={form.fundingTypeId} onValueChange={(v) => setForm((f) => ({ ...f, fundingTypeId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isMixedMode ? (
              <div className="space-y-2">
                <FundingFieldLabel
                  className="mb-1"
                  label="Funders"
                  tooltip={FUNDING_FIELD_TOOLTIPS.funderId}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Select each funder and set their invoice split %. Splits must total 100%.
                </p>
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                  {funders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No funders available.</p>
                  ) : (
                    funders.map((funder) => {
                      const share = form.mixedShares.find((s) => s.funderId === funder.id)
                      const checked = Boolean(share)
                      return (
                        <div
                          key={funder.id}
                          className="flex flex-wrap items-center gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                        >
                          <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                setForm((f) => ({
                                  ...f,
                                  mixedShares: toggleMixedFunder(
                                    f.mixedShares,
                                    funder.id,
                                    value === true,
                                  ),
                                }))
                              }
                              aria-label={`Select funder ${funder.name}`}
                            />
                            <span className="truncate">{funder.name}</span>
                          </label>
                          {checked ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                className="h-8 w-20"
                                inputMode="decimal"
                                placeholder="%"
                                value={share?.splitPercent ?? ''}
                                onChange={(e) =>
                                  setForm((f) => ({
                                    ...f,
                                    mixedShares: setMixedSharePercent(
                                      f.mixedShares,
                                      funder.id,
                                      e.target.value,
                                    ),
                                  }))
                                }
                                aria-label={`Split percent for ${funder.name}`}
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                          ) : null}
                        </div>
                      )
                    })
                  )}
                </div>
                {form.mixedShares.length > 0 ? (
                  <p
                    className={cn(
                      'text-xs',
                      Math.abs(mixedSplitTotal - 100) > 0.001 && mixedSplitTotal > 0
                        ? 'text-amber-800 dark:text-amber-200'
                        : null,
                      Math.abs(mixedSplitTotal - 100) <= 0.001
                        ? 'text-teal-800 dark:text-teal-200'
                        : null,
                      mixedSplitTotal > 100 ? 'text-destructive' : null,
                    )}
                  >
                    Selected {form.mixedShares.length} funder
                    {form.mixedShares.length === 1 ? '' : 's'} · Combined split:{' '}
                    {mixedSplitTotal.toFixed(mixedSplitTotal % 1 === 0 ? 0 : 1)}%
                    {Math.abs(mixedSplitTotal - 100) <= 0.001
                      ? ' — fully allocated'
                      : mixedSplitTotal > 100
                        ? ' — exceeds 100%'
                        : ' — must total 100%'}
                  </p>
                ) : null}
              </div>
            ) : (
              <div>
                <FundingFieldLabel className="mb-1" label="Funder" tooltip={FUNDING_FIELD_TOOLTIPS.funderId} />
                <Select value={form.funderId || '__none__'} onValueChange={(v) => setForm((f) => ({ ...f, funderId: v === '__none__' ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {funders.map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {x.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <FundingFieldLabel className="mb-1" label="Status" tooltip={FUNDING_FIELD_TOOLTIPS.status} />
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as EnterpriseFundingStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FundingFieldLabel className="mb-1" label="Start" tooltip={FUNDING_FIELD_TOOLTIPS.startDate} />
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <FundingFieldLabel className="mb-1" label="End" tooltip={FUNDING_FIELD_TOOLTIPS.endDate} />
                <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FundingFieldLabel className="mb-1" label="Funding ref" tooltip={FUNDING_FIELD_TOOLTIPS.fundingReference} />
                <Input value={form.fundingReference} onChange={(e) => setForm((f) => ({ ...f, fundingReference: e.target.value }))} />
              </div>
              <div>
                <FundingFieldLabel className="mb-1" label="Approval ref" tooltip={FUNDING_FIELD_TOOLTIPS.approvalReference} />
                <Input value={form.approvalReference} onChange={(e) => setForm((f) => ({ ...f, approvalReference: e.target.value }))} />
              </div>
            </div>
            <div>
              <FundingFieldLabel className="mb-1" label="Package name" tooltip={FUNDING_FIELD_TOOLTIPS.packageName} />
              <Input value={form.packageName} onChange={(e) => setForm((f) => ({ ...f, packageName: e.target.value }))} />
            </div>
            <div>
              <FundingFieldLabel className="mb-1" label="Weekly budget" tooltip={FUNDING_FIELD_TOOLTIPS.weeklyBudget} />
              <Input inputMode="decimal" value={form.weeklyBudget} onChange={(e) => setForm((f) => ({ ...f, weeklyBudget: e.target.value }))} />
            </div>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-foreground">Billing & invoicing</h4>
              <p className="text-xs text-muted-foreground">
                Purchase orders, charge cards, and billing contacts are used when generating invoice runs.
                {isMixedMode
                  ? ' Invoice splits are set next to each funder above.'
                  : null}
              </p>
              {form.payerMode === 'SINGLE' ? (
                <p className="text-xs text-muted-foreground">
                  Single Funder does not use split percentages. Use Mixed Funding when more than one funder shares
                  the invoice.
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FundingFieldLabel className="mb-1" label="PO number" tooltip={FUNDING_FIELD_TOOLTIPS.purchaseOrderNumber} />
                  <Input
                    value={form.purchaseOrderNumber}
                    onChange={(e) => setForm((f) => ({ ...f, purchaseOrderNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <FundingFieldLabel className="mb-1" label="PO expires" tooltip={FUNDING_FIELD_TOOLTIPS.purchaseOrderExpiresAt} />
                  <Input
                    type="date"
                    value={form.purchaseOrderExpiresAt}
                    onChange={(e) => setForm((f) => ({ ...f, purchaseOrderExpiresAt: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <FundingFieldLabel
                  className="mb-1"
                  label="Authorised weekly hours"
                  tooltip={FUNDING_FIELD_TOOLTIPS.authorisedWeeklyHours}
                />
                <Input
                  inputMode="decimal"
                  placeholder="e.g. 35"
                  value={form.authorisedWeeklyHours}
                  onChange={(e) => setForm((f) => ({ ...f, authorisedWeeklyHours: e.target.value }))}
                />
              </div>
              <div>
                <FundingFieldLabel className="mb-1" label="Charge card" tooltip={FUNDING_FIELD_TOOLTIPS.defaultChargeCardId} />
                <Combobox
                  options={chargeCardOptions}
                  value={form.defaultChargeCardId}
                  onChange={value => setForm(f => ({ ...f, defaultChargeCardId: value }))}
                  placeholder="Select charge card for this contract"
                  allowDeselect
                />
              </div>
              <div>
                <FundingFieldLabel
                  className="mb-1"
                  label="Invoice template"
                  tooltip={FUNDING_FIELD_TOOLTIPS.defaultInvoiceTemplateId}
                />
                <Combobox
                  options={invoiceTemplateOptions}
                  value={form.defaultInvoiceTemplateId}
                  onChange={value => setForm(f => ({ ...f, defaultInvoiceTemplateId: value }))}
                  placeholder="Select export template for this contract"
                  allowDeselect
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FundingFieldLabel
                    className="mb-1"
                    label="Billing contact name"
                    tooltip={FUNDING_FIELD_TOOLTIPS.billingContactName}
                  />
                  <Input
                    value={form.billingContactName}
                    onChange={(e) => setForm((f) => ({ ...f, billingContactName: e.target.value }))}
                  />
                </div>
                <div>
                  <FundingFieldLabel
                    className="mb-1"
                    label="Billing contact email"
                    tooltip={FUNDING_FIELD_TOOLTIPS.billingContactEmail}
                  />
                  <Input
                    type="email"
                    value={form.billingContactEmail}
                    onChange={(e) => setForm((f) => ({ ...f, billingContactEmail: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <FundingFieldLabel
                  className="mb-1"
                  label="Billing contact phone"
                  tooltip={FUNDING_FIELD_TOOLTIPS.billingContactPhone}
                />
                <Input
                  value={form.billingContactPhone}
                  onChange={(e) => setForm((f) => ({ ...f, billingContactPhone: e.target.value }))}
                />
              </div>
              <div>
                <FundingFieldLabel
                  className="mb-1"
                  label="Invoice grouping rule"
                  tooltip={FUNDING_FIELD_TOOLTIPS.invoiceGroupingRule}
                />
                <Input
                  placeholder="e.g. One invoice per service user"
                  value={form.invoiceGroupingRule}
                  onChange={(e) => setForm((f) => ({ ...f, invoiceGroupingRule: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-foreground">Other</h4>
            <div>
              <FundingFieldLabel className="mb-1" label="Review date" tooltip={FUNDING_FIELD_TOOLTIPS.reviewDate} />
              <Input type="date" value={form.reviewDate} onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))} />
            </div>
            <div>
              <FundingFieldLabel className="mb-1" label="Notes" tooltip={FUNDING_FIELD_TOOLTIPS.notes} />
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isPrimary} onCheckedChange={(v) => setForm((f) => ({ ...f, isPrimary: v }))} />
              <FundingFieldLabel
                label={isMixedMode ? 'Mark first funder as primary' : 'Primary funding'}
                tooltip={
                  isMixedMode
                    ? 'When enabled, the first selected funder in the list becomes the primary funding line.'
                    : FUNDING_FIELD_TOOLTIPS.isPrimary
                }
              />
            </div>
            {rows.filter(isPrimaryEligibleFunding).length > 1 ? (
              <p className="text-xs text-muted-foreground">
                If you remove the only primary funding, the next funding by split priority will automatically
                become primary.
              </p>
            ) : null}
            </div>
            </TooltipProvider>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveFunding()}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isMixedMode ? (
                `Save ${Math.max(form.mixedShares.length, 2)} funders`
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={endOpen} onOpenChange={setEndOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End funding</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <p className="mb-1 text-sm font-medium">End date *</p>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Reason</p>
              <Input value={endReason} onChange={(e) => setEndReason(e.target.value)} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEndOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void confirmEnd()}>
              End funding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove funding record?</AlertDialogTitle>
            <AlertDialogDescription>This soft-deletes the funding row. History is retained in the database.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void confirmDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
