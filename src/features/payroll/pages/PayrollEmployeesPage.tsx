import * as React from 'react'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import { PayrollStatusBadge } from '@/features/payroll/components/PayrollStatusBadge'
import {
  groupTaxCodeOptions,
  taxCodeSelectValue,
  UK_NI_CATEGORY_OPTIONS,
  UK_TAX_CODE_OTHER,
} from '@/features/payroll/data/uk-payroll-lookups'
import {
  useCreateEmployeePayAgreement,
  usePayrollEmployees,
  usePayrollSchedules,
  useUpsertEmployeePayrollProfile,
} from '@/features/payroll/hooks/usePayroll'
import { useAuthStore } from '@/features/auth/store'
import type {
  EmployeePayAgreementBasis,
  EmployeePayrollProfileStatus,
  PayrollNiCategory,
  PayrollStarterDeclaration,
} from '@/features/payroll/types/payroll.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

const TAX_CODE_GROUPS = groupTaxCodeOptions()

export default function PayrollEmployeesPage() {
  const canManage = useAuthStore((s) => s.can('payroll.employees.manage'))
  const { data = [], isLoading } = usePayrollEmployees()
  const { data: schedules = [] } = usePayrollSchedules()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selected = data.find((r) => r.employeeId === selectedId) ?? null
  const upsertMut = useUpsertEmployeePayrollProfile(selectedId ?? '')
  const agreementMut = useCreateEmployeePayAgreement(selectedId ?? '')

  const [taxCodeSelect, setTaxCodeSelect] = React.useState('1257L')
  const [customTaxCode, setCustomTaxCode] = React.useState('')
  const [niCategory, setNiCategory] = React.useState<PayrollNiCategory>('A')
  const [status, setStatus] = React.useState<EmployeePayrollProfileStatus>('DRAFT')
  const [starter, setStarter] = React.useState<PayrollStarterDeclaration>('UNKNOWN')
  const [scheduleId, setScheduleId] = React.useState('')
  const [basis, setBasis] = React.useState<EmployeePayAgreementBasis>('HOURLY_CARE')
  const [effectiveFrom, setEffectiveFrom] = React.useState(
    new Date().toISOString().slice(0, 10),
  )

  React.useEffect(() => {
    if (!selected) return
    const stored = selected.profile?.taxCode ?? '1257L'
    const selectValue = taxCodeSelectValue(stored)
    setTaxCodeSelect(selectValue)
    setCustomTaxCode(selectValue === UK_TAX_CODE_OTHER ? stored.trim().toUpperCase() : '')
    setNiCategory(selected.profile?.niCategory ?? 'A')
    setStatus(selected.profile?.status ?? 'DRAFT')
    setStarter(selected.profile?.starterDeclaration ?? 'UNKNOWN')
    setScheduleId(selected.profile?.scheduleId ?? '')
  }, [selected])

  const resolvedTaxCode =
    taxCodeSelect === UK_TAX_CODE_OTHER
      ? customTaxCode.trim().toUpperCase()
      : taxCodeSelect

  return (
    <PayrollSectionLayout
      title="Employee payroll setup"
      description="Select UK tax code and NI category from HMRC lists, then set starter declaration and pay agreements. Tax/NI £ amounts are calculated on the payroll run."
      testId="payroll-employees-page"
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">Employee</th>
                <th className="py-2 pr-3 font-medium">Payroll no.</th>
                <th className="py-2 pr-3 font-medium">Profile</th>
                <th className="py-2 pr-3 font-medium">Tax code</th>
                <th className="py-2 pr-3 font-medium">Agreement</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.employeeId} className="border-b border-border/70">
                  <td className="py-2.5 pr-3 font-medium">{row.displayName}</td>
                  <td className="py-2.5 pr-3">{row.payrollNumber ?? '—'}</td>
                  <td className="py-2.5 pr-3">
                    {row.profile ? (
                      <PayrollStatusBadge status={row.profile.status} />
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">{row.profile?.taxCode ?? '—'}</td>
                  <td className="py-2.5 pr-3">
                    {row.activeAgreement ? (
                      <PayrollStatusBadge status={row.activeAgreement.status} />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2.5">
                    {canManage ? (
                      <Button size="sm" variant="outline" onClick={() => setSelectedId(row.employeeId)}>
                        Edit
                      </Button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-muted-foreground">
                    No employees found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>
              {selected ? `Payroll setup — ${selected.displayName}` : 'Payroll setup'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm sm:col-span-2">
                <span>UK tax code</span>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={taxCodeSelect}
                  onChange={(e) => {
                    const next = e.target.value
                    setTaxCodeSelect(next)
                    if (next !== UK_TAX_CODE_OTHER) setCustomTaxCode('')
                  }}
                >
                  {TAX_CODE_GROUPS.map((group) => (
                    <optgroup key={group.group} label={group.group}>
                      {group.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <optgroup label="Other">
                    <option value={UK_TAX_CODE_OTHER}>Other HMRC code (rare / notice)</option>
                  </optgroup>
                </select>
                <p className="text-xs text-muted-foreground">
                  Most carers use 1257L. Special codes (BR, 0T, NT, D0, D1) come from HMRC notices.
                </p>
              </label>
              {taxCodeSelect === UK_TAX_CODE_OTHER ? (
                <label className="block space-y-1 text-sm sm:col-span-2">
                  <span>Enter HMRC tax code</span>
                  <Input
                    value={customTaxCode}
                    onChange={(e) => setCustomTaxCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 1185L"
                    maxLength={20}
                  />
                </label>
              ) : null}
              <label className="block space-y-1 text-sm sm:col-span-2">
                <span>NI category (Class 1)</span>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={niCategory}
                  onChange={(e) => setNiCategory(e.target.value as PayrollNiCategory)}
                >
                  {UK_NI_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Category A is standard for most working-age employees.
                </p>
              </label>
              <label className="block space-y-1 text-sm">
                <span>Profile status</span>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EmployeePayrollProfileStatus)}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="READY">READY</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span>Starter declaration</span>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={starter}
                  onChange={(e) => setStarter(e.target.value as PayrollStarterDeclaration)}
                >
                  <option value="UNKNOWN">Unknown</option>
                  <option value="A_FIRST_JOB">A — first job</option>
                  <option value="B_ONLY_JOB_THIS_YEAR">B — only job this year</option>
                  <option value="C_HAS_ANOTHER_JOB_OR_PENSION">C — another job/pension</option>
                </select>
              </label>
              <label className="block space-y-1 text-sm sm:col-span-2">
                <span>Pay schedule</span>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={scheduleId}
                  onChange={(e) => setScheduleId(e.target.value)}
                >
                  <option value="">None</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-lg border border-border p-3">
              <h4 className="mb-2 text-sm font-medium">New pay agreement</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span>Basis</span>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={basis}
                    onChange={(e) => setBasis(e.target.value as EmployeePayAgreementBasis)}
                  >
                    <option value="HOURLY_CARE">Hourly care</option>
                    <option value="SALARIED">Salaried</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Effective from</span>
                  <Input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Creating an ACTIVE agreement supersedes any previous active agreement. Optional pay
                card link uses the employee default pay card when present.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedId(null)}>
              Close
            </Button>
            <Button
              variant="outline"
              disabled={!selectedId || agreementMut.isPending}
              onClick={() =>
                agreementMut.mutate({
                  basis,
                  effectiveFrom,
                  scheduleId: scheduleId || null,
                  payCardId: selected?.defaultPayCardId ?? null,
                  status: 'ACTIVE',
                })
              }
            >
              Add agreement
            </Button>
            <Button
              disabled={
                !selectedId ||
                upsertMut.isPending ||
                !resolvedTaxCode ||
                (taxCodeSelect === UK_TAX_CODE_OTHER && customTaxCode.trim().length < 2)
              }
              onClick={() =>
                upsertMut.mutate({
                  taxCode: resolvedTaxCode || null,
                  niCategory,
                  status,
                  starterDeclaration: starter,
                  scheduleId: scheduleId || null,
                })
              }
            >
              Save profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PayrollSectionLayout>
  )
}
