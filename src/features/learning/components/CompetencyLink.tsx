import { ApiError } from '@/shared/api/api-client'
import { Combobox } from '@/shared/ui/combobox'
import { FormField } from '@/shared/ui/form-field'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useLearningCompetencies, useUpdateLearningCourse } from '@/features/learning/hooks/useLearning'
import type { LearningCourse, LearningCourseVersion } from '@/features/learning/types/learning.types'

type Props = {
  course: LearningCourse
  version: LearningCourseVersion
  readOnly: boolean
  onChanged: () => void
}

function failed(err: unknown, fallback: string) {
  toastApiError(err instanceof ApiError ? err : new Error(fallback))
}

/** Practical competency on the draft version. Its checklist is frozen into the version at publish. */
export function CompetencyLink({ course, version, readOnly, onChanged }: Props) {
  const competenciesQuery = useLearningCompetencies({ limit: 100 })
  const updateMut = useUpdateLearningCourse()
  const all = competenciesQuery.data?.rows ?? []
  const linked = all.find(c => c.id === version.competencyId) ?? null
  const snapshot = Array.isArray(version.competencyChecklistSnapshot) ? version.competencyChecklistSnapshot : null
  const checklist = version.status === 'DRAFT' ? (linked?.assessmentCriteria ?? []) : (snapshot ?? linked?.assessmentCriteria ?? [])

  const options = all
    .filter(c => c.isActive || c.id === version.competencyId)
    .map(c => ({ value: c.id, label: c.isActive ? `${c.name} (${c.code})` : `${c.name} (inactive)` }))

  const change = async (value: string) => {
    const next = value || null
    if (next === (version.competencyId ?? null)) return
    try {
      await updateMut.mutateAsync({ id: course.id, body: { competencyId: next } })
      toastSuccess(next ? 'Practical competency linked' : 'Practical competency removed')
      onChanged()
    } catch (err) {
      failed(err, 'Could not change the competency')
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Practical competency</h3>
        <p className="text-xs text-muted-foreground">
          A skill an assessor checks in person. Competencies and their checklists are managed in Learning settings.
          {course.courseType === 'PRACTICAL_COMPETENCY' ? ' A practical competency course needs one.' : ''}
        </p>
      </div>
      <FormField label="Competency" className="max-w-md">
        <Combobox
          value={version.competencyId ?? ''}
          onChange={v => void change(v)}
          options={options}
          placeholder="None"
          loading={competenciesQuery.isLoading}
          disabled={readOnly || updateMut.isPending}
        />
      </FormField>
      {version.competencyId && checklist.length ? (
        <div className="max-w-xl rounded-lg border border-border p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Checklist{version.status !== 'DRAFT' && snapshot ? ' (as published)' : ''}
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {checklist.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
