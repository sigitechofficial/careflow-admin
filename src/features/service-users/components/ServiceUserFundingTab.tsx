import * as React from 'react'
import { Ban, CheckCircle, Info, Loader2, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import type {
  CreateEnterpriseServiceUserFundingBody,
  EnterpriseFundingStatus,
  EnterpriseFunderRow,
  EnterpriseServiceUserFundingRow,
} from '@/features/service-users/types'
import {
  DEFAULT_PAYMENT_TERMS,
  PAYMENT_TERMS_OPTIONS,
} from '@/features/billing/data/payment-terms.options'
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
  useServiceUserEnterpriseFundings,
} from '@/features/service-users/hooks/useServiceUserTabs'
import { useChargeCards } from '@/features/billing/hooks/useChargeCards'
import type { ChargeCard } from '@/features/billing/types/billing-cards.types'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import { FunderFormDialog } from '@/features/settings/components/FunderFormDialog'
import { ChargeCardPicker } from '@/features/billing/components/ChargeCardPicker'
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
  paymentTerms:
    'QBO-style terms for this funder (Net 30, Due on receipt, …). Invoice due date = invoice date + term days. Saved on the funder, not the charge card.',
  status: 'Lifecycle of this funding line — e.g. pending approval, active, suspended, or ended.',
  startDate: 'Date this funding arrangement becomes effective.',
  endDate: 'Date funding ends. Leave blank if the contract is open-ended.',
  fundingReference: "The funder's own number for this package (package ID, client number). Printed on the invoice as \"Your ref\".",
  approvalReference: "The approval panel's reference from the council or NHS. Shown on the funding line for your records.",
  packageName: 'Care package or contract name shown on invoices and reports.',
  weeklyBudget: 'Maximum weekly amount authorised by the funder for this package (informational). Visit charges come from the charge card.',
  splitPercent:
    'Share of invoice lines allocated to this funder when multiple funders apply. Combined splits must total 100% for Mixed Funding.',
  splitPriority: 'Billing order when multiple funders apply — 1 is invoiced first; highest number receives the remainder.',
  purchaseOrderNumber: "The funder's purchase order. Printed on the invoice; visit checks warn when it is missing or expired.",
  purchaseOrderExpiresAt: 'Date after which the purchase order is no longer valid for billing.',
  authorisedWeeklyHours: 'Maximum care hours per week authorised under this contract.',
  defaultChargeCardId:
    'Rate card used to price visits for this funding line (hourly, fixed, night duty, etc.). Overrides the funder default when set.',
  billingContactName: 'Person or team named on invoices. Required for billing readiness.',
  billingContactEmail: 'Email address for sending invoices to this funder or appointee.',
  billingContactPhone: 'Phone number for billing queries.',
  billingAddress:
    'Postal address printed on / used for invoices for this funding line. Can differ from the funder organisation address.',
  billingAddressLine1: 'First line of the invoice billing address.',
  billingAddressLine2: 'Second line of the invoice billing address (optional).',
  billingTown: 'Town or city for the invoice billing address.',
  billingCounty: 'County or region for the invoice billing address.',
  billingCountry: 'Country for the invoice billing address.',
  billingPostcode: 'Postcode for the invoice billing address.',
  invoiceGroupingRule: 'How invoice lines are grouped — e.g. one invoice per service user or per PO.',
  reviewDate: 'Date when this funding arrangement should be reviewed.',
  notes: 'Internal notes for staff. Not shown on invoices.',
  isPrimary:
    'Primary funding is used first when resolving charge cards and is highlighted on the funding list. At least one active funding must stay primary.',
} as const

type FundingPayerMode = 'SINGLE' | 'MIXED'

type MixedFunderShare = {
  funderId: string
  /** Invoices go to the funder's billing details (Settings → Funders). False = this line has its own. */
  useFunderBilling?: boolean
  /** How this share is funded (a funding route under the funder's type). */
  fundingRouteId?: string
  splitPercent: string
  paymentTerms: string
  billingContactName: string
  billingContactEmail: string
  billingContactPhone: string
  billingAddressLine1: string
  billingAddressLine2: string
  billingTown: string
  billingCounty: string
  billingCountry: string
  billingPostcode: string
}

function emptyMixedBillingFields(): Omit<
  MixedFunderShare,
  'funderId' | 'splitPercent' | 'paymentTerms'
> {
  return {
    billingContactName: '',
    billingContactEmail: '',
    billingContactPhone: '',
    billingAddressLine1: '',
    billingAddressLine2: '',
    billingTown: '',
    billingCounty: '',
    billingCountry: '',
    billingPostcode: '',
  }
}

function billingFieldsFromFundingRow(
  row: EnterpriseServiceUserFundingRow,
): Omit<MixedFunderShare, 'funderId' | 'splitPercent' | 'paymentTerms'> {
  return {
    billingContactName: row.billingContactName ?? '',
    billingContactEmail: row.billingContactEmail ?? '',
    billingContactPhone: row.billingContactPhone ?? '',
    billingAddressLine1: row.billingAddressLine1 ?? '',
    billingAddressLine2: row.billingAddressLine2 ?? '',
    billingTown: row.billingTown ?? '',
    billingCounty: row.billingCounty ?? '',
    billingCountry: row.billingCountry ?? '',
    billingPostcode: row.billingPostcode ?? '',
  }
}

