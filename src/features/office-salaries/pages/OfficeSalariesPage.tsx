import * as React from 'react'
import { Banknote, CheckCircle2, Clock, History, Pencil, Printer, Undo2, Users } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { formatCurrency } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import {
  useOfficeSalaries,
  useOfficeSalaryDetail,
  useRecordOfficeSalaryPayment,
  useRemoveOfficeSalaryPayment,
  useUpsertOfficeSalary,
} from '@/features/office-salaries/hooks'
import type {
  OfficeSalaryPayment,
  OfficeSalaryPeriod,
  OfficeSalaryRow,
} from '@/features/office-salaries/types'

const fieldClass =
  'h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

/** "2026-10" → "October 2026" */
function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** Opens a simple printable pay statement for one payment. */
function printStatement(person: { name: string; email: string }, payment: OfficeSalaryPayment, paidOn: string) {
  const win = window.open('', '_blank', 'width=720,height=800')
  if (!win) return
  const rows: [string, string][] = [
    ['Employee', person.name],
    ['Email', person.email],
    ['Pay period', monthLabel(payment.month)],
    ['Amount paid', formatCurrency(payment.amount)],
    ['Paid on', paidOn],
    ['Reference', payment.reference ?? '—'],
  ]
  if (payment.note) rows.push(['Note', payment.note])
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Salary statement — ${escapeHtml(
    person.name,
  )} — ${escapeHtml(monthLabel(payment.month))}</title>
<style>body{font-family:system-ui,sans-serif;margin:40px;color:#111}h1{font-size:20px;margin:0 0 4px}
p.sub{color:#555;margin:0 0 24px;font-size:13px}table{border-collapse:collapse;width:100%}
td{padding:10px 8px;border-bottom:1px solid #ddd;font-size:14px}td:first-child{color:#555;width:35%}
.foot{margin-top:28px;font-size:12px;color:#666}</style></head><body>
<h1>Salary statement</h1><p class="sub">${escapeHtml(monthLabel(payment.month))}</p>
<table>${rows.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join('')}</table>
<p class="foot">Gross salary as agreed. Tax and National Insurance are handled separately.</p>
<script>window.onload=function(){window.print()}</script></body></html>`)
  win.document.close()
}

function SalaryDialog({ row, onClose }: { row: OfficeSalaryRow | null; onClose: () => void }) {
  const detail = useOfficeSalaryDetail(row?.userId ?? null)
  const save = useUpsertOfficeSalary()
  const [form, setForm] = React.useState({
    amount: '',
    period: 'MONTHLY' as OfficeSalaryPeriod,
    payDay: '',
    startDate: '',
    bankAccountName: '',
    bankSortCode: '',
    bankAccountNumber: '',
    notes: '',
    isActive: true,
  })
  const [error, setError] = React.useState<string | null>(null)
  const loaded = detail.data?.userId === row?.userId ? detail.data : undefined

  React.useEffect(() => {
    if (!row) return
    const s = loaded?.salary
    setForm({
      amount: s ? String(s.amount) : '',
      period: s?.period ?? 'MONTHLY',
      payDay: s?.payDay ? String(s.payDay) : '',
      startDate: s?.startDate ?? '',
      bankAccountName: s?.bankAccountName ?? '',
      bankSortCode: s?.bankSortCode ?? '',
      bankAccountNumber: s?.bankAccountNumber ?? '',
      notes: s?.notes ?? '',
      isActive: s?.isActive ?? true,
    })
    setError(null)
  }, [row, loaded])

  const amount = Number(form.amount)
  const monthly = Number.isFinite(amount) ? (form.period === 'ANNUAL' ? amount / 12 : amount) : 0

  const submit = async () => {
    if (!row) return
    if (!form.amount || !Number.isFinite(amount) || amount < 0) {
      setError('Enter the salary amount.')
      return
    }
    const payDay = form.payDay ? Number(form.payDay) : null
    if (payDay !== null && (!Number.isInteger(payDay) || payDay < 1 || payDay > 31)) {
      setError('Pay day must be a day of the month (1–31).')
      return
    }
    try {
      await save.mutateAsync({
        userId: row.userId,
        input: {
          amount: Math.round(amount * 100) / 100,
          period: form.period,
          payDay,
          startDate: form.startDate || null,
          bankAccountName: form.bankAccountName.trim() || null,
          bankSortCode: form.bankSortCode.trim() || null,
          bankAccountNumber: form.bankAccountNumber.trim() || null,
          notes: form.notes.trim() || null,
          isActive: form.isActive,
        },
      })
      toastSuccess('Salary saved')
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not save salary')
    }
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <Dialog open={row != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{row?.salary ? 'Edit salary' : 'Set up salary'} — {row?.name}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {row?.salary && detail.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Salary amount (£) *</span>
                  <Input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Per</span>
                  <select className={fieldClass} value={form.period} onChange={(e) => set('period', e.target.value as OfficeSalaryPeriod)}>
                    <option value="MONTHLY">Month</option>
                    <option value="ANNUAL">Year</option>
                  </select>
                </label>
              </div>
              {form.amount && form.period === 'ANNUAL' ? (
                <p className="text-xs text-muted-foreground">Monthly payment: {formatCurrency(Math.round(monthly * 100) / 100)}</p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Pay day (day of month)</span>
                  <Input type="number" min={1} max={31} value={form.payDay} onChange={(e) => set('payDay', e.target.value)} placeholder="e.g. 28" />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Start date</span>
                  <Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
                </label>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bank details</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block space-y-1 text-sm sm:col-span-3">
                    <span className="font-medium">Account name</span>
                    <Input value={form.bankAccountName} maxLength={100} onChange={(e) => set('bankAccountName', e.target.value)} />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium">Sort code</span>
                    <Input value={form.bankSortCode} maxLength={8} placeholder="12-34-56" onChange={(e) => set('bankSortCode', e.target.value)} />
                  </label>
                  <label className="block space-y-1 text-sm sm:col-span-2">
                    <span className="font-medium">Account number</span>
                    <Input value={form.bankAccountNumber} maxLength={8} inputMode="numeric" placeholder="8 digits" onChange={(e) => set('bankAccountNumber', e.target.value)} />
                  </label>
                </div>
              </div>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Notes</span>
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 rounded border-input" />
                Salary is active (expected to be paid each month)
              </label>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save salary'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PayDialog({ row, month, onClose }: { row: OfficeSalaryRow | null; month: string; onClose: () => void }) {
  const record = useRecordOfficeSalaryPayment()
  const [amount, setAmount] = React.useState('')
  const [paidAt, setPaidAt] = React.useState('')
  const [reference, setReference] = React.useState('')
  const [note, setNote] = React.useState('')

  React.useEffect(() => {
    if (!row) return
    setAmount(String(row.payment?.amount ?? row.salary?.monthlyAmount ?? ''))
    setPaidAt(row.payment?.paidAt ?? operationalTodayIso())
    setReference(row.payment?.reference ?? '')
    setNote(row.payment?.note ?? '')
  }, [row])

  const submit = async () => {
    if (!row) return
    const value = Number(amount)
    if (!amount || !Number.isFinite(value) || value < 0) return
    try {
      await record.mutateAsync({
        userId: row.userId,
        input: {
          month,
          amount: Math.round(value * 100) / 100,
          paidAt: paidAt || undefined,
          reference: reference.trim() || undefined,
          note: note.trim() || undefined,
        },
      })
      toastSuccess(`Salary marked as paid for ${monthLabel(month)}`)
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not record payment')
    }
  }

  return (
    <Dialog open={row != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Mark as paid — {row?.name}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-sm text-muted-foreground">Salary for {monthLabel(month)}.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Amount paid (£)</span>
              <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Paid on</span>
              <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Bank reference</span>
            <Input value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Note</span>
            <Input value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} placeholder="e.g. includes bonus" />
          </label>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={record.isPending || !amount}>
            {record.isPending ? 'Saving…' : 'Mark as paid'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function HistoryDialog({ row, onClose }: { row: OfficeSalaryRow | null; onClose: () => void }) {
  const detail = useOfficeSalaryDetail(row?.userId ?? null)
  const { formatDate } = useOrganisationDisplayFormat()
  const data = detail.data?.userId === row?.userId ? detail.data : undefined
  return (
    <Dialog open={row != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Salary history — {row?.name}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {!data ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : data.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Month</th>
                    <th className="py-2 pr-3 text-right">Amount</th>
                    <th className="py-2 pr-3">Paid on</th>
                    <th className="py-2 pr-3">Reference</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p.id} className="border-b border-border/70 last:border-0">
                      <td className="py-2 pr-3">{monthLabel(p.month)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(p.amount)}</td>
                      <td className="py-2 pr-3">{p.paidAt ? formatDate(p.paidAt) : '—'}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{p.reference ?? '—'}</td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1"
                          onClick={() => printStatement(data, p, p.paidAt ? formatDate(p.paidAt) : '—')}
                        >
                          <Printer className="h-3.5 w-3.5" /> Statement
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function OfficeSalariesPage() {
  const { formatDate } = useOrganisationDisplayFormat()
  const [month, setMonth] = React.useState(() => operationalTodayIso().slice(0, 7))
  const { data, isLoading, isError } = useOfficeSalaries(month)
  const removePayment = useRemoveOfficeSalaryPayment()
  const [salaryRow, setSalaryRow] = React.useState<OfficeSalaryRow | null>(null)
  const [payRow, setPayRow] = React.useState<OfficeSalaryRow | null>(null)
  const [historyRow, setHistoryRow] = React.useState<OfficeSalaryRow | null>(null)

  const undo = async (row: OfficeSalaryRow) => {
    if (!window.confirm(`Remove the ${monthLabel(month)} payment for ${row.name}?`)) return
    try {
      await removePayment.mutateAsync({ userId: row.userId, month })
      toastSuccess('Payment removed')
    } catch (e) {
      toastApiError(e, 'Could not remove payment')
    }
  }

  const totals = data?.totals
  const cards = [
    { label: 'Salaried staff', value: totals ? String(totals.salariedCount) : '—', icon: <Users className="h-5 w-5" /> },
    { label: 'Monthly total', value: totals ? formatCurrency(totals.monthlyTotal) : '—', icon: <Banknote className="h-5 w-5" /> },
    { label: `Paid in ${monthLabel(month)}`, value: totals ? formatCurrency(totals.paidTotal) : '—', icon: <CheckCircle2 className="h-5 w-5" /> },
    { label: 'Not paid yet', value: totals ? String(totals.unpaidCount) : '—', icon: <Clock className="h-5 w-5" /> },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Office salaries"
        icon={<Banknote className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Office salaries' }]}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Salaries for office users (login accounts), kept separate from carer payroll. Amounts are gross as agreed —
          tax and National Insurance are not calculated here.
        </p>
        <label className="space-y-1 text-sm">
          <span className="block text-xs font-medium text-muted-foreground">Month</span>
          <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-44" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">{c.icon}</div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading office salaries…</p>
        ) : isError ? (
          <p className="p-6 text-sm text-destructive">Could not load office salaries.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5">Office user</th>
                  <th className="px-3 py-2.5">Role</th>
                  <th className="px-3 py-2.5 text-right">Monthly salary</th>
                  <th className="px-3 py-2.5">Pay day</th>
                  <th className="px-3 py-2.5">Bank</th>
                  <th className="px-3 py-2.5">{monthLabel(month)}</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows ?? []).map((row) => (
                  <tr key={row.userId} className="border-b border-border/70 last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-3">
                      <div className="font-medium text-foreground">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.email}</div>
                      {!row.loginActive ? <Badge variant="muted" size="sm">Login inactive</Badge> : null}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{row.roles.join(', ') || '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.salary ? (
                        <>
                          <div className={row.salary.isActive ? 'text-foreground' : 'text-muted-foreground line-through'}>
                            {formatCurrency(row.salary.monthlyAmount)}
                          </div>
                          {row.salary.period === 'ANNUAL' ? (
                            <div className="text-xs text-muted-foreground">{formatCurrency(row.salary.amount)} / year</div>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">No salary set</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{row.salary?.payDay ? `Day ${row.salary.payDay}` : '—'}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {row.salary?.bankSortCode || row.salary?.bankAccountNumber
                        ? `${row.salary.bankSortCode ?? ''} ${row.salary.bankAccountNumber ?? ''}`.trim()
                        : '—'}
                    </td>
                    <td className="px-3 py-3">
                      {row.payment ? (
                        <div>
                          <Badge variant="success" size="sm">Paid {formatCurrency(row.payment.amount)}</Badge>
                          {row.payment.paidAt ? (
                            <div className="mt-0.5 text-xs text-muted-foreground">on {formatDate(row.payment.paidAt)}</div>
                          ) : null}
                        </div>
                      ) : row.salary?.isActive ? (
                        <Badge variant="warning" size="sm">Not paid</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => setSalaryRow(row)}>
                          <Pencil className="h-3.5 w-3.5" /> {row.salary ? 'Edit' : 'Set up'}
                        </Button>
                        {row.salary ? (
                          row.payment ? (
                            <Button size="sm" variant="ghost" className="gap-1" onClick={() => void undo(row)} disabled={removePayment.isPending}>
                              <Undo2 className="h-3.5 w-3.5" /> Undo
                            </Button>
                          ) : (
                            <Button size="sm" className="gap-1" onClick={() => setPayRow(row)}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
                            </Button>
                          )
                        ) : null}
                        {row.salary ? (
                          <Button size="sm" variant="ghost" className="gap-1" onClick={() => setHistoryRow(row)}>
                            <History className="h-3.5 w-3.5" /> History
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

      <SalaryDialog row={salaryRow} onClose={() => setSalaryRow(null)} />
      <PayDialog row={payRow} month={month} onClose={() => setPayRow(null)} />
      <HistoryDialog row={historyRow} onClose={() => setHistoryRow(null)} />
    </div>
  )
}
