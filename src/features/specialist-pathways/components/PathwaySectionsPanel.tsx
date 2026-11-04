import * as React from 'react'
import { Check, Save } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { sectionsFor } from '@/features/specialist-pathways/pathway-specs'
import { useUpdatePathwayCase } from '@/features/specialist-pathways/hooks/useSpecialistPathways'
import type {
  PathwayCase,
  PathwaySections,
} from '@/features/specialist-pathways/types/specialist-pathway.types'

type Props = { caseData: PathwayCase }

export function PathwaySectionsPanel({ caseData }: Props) {
  const specs = sectionsFor(caseData.pathwayType)
  const userId = useAuthStore(s => s.user?.id ?? null)
  const canManage = useAuthStore(s => s.can)('specialist_pathways.manage')
  const update = useUpdatePathwayCase(caseData.id)

  const [draft, setDraft] = React.useState<PathwaySections>(caseData.sections ?? {})

  // Keep local draft in sync when the server copy changes (e.g. after save).
  React.useEffect(() => {
    setDraft(caseData.sections ?? {})
  }, [caseData.sections])

  const setField = (sectionKey: string, fieldId: string, value: string) => {
    setDraft(prev => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] ?? { fields: {} }),
        fields: { ...(prev[sectionKey]?.fields ?? {}), [fieldId]: value },
      },
    }))
  }

  const toggleReviewed = (sectionKey: string) => {
    setDraft(prev => {
      const current = prev[sectionKey] ?? { fields: {} }
      const reviewed = !!current.verifiedAt
      return {
        ...prev,
        [sectionKey]: {
          ...current,
          verifiedAt: reviewed ? null : new Date().toISOString(),
          verifiedById: reviewed ? null : userId,
        },
      }
    })
  }

  const onSave = () => {
    update.mutate(
      { sections: draft },
      {
        onSuccess: () => toastSuccess('Assessment saved'),
        onError: e => toastApiError(e, 'Could not save assessment'),
      },
    )
  }

  if (specs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          No assessment sections are configured for this pathway yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="pathway-sections-panel">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {specs.length} assessment sections
        </p>
        {canManage && (
          <Button onClick={onSave} disabled={update.isPending}>
            <Save className="mr-2 h-4 w-4" aria-hidden />
            {update.isPending ? 'Saving…' : 'Save assessment'}
          </Button>
        )}
      </div>

      {specs.map(section => {
        const stored = draft[section.key]
        const reviewed = !!stored?.verifiedAt
        return (
          <Card key={section.key}>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">{section.title}</CardTitle>
              {canManage && (
                <Button
                  type="button"
                  size="sm"
                  variant={reviewed ? 'secondary' : 'outline'}
                  onClick={() => toggleReviewed(section.key)}
                >
                  <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  {reviewed ? 'Reviewed' : 'Mark reviewed'}
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {section.fields.map(field => {
                const value = stored?.fields?.[field.id] ?? ''
                const id = `${section.key}.${field.id}`
                return (
                  <div key={field.id} className="flex flex-col gap-1.5">
                    <label htmlFor={id} className="text-sm font-medium text-foreground">
                      {field.label}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        id={id}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                        value={value}
                        disabled={!canManage}
                        onChange={e => setField(section.key, field.id, e.target.value)}
                      >
                        <option value="">—</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <textarea
                        id={id}
                        className="min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                        value={value}
                        disabled={!canManage}
                        onChange={e => setField(section.key, field.id, e.target.value)}
                      />
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