function billingAddressFromFunder(
  funder: EnterpriseFunderRow,
): Pick<
  MixedFunderShare,
  | 'billingAddressLine1'
  | 'billingAddressLine2'
  | 'billingTown'
  | 'billingCounty'
  | 'billingCountry'
  | 'billingPostcode'
> {
  return {
    billingAddressLine1: funder.addressLine1 ?? '',
    billingAddressLine2: funder.addressLine2 ?? '',
    billingTown: funder.town ?? '',
    billingCounty: funder.county ?? '',
    billingCountry: funder.country ?? '',
    billingPostcode: funder.postcode ?? '',
  }
}

function funderHasAddress(funder: EnterpriseFunderRow | undefined): boolean {
  if (!funder) return false
  return Boolean(
    funder.addressLine1?.trim() ||
      funder.addressLine2?.trim() ||
      funder.town?.trim() ||
      funder.county?.trim() ||
      funder.postcode?.trim() ||
      funder.country?.trim(),
  )
}

/** True when a funding line has billing details of its own (not the funder's). */
function rowHasOwnBilling(row: EnterpriseServiceUserFundingRow): boolean {
  return [
    row.billingContactName,
    row.billingContactEmail,
    row.billingContactPhone,
    row.billingAddressLine1,
    row.billingAddressLine2,
    row.billingTown,
    row.billingCounty,
    row.billingCountry,
    row.billingPostcode,
  ].some((v) => Boolean(v?.trim()))
}

/** The funder's billing details, read-only, with where to change them. */
function FunderBillingSummary({ funder }: { funder: EnterpriseFunderRow | undefined }) {
  if (!funder) return null
  const address = [funder.addressLine1, funder.addressLine2, funder.town, funder.county, funder.postcode]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(', ')
  const contact = [funder.contactName, funder.email, funder.phone].map((v) => v?.trim()).filter(Boolean).join(' · ')
  if (!address && !contact) {
    return (
      <p className="text-xs font-medium text-amber-700 dark:text-amber-400" data-testid="funder-billing-missing">
        {funder.name} has no billing contact or address yet. Add them in Settings → Funders.
      </p>
    )
  }
  return (
    <div className="space-y-0.5 text-xs text-muted-foreground" data-testid="funder-billing-summary">
      {contact ? <p>{contact}</p> : null}
      {address ? <p>{address}</p> : null}
      <p>Change these in Settings → Funders.</p>
    </div>
  )
}

/** Payment terms are the funder's (Settings → Funders); shown here for reference. */
function FunderPaymentTerms({ funder }: { funder: EnterpriseFunderRow | undefined }) {
  if (!funder) return null
  return (
    <p className="text-xs text-muted-foreground" data-testid="funder-payment-terms">
      Payment terms: {funder.paymentTerms?.trim() || DEFAULT_PAYMENT_TERMS} (set on the funder in Settings → Funders)
    </p>
  )
}

function chargeCardOptionLabel(card: ChargeCard): string {
  return `${card.name} (${card.code})`
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
  /** How this line is funded, e.g. "LA — spot purchase". Only routes under the funder's type are offered. */
  fundingRouteId: string
  /** Invoices go to the funder's billing details (Settings → Funders). False = this line has its own. */
  useFunderBilling: boolean
  /** Where this line's rates come from (screen choice; only EXISTING / OWN keep a charge card on the line). */
  ratesMode: FundingRatesMode
  /** Payment terms for the selected funder (saved on Funder). */
  paymentTerms: string
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
  billingAddressLine1: string
  billingAddressLine2: string
  billingTown: string
  billingCounty: string
  billingCountry: string
  billingPostcode: string
  invoiceGroupingRule: string
  defaultChargeCardId: string
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
    fundingRouteId: '',
    useFunderBilling: true,
    ratesMode: 'FUNDER',
    paymentTerms: DEFAULT_PAYMENT_TERMS,
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
    billingAddressLine1: '',
    billingAddressLine2: '',
    billingTown: '',
    billingCounty: '',
    billingCountry: '',
    billingPostcode: '',
    invoiceGroupingRule: '',
    defaultChargeCardId: '',
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
    fundingRouteId: row.fundingRouteId ?? '',
    useFunderBilling: !rowHasOwnBilling(row),
    ratesMode: row.defaultChargeCardId ? 'EXISTING' : row.funder?.defaultChargeCardId ? 'FUNDER' : 'LATER',
    paymentTerms: row.funder?.paymentTerms?.trim() || DEFAULT_PAYMENT_TERMS,
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
    billingAddressLine1: row.billingAddressLine1 ?? '',
    billingAddressLine2: row.billingAddressLine2 ?? '',
    billingTown: row.billingTown ?? '',
    billingCounty: row.billingCounty ?? '',
    billingCountry: row.billingCountry ?? '',
    billingPostcode: row.billingPostcode ?? '',
    invoiceGroupingRule: row.invoiceGroupingRule ?? '',
    defaultChargeCardId: row.defaultChargeCardId ?? row.defaultChargeCard?.id ?? '',
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
        fundingRouteId: r.fundingRouteId ?? '',
        useFunderBilling: !rowHasOwnBilling(r),
        splitPercent: r.splitPercent != null ? String(Number(r.splitPercent)) : '',
        paymentTerms: r.funder?.paymentTerms?.trim() || DEFAULT_PAYMENT_TERMS,
        ...billingFieldsFromFundingRow(r),
      })),
      isPrimary: splitRows.some((r) => r.isPrimary),
    },
    groupIds: splitRows.map((r) => r.id),
  }
}

