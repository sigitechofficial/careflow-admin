import * as React from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import { useComplianceTypes } from '@/features/settings/hooks/useLookupsAdmin'
import {
  useComplianceRequirements,
  useCreateComplianceRequirement,
  useDeleteComplianceRequirement,
  useUpdateComplianceRequirement,
} from '@/features/settings/hooks/useComplianceRequirements'
import type { ComplianceRequirementRow } from '@/features/settings/api/compliance-requirements-api'
import { SettingsTablePagination } from '@/features/settings/components/SettingsTablePagination'
import { useClientPagination } from '@/features/settings/hooks/useClientPagination'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Switch } from '@/shared/ui/toggle-controls'

const NONE = '__none__'

function dimLabel(id: string | null, options: { id: string; name: string }[]): string {
  if (!id) return 'All'
  return options.find(o => o.id === id)?.name ?? '—'
}

export function ComplianceRequirementsSettingsPanel() {
  const canRead = useAuthStore(s => s.can('compliance_requirements.read'))
  const canCreate = useAuthStore(s => s.can('compliance_requirements.create'))
  const canUpdate = useAuthStore(s => s.can('compliance_requirements.update'))
  const canDelete = useAuthStore(s => s.can('compliance_requirements.delete'))

  const listQuery = useComplianceRequirements()
  const typesQuery = useComplianceTypes({ limit: 100 })
  const lookupsQuery = useEmployeeLookups(canRead)
  const createMutation = useCreateComplianceRequirement()
  const updateMutation = useUpdateComplianceRequirement()
  const deleteMutation = useDeleteComplianceRequirement()

  const rows = listQuery.data?.data ?? []
  const complianceTypes = typesQuery.data ?? []
  const roles = lookupsQuery.data?.roles ?? []
  const workAreas = lookupsQuery.data?.workAreas ?? []

  const [filter, setFilter] = React.useState('')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editRow, setEditRow] = React.useState<ComplianceRequirementRow | null>(null)
  const [complianceTypeId, setComplianceTypeId] = React.useState('')
  const [roleId, setRoleId] = React.useState(NONE)
  const [workAreaId, setWorkAreaId] = React.useState(NONE)
  const [renewalBeforeDays, setRenewalBeforeDays] = React.useState('30')
  const [isMandatory, setIsMandatory] = React.useState(true)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const filtered = React.useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => {
      const typeName = r.complianceType?.name?.toLowerCase() ?? ''
      const code = r.complianceType?.code?.toLowerCase() ?? ''
      return typeName.includes(q) || code.includes(q)
    })
  }, [filter, rows])

  const pagination = useClientPagination(filtered, { resetDeps: [filter] })

  const openCreate = () => {
    setEditRow(null)
    setComplianceTypeId(complianceTypes[0]?.id ?? '')
    setRoleId(NONE)
    setWorkAreaId(NONE)
    setRenewalBeforeDays('30')
    setIsMandatory(true)
    setActionError(null)
    setDialogOpen(true)
  }

  const openEdit = (row: ComplianceRequirementRow) => {
    setEditRow(row)
    setComplianceTypeId(row.complianceTypeId)
    setRoleId(row.roleId ?? NONE)
    setWorkAreaId(row.workAreaId ?? NONE)
    setRenewalBeforeDays(String(row.renewalBeforeDays))
    setIsMandatory(row.isMandatory)
    setActionError(null)
    setDialogOpen(true)
  }

  const onSave = async () => {
    if (!complianceTypeId) {
      setActionError('Select a compliance type.')
      return
    }
    const renewal = Number.parseInt(renewalBeforeDays, 10)
    if (!Number.isFinite(renewal) || renewal < 1) {
      setActionError('Renewal alert days must be at least 1.')
      return
    }
    setActionError(null)
    const body = {
      complianceTypeId,
      roleId: roleId === NONE ? undefined : roleId,
      workAreaId: workAreaId === NONE ? undefined : workAreaId,
      isMandatory,
      renewalBeforeDays: renewal,
    }
    try {
      if (editRow) {
        if (!canUpdate) return
        await updateMutation.mutateAsync({
          id: editRow.id,
          body: {
            ...body,
            roleId: roleId === NONE ? null : roleId,
            workAreaId: workAreaId === NONE ? null : workAreaId,
          },
        })
      } else {
        if (!canCreate) return
        await createMutation.mutateAsync(body)
      }
      setDialogOpen(false)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not save requirement.')
    }
  }

  const onDelete = async (row: ComplianceRequirementRow) => {
    if (!canDelete) return
    if (!window.confirm(`Delete requirement for ${row.complianceType?.name ?? 'type'}?`)) return
    try {
      await deleteMutation.mutateAsync(row.id)
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not delete requirement.')
    }
  }

  if (!canRead) {
    return <p className="text-sm text-muted-foreground">You do not have permission to view compliance requirements.</p>
  }

  const loading = listQuery.isLoading
  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  const error =
    actionError ??
    (listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load requirements.'
        : null)

  return (
    <div className="space-y-4" data-testid="compliance-requirements-settings">
      <div>
        <h2 className="text-base font-semibold text-foreground">Compliance requirements</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Matrix of which compliance types apply by role, work area, and other employment dimensions. Drives
          mandatory checklist and renewal alert windows.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Filter by compliance type…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="max-w-xs"
        />
        {canCreate ? (
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add requirement
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {['Compliance type', 'Role', 'Work area', 'Mandatory', 'Alert days', ''].map(h => (
                <th key={h} className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : pagination.paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-muted-foreground">
                  No requirements configured.
                </td>
              </tr>
            ) : (
              pagination.paginatedItems.map(row => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-medium">{row.complianceType?.name ?? '—'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{dimLabel(row.roleId, roles)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{dimLabel(row.workAreaId, workAreas)}</td>
                  <td className="px-3 py-2.5">{row.isMandatory ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2.5">{row.renewalBeforeDays}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      {canUpdate ? (
                        <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button type="button" variant="ghost" size="icon" onClick={() => void onDelete(row)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <SettingsTablePagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        rangeStart={pagination.rangeStart}
        rangeEnd={pagination.rangeEnd}
        pageSize={pagination.pageSize}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editRow ? 'Edit requirement' : 'Add requirement'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Compliance type</label>
              <Select value={complianceTypeId} onValueChange={setComplianceTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {complianceTypes.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role (optional)</label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>All roles</SelectItem>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Work area (optional)</label>
              <Select value={workAreaId} onValueChange={setWorkAreaId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>All work areas</SelectItem>
                  {workAreas.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Renewal alert (days before expiry)</label>
              <Input value={renewalBeforeDays} onChange={e => setRenewalBeforeDays(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isMandatory} onCheckedChange={setIsMandatory} />
              <span className="text-sm">Mandatory</span>
            </div>
            {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onSave()} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
