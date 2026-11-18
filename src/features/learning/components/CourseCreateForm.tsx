import * as React from 'react'
import { CourseKindPicker } from '@/features/learning/components/CourseKindPicker'
import { SideCard, TwoColumn } from '@/features/learning/components/builder-layout'
import { useNavigate } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { Combobox } from '@/shared/ui/combobox'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useCreateLearningCourse,
  useLearningCategories,
  useSuggestLearningCourseCode,
} from '@/features/learning/hooks/useLearning'
import {
  courseKindOf,
  type LearningCourseKind,
  type LearningCourseType,
  type LearningDeliveryMethod,
} from '@/features/learning/types/learning.types'
import { LEARNING_PATHS } from '@/features/learning/learning-routes'

type Errors = Partial<Record<'title' | 'code' | 'categoryId' | 'courseType' | 'deliveryMethod' | 'duration', string>>

/** Full-page "New course" form. Creates the course + draft v1 and opens the builder. */
export function CourseCreateForm() {
  const navigate = useNavigate()
  const createMut = useCreateLearningCourse()
  const suggestMut = useSuggestLearningCourseCode()
  const categoriesQuery = useLearningCategories({ limit: 100, isActive: true })

  const [title, setTitle] = React.useState('')
  const [categoryId, setCategoryId] = React.useState('')
  const [code, setCode] = React.useState('')
  const [codeEdited, setCodeEdited] = React.useState(false)
  const [courseType, setCourseType] = React.useState<LearningCourseType | ''>('COURSE')
  const [deliveryMethod, setDeliveryMethod] = React.useState<LearningDeliveryMethod | ''>('ONLINE')
  const [description, setDescription] = React.useState('')
  const [duration, setDuration] = React.useState('')
  const [learningObjectives, setLearningObjectives] = React.useState('')
  const [errors, setErrors] = React.useState<Errors>({})

  const categoryOptions = (categoriesQuery.data?.rows ?? []).map(c => ({ value: c.id, label: c.name }))

  const clearError = (key: keyof Errors) => setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev))

  const suggestCode = async (forCategory: string) => {
    try {
      const { code: next } = await suggestMut.mutateAsync(forCategory)
      setCode(next)
      setCodeEdited(false)
      clearError('code')
    } catch {
      // Leave the code box as it is; the admin can type one.
    }
  }

  const onCategoryChange = (value: string) => {
    setCategoryId(value)
    clearError('categoryId')
    // Suggest a code for the new category unless the admin typed their own.
    if (value && (!codeEdited || !code.trim())) void suggestCode(value)
  }

  const validate = (): Errors => {
    const next: Errors = {}
    if (!title.trim()) next.title = 'Enter a course title'
    if (!categoryId) next.categoryId = 'Choose a category'
    if (!code.trim()) next.code = 'Enter a course code'
    if (!courseType) next.courseType = 'Choose a course type'
    if (!deliveryMethod) next.deliveryMethod = 'Choose how it is delivered'
    if (duration.trim()) {
      const n = Number(duration)
      if (!Number.isInteger(n) || n < 1) next.duration = 'Enter whole minutes, 1 or more'
    }
    return next
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.values(found).some(Boolean)) return
    try {
      const created = await createMut.mutateAsync({
        title: title.trim(),
        code: code.trim(),
        categoryId,
        courseType: courseType as LearningCourseType,
        deliveryMethod: deliveryMethod as LearningDeliveryMethod,
        description: description.trim() || undefined,
        estimatedDurationMinutes: duration.trim() ? Number(duration) : undefined,
        learningObjectives: learningObjectives.trim() || undefined,
      })
      toastSuccess('Draft course created')
      void navigate({ to: LEARNING_PATHS.courseDetail, params: { courseId: created.id } })
    } catch (err) {
      // Keep everything the admin typed; show the reason next to the code when it clashes.
      if (err instanceof ApiError && err.status === 409) {
        setErrors(prev => ({ ...prev, code: 'This code is already used. Pick another or suggest one.' }))
        return
      }
      toastApiError(err instanceof ApiError ? err : new Error('Could not create the course'))
    }
  }

  return (
    <form onSubmit={onSubmit} data-testid="learning-course-create-form" noValidate>
      {/* Wide screens: form in the main column, guidance on the right (17 Nov 2026). */}
      <TwoColumn
        main={
      <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Course title" required error={errors.title} className="sm:col-span-2">
          <Input
            value={title}
            maxLength={200}
            placeholder="Safeguarding adults awareness"
            onChange={e => {
              setTitle(e.target.value)
              clearError('title')
            }}
          />
        </FormField>

        <FormField label="Category" required error={errors.categoryId}>
          <Combobox
            value={categoryId}
            onChange={onCategoryChange}
            options={categoryOptions}
            placeholder="Choose a category"
            loading={categoriesQuery.isLoading}
            allowDeselect={false}
            error={Boolean(errors.categoryId)}
          />
        </FormField>

        <FormField
          label="Course code"
          required
          error={errors.code}
          hint="Suggested from the category, e.g. SAFEGUARDING-001. You can change it."
        >
          <div className="flex gap-2">
            <Input
              value={code}
              maxLength={60}
              placeholder="SAFEGUARDING-001"
              onChange={e => {
                setCode(e.target.value.toUpperCase())
                setCodeEdited(true)
                clearError('code')
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Suggest a code"
              title="Suggest a code"
              disabled={!categoryId || suggestMut.isPending}
              onClick={() => void suggestCode(categoryId)}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </FormField>

        <FormField label="Course type" required error={errors.deliveryMethod} className="sm:col-span-2">
          <CourseKindPicker
            value={courseKindOf({ courseType, deliveryMethod })}
            onChange={kind => {
              // One choice (17 Nov 2026): stored as a training course with this delivery method.
              setCourseType('COURSE')
              setDeliveryMethod(kind)
              clearError('courseType')
              clearError('deliveryMethod')
            }}
          />
        </FormField>

        <FormField label="Description" hint="What the course covers. Shown in the course list." className="sm:col-span-2">
          <Textarea
            value={description}
            rows={3}
            maxLength={2000}
            placeholder="Recognise abuse and report concerns"
            onChange={e => setDescription(e.target.value)}
          />
        </FormField>

        <FormField label="Estimated duration (minutes)" error={errors.duration}>
          <Input
            type="number"
            min={1}
            step={1}
            value={duration}
            placeholder="45"
            onChange={e => {
              setDuration(e.target.value)
              clearError('duration')
            }}
          />
        </FormField>

        <FormField
          label="Learning objectives"
          hint="What the learner should know or be able to do. One per line."
          className="sm:col-span-2"
        >
          <Textarea
            value={learningObjectives}
            rows={4}
            maxLength={4000}
            placeholder={'Recognise the types of abuse\nKnow how to report a concern'}
            onChange={e => setLearningObjectives(e.target.value)}
          />
        </FormField>
      </div>

      <p className="text-sm text-muted-foreground">
        The course is saved as a draft (version 1). You add lessons, quizzes and completion rules in the
        course builder next.
      </p>

      <div className="flex gap-2">
        <Button type="submit" disabled={createMut.isPending}>
          {createMut.isPending ? 'Creating…' : 'Create draft'}
        </Button>
        <Button type="button" variant="outline" onClick={() => void navigate({ to: LEARNING_PATHS.courses })}>
          Cancel
        </Button>
      </div>
      </div>
        }
        side={<NewCourseGuide kind={courseKindOf({ courseType, deliveryMethod })} />}
      />
    </form>
  )
}

/** What each course type means in practice (17 Nov 2026). */
const KIND_GUIDE: Record<LearningCourseKind, { title: string; points: string[] }> = {
  ONLINE: {
    title: 'Online course',
    points: [
      'The carer opens it in the app and works through the lessons',
      'Add quizzes or a final assessment if needed; a quiz-only course is fine',
      'It completes by itself and the certificate is issued',
    ],
  },
  FACE_TO_FACE: {
    title: 'Face to face course',
    points: [
      'Book a session in Training events and record attendance',
      'The office starts the course and marks the lessons done',
      'Any quiz is done by the carer in the app',
      'Add a practical test on the Finish step if needed',
      'A manager records the result',
    ],
  },
  WORKPLACE: {
    title: 'Workplace course',
    points: [
      'Done on the job, no session to book',
      'The office starts the course and marks the lessons done',
      'Any quiz is done by the carer in the app',
      'Add a practical test on the Finish step if needed',
      'A manager records the result',
    ],
  },
}

const BUILDER_STEPS = ['Details', 'Course outline', 'Final assessment', 'Finish and certificate', 'Review and publish']

function NewCourseGuide({ kind }: { kind: LearningCourseKind }) {
  const guide = KIND_GUIDE[kind]
  return (
    <>
      <SideCard title={guide.title} testId="new-course-kind-guide">
        <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
          {guide.points.map(p => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </SideCard>
      <SideCard title="What comes next">
        <ol className="space-y-1.5 text-sm">
          {BUILDER_STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span
                className={
                  i === 0
                    ? 'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground'
                    : 'flex h-5 w-5 items-center justify-center rounded-full border border-border text-[11px] text-muted-foreground'
                }
              >
                {i + 1}
              </span>
              <span className={i === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                {step}
                {i === 0 ? ' · you are here' : ''}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          The course is saved as a draft. Carers see it only after you publish it.
        </p>
      </SideCard>
    </>
  )
}
