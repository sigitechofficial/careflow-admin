import * as React from 'react'
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField } from '@/shared/ui/form-field'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useCreateAssessmentQuestion,
  useCreateLearningAssessment,
  useCreateLearningContentItem,
  useCreateLearningSection,
  useDeleteAssessmentQuestion,
  useDeleteLearningAssessment,
  useDeleteLearningContentItem,
  useDeleteLearningSection,
  useLearningCourseVersion,
  useLearningCourseVersions,
  useLearningSettings,
  usePublishLearningCourse,
  useUpdateLearningCourse,
} from '@/features/learning/hooks/useLearning'
import type { LearningCourse } from '@/features/learning/types/learning.types'
import { LearningStatusBadge } from '@/features/learning/components/LearningStatusBadge'
import { useAuthStore } from '@/features/auth/store'

const STEPS = ['Details', 'Content', 'Assessment', 'Completion', 'Review'] as const
type StepId = (typeof STEPS)[number]

type Props = {
  course: LearningCourse
  onCourseUpdated?: () => void
}

export function CourseBuilderPanel({ course, onCourseUpdated }: Props) {
  const canManage = useAuthStore(s => s.can('learning.courses.manage'))
  const [step, setStep] = React.useState<StepId>('Details')
  const [changeSummary, setChangeSummary] = React.useState('')

  const versionsQuery = useLearningCourseVersions(course.id)
  const draftVersion = React.useMemo(
    () => versionsQuery.data?.find(v => v.status === 'DRAFT') ?? versionsQuery.data?.[0],
    [versionsQuery.data],
  )

  const versionQuery = useLearningCourseVersion(course.id, draftVersion?.id ?? null, !!draftVersion?.id)
  const version = versionQuery.data

  const updateCourseMut = useUpdateLearningCourse()
  const { data: learningSettings } = useLearningSettings()
  const createSectionMut = useCreateLearningSection()
  const createContentMut = useCreateLearningContentItem()
  const deleteSectionMut = useDeleteLearningSection()
  const deleteContentMut = useDeleteLearningContentItem()
  const createAssessmentMut = useCreateLearningAssessment()
  const deleteAssessmentMut = useDeleteLearningAssessment()
  const createQuestionMut = useCreateAssessmentQuestion()
  const deleteQuestionMut = useDeleteAssessmentQuestion()
  const publishMut = usePublishLearningCourse()

  const [detailsForm, setDetailsForm] = React.useState({
    title: course.title,
    shortDescription: course.shortDescription ?? '',
    description: course.description ?? '',
    passingScore: course.passingScore ?? 80,
    maximumAttempts: course.maximumAttempts ?? 3,
    /** Empty = inherit the Learning settings default (stored as null). */
    certificateValidityDays: course.certificateValidityDays ?? null,
  })

  React.useEffect(() => {
    setDetailsForm({
      title: course.title,
      shortDescription: course.shortDescription ?? '',
      description: course.description ?? '',
      passingScore: course.passingScore ?? 80,
      maximumAttempts: course.maximumAttempts ?? 3,
      certificateValidityDays: course.certificateValidityDays ?? null,
    })
  }, [course])

  const stepIndex = STEPS.indexOf(step)

  const saveDetails = async () => {
    try {
      await updateCourseMut.mutateAsync({
        id: course.id,
        body: {
          title: detailsForm.title,
          shortDescription: detailsForm.shortDescription,
          description: detailsForm.description,
          passingScore: detailsForm.passingScore,
          maximumAttempts: detailsForm.maximumAttempts,
          certificateValidityDays: detailsForm.certificateValidityDays,
        },
      })
      toastSuccess('Course details saved')
      onCourseUpdated?.()
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Save failed'))
    }
  }

  const addSection = async () => {
    if (!draftVersion?.id) return
    const title = window.prompt('Section title')
    if (!title?.trim()) return
    try {
      await createSectionMut.mutateAsync({
        versionId: draftVersion.id,
        body: { title: title.trim(), displayOrder: version?.sections?.length ?? 0 },
      })
      void versionQuery.refetch()
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Failed to add section'))
    }
  }

  const addContent = async (sectionId: string) => {
    const title = window.prompt('Content item title')
    if (!title?.trim()) return
    try {
      await createContentMut.mutateAsync({
        sectionId,
        body: {
          contentType: 'TEXT',
          title: title.trim(),
          contentBody: '',
          isRequired: true,
        },
      })
      void versionQuery.refetch()
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Failed to add content'))
    }
  }

  const addAssessment = async () => {
    if (!draftVersion?.id) return
    try {
      await createAssessmentMut.mutateAsync({
        versionId: draftVersion.id,
        body: {
          title: 'Course assessment',
          passingScore: detailsForm.passingScore,
          maximumAttempts: detailsForm.maximumAttempts,
          isRequired: true,
        },
      })
      void versionQuery.refetch()
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Failed to create assessment'))
    }
  }

  const addQuestion = async (assessmentId: string) => {
    const text = window.prompt('Question text')
    if (!text?.trim()) return
    try {
      await createQuestionMut.mutateAsync({
        assessmentId,
        body: {
          questionType: 'SINGLE_CHOICE',
          questionText: text.trim(),
          options: [
            { optionText: 'True', isCorrect: true, displayOrder: 0 },
            { optionText: 'False', isCorrect: false, displayOrder: 1 },
          ],
        },
      })
      void versionQuery.refetch()
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Failed to add question'))
    }
  }

  const onPublish = async () => {
    try {
      await publishMut.mutateAsync({ id: course.id, changeSummary: changeSummary || undefined })
      toastSuccess('Course published')
      onCourseUpdated?.()
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Publish failed'))
    }
  }

  if (versionsQuery.isLoading || versionQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!draftVersion) {
    return (
      <p className="text-sm text-muted-foreground">
        No editable version found. Create a new version from the course header to continue building.
      </p>
    )
  }

  return (
    <div className="space-y-6" data-testid="course-builder-panel">
      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((label, idx) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(label)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              step === label
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {idx + 1}. {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          Editing <LearningStatusBadge status={draftVersion.status} size="sm" /> v{draftVersion.versionNumber}
        </span>
      </div>

      {step === 'Details' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Title" className="sm:col-span-2">
            <Input
              value={detailsForm.title}
              onChange={e => setDetailsForm(prev => ({ ...prev, title: e.target.value }))}
              disabled={!canManage}
            />
          </FormField>
          <FormField label="Short description" className="sm:col-span-2">
            <Input
              value={detailsForm.shortDescription}
              onChange={e => setDetailsForm(prev => ({ ...prev, shortDescription: e.target.value }))}
              disabled={!canManage}
            />
          </FormField>
          <FormField label="Description" className="sm:col-span-2">
            <Input
              value={detailsForm.description}
              onChange={e => setDetailsForm(prev => ({ ...prev, description: e.target.value }))}
              disabled={!canManage}
            />
          </FormField>
          {canManage ? (
            <div className="sm:col-span-2">
              <Button type="button" onClick={() => void saveDetails()}>
                Save details
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 'Content' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Sections & content</h3>
            {canManage ? (
              <Button size="sm" variant="outline" onClick={() => void addSection()}>
                <Plus className="mr-1 h-4 w-4" />
                Add section
              </Button>
            ) : null}
          </div>
          {(version?.sections ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No sections yet. Add a section to start building content.</p>
          ) : (
            (version?.sections ?? []).map(section => (
              <div key={section.id} className="rounded-lg border border-border p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="font-medium">{section.title}</h4>
                  {canManage ? (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() =>
                        void deleteSectionMut.mutateAsync(section.id).then(() => versionQuery.refetch())
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <ul className="space-y-2">
                  {(section.contentItems ?? []).map(item => (
                    <li key={item.id} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-sm">
                      <span>
                        {item.title}{' '}
                        <span className="text-xs text-muted-foreground">({item.contentType})</span>
                      </span>
                      {canManage ? (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() =>
                            void deleteContentMut.mutateAsync(item.id).then(() => versionQuery.refetch())
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {canManage ? (
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => void addContent(section.id)}>
                    Add content item
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}

      {step === 'Assessment' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Assessments</h3>
            {canManage ? (
              <Button size="sm" variant="outline" onClick={() => void addAssessment()}>
                <Plus className="mr-1 h-4 w-4" />
                Add assessment
              </Button>
            ) : null}
          </div>
          {(version?.assessments ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No assessments configured.</p>
          ) : (
            (version?.assessments ?? []).map(assessment => (
              <div key={assessment.id} className="rounded-lg border border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{assessment.title}</h4>
                    <p className="text-xs text-muted-foreground">Pass {assessment.passingScore}%</p>
                  </div>
                  {canManage ? (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() =>
                        void deleteAssessmentMut.mutateAsync(assessment.id).then(() => versionQuery.refetch())
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <ul className="space-y-2">
                  {(assessment.questions ?? []).map(q => (
                    <li key={q.id} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-sm">
                      <span>{q.questionText}</span>
                      {canManage ? (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() =>
                            void deleteQuestionMut.mutateAsync(q.id).then(() => versionQuery.refetch())
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {canManage ? (
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => void addQuestion(assessment.id)}>
                    Add question
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}

      {step === 'Completion' ? (
        <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
          <FormField label="Passing score (%)">
            <Input
              type="number"
              min={0}
              max={100}
              value={detailsForm.passingScore}
              onChange={e => setDetailsForm(prev => ({ ...prev, passingScore: Number(e.target.value) }))}
              disabled={!canManage}
            />
          </FormField>
          <FormField label="Maximum attempts">
            <Input
              type="number"
              min={1}
              value={detailsForm.maximumAttempts}
              onChange={e => setDetailsForm(prev => ({ ...prev, maximumAttempts: Number(e.target.value) }))}
              disabled={!canManage}
            />
          </FormField>
          <FormField
            label="Certificate validity (days)"
            hint={
              learningSettings?.defaultCertificateValidityDays
                ? `Leave empty to use the Learning settings default (${learningSettings.defaultCertificateValidityDays} days).`
                : 'Leave empty to use the Learning settings default.'
            }
          >
            <Input
              type="number"
              min={1}
              value={detailsForm.certificateValidityDays ?? ''}
              placeholder={learningSettings?.defaultCertificateValidityDays ? String(learningSettings.defaultCertificateValidityDays) : 'Default'}
              onChange={e => {
                const n = Number.parseInt(e.target.value, 10)
                setDetailsForm(prev => ({
                  ...prev,
                  certificateValidityDays: e.target.value.trim() && Number.isInteger(n) && n >= 1 ? n : null,
                }))
              }}
              disabled={!canManage}
            />
          </FormField>
          {canManage ? (
            <div className="sm:col-span-2">
              <Button type="button" onClick={() => void saveDetails()}>
                Save completion rules
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 'Review' ? (
        <div className="space-y-4 max-w-xl">
          <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm space-y-2">
            <p>
              <span className="font-medium">Sections:</span> {version?.sections?.length ?? 0}
            </p>
            <p>
              <span className="font-medium">Content items:</span>{' '}
              {(version?.sections ?? []).reduce((n, s) => n + (s.contentItems?.length ?? 0), 0)}
            </p>
            <p>
              <span className="font-medium">Assessments:</span> {version?.assessments?.length ?? 0}
            </p>
            <p>
              <span className="font-medium">Passing score:</span> {detailsForm.passingScore}%
            </p>
          </div>
          {canManage ? (
            <>
              <FormField label="Change summary (optional)">
                <Input value={changeSummary} onChange={e => setChangeSummary(e.target.value)} />
              </FormField>
              <Button onClick={() => void onPublish()} disabled={publishMut.isPending}>
                Publish draft version
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="flex justify-between border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={stepIndex <= 0}
          onClick={() => {
            const prev = STEPS[stepIndex - 1]
            if (prev) setStep(prev)
          }}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button
          type="button"
          disabled={stepIndex >= STEPS.length - 1}
          onClick={() => {
            const next = STEPS[stepIndex + 1]
            if (next) setStep(next)
          }}
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
