import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import { type EmployeeSkillRow } from '@/features/employees/types'
import {
  useCreateEmployeeSkill,
  useDeleteEmployeeSkill,
} from '@/features/employees/hooks/useEmployeeMutations'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import { useEmployeeSkills } from '@/features/employees/hooks/useEmployeeTabs'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

function formatSkillExpiry(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export function EmployeeEditSkillsPanel({ employeeId }: { employeeId: string }) {
  const apiConfigured = Boolean(getApiBaseUrl())
  const accessToken = useAuthStore(s => s.accessToken)
  const jwtPresent = Boolean(accessToken?.includes('.'))
  const canUpdate = useAuthStore(s => s.can('employees.update'))
  const queryEnabled = apiConfigured && jwtPresent && Boolean(employeeId)

  const lookupsQuery = useEmployeeLookups(queryEnabled)
  const skillsQuery = useEmployeeSkills(employeeId, queryEnabled)
  const createMutation = useCreateEmployeeSkill(employeeId)
  const deleteMutation = useDeleteEmployeeSkill(employeeId)

  const lookups = lookupsQuery.data ?? null
  const skills = skillsQuery.data ?? []
  const loading = skillsQuery.isLoading
  const error =
    skillsQuery.error instanceof ApiError
      ? skillsQuery.error.message
      : skillsQuery.error
        ? 'Could not load skills.'
        : null

  const [skillTypeId, setSkillTypeId] = React.useState('')
  const [expiryDate, setExpiryDate] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [banner, setBanner] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const saving = createMutation.isPending

  const assignedSkillTypeIds = React.useMemo(
    () => new Set(skills.map(s => s.skillTypeId).filter(Boolean) as string[]),
    [skills],
  )

  const skillTypeOptions = React.useMemo(() => {
    const types = lookups?.skillTypes ?? []
    return types.filter(t => !assignedSkillTypeIds.has(t.id))
  }, [lookups?.skillTypes, assignedSkillTypeIds])

  const onAddSkill = async () => {
    if (!skillTypeId.trim()) {
      setBanner({ type: 'error', text: 'Select a skill type.' })
      return
    }
    setBanner(null)
    try {
      const body: { skillTypeId: string; expiryDate?: string; notes?: string } = {
        skillTypeId: skillTypeId.trim(),
      }
      if (expiryDate.trim()) body.expiryDate = `${expiryDate.trim()}T12:00:00.000Z`
      if (notes.trim()) body.notes = notes.trim()
      await createMutation.mutateAsync(body)
      setSkillTypeId('')
      setExpiryDate('')
      setNotes('')
      setBanner({ type: 'success', text: 'Skill added.' })
    } catch (e) {
      setBanner({ type: 'error', text: e instanceof ApiError ? e.message : 'Could not add skill.' })
    }
  }

  const onDeleteSkill = async (skillId: string) => {
    if (!window.confirm('Remove this skill from the employee?')) return
    setBanner(null)
    try {
      await deleteMutation.mutateAsync(skillId)
      setBanner({ type: 'success', text: 'Skill removed.' })
    } catch (e) {
      setBanner({ type: 'error', text: e instanceof ApiError ? e.message : 'Could not remove skill.' })
    }
  }

  return (
    <div className="space-y-4" data-testid="employee-edit-skills-panel">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">Skills</h2>
        {canUpdate ? (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
            <Plus className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
      </div>
      {banner ? (
        <div
          role="status"
          className={
            banner.type === 'success'
              ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900'
              : 'rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive'
          }
        >
          {banner.text}
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading skills…</p> : null}
      {!loading ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium">Skill</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">Expiry Date</th>
                <th className="px-3 py-2 font-medium">Notes</th>
                <th className="px-3 py-2 font-medium">Skill Documentation</th>
                {canUpdate ? <th className="w-12 px-3 py-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {skills.length === 0 ? (
                <tr>
                  <td colSpan={canUpdate ? 5 : 4} className="px-3 py-8 text-center text-muted-foreground">
                    No skills recorded yet.
                  </td>
                </tr>
              ) : (
                skills.map((row: EmployeeSkillRow) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{row.skillType?.name ?? '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {formatSkillExpiry(row.expiryDate)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.notes?.trim() ? row.notes : '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">—</td>
                    {canUpdate ? (
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          title="Remove skill"
                          className="inline-flex rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => void onDeleteSkill(row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
      {canUpdate ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-4 space-y-3">
          <p className="text-xs font-medium text-foreground">Add skill</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Skill type</label>
              <Select value={skillTypeId} onValueChange={setSkillTypeId}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={skillTypeOptions.length ? 'Select skill type' : 'All types assigned'} />
                </SelectTrigger>
                <SelectContent>
                  {skillTypeOptions.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Expiry (optional)</label>
              <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Notes (optional)</label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} className="h-9" />
            </div>
          </div>
          <Button type="button" size="sm" disabled={saving || !skillTypeId.trim()} onClick={() => void onAddSkill()}>
            {saving ? 'Saving…' : 'Add skill'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