function formToBody(f: FundingForm): CreateEnterpriseServiceUserFundingBody {
  // Using the funder's billing details: the line keeps none of its own, so invoices follow Settings → Funders.
  const own = !f.useFunderBilling
  const b = (v: string) => (own ? v || null : null)
  return {
    fundingTypeId: f.fundingTypeId,
    funderId: f.funderId || null,
    fundingRouteId: f.fundingRouteId || null,
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
    billingContactName: b(f.billingContactName),
    billingContactEmail: b(f.billingContactEmail),
    billingContactPhone: b(f.billingContactPhone),
    billingAddressLine1: b(f.billingAddressLine1),
    billingAddressLine2: b(f.billingAddressLine2),
    billingTown: b(f.billingTown),
    billingCounty: b(f.billingCounty),
    billingCountry: b(f.billingCountry),
    billingPostcode: b(f.billingPostcode),
    defaultChargeCardId:
      f.ratesMode === 'EXISTING' || f.ratesMode === 'OWN' ? f.defaultChargeCardId || null : null,
    isPrimary: f.isPrimary,
    reviewDate: f.reviewDate || null,
    notes: f.notes || null,
  }
}

function fundingTypeIdForFunder(
  funderId: string,
  funders: EnterpriseFunderRow[],
  fallback?: string | null,
): string {
  const fromFunder = funders.find((f) => f.id === funderId)?.fundingType?.id
  return fromFunder || fallback || ''
}

