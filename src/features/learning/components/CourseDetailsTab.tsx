import * as React from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { Panel, TwoColumn } from '@/features/learning/components/builder-layout'
import { CompletionSummaryCard, CourseInfoCard, VersionHistoryCard } from '@/features/learning/components/CourseSidebarCards'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField } from '@/shared/ui/form-field'
import { Combobox } from '@/shared/ui/combobox'
import { RichTextEditor } from '@/shared/ui/rich-text-editor'
import { RichTextHtml } from '@/shared/ui/rich-text-html'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useLearningCategories, useUpdateLearningCourse } from '@/features/learning/hooks/useLearning'
import {
  CREATABLE_COURSE_TYPES,
  LEARNING_COURSE_TYPE_OPTIONS,
  LEARNING_DELIVERY_METHOD_OPTIONS,
  type LearningCourse,
  type LearningCourseType,
  type LearningCourseVersion,
  type LearningDeliveryMethod,
} from '@/features/learning/types/learning.types'

type Props = {
  course: LearningCourse
  version: LearningCourseVersion
  readOnly: boolean
  onSaved?: () => void
}

type Form = {
  title: string
  description: string
  learningObjectives: string
  categoryId: string
  courseType: LearningCourseType | ''
  deliveryMethod: LearningDeliveryMethod | ''
  duration: string
}

type Errors = Partial<Record<'title' | 'categoryId' | 'courseType' | 'deliveryMethod' | 'duration', string>>

function formFrom(course: LearningCourse, version: LearningCourseVersion): Form {
  return {
    title: course.title,
    // One description; older courses may only have the old short description.
    description: course.description || course.shortDescription || '',
    learningObjectives: version.learningObjectives ?? '',
    categoryId: course.categoryId ?? '',
    courseType: course.courseType ?? '',
    deliveryMethod: course.deliveryMethod ?? '',
    duration: course.estimatedDurationMinutes ? String(course.estimatedDurationMinutes) : '',
  }
}

