import * as React from 'react'
import {
  Calendar,
  CalendarRange,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  Eye,
  FilePenLine,
  Loader2,
  Mail,
  Phone,
  StickyNote,
  Wallet,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import { downloadInvoiceRunExport } from '@/features/billing/api/invoice-runs.api'
import { useServiceUserInvoices } from '@/features/billing/hooks/useInvoiceRuns'
import { useResolveServiceUserInvoiceTemplate } from '@/features/billing/hooks/useInvoiceTemplates'
import {
  BillingStatusBadge,
  InvoiceRunStatusBadge,
} from '@/features/billing/components/BillingStatusBadge'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { useUpdateServiceUser } from '@/features/service-users/hooks/useServiceUserMutations'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { ContentCard } from '@/shared/ui/content-section'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

type InvoiceCadence = 'WEEKLY' | 'MONTHLY'

type InvoiceRunRow = NonNullable<
  ReturnType<typeof useServiceUserInvoices>['data']
>['runs'][number]

type InvoicesSubTab = 'transactions' | 'schedule'

type TxnTypeFilter = 'all' | 'invoice' | 'payment'
type TxnStatusFilter = 'all' | 'PAID' | 'PART_PAID' | 'UNPAID' | 'OVERDUE' | 'DRAFT'
type TxnDateFilter = 'all' | '30' | '90' | '365'

type DisplayPaymentStatus = 'UNPAID' | 'PART_PAID' | 'PAID' | 'DRAFT' | 'OVERDUE'

const OPEN_RECEIVABLE_STATUSES = new Set(['SENT', 'PART_PAID', 'PAID'])

/** Prefer API outstanding; fall back to subtotal − paid when value is missing. */
function runOutstandingValue(run: {
  outstandingValue?: number
  subtotalValue?: number
  paidValue?: number
}): number {
  if (typeof run.outstandingValue === 'number' && Number.isFinite(run.outstandingValue)) {
    return run.outstandingValue
  }
  const sub = run.subtotalValue ?? 0
  const paid = run.paidValue ?? 0
  return Math.max(0, Math.round((sub - paid) * 100) / 100)
}

function isPastDue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false
  const due = new Date(dueDate.includes('T') ? dueDate : `${dueDate}T23:59:59.999Z`)
  if (Number.isNaN(due.getTime())) return false
  return due.getTime() < Date.now()
}

/** Map run + payment amounts to the status users expect in the transactions table. */
function resolveInvoiceDisplayStatus(run: InvoiceRunRow): DisplayPaymentStatus {
  const paid = run.paidValue ?? 0
  const outstanding = runOutstandingValue(run)

  if (run.status === 'PAID' || (paid > 0.001 && outstanding <= 0.001)) return 'PAID'
  if (run.status === 'PART_PAID' || (paid > 0.001 && outstanding > 0.001)) return 'PART_PAID'

  const isOpen =
    run.sent ||
    Boolean(run.sentAt) ||
    OPEN_RECEIVABLE_STATUSES.has(run.status)

  if (!isOpen) return 'DRAFT'

  if (isPastDue(run.dueDate)) return 'OVERDUE'
  return 'UNPAID'
}

type TransactionRow = {
  id: string
  sortDate: string
  dateLabel: string
  dueDateLabel: string
  type: 'Invoice' | 'Payment'
  number: string
  customer: string
  memo: string
  amount: string
  amountValue: number
  paymentStatus: DisplayPaymentStatus
  run: InvoiceRunRow
}

function PaymentBadge({ status }: { status: 'UNPAID' | 'PART_PAID' | 'PAID' | 'OVERDUE' }) {
  return <BillingStatusBadge status={status} />
}

