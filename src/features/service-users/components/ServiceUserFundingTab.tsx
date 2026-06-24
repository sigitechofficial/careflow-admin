import * as React from 'react'
import { Loader2, Pencil, Plus, Star, Trash2, CheckCircle, Ban } from 'lucide-react'
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
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Switch } from '@/shared/ui/toggle-controls'
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

type FundingForm = {
  fundingTypeId: string
  funderId: string
  status: EnterpriseFundingStatus
  fundingReference: string
  approvalReference: string
  packageName: string
  startDate: string
  endDate: string
  weeklyBudget: string
  hourlyRate: string
  contributionAmount: string
  isPrimary: boolean
  reviewDate: string
  notes: string
}

function emptyForm(): FundingForm {
  return {
    fundingTypeId: '',
    funderId: '',
    status: 'UNKNOWN',
    fundingReference: '',
    approvalReference: '',
    packageName: '',
    startDate: '',
    endDate: '',
    weeklyBudget: '',
    hourlyRate: '',
    contributionAmount: '',
    isPrimary: false,
    reviewDate: '',
    notes: '',
  }
}

function rowToForm(row: EnterpriseServiceUserFundingRow): FundingForm {
  return {
    fundingTypeId: row.fundingTypeId,
    funderId: row.funderId ?? '',
    status: row.status,
    fundingReference: row.fundingReference ?? '',
    approvalReference: row.approvalReference ?? '',
    packageName: row.packageName ?? '',
    startDate: row.startDate ? row.startDate.slice(0, 10) : '',
    endDate: row.endDate ? row.endDate.slice(0, 10) : '',
    weeklyBudget: row.weeklyBudget ?? '',
    hourlyRate: row.hourlyRate ?? '',
    contributionAmount: row.contributionAmount ?? '',
    isPrimary: row.isPrimary,
    reviewDate: row.reviewDate ? row.reviewDate.slice(0, 10) : '',
    notes: row.notes ?? '',
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
    hourlyRate: f.hourlyRate === '' ? null : Number(f.hourlyRate),
    contributionAmount: f.contributionAmount === '' ? null : Number(f.contributionAmount),
    isPrimary: f.isPrimary,
    reviewDate: f.reviewDate || null,
    notes: f.notes || null,
  }
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
  const createMutation = useCreateServiceUserEnterpriseFunding(serviceUserId)
  const updateMutation = useUpdateServiceUserEnterpriseFunding(serviceUserId)
  const deleteMutation = useDeleteServiceUserEnterpriseFunding(serviceUserId)
  const patchRefsMutation = usePatchServiceUserFundingRefs(serviceUserId)
  const setPrimaryMutation = useSetPrimaryServiceUserEnterpriseFunding(serviceUserId)
  const approveMutation = useApproveServiceUserEnterpriseFunding(serviceUserId)
  const endMutation = useEndServiceUserEnterpriseFunding(serviceUserId)

  const loading = fundingsQuery.isLoading || typesQuery.isLoading || fundersQuery.isLoading
  const rows = fundingsQuery.data?.rows ?? []
  const types = typesQuery.data ?? []
  const funders = fundersQuery.data ?? []
  const [nhsNumber, setNhsNumber] = React.useState(initialNhsNumber ?? '')
  const [socialRef, setSocialRef] = React.useState(initialSocialServicesRef ?? '')

  React.useEffect(() => {
    setNhsNumber(initialNhsNumber ?? '')
    setSocialRef(initialSocialServicesRef ?? '')
  }, [initialNhsNumber, initialSocialServicesRef])

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<FundingForm>(() => emptyForm())
  const saving = createMutation.isPending || updateMutation.isPending

  const [endOpen, setEndOpen] = React.useState(false)
  const [endTarget, setEndTarget] = React.useState<EnterpriseServiceUserFundingRow | null>(null)
  const [endDate, setEndDate] = React.useState('')
  const [endReason, setEndReason] = React.useState('')

  const [deleteTarget, setDeleteTarget] = React.useState<EnterpriseServiceUserFundingRow | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (row: EnterpriseServiceUserFundingRow) => {
    setEditingId(row.id)
    setForm(rowToForm(row))
    setDialogOpen(true)
  }

  const saveFunding = async () => {
    if (!form.fundingTypeId) {
      toastApiError(new Error('Funding type is required'), 'Validation')
      return
    }
    try {
      const body = formToBody(form)
      if (editingId) {
        await updateMutation.mutateAsync({ fundingId: editingId, body })
        toastSuccess('Funding updated')
      } else {
        await createMutation.mutateAsync(body)
        toastSuccess('Funding created')
      }
      setDialogOpen(false)
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
                    <p className="mt-2 text-xs text-muted-foreground">
                      {fmtDate(row.startDate)} → {fmtDate(row.endDate)} · Weekly {fmtMoney(row.weeklyBudget)} · Hourly {fmtMoney(row.hourlyRate)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit funding' : 'Add funding'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div>
              <p className="mb-1 text-sm font-medium">Funding type *</p>
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
            <div>
              <p className="mb-1 text-sm font-medium">Funder</p>
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
            <div>
              <p className="mb-1 text-sm font-medium">Status</p>
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
                <p className="mb-1 text-sm font-medium">Start</p>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">End</p>
                <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-sm font-medium">Funding ref</p>
                <Input value={form.fundingReference} onChange={(e) => setForm((f) => ({ ...f, fundingReference: e.target.value }))} />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Approval ref</p>
                <Input value={form.approvalReference} onChange={(e) => setForm((f) => ({ ...f, approvalReference: e.target.value }))} />
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Package name</p>
              <Input value={form.packageName} onChange={(e) => setForm((f) => ({ ...f, packageName: e.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="mb-1 text-sm font-medium">Weekly budget</p>
                <Input inputMode="decimal" value={form.weeklyBudget} onChange={(e) => setForm((f) => ({ ...f, weeklyBudget: e.target.value }))} />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Hourly rate</p>
                <Input inputMode="decimal" value={form.hourlyRate} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))} />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Contribution</p>
                <Input
                  inputMode="decimal"
                  value={form.contributionAmount}
                  onChange={(e) => setForm((f) => ({ ...f, contributionAmount: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Review date</p>
              <Input type="date" value={form.reviewDate} onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))} />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Notes</p>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isPrimary} onCheckedChange={(v) => setForm((f) => ({ ...f, isPrimary: v }))} />
              <span className="text-sm">Primary funding</span>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveFunding()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
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