/** Builder step 1. Course fields live on the course; learning objectives on the draft version. */
export function CourseDetailsTab({ course, version, readOnly, onSaved }: Props) {
  const updateMut = useUpdateLearningCourse()
  const categoriesQuery = useLearningCategories({ limit: 100, isActive: true })
  const [form, setForm] = React.useState<Form>(() => formFrom(course, version))
  const [errors, setErrors] = React.useState<Errors>({})
  // Remount the editor when the saved data changes, so it shows the new value.
  const [editorKey, setEditorKey] = React.useState(0)

  React.useEffect(() => {
    setForm(formFrom(course, version))
    setErrors({})
    setEditorKey(k => k + 1)
  }, [course, version])

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (key in errors) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const categoryOptions = (categoriesQuery.data?.rows ?? []).map(c => ({ value: c.id, label: c.name }))
  // A retired category stays visible on old courses.
  if (course.categoryId && categoriesQuery.data && !categoryOptions.some(o => o.value === course.categoryId)) {
    categoryOptions.push({ value: course.categoryId, label: 'Retired category' })
  }

  const typeOptions = CREATABLE_COURSE_TYPES.map(t => ({ value: t.value, label: t.label }))
  const legacyType = course.courseType && !CREATABLE_COURSE_TYPES.some(t => t.value === course.courseType)
  if (legacyType && course.courseType) {
    const label = LEARNING_COURSE_TYPE_OPTIONS.find(o => o.value === course.courseType)?.label ?? course.courseType
    typeOptions.push({ value: course.courseType, label: `${label} (old type)` })
  }
  const typeDef = CREATABLE_COURSE_TYPES.find(t => t.value === form.courseType)
  const deliveryOptions = typeDef
    ? LEARNING_DELIVERY_METHOD_OPTIONS.filter(o => typeDef.deliveryMethods.includes(o.value))
    : LEARNING_DELIVERY_METHOD_OPTIONS

  const onTypeChange = (value: string) => {
    const next = value as LearningCourseType
    const allowed = CREATABLE_COURSE_TYPES.find(t => t.value === next)?.deliveryMethods
    setForm(prev => ({
      ...prev,
      courseType: next,
      deliveryMethod: !allowed || (prev.deliveryMethod && allowed.includes(prev.deliveryMethod)) ? prev.deliveryMethod : (allowed[0] ?? ''),
    }))
    setErrors(prev => ({ ...prev, courseType: undefined, deliveryMethod: undefined }))
  }

  const validate = (): Errors => {
    const next: Errors = {}
    if (!form.title.trim()) next.title = 'Enter a course title'
    if (!form.categoryId) next.categoryId = 'Choose a category'
    if (!form.courseType) next.courseType = 'Choose a type'
    if (!form.deliveryMethod) next.deliveryMethod = 'Choose how it is delivered'
    if (form.duration.trim()) {
      const n = Number(form.duration)
      if (!Number.isInteger(n) || n < 1) next.duration = 'Enter whole minutes, 1 or more'
    }
    return next
  }

  const save = async () => {
    const found = validate()
    setErrors(found)
    if (Object.values(found).some(Boolean)) return
    try {
      await updateMut.mutateAsync({
        id: course.id,
        body: {
          title: form.title.trim(),
          description: form.description,
          learningObjectives: form.learningObjectives
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean)
            .join('\n'),
          categoryId: form.categoryId,
          courseType: form.courseType || undefined,
          deliveryMethod: form.deliveryMethod || undefined,
          ...(form.duration.trim() ? { estimatedDurationMinutes: Number(form.duration) } : {}),
        },
      })
      toastSuccess('Course details saved')
      onSaved?.()
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Save failed'))
    }
  }

  return (
    <TwoColumn
      side={
        <>
          <CourseInfoCard course={course} version={version} />
          <CompletionSummaryCard course={course} version={version} />
          <VersionHistoryCard courseId={course.id} />
        </>
      }
      main={
    <Panel title="Course details" description="The core information about this course. It appears in the course list and to carers.">
    <div className="grid gap-4 sm:grid-cols-2" data-testid="course-details-tab">
      <FormField label="Course title" required error={errors.title} className="sm:col-span-2">
        <Input value={form.title} maxLength={200} onChange={e => set('title', e.target.value)} disabled={readOnly} />
      </FormField>
      <FormField label="Course code" hint="Set when the course was created" className="sm:col-span-2">
        <Input value={course.code} disabled />
      </FormField>
      <FormField label="Category" required error={errors.categoryId}>
        <Combobox
          value={form.categoryId}
          onChange={v => set('categoryId', v)}
          options={categoryOptions}
          placeholder="Choose a category"
          allowDeselect={false}
          loading={categoriesQuery.isLoading}
          disabled={readOnly}
        />
      </FormField>
      <FormField label="Estimated time (minutes)" error={errors.duration}>
        <Input
          type="number"
          min={1}
          value={form.duration}
          onChange={e => set('duration', e.target.value)}
          disabled={readOnly}
        />
      </FormField>
      <FormField label="Type" required error={errors.courseType}>
        <Combobox
          value={form.courseType}
          onChange={onTypeChange}
          options={typeOptions}
          allowDeselect={false}
          disabled={readOnly}
        />
      </FormField>
      <FormField label="Delivery" required error={errors.deliveryMethod}>
        <Combobox
          value={form.deliveryMethod}
          onChange={v => set('deliveryMethod', v as LearningDeliveryMethod)}
          options={deliveryOptions.map(o => ({ value: o.value, label: o.label }))}
          allowDeselect={false}
          disabled={readOnly}
        />
      </FormField>
      <FormField
        label="Description"
        hint="What the course covers. Shown in the course list and in Preview as carer."
        className="sm:col-span-2"
      >
        {readOnly ? (
          form.description ? (
            <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
              <RichTextHtml html={form.description} className="prose prose-sm max-w-none dark:prose-invert" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No description.</p>
          )
        ) : (
          <RichTextEditor
            key={editorKey}
            value={form.description}
            onChange={html => set('description', html)}
            placeholder="What the course covers and who it is for"
            minHeight={140}
          />
        )}
      </FormField>
      <FormField
        label="Learning objectives"
        hint="What the carer will be able to do after the course."
        className="sm:col-span-2"
      >
        <ObjectivesEditor
          value={form.learningObjectives}
          onChange={v => set('learningObjectives', v)}
          readOnly={readOnly}
        />
      </FormField>
      {!readOnly ? (
        <div className="flex justify-end border-t border-border pt-4 sm:col-span-2">
          <Button type="button" onClick={() => void save()} disabled={updateMut.isPending}>
            <Save className="mr-1 h-4 w-4" />
            Save details
          </Button>
        </div>
      ) : null}
    </div>
    </Panel>
      }
    />
  )
}

/** One input per objective; stored as one objective per line (as before). */
function ObjectivesEditor({ value, onChange, readOnly }: { value: string; onChange: (v: string) => void; readOnly: boolean }) {
  const lines = value.split('\n')
  const items = lines.length === 1 && lines[0] === '' ? [] : lines
  const update = (next: string[]) => onChange(next.join('\n'))
  if (readOnly) {
    return items.filter(i => i.trim()).length ? (
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {items.filter(i => i.trim()).map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-muted-foreground">No learning objectives.</p>
    )
  }
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-5 text-right text-xs text-muted-foreground">{i + 1}.</span>
          <Input
            value={item}
            maxLength={300}
            placeholder="Recognise possible signs of abuse"
            onChange={e => update(items.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <Button type="button" size="icon-sm" variant="ghost" aria-label={`Remove objective ${i + 1}`} onClick={() => update(items.filter((_, j) => j !== i))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => update([...items, ''])}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add learning objective
      </button>
    </div>
  )
}