function mixedShareToBody(
  f: FundingForm,
  share: MixedFunderShare,
  splitPriority: number,
  isPrimary: boolean,
  fundingTypeId: string,
): CreateEnterpriseServiceUserFundingBody {
  return {
    ...formToBody({
      ...f,
      payerMode: 'MIXED',
      funderId: share.funderId,
      fundingRouteId: share.fundingRouteId ?? '',
      useFunderBilling: share.useFunderBilling !== false,
      fundingTypeId,
      splitPercent: share.splitPercent,
      splitPriority: String(splitPriority),
      isPrimary,
      billingContactName: share.billingContactName,
      billingContactEmail: share.billingContactEmail,
      billingContactPhone: share.billingContactPhone,
      billingAddressLine1: share.billingAddressLine1,
      billingAddressLine2: share.billingAddressLine2,
      billingTown: share.billingTown,
      billingCounty: share.billingCounty,
      billingCountry: share.billingCountry,
      billingPostcode: share.billingPostcode,
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
  paymentTerms: string = DEFAULT_PAYMENT_TERMS,
  funder?: EnterpriseFunderRow,
): MixedFunderShare[] {
  if (checked) {
    if (shares.some((s) => s.funderId === funderId)) return shares
    return [
      ...shares,
      {
        funderId,
        splitPercent: '',
        paymentTerms: paymentTerms.trim() || DEFAULT_PAYMENT_TERMS,
        ...emptyMixedBillingFields(),
        ...(funder && funderHasAddress(funder) ? billingAddressFromFunder(funder) : {}),
      },
    ]
  }
  return shares.filter((s) => s.funderId !== funderId)
}

function patchMixedShare(
  shares: MixedFunderShare[],
  funderId: string,
  patch: Partial<MixedFunderShare>,
): MixedFunderShare[] {
  return shares.map((s) => (s.funderId === funderId ? { ...s, ...patch } : s))
}

function setMixedSharePercent(
  shares: MixedFunderShare[],
  funderId: string,
  splitPercent: string,
): MixedFunderShare[] {
  return patchMixedShare(shares, funderId, { splitPercent })
}

function setMixedSharePaymentTerms(
  shares: MixedFunderShare[],
  funderId: string,
  paymentTerms: string,
): MixedFunderShare[] {
  return patchMixedShare(shares, funderId, {
    paymentTerms: paymentTerms.trim() || DEFAULT_PAYMENT_TERMS,
  })
}

/** Where a funding line's rates come from. */
type FundingRatesMode = 'FUNDER' | 'EXISTING' | 'OWN' | 'LATER'

/** Dropdown value that opens "Add funder" instead of choosing a funder. */
const ADD_FUNDER_OPTION = '__add_funder__'

type FundingRouteOption = { id: string; name: string; billingFundingTypeId?: string | null }

/** Whether a funding route can go with a funder of this billing type (routes with no type set fit any). */
function routeFits(routes: FundingRouteOption[], routeId: string, billingTypeId: string | null | undefined): boolean {
  if (!routeId) return true
  const r = routes.find((x) => x.id === routeId)
  return !r?.billingFundingTypeId || !billingTypeId || r.billingFundingTypeId === billingTypeId
}

/** Funding route picker, offering only the routes under the funder's billing type. */
function FundingRouteSelect({
  routes,
  billingTypeId,
  value,
  onChange,
  label,
}: {
  routes: FundingRouteOption[]
  billingTypeId: string
  value: string
  onChange: (v: string) => void
  label: string
}) {
  if (!billingTypeId) return null
  const options = routes
    .filter((r) => r.billingFundingTypeId === billingTypeId || r.id === value)
    .sort((a, b) => a.name.localeCompare(b.name))
  return (
    <div className="mt-2 space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Funding route</label>
      <select
        aria-label={label}
        data-testid="funding-route-select"
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— Choose how this is funded —</option>
        {options.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        How this funder pays, e.g. spot purchase or framework. Routes are set up in Settings → Funding routes.
      </p>
    </div>
  )
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
  const fundersQuery = useEnterpriseFunders(canRead)
  const chargeCardsQuery = useChargeCards()
  const createMutation = useCreateServiceUserEnterpriseFunding(serviceUserId)
  const updateMutation = useUpdateServiceUserEnterpriseFunding(serviceUserId)
  const deleteMutation = useDeleteServiceUserEnterpriseFunding(serviceUserId)
  const patchRefsMutation = usePatchServiceUserFundingRefs(serviceUserId)
  const setPrimaryMutation = useSetPrimaryServiceUserEnterpriseFunding(serviceUserId)
  const approveMutation = useApproveServiceUserEnterpriseFunding(serviceUserId)
  const endMutation = useEndServiceUserEnterpriseFunding(serviceUserId)

  const loading = fundingsQuery.isLoading || fundersQuery.isLoading || chargeCardsQuery.isLoading
  const rows = fundingsQuery.data?.rows ?? []
  const funders = fundersQuery.data ?? []
  const chargeCards = chargeCardsQuery.data ?? []
  const [nhsNumber, setNhsNumber] = React.useState(initialNhsNumber ?? '')
  const [socialRef, setSocialRef] = React.useState(initialSocialServicesRef ?? '')

  React.useEffect(() => {
    setNhsNumber(initialNhsNumber ?? '')
    setSocialRef(initialSocialServicesRef ?? '')
  }, [initialNhsNumber, initialSocialServicesRef])

  const [dialogOpen, setDialogOpen] = React.useState(false)
  /** Adding a funder that is not in the list yet, without leaving the funding form. */
  const [addFunderOpen, setAddFunderOpen] = React.useState(false)
  const canCreateFunder = can('funders.create')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  /** Funding row ids belonging to the arrangement being edited (1 for Single, N for Mixed). */
  const [editingGroupIds, setEditingGroupIds] = React.useState<string[]>([])
  const [form, setForm] = React.useState<FundingForm>(() => emptyForm())
  const lookupsQuery = useServiceUserLookups()
  const fundingRoutes = lookupsQuery.data?.fundingTypes ?? []
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

  const selectedFunder = React.useMemo(
    () => (form.funderId ? funders.find((f) => f.id === form.funderId) : undefined),
    [form.funderId, funders],
  )
  const selectedFunderHasAddress = Boolean(
    selectedFunder?.addressLine1?.trim() ||
      selectedFunder?.addressLine2?.trim() ||
      selectedFunder?.town?.trim() ||
      selectedFunder?.county?.trim() ||
      selectedFunder?.postcode?.trim() ||
      selectedFunder?.country?.trim(),
  )
  const applyFunderBillingAddress = () => {
    if (!selectedFunder) return
    setForm((f) => ({
      ...f,
      billingAddressLine1: selectedFunder.addressLine1 ?? '',
      billingAddressLine2: selectedFunder.addressLine2 ?? '',
      billingTown: selectedFunder.town ?? '',
      billingCounty: selectedFunder.county ?? '',
      billingCountry: selectedFunder.country ?? '',
      billingPostcode: selectedFunder.postcode ?? '',
    }))
  }

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
              ? [
                  {
                    funderId: f.funderId,
                    fundingRouteId: f.fundingRouteId,
                    useFunderBilling: f.useFunderBilling,
                    splitPercent: '',
                    paymentTerms: f.paymentTerms || DEFAULT_PAYMENT_TERMS,
                    billingContactName: f.billingContactName,
                    billingContactEmail: f.billingContactEmail,
                    billingContactPhone: f.billingContactPhone,
                    billingAddressLine1: f.billingAddressLine1,
                    billingAddressLine2: f.billingAddressLine2,
                    billingTown: f.billingTown,
                    billingCounty: f.billingCounty,
                    billingCountry: f.billingCountry,
                    billingPostcode: f.billingPostcode,
                  },
                ]
              : f.mixedShares.length
                ? f.mixedShares
                : [],
        }
      }
      const firstShare = f.mixedShares[0]
      return {
        ...f,
        payerMode: 'SINGLE',
        mixedShares: [],
        funderId: firstShare?.funderId ?? f.funderId,
        fundingRouteId: firstShare?.fundingRouteId ?? f.fundingRouteId,
        useFunderBilling: firstShare ? firstShare.useFunderBilling !== false : f.useFunderBilling,
        paymentTerms:
          firstShare?.paymentTerms || f.paymentTerms || DEFAULT_PAYMENT_TERMS,
        billingContactName: firstShare?.billingContactName ?? f.billingContactName,
        billingContactEmail: firstShare?.billingContactEmail ?? f.billingContactEmail,
        billingContactPhone: firstShare?.billingContactPhone ?? f.billingContactPhone,
        billingAddressLine1: firstShare?.billingAddressLine1 ?? f.billingAddressLine1,
        billingAddressLine2: firstShare?.billingAddressLine2 ?? f.billingAddressLine2,
        billingTown: firstShare?.billingTown ?? f.billingTown,
        billingCounty: firstShare?.billingCounty ?? f.billingCounty,
        billingCountry: firstShare?.billingCountry ?? f.billingCountry,
        billingPostcode: firstShare?.billingPostcode ?? f.billingPostcode,
        splitPercent: '',
        splitPriority: '1',
      }
    })
  }

  const saveFunding = async () => {
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
        if (!fundingTypeIdForFunder(share.funderId, funders)) {
          const name = funders.find((f) => f.id === share.funderId)?.name ?? 'Selected funder'
          toastApiError(
            new Error(`${name} has no funding type configured — update the funder record first`),
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
                fundingTypeIdForFunder(share.funderId, funders),
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
              fundingTypeIdForFunder(
                share.funderId,
                funders,
                existing?.fundingTypeId,
              ),
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
                    fundingRouteId: leftover.fundingRouteId ?? '',
                    fundingTypeId: leftover.fundingTypeId,
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
        void fundersQuery.refetch()
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

    if (!form.funderId) {
      toastApiError(new Error('Funder is required'), 'Validation')
      return
    }
    const resolvedFundingTypeId = fundingTypeIdForFunder(
      form.funderId,
      funders,
      form.fundingTypeId,
    )
    if (!resolvedFundingTypeId) {
      toastApiError(
        new Error('This funder has no funding type configured — update the funder record first'),
        'Validation',
      )
      return
    }

    try {
      const body = formToBody({
        ...form,
        fundingTypeId: resolvedFundingTypeId,
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
      void fundersQuery.refetch()
    } catch (e) {
      toastApiError(e, 'Save failed')
    }
  }

  const onFunderAdded = (funder: EnterpriseFunderRow) => {
    void fundersQuery.refetch()
    const typeId = funder.fundingType?.id ?? funder.fundingTypeId ?? ''
    setForm((f) =>
      f.payerMode === 'MIXED'
        ? { ...f, mixedShares: toggleMixedFunder(f.mixedShares, funder.id, true, DEFAULT_PAYMENT_TERMS, funder) }
        : { ...f, funderId: funder.id, fundingTypeId: typeId, fundingRouteId: '' },
    )
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
          <div
            className="mt-4 rounded-md border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/30"
            data-testid="funding-none-set-up"
          >
            <p className="font-medium text-amber-900 dark:text-amber-200">No funding set up yet</p>
            <p className="mt-1 text-amber-900/80 dark:text-amber-200/80">
              Nobody can be invoiced for this person&apos;s care until you add who pays, and their visits are
              flagged in billing until then. Use Add funding once you know who pays. If the person or their
              family pays, choose &quot;Private / Self-Funded&quot; or &quot;Family Funded&quot; as the funder.
            </p>
          </div>
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
                      {row.fundingRoute ? (
                        <span className="text-sm text-muted-foreground" data-testid="funding-line-route">
                          · {row.fundingRoute.name}
                        </span>
                      ) : null}
                      {row.isPrimary ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900">
                          <Star className="h-3 w-3" /> Primary
                        </span>
                      ) : null}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{row.status}</span>
                    </div>
                    {row.funder ? <p className="mt-1 text-sm text-muted-foreground">Funder: {row.funder.name}</p> : null}
                    {row.packageName ? <p className="text-sm text-muted-foreground">Package: {row.packageName}</p> : null}
                    {row.fundingReference || row.approvalReference || row.purchaseOrderNumber ? (
                      <p className="text-sm text-muted-foreground" data-testid="funding-line-refs">
                        {[
                          row.fundingReference ? `Funding ref ${row.fundingReference}` : null,
                          row.approvalReference ? `Approval ref ${row.approvalReference}` : null,
                          row.purchaseOrderNumber ? `PO ${row.purchaseOrderNumber}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    ) : null}
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
                    {row.funder?.paymentTerms ? (
                      <p className="text-sm text-muted-foreground">
                        Payment terms: {row.funder.paymentTerms}
                      </p>
                    ) : null}
                    {row.billingContactName ? (
                      <p className="text-sm text-muted-foreground">Billing: {row.billingContactName}</p>
                    ) : null}
                    {row.billingAddressLine1 || row.billingPostcode ? (
                      <p className="text-sm text-muted-foreground">
                        Invoice address:{' '}
                        {[
                          row.billingAddressLine1,
                          row.billingAddressLine2,
                          row.billingTown,
                          row.billingCounty,
                          row.billingPostcode,
                          row.billingCountry,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
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
            {isMixedMode ? (
              <div className="space-y-2">
                <FundingFieldLabel
                  className="mb-1"
                  label="Funders"
                  tooltip={FUNDING_FIELD_TOOLTIPS.funderId}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Select each funder and set their invoice split % and funding route. Splits must total 100%.
                </p>

                <div className="max-h-[28rem] space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                  {funders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No funders available.</p>
                  ) : (
                    funders.map((funder) => {
                      const share = form.mixedShares.find((s) => s.funderId === funder.id)
                      const checked = Boolean(share)
                      return (
                        <div
                          key={funder.id}
                          className="space-y-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                        >
                          <div className="flex flex-wrap items-center gap-3">
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
                                      funder.paymentTerms?.trim() || DEFAULT_PAYMENT_TERMS,
                                      funder,
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
                          {checked && share ? (
                            <div className="space-y-3 pl-7">
                              <FundingRouteSelect
                                routes={fundingRoutes}
                                billingTypeId={funder.fundingType?.id ?? ''}
                                value={share.fundingRouteId ?? ''}
                                onChange={(v) =>
                                  setForm((f) => ({
                                    ...f,
                                    mixedShares: patchMixedShare(f.mixedShares, funder.id, { fundingRouteId: v }),
                                  }))
                                }
                                label={`Funding route for ${funder.name}`}
                              />
                              <FunderPaymentTerms funder={funder} />
                              <div className="space-y-2 rounded-md border border-border/70 bg-muted/20 p-3">
                                <p className="text-xs font-medium text-foreground">
                                  Billing details for {funder.name}
                                </p>
                                <label className="flex items-center gap-2 text-xs">
                                  <Checkbox
                                    checked={share.useFunderBilling !== false}
                                    onCheckedChange={(value) =>
                                      setForm((f) => ({
                                        ...f,
                                        mixedShares: patchMixedShare(f.mixedShares, funder.id, {
                                          useFunderBilling: value === true,
                                        }),
                                      }))
                                    }
                                    aria-label={`Send invoices to ${funder.name}'s billing details`}
                                  />
                                  Send invoices to the funder&apos;s billing details
                                </label>
                                {share.useFunderBilling !== false ? (
                                  <FunderBillingSummary funder={funder} />
                                ) : (
                                <>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div>
                                    <FundingFieldLabel
                                      className="mb-1"
                                      label="Billing contact name"
                                      tooltip={FUNDING_FIELD_TOOLTIPS.billingContactName}
                                    />
                                    <Input
                                      className="h-8"
                                      value={share.billingContactName}
                                      onChange={(e) =>
                                        setForm((f) => ({
                                          ...f,
                                          mixedShares: patchMixedShare(
                                            f.mixedShares,
                                            funder.id,
                                            { billingContactName: e.target.value },
                                          ),
                                        }))
                                      }
                                    />
                                  </div>
                                  <div>
                                    <FundingFieldLabel
                                      className="mb-1"
                                      label="Billing contact email"
                                      tooltip={FUNDING_FIELD_TOOLTIPS.billingContactEmail}
                                    />
                                    <Input
                                      className="h-8"
                                      type="email"
                                      value={share.billingContactEmail}
                                      onChange={(e) =>
                                        setForm((f) => ({
                                          ...f,
                                          mixedShares: patchMixedShare(
                                            f.mixedShares,
                                            funder.id,
                                            { billingContactEmail: e.target.value },
                                          ),
                                        }))
                                      }
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
                                    className="h-8"
                                    value={share.billingContactPhone}
                                    onChange={(e) =>
                                      setForm((f) => ({
                                        ...f,
                                        mixedShares: patchMixedShare(
                                          f.mixedShares,
                                          funder.id,
                                          { billingContactPhone: e.target.value },
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                  <FundingFieldLabel
                                    label="Billing address"
                                    tooltip={FUNDING_FIELD_TOOLTIPS.billingAddress}
                                  />
                                  {funderHasAddress(funder) ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7"
                                      onClick={() =>
                                        setForm((f) => ({
                                          ...f,
                                          mixedShares: patchMixedShare(
                                            f.mixedShares,
                                            funder.id,
                                            billingAddressFromFunder(funder),
                                          ),
                                        }))
                                      }
                                    >
                                      Use funder address
                                    </Button>
                                  ) : null}
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="sm:col-span-2">
                                    <FundingFieldLabel
                                      className="mb-1"
                                      label="Address line 1"
                                      tooltip={FUNDING_FIELD_TOOLTIPS.billingAddressLine1}
                                    />
                                    <Input
                                      className="h-8"
                                      value={share.billingAddressLine1}
                                      onChange={(e) =>
                                        setForm((f) => ({
                                          ...f,
                                          mixedShares: patchMixedShare(
                                            f.mixedShares,
                                            funder.id,
                                            { billingAddressLine1: e.target.value },
                                          ),
                                        }))
                                      }
                                      placeholder="Building / street"
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <FundingFieldLabel
                                      className="mb-1"
                                      label="Address line 2"
                                      tooltip={FUNDING_FIELD_TOOLTIPS.billingAddressLine2}
                                    />
                                    <Input
                                      className="h-8"
                                      value={share.billingAddressLine2}
                                      onChange={(e) =>
                                        setForm((f) => ({
                                          ...f,
                                          mixedShares: patchMixedShare(
                                            f.mixedShares,
                                            funder.id,
                                            { billingAddressLine2: e.target.value },
                                          ),
                                        }))
                                      }
                                    />
                                  </div>
                                  <div>
                                    <FundingFieldLabel
                                      className="mb-1"
                                      label="Town / city"
                                      tooltip={FUNDING_FIELD_TOOLTIPS.billingTown}
                                    />
                                    <Input
                                      className="h-8"
                                      value={share.billingTown}
                                      onChange={(e) =>
                                        setForm((f) => ({
                                          ...f,
                                          mixedShares: patchMixedShare(
                                            f.mixedShares,
                                            funder.id,
                                            { billingTown: e.target.value },
                                          ),
                                        }))
                                      }
                                    />
                                  </div>
                                  <div>
                                    <FundingFieldLabel
                                      className="mb-1"
                                      label="County"
                                      tooltip={FUNDING_FIELD_TOOLTIPS.billingCounty}
                                    />
                                    <Input
                                      className="h-8"
                                      value={share.billingCounty}
                                      onChange={(e) =>
                                        setForm((f) => ({
                                          ...f,
                                          mixedShares: patchMixedShare(
                                            f.mixedShares,
                                            funder.id,
                                            { billingCounty: e.target.value },
                                          ),
                                        }))
                                      }
                                    />
                                  </div>
                                  <div>
                                    <FundingFieldLabel
                                      className="mb-1"
                                      label="Postcode"
                                      tooltip={FUNDING_FIELD_TOOLTIPS.billingPostcode}
                                    />
                                    <Input
                                      className="h-8"
                                      value={share.billingPostcode}
                                      onChange={(e) =>
                                        setForm((f) => ({
                                          ...f,
                                          mixedShares: patchMixedShare(
                                            f.mixedShares,
                                            funder.id,
                                            { billingPostcode: e.target.value },
                                          ),
                                        }))
                                      }
                                    />
                                  </div>
                                  <div>
                                    <FundingFieldLabel
                                      className="mb-1"
                                      label="Country"
                                      tooltip={FUNDING_FIELD_TOOLTIPS.billingCountry}
                                    />
                                    <Input
                                      className="h-8"
                                      value={share.billingCountry}
                                      onChange={(e) =>
                                        setForm((f) => ({
                                          ...f,
                                          mixedShares: patchMixedShare(
                                            f.mixedShares,
                                            funder.id,
                                            { billingCountry: e.target.value },
                                          ),
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                                </>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )
                    })
                  )}
                  {canCreateFunder ? (
                    <button
                      type="button"
                      className="w-full border-t border-border pt-2 text-left text-sm font-medium text-primary hover:underline"
                      onClick={() => setAddFunderOpen(true)}
                    >
                      + Add a funder that isn&apos;t listed
                    </button>
                  ) : null}
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
              <div className="space-y-3">
                <div>
                  <FundingFieldLabel
                    className="mb-1"
                    label="Funder"
                    tooltip={FUNDING_FIELD_TOOLTIPS.funderId}
                    required
                  />
                  <Select
                    value={form.funderId}
                    onValueChange={(v) => {
                      if (v === ADD_FUNDER_OPTION) {
                        setAddFunderOpen(true)
                        return
                      }
                      const funder = funders.find((x) => x.id === v)
                      setForm((f) => ({
                        ...f,
                        funderId: v,
                        fundingRouteId: routeFits(fundingRoutes, f.fundingRouteId, funder?.fundingType?.id)
                          ? f.fundingRouteId
                          : '',
                        fundingTypeId: funder?.fundingType?.id ?? '',
                        ratesMode:
                          f.ratesMode === 'EXISTING' || f.ratesMode === 'OWN'
                            ? f.ratesMode
                            : funder?.defaultChargeCardId
                              ? 'FUNDER'
                              : 'LATER',
                        paymentTerms:
                          funder?.paymentTerms?.trim() || DEFAULT_PAYMENT_TERMS,
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select funder" />
                    </SelectTrigger>
                    <SelectContent>
                      {funders.map((x) => (
                        <SelectItem key={x.id} value={x.id}>
                          {x.name}
                        </SelectItem>
                      ))}
                      {canCreateFunder ? (
                        <SelectItem
                          value={ADD_FUNDER_OPTION}
                          className="mt-1 border-t border-border font-medium text-primary"
                          data-testid="funding-add-funder"
                        >
                          + Add a funder that isn&apos;t listed
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                  <FundingRouteSelect
                    routes={fundingRoutes}
                    billingTypeId={form.fundingTypeId}
                    value={form.fundingRouteId}
                    onChange={(v) => setForm((f) => ({ ...f, fundingRouteId: v }))}
                    label="Funding route"
                  />
                </div>
                <FunderPaymentTerms funder={funders.find((x) => x.id === form.funderId)} />
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
                Purchase orders and charge cards are used when generating invoice runs.
                {isMixedMode
                  ? ' Invoice splits and billing contacts/addresses are set per funder above.'
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
              <div className="space-y-2" data-testid="funding-rates-mode">
                <FundingFieldLabel className="mb-1" label="Rates" tooltip={FUNDING_FIELD_TOOLTIPS.defaultChargeCardId} />
                {(() => {
                  const funder = !isMixedMode ? funders.find((x) => x.id === form.funderId) : undefined
                  const standard = funder?.defaultChargeCard?.name ?? null
                  const options: Array<{ mode: FundingRatesMode; label: string; hint: string }> = [
                    ...(isMixedMode || funder?.defaultChargeCardId
                      ? [
                          {
                            mode: 'FUNDER' as const,
                            label: isMixedMode ? "Use each funder's standard rates" : `Use ${funder?.name}'s standard rates`,
                            hint: isMixedMode
                              ? 'Each funder is billed at its own standard charge card (Settings → Funders).'
                              : `${standard ?? 'Their standard charge card'}. Rate changes there apply to everyone they fund.`,
                          },
                        ]
                      : []),
                    { mode: 'EXISTING', label: 'Use another existing charge card', hint: 'Pick a card that is already set up.' },
                    {
                      mode: 'OWN',
                      label: 'Set rates just for this person',
                      hint: 'Create a charge card for this person (opens in a new tab), then pick it here.',
                    },
                    {
                      mode: 'LATER',
                      label: 'Add rates later',
                      hint: 'Visits are flagged in billing until rates are added.',
                    },
                  ]
                  return (
                    <>
                      {options.map((o) => (
                        <label key={o.mode} className="flex cursor-pointer items-start gap-2 text-sm">
                          <input
                            type="radio"
                            name="funding-rates-mode"
                            className="mt-1"
                            checked={form.ratesMode === o.mode}
                            onChange={() =>
                              setForm((f) => ({
                                ...f,
                                ratesMode: o.mode,
                                defaultChargeCardId: o.mode === 'EXISTING' || o.mode === 'OWN' ? f.defaultChargeCardId : '',
                              }))
                            }
                          />
                          <span>
                            <span className="font-medium">{o.label}</span>
                            <span className="block text-xs text-muted-foreground">{o.hint}</span>
                          </span>
                        </label>
                      ))}
                      {!isMixedMode && funder && !funder.defaultChargeCardId ? (
                        <p className="text-xs text-muted-foreground">
                          {funder.name} has no standard rates yet. You can set them in Settings → Funders.
                        </p>
                      ) : null}
                      {form.ratesMode === 'EXISTING' || form.ratesMode === 'OWN' ? (
                        <ChargeCardPicker
                          value={form.defaultChargeCardId}
                          onChange={(id) => setForm((f) => ({ ...f, defaultChargeCardId: id }))}
                          testId="funding-charge-card"
                        />
                      ) : null}
                    </>
                  )
                })()}
              </div>
              {!isMixedMode && form.funderId ? (
                <>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.useFunderBilling}
                  onCheckedChange={(value) => setForm((f) => ({ ...f, useFunderBilling: value === true }))}
                  aria-label="Send invoices to the funder's billing details"
                />
                Send invoices to the funder&apos;s billing details
              </label>
              <p className="text-xs text-muted-foreground">
                Untick only when someone else receives the invoice, for example a family member or an appointee.
              </p>
              {form.useFunderBilling ? (
                <FunderBillingSummary funder={funders.find((x) => x.id === form.funderId)} />
              ) : (
              <>
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
              <div className="space-y-3 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <FundingFieldLabel
                      label="Billing address"
                      tooltip={FUNDING_FIELD_TOOLTIPS.billingAddress}
                    />
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Postal address where invoices for this funder should be sent.
                    </p>
                  </div>
                  {selectedFunderHasAddress ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={applyFunderBillingAddress}
                    >
                      Use funder address
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FundingFieldLabel
                      className="mb-1"
                      label="Address line 1"
                      tooltip={FUNDING_FIELD_TOOLTIPS.billingAddressLine1}
                    />
                    <Input
                      value={form.billingAddressLine1}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, billingAddressLine1: e.target.value }))
                      }
                      placeholder="Building / street"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FundingFieldLabel
                      className="mb-1"
                      label="Address line 2"
                      tooltip={FUNDING_FIELD_TOOLTIPS.billingAddressLine2}
                    />
                    <Input
                      value={form.billingAddressLine2}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, billingAddressLine2: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <FundingFieldLabel
                      className="mb-1"
                      label="Town / city"
                      tooltip={FUNDING_FIELD_TOOLTIPS.billingTown}
                    />
                    <Input
                      value={form.billingTown}
                      onChange={(e) => setForm((f) => ({ ...f, billingTown: e.target.value }))}
                    />
                  </div>
                  <div>
                    <FundingFieldLabel
                      className="mb-1"
                      label="County"
                      tooltip={FUNDING_FIELD_TOOLTIPS.billingCounty}
                    />
                    <Input
                      value={form.billingCounty}
                      onChange={(e) => setForm((f) => ({ ...f, billingCounty: e.target.value }))}
                    />
                  </div>
                  <div>
                    <FundingFieldLabel
                      className="mb-1"
                      label="Postcode"
                      tooltip={FUNDING_FIELD_TOOLTIPS.billingPostcode}
                    />
                    <Input
                      value={form.billingPostcode}
                      onChange={(e) => setForm((f) => ({ ...f, billingPostcode: e.target.value }))}
                    />
                  </div>
                  <div>
                    <FundingFieldLabel
                      className="mb-1"
                      label="Country"
                      tooltip={FUNDING_FIELD_TOOLTIPS.billingCountry}
                    />
                    <Input
                      value={form.billingCountry}
                      onChange={(e) => setForm((f) => ({ ...f, billingCountry: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              </>
              )}
                </>
              ) : null}
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

      <FunderFormDialog open={addFunderOpen} onOpenChange={setAddFunderOpen} onSaved={onFunderAdded} />
    </div>
  )
}
