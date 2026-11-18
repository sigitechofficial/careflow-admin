import * as React from 'react'
import { Loader2, Pencil, Plus } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { Combobox } from '@/shared/ui/combobox'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useCreateLearningCompetency,
  useLearningCategories,
  useLearningCompetencies,
  useUpdateLearningCompetency,
} from '@/features/learning/hooks/useLearning'
import type { LearningCompetency } from '@/features/learning/types/learning.types'
import { useAuthStore } from '@/features/auth/store'

type Errors = Partial<Record<'name' | 'code' | 'validityDays' | 'criteria', string>>

/** One checklist item per line; blank lines ignored. */
function criteriaFromText(text: string): string[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
}

function CompetencyFormDialog({
  open,
  onOpenChange,
  competency,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  competency: LearningCompetency | null
}) {
  const createMut = useCreateLearningCompetency()
  const updateMut = useUpdateLearningCompetency()
  const categoriesQuery = useLearningCategories({ limit: 100, isActive: true })
  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [categoryId, setCategoryId] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [validityDays, setValidityDays] = React.useState('')
  const [criteria, setCriteria] = React.useState('')
  const [isActive, setIsActive] = React.useState(true)
  const [errors, setErrors] = React.useState<Errors>({})

  React.useEffect(() => {
    if (!open) return
    setName(competency?.name ?? '')
    setCode(competency?.code ?? '')
    setCategoryId(competency?.categoryId ?? '')
    setDescription(competency?.description ?? '')
    setValidityDays(competency?.validityDays ? String(competency.validityDays) : '')
    setCriteria((competency?.assessmentCriteria ?? []).join('\n'))
    setIsActive(competency?.isActive ?? true)
    setErrors({})
  }, [open, competency])

  const save = async () => {
    const items = criteriaFromText(criteria)
    const next: Errors = {}
    if (!name.trim()) next.name = 'Enter a name'
    if (!code.trim()) next.code = 'Enter a code'
    let validity: number | null = null
    if (validityDays.trim()) {
      validity = Number(validityDays)
      if (!Number.isInteger(validity) || validity < 1) next.validityDays = 'Enter whole days, 1 or more'
    }
    if (!items.length) next.criteria = 'Add at least one checklist item'
    else if (new Set(items.map(i => i.toLowerCase())).size !== items.length) next.criteria = 'A checklist item is listed twice'
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    const body = {
      name: name.trim(),
      code: code.trim(),
      ...(categoryId ? { categoryId } : {}),
      description: description.trim(),
      validityDays: validity,
      assessmentCriteria: items,
    }
    try {
      if (competency) {
        await updateMut.mutateAsync({ id: competency.id, body: { ...body, isActive } })
        toastSuccess('Competency saved')
      } else {
        await createMut.mutateAsync(body)
        toastSuccess('Competency added')
      }
      onOpenChange(false)
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Save failed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{competency ? 'Edit competency' : 'Add competency'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" required error={errors.name}>
              <Input value={name} maxLength={200} onChange={e => setName(e.target.value)} />
            </FormField>
            <FormField label="Code" required error={errors.code}>
              <Input value={code} maxLength={60} onChange={e => setCode(e.target.value.toUpperCase())} />
            </FormField>
            <FormField label="Category">
              <Combobox
                value={categoryId}
                onChange={v => setCategoryId(v)}
                options={(categoriesQuery.data?.rows ?? []).map(c => ({ value: c.id, label: c.name }))}
                placeholder="None"
                loading={categoriesQuery.isLoading}
              />
            </FormField>
            <FormField label="Valid for (days)" hint="Empty = does not expire" error={errors.validityDays}>
              <Input type="number" min={1} value={validityDays} onChange={e => setValidityDays(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Description">
            <Textarea value={description} rows={2} maxLength={2000} onChange={e => setDescription(e.target.value)} />
          </FormField>
          <FormField
            label="Checklist"
            required
            error={errors.criteria}
            hint="What the assessor checks, one item per line. Courses keep the checklist as it was when they were published."
          >
            <Textarea
              value={criteria}
              rows={6}
              placeholder={'Completes pre-use equipment checks\nExplains each step to the person'}
              onChange={e => setCriteria(e.target.value)}
            />
          </FormField>
          {competency ? (
            <label className="inline-flex items-center gap-2 text-sm">
              <Checkbox checked={isActive} onCheckedChange={v => setIsActive(!!v)} />
              Active (can be linked to courses)
            </label>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={createMut.isPending || updateMut.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CompetenciesPanel() {
  const canManage = useAuthStore(s => s.can('learning.competencies.manage'))
  const query = useLearningCompetencies({ limit: 100 })
  const [dialog, setDialog] = React.useState<{ open: boolean; competency: LearningCompetency | null }>({
    open: false,
    competency: null,
  })
  const rows = query.data?.rows ?? []

  return (
    <div className="space-y-4" data-testid="learning-competencies-panel">
      <ContentSectionHeader
        title="Practical competencies"
        description="Skills an assessor checks in person, each with its checklist. Link one to a practical course in the course builder."
        action={
          canManage ? (
            <Button size="sm" onClick={() => setDialog({ open: true, competency: null })}>
              <Plus className="mr-1 h-4 w-4" />
              Add competency
            </Button>
          ) : undefined
        }
      />

      {query.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No competencies yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Checklist</th>
                <th className="px-3 py-2">Valid for</th>
                {canManage ? <th className="px-3 py-2 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">
                    {row.name}
                    {!row.isActive ? <span className="ml-2 text-xs text-muted-foreground">(inactive)</span> : null}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-3 py-2">{row.assessmentCriteria?.length ?? 0} items</td>
                  <td className="px-3 py-2">{row.validityDays ? `${row.validityDays} days` : 'No expiry'}</td>
                  {canManage ? (
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Edit ${row.name}`}
                        onClick={() => setDialog({ open: true, competency: row })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CompetencyFormDialog
        open={dialog.open}
        onOpenChange={open => setDialog(prev => ({ ...prev, open }))}
        competency={dialog.competency}
      />
    </div>
  )
}