function TransactionStatusBadge({ status }: { status: DisplayPaymentStatus }) {
  if (status === 'PAID') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
        <Check className="h-3 w-3 shrink-0" strokeWidth={3} aria-hidden />
        Paid
      </span>
    )
  }
  if (status === 'PART_PAID') {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
        Partial paid
      </span>
    )
  }
  if (status === 'OVERDUE') {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/50 dark:text-red-200">
        Overdue
      </span>
    )
  }
  if (status === 'DRAFT') {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
        Not sent
      </span>
    )
  }
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Unpaid
    </span>
  )
}

function formatDisplayDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.includes('T') ? iso : `${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Placeholder avatar when the service user has no profile photo. */
const DUMMY_PROFILE_AVATAR = '/about_me_svgs/avatar-man-serious.svg'

function formatAddress(profile: {
  address?: {
    addressLine1?: string | null
    addressLine2?: string | null
    town?: string | null
    county?: string | null
    postcode?: string | null
  } | null
} | null | undefined): string {
  const a = profile?.address
  if (!a) return 'No address on file'
  return (
    [a.addressLine1, a.addressLine2, a.town, a.county, a.postcode].filter(Boolean).join(', ') ||
    'No address on file'
  )
}

function buildTransactions(
  runs: InvoiceRunRow[],
  customerName: string,
): TransactionRow[] {
  const rows: TransactionRow[] = []
  for (const run of runs) {
    const invoiceNo = run.invoiceNumber?.trim() || run.period
    const sortDate = run.sentAt ?? run.lockedAt ?? run.periodEnd
    const dueDateLabel = formatDisplayDate(run.dueDate ?? null)
    const displayStatus = resolveInvoiceDisplayStatus(run)
    rows.push({
      id: `invoice-${run.id}`,
      sortDate,
      dateLabel: formatDisplayDate(sortDate),
      dueDateLabel,
      type: 'Invoice',
      number: invoiceNo,
      customer: customerName,
      memo: run.period,
      amount: run.subtotal,
      amountValue: run.subtotalValue,
      paymentStatus: displayStatus,
      run,
    })
    if ((displayStatus === 'PAID' || displayStatus === 'PART_PAID') && run.paidValue > 0.001) {
      rows.push({
        id: `payment-${run.id}`,
        sortDate,
        dateLabel: formatDisplayDate(sortDate),
        dueDateLabel: '—',
        type: 'Payment',
        number: run.invoiceNumber?.trim() ? `PAY-${run.invoiceNumber}` : '—',
        customer: customerName,
        memo: `Payment for ${invoiceNo}`,
        amount: run.paid,
        amountValue: run.paidValue,
        paymentStatus: displayStatus === 'PAID' ? 'PAID' : 'PART_PAID',
        run,
      })
    }
  }
  return rows.sort((a, b) => b.sortDate.localeCompare(a.sortDate) || a.id.localeCompare(b.id))
}

function InvoiceDetailDialog({
  run,
  serviceUserName,
  onOpenChange,
}: {
  run: InvoiceRunRow | null
  serviceUserName: string
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={run !== null} onOpenChange={onOpenChange}>
      <DialogContent size="full" className="max-w-[min(98vw,88rem)]">
        <DialogHeader>
          <DialogTitle>{run ? `Invoice — ${run.period}` : 'Invoice'}</DialogTitle>
        </DialogHeader>
        {run ? (
          <DialogBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">{serviceUserName}</span>
              <InvoiceRunStatusBadge status={run.status} />
              <TransactionStatusBadge status={resolveInvoiceDisplayStatus(run)} />
              <span className="text-muted-foreground">
                {run.periodStart} → {run.periodEnd}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">This client</p>
                <p className="text-lg font-semibold tabular-nums">{run.subtotal}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Invoice total</p>
                <p className="text-lg font-semibold tabular-nums">{run.runNetTotal}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Paid</p>
                <p className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {run.paid}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Outstanding</p>
                <p className="text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                  {run.outstanding}
                </p>
              </div>
            </div>

            {run.funderSummaries.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Paid by funder
                </p>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                        <th className="px-3 py-2 text-left font-medium">Funder</th>
                        <th className="px-3 py-2 text-right font-medium">Invoiced</th>
                        <th className="px-3 py-2 text-right font-medium">Paid</th>
                        <th className="px-3 py-2 text-right font-medium">Remaining</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {run.funderSummaries.map((f) => (
                        <tr
                          key={f.funderId ?? f.funderName}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="px-3 py-2 font-medium text-foreground">{f.funderName}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{f.subtotal}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                            {f.paid}
                          </td>
                          <td
                            className={
                              f.outstandingValue > 0.001
                                ? 'px-3 py-2 text-right tabular-nums font-medium text-amber-600 dark:text-amber-400'
                                : 'px-3 py-2 text-right tabular-nums text-muted-foreground'
                            }
                          >
                            {f.outstanding}
                          </td>
                          <td className="px-3 py-2">
                            {run.sent ? (
                              <PaymentBadge status={f.paymentStatus} />
                            ) : (
                              <span className="text-muted-foreground">Not sent</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Visits</p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[1480px] text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">Visit reference</th>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Slot</th>
                      <th className="px-3 py-2 text-left font-medium">Carer</th>
                      <th className="px-3 py-2 text-left font-medium">Planned start</th>
                      <th className="px-3 py-2 text-left font-medium">Planned end</th>
                      <th className="px-3 py-2 text-left font-medium">Actual start</th>
                      <th className="px-3 py-2 text-left font-medium">Actual end</th>
                      <th className="px-3 py-2 text-left font-medium">Planned duration</th>
                      <th className="px-3 py-2 text-left font-medium">Actual duration</th>
                      <th className="px-3 py-2 text-left font-medium">Duration variance</th>
                      <th className="px-3 py-2 text-left font-medium">Address</th>
                      <th className="px-3 py-2 text-left font-medium">Funder</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.lines.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="px-3 py-4 text-center text-muted-foreground">
                          No invoice lines for this client on this run.
                        </td>
                      </tr>
                    ) : (
                      run.lines.map((line) => (
                        <tr key={line.id} className="border-b border-border/60 last:border-0 align-top">
                          <td className="whitespace-nowrap px-3 py-2 font-medium">
                            {line.visitRef ?? '—'}
                            {line.exceptionMessage ? (
                              <p className="mt-0.5 max-w-[12rem] text-[10px] font-normal text-amber-600 dark:text-amber-400">
                                {line.exceptionMessage}
                              </p>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">{line.date ?? '—'}</td>
                          <td className="px-3 py-2">{line.slot ?? '—'}</td>
                          <td className="px-3 py-2">{line.carerName ?? '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                            {line.plannedStart ?? '—'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                            {line.plannedEnd ?? '—'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                            {line.actualStart ?? '—'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                            {line.actualEnd ?? '—'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">{line.plannedDuration ?? '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2">{line.actualDuration ?? '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2">{line.durationVariance ?? '—'}</td>
                          <td className="max-w-[14rem] px-3 py-2" title={line.address ?? undefined}>
                            <span className="line-clamp-2">{line.address ?? '—'}</span>
                          </td>
                          <td className="px-3 py-2">{line.funderName}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums">
                            {line.amount}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </DialogBody>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function ServiceUserEditInvoicesPanel({ serviceUserId }: { serviceUserId: string }) {
  const canRead = useAuthStore(
    (s) =>
      s.can('service_users.read') ||
      s.can('service_users.update') ||
      s.can('billing.invoice_runs.read' as never),
  )
  const canUpdateProfile = useAuthStore((s) => s.can('service_users.update'))
  const canManage = useAuthStore((s) => s.can('billing.invoice_runs.manage' as never))
  const canOpenBilling = useAuthStore((s) => s.can('billing.invoice_runs.read' as never))

  const profileQuery = useServiceUser(serviceUserId)
  const updateMutation = useUpdateServiceUser(serviceUserId)
  const invoicesQuery = useServiceUserInvoices(serviceUserId, canRead)
  const templateQuery = useResolveServiceUserInvoiceTemplate(serviceUserId, undefined, canRead)
  const [selectedRun, setSelectedRun] = React.useState<InvoiceRunRow | null>(null)
  const [exportingRunId, setExportingRunId] = React.useState<string | null>(null)
  const [subTab, setSubTab] = React.useState<InvoicesSubTab>('transactions')
  const [typeFilter, setTypeFilter] = React.useState<TxnTypeFilter>('all')
  const [statusFilter, setStatusFilter] = React.useState<TxnStatusFilter>('all')
  const [dateFilter, setDateFilter] = React.useState<TxnDateFilter>('all')
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set())

  const data = invoicesQuery.data
  const runs = data?.runs ?? []
  const profile = profileQuery.data
  const displayName =
    data?.serviceUserName ||
    profile?.preferredName?.trim() ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() ||
    'Service user'
  const cadence: InvoiceCadence =
    profile?.invoiceBillingFrequency === 'MONTHLY' ? 'MONTHLY' : 'WEEKLY'
  const resolvedTemplate = templateQuery.data?.invoiceTemplate
  const templateSource = templateQuery.data?.source

  /**
   * Open balance = money still owed across this client's invoices.
   * Overdue = unpaid only after the billing period end date has passed.
   */
  const openBalanceValue = React.useMemo(
    () =>
      Math.round(runs.reduce((sum, r) => sum + runOutstandingValue(r), 0) * 100) / 100,
    [runs],
  )
  const totalInvoicedValue = React.useMemo(
    () =>
      Math.round(
        runs.reduce((sum, r) => sum + Math.max(0, r.subtotalValue ?? 0), 0) * 100,
      ) / 100,
    [runs],
  )
  const totalPaidValue = React.useMemo(
    () =>
      Math.round(
        runs.reduce((sum, r) => sum + Math.max(0, r.paidValue ?? 0), 0) * 100,
      ) / 100,
    [runs],
  )
  const overdueValue = React.useMemo(() => {
    const today = new Date()
    const todayUtc = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
    )
    return (
      Math.round(
        runs.reduce((sum, r) => {
          const outstanding = runOutstandingValue(r)
          if (outstanding <= 0.001) return sum
          const dueRaw = r.dueDate ?? r.periodEnd
          const due = new Date(
            dueRaw.includes('T') ? dueRaw : `${dueRaw}T00:00:00Z`,
          )
          if (Number.isNaN(due.getTime())) return sum
          const dueUtc = Date.UTC(
            due.getUTCFullYear(),
            due.getUTCMonth(),
            due.getUTCDate(),
          )
          if (dueUtc >= todayUtc) return sum
          return sum + outstanding
        }, 0) * 100,
      ) / 100
    )
  }, [runs])

  const formatMoney = (value: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)

  const transactions = React.useMemo(
    () => buildTransactions(runs, displayName),
    [runs, displayName],
  )

  const filteredTransactions = React.useMemo(() => {
    const now = Date.now()
    const dayMs = 86_400_000
    return transactions.filter((txn) => {
      if (typeFilter === 'invoice' && txn.type !== 'Invoice') return false
      if (typeFilter === 'payment' && txn.type !== 'Payment') return false
      if (statusFilter !== 'all' && txn.paymentStatus !== statusFilter) return false
      if (dateFilter !== 'all') {
        const days = Number(dateFilter)
        const t = new Date(txn.sortDate.includes('T') ? txn.sortDate : `${txn.sortDate}T00:00:00Z`).getTime()
        if (Number.isNaN(t) || now - t > days * dayMs) return false
      }
      return true
    })
  }, [transactions, typeFilter, statusFilter, dateFilter])

  const allVisibleSelected =
    filteredTransactions.length > 0 &&
    filteredTransactions.every((t) => selectedIds.has(t.id))

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const t of filteredTransactions) next.delete(t.id)
      } else {
        for (const t of filteredTransactions) next.add(t.id)
      }
      return next
    })
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const saveCadence = async (next: InvoiceCadence) => {
    if (!canUpdateProfile || next === cadence || updateMutation.isPending) return
    try {
      await updateMutation.mutateAsync({ body: { invoiceBillingFrequency: next } })
      toastSuccess('Invoice schedule updated', next === 'WEEKLY' ? 'Weekly' : 'Monthly')
    } catch (e) {
      toastApiError(e, 'Could not update invoice schedule')
    }
  }

  const handleCsv = async (run: InvoiceRunRow) => {
    setExportingRunId(run.id)
    try {
      await downloadInvoiceRunExport(run.id, 'csv', { serviceUserId })
      toastSuccess('CSV downloaded')
    } catch (e) {
      toastApiError(e, 'Could not download CSV')
    } finally {
      setExportingRunId(null)
    }
  }

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view invoices for this service user.
      </p>
    )
  }

  const phone = profile?.mobile || profile?.phone || null
  const email = profile?.email || null
  const addressLine = formatAddress(profile)
  const photoSrc =
    resolveMediaUrl(profile?.profilePhoto?.fileUrl ?? profile?.profilePhotoUrl) || null
  const avatarSrc = photoSrc || DUMMY_PROFILE_AVATAR

  return (
    <div
      className="space-y-4"
      data-testid="service-user-invoices-panel"
      style={
        {
          '--qbo-accent': '#2ca01c',
          '--qbo-accent-hover': '#248a18',
          '--qbo-summary-bg': '#e8f2fc',
        } as React.CSSProperties
      }
    >
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canUpdateProfile ? (
          <Button variant="outline" size="sm" asChild>
            <Link to="/service-users/$serviceUserId/profile" params={{ serviceUserId }} search={{ tab: 'personal' }}>
              Edit
              <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" aria-hidden />
            </Link>
          </Button>
        ) : null}
        {canOpenBilling || canManage ? (
          <Button
            size="sm"
            className="bg-[var(--qbo-accent)] text-white hover:bg-[var(--qbo-accent-hover)]"
            asChild
          >
            <Link to="/billing/invoice-runs">
              New transaction
              <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-90" aria-hidden />
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(220px,0.9fr)]">
          <div className="flex flex-col items-start gap-3 border-b border-border p-5 lg:border-b-0 lg:border-r">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
              <img
                src={avatarSrc}
                alt=""
                className={cn(
                  'h-full w-full object-cover',
                  !photoSrc && 'object-contain p-1.5 opacity-90',
                )}
                onError={(e) => {
                  const img = e.currentTarget
                  if (img.dataset.fallback === '1') return
                  img.dataset.fallback = '1'
                  img.src = DUMMY_PROFILE_AVATAR
                  img.classList.add('object-contain', 'p-1.5', 'opacity-90')
                }}
              />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-tight text-foreground">
                {displayName}
              </h2>
              {data?.serviceUserNumber ? (
                <p className="mt-0.5 font-mono text-sm text-muted-foreground">{data.serviceUserNumber}</p>
              ) : (
                <p className="mt-0.5 text-sm text-muted-foreground">{displayName}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title={`Email ${email}`}
                  aria-label="Email"
                >
                  <Mail className="h-4 w-4" />
                </a>
              ) : (
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground/40"
                  title="No email on file"
                >
                  <Mail className="h-4 w-4" />
                </span>
              )}
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title={`Call ${phone}`}
                  aria-label="Call"
                >
                  <Phone className="h-4 w-4" />
                </a>
              ) : (
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground/40"
                  title="No phone on file"
                >
                  <Phone className="h-4 w-4" />
                </span>
              )}
              <Link
                to="/service-users/$serviceUserId/profile"
                params={{ serviceUserId }}
                search={{ tab: 'about' }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="About / notes"
                aria-label="About"
              >
                <StickyNote className="h-4 w-4" />
              </Link>
              {canUpdateProfile ? (
                <Link
                  to="/service-users/$serviceUserId/profile"
                  params={{ serviceUserId }}
                  search={{ tab: 'personal' }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Edit details"
                  aria-label="Edit details"
                >
                  <FilePenLine className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 border-b border-border p-5 text-sm lg:border-b-0 lg:border-r">
            {email ? (
              <p className="truncate text-foreground" title={email}>
                {email}
              </p>
            ) : (
              <p className="text-muted-foreground">No email on file</p>
            )}
            {phone ? (
              <p>
                <span className="text-muted-foreground">Phone </span>
                <span className="font-medium tabular-nums text-foreground">{phone}</span>
              </p>
            ) : null}
            <div>
              <p className="text-muted-foreground">Billing address</p>
              <p className="mt-0.5 text-foreground">{addressLine}</p>
              <p className="mt-1 text-xs text-muted-foreground">(used for invoices)</p>
            </div>
            <div>
              <p className="text-muted-foreground">Invoice schedule</p>
              <p className="mt-0.5 font-medium text-foreground">
                {cadence === 'MONTHLY' ? 'Monthly' : 'Weekly'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Invoice template</p>
              <p className="mt-0.5 font-medium text-foreground">
                {resolvedTemplate?.name
                  ? resolvedTemplate.name
                  : templateQuery.isLoading
                    ? '…'
                    : 'Not set'}
              </p>
              {templateSource && templateSource !== 'NONE' ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  via {templateSource.replace(/_/g, ' ').toLowerCase()}
                </p>
              ) : null}
            </div>
          </div>

          <div className="bg-[var(--qbo-summary-bg)] p-5 dark:bg-sky-950/40">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Wallet className="h-4 w-4 text-sky-700 dark:text-sky-300" aria-hidden />
              Financial summary
            </div>
            <dl className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-sm text-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden />
                  Open balance
                </dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">
                  {invoicesQuery.isLoading ? '…' : formatMoney(openBalanceValue)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-sm text-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden />
                  Overdue payment
                </dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">
                  {invoicesQuery.isLoading ? '…' : formatMoney(overdueValue)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-sky-200/80 pt-3 dark:border-sky-800">
                <dt className="text-sm text-muted-foreground">Total invoiced</dt>
                <dd className="text-sm font-medium tabular-nums text-foreground">
                  {invoicesQuery.isLoading ? '…' : formatMoney(totalInvoicedValue)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-muted-foreground">Total paid</dt>
                <dd className="text-sm font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
                  {invoicesQuery.isLoading ? '…' : formatMoney(totalPaidValue)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="border-b border-border">
        <nav className="-mb-px flex flex-wrap gap-1" aria-label="Invoice sections">
          {(
            [
              { id: 'transactions' as const, label: 'Transaction list' },
              { id: 'schedule' as const, label: 'Invoice schedule' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={cn(
                'relative px-3 py-2.5 text-sm font-medium transition-colors',
                subTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              {subTab === tab.id ? (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--qbo-accent)]" />
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {subTab === 'schedule' ? (
        <ContentCard className="space-y-3 p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Invoice schedule</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Weekly clients only appear on weekly invoice runs; monthly on monthly runs.
            </p>
          </div>
          {profileQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading schedule…
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: 'WEEKLY' as const, label: 'Weekly', Icon: Calendar },
                  { value: 'MONTHLY' as const, label: 'Monthly', Icon: CalendarRange },
                ] as const
              ).map(({ value, label, Icon }) => {
                const selected = cadence === value
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={!canUpdateProfile || updateMutation.isPending}
                    onClick={() => void saveCadence(value)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                      selected
                        ? 'border-[var(--qbo-accent)] bg-[var(--qbo-accent)]/10 text-[var(--qbo-accent)]'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/40',
                      (!canUpdateProfile || updateMutation.isPending) && 'opacity-60',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </button>
                )
              })}
            </div>
          )}
          {data && data.readyToInvoiceCount > 0 ? (
            <p className="text-sm text-muted-foreground">
              {data.readyToInvoiceCount} approved visit
              {data.readyToInvoiceCount === 1 ? '' : 's'} ready to invoice under Billing → Invoice
              runs.
            </p>
          ) : null}
        </ContentCard>
      ) : invoicesQuery.isLoading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading transactions…
        </div>
      ) : invoicesQuery.isError ? (
        <p className="text-sm text-destructive">Could not load invoices for this service user.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as TxnTypeFilter)}
            >
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as TxnStatusFilter)}
            >
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PART_PAID">Partial</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="DRAFT">Not sent</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={dateFilter}
              onValueChange={(v) => setDateFilter(v as TxnDateFilter)}
            >
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dates</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex flex-wrap gap-2">
              {(canManage || canOpenBilling) && runs.length > 0 ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/billing/service-user-invoices" search={{ serviceUserId }}>
                    <Mail className="mr-1.5 h-3.5 w-3.5" />
                    Email invoices
                  </Link>
                </Button>
              ) : null}
              {canOpenBilling ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/billing/invoice-runs">
                    All invoice runs
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
              No transactions yet for this service user.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[1080px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                    <th className="w-10 px-3 py-2.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left font-medium">Date ↓</th>
                    <th className="px-3 py-2.5 text-left font-medium">Type</th>
                    <th className="px-3 py-2.5 text-left font-medium">No.</th>
                    <th className="px-3 py-2.5 text-left font-medium">Customer</th>
                    <th className="px-3 py-2.5 text-left font-medium">Memo</th>
                    <th className="px-3 py-2.5 text-left font-medium">Due date</th>
                    <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                    <th className="px-3 py-2.5 text-center font-medium">Status</th>
                    <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((txn) => (
                    <tr
                      key={txn.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border"
                          checked={selectedIds.has(txn.id)}
                          onChange={() => toggleSelect(txn.id)}
                          aria-label={`Select ${txn.number}`}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-foreground">
                        {txn.dateLabel}
                      </td>
                      <td className="px-3 py-2.5 text-foreground">{txn.type}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-foreground">{txn.number}</td>
                      <td className="max-w-[12rem] truncate px-3 py-2.5 text-foreground" title={txn.customer}>
                        {txn.customer}
                      </td>
                      <td className="max-w-[16rem] truncate px-3 py-2.5 text-muted-foreground" title={txn.memo}>
                        {txn.memo}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-muted-foreground">
                        {txn.dueDateLabel}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums text-foreground">
                        {txn.amount}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="inline-flex justify-center">
                          <TransactionStatusBadge status={txn.paymentStatus} />
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-nowrap items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 shrink-0 p-0"
                            title="View detail"
                            aria-label="View detail"
                            onClick={() => setSelectedRun(txn.run)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {txn.type === 'Invoice' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 shrink-0 p-0"
                              title="Download CSV"
                              aria-label="Download CSV"
                              leftIcon={<Download className="h-3.5 w-3.5" />}
                              loading={exportingRunId === txn.run.id}
                              disabled={txn.run.lineCount === 0 || exportingRunId !== null}
                              onClick={() => void handleCsv(txn.run)}
                            />
                          ) : null}
                          {canOpenBilling ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 shrink-0 p-0"
                              asChild
                            >
                              <Link
                                to="/billing/invoice-runs/$invoiceRunId"
                                params={{ invoiceRunId: txn.run.id }}
                                title="Open invoice run"
                                aria-label="Open invoice run"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <InvoiceDetailDialog
        run={selectedRun}
        serviceUserName={displayName}
        onOpenChange={(open) => {
          if (!open) setSelectedRun(null)
        }}
      />
    </div>
  )
}
