import * as React from 'react'
import { useForm } from 'react-hook-form'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField } from '@/shared/ui/form-field'
import { Combobox } from '@/shared/ui/combobox'
import { Checkbox } from '@/shared/ui/toggle-controls'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useCreateLearningCourse,
  useLearningCategories,
  useUpdateLearningCourse,
} from '@/features/learning/hooks/useLearning'
import type { LearningCourse, LearningCourseInput } from '@/features/learning/types/learning.types'
import {
  LEARNING_COURSE_TYPE_OPTIONS,
  LEARNING_DELIVERY_METHOD_OPTIONS,
} from '@/features/learning/types/learning.types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  course?: LearningCourse | null
  onCreated?: (course: LearningCourse) => void
}

export function CourseFormDialog({ open, onOpenChange, course, onCreated }: Props) {
  const createMut = useCreateLearningCourse()
  const updateMut = useUpdateLearningCourse()
  const categoriesQuery = useLearningCategories({ limit: 100, isActive: true })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<LearningCourseInput>({
    defaultValues: {
      title: '',
      code: '',
      shortDescription: '',
      description: '',
      courseType: 'COURSE',
      deliveryMethod: 'ONLINE',
      isMandatory: false,
      requiresAssessment: false,
      certificateEnabled: true,
      passingScore: 80,
    },
  })

  React.useEffect(() => {
    if (open) {
      reset({
        categoryId: course?.categoryId ?? undefined,
        title: course?.title ?? '',
        code: course?.code ?? '',
        shortDescription: course?.shortDescription ?? '',
        description: course?.description ?? '',
        courseType: course?.courseType ?? 'COURSE',
        deliveryMethod: course?.deliveryMethod ?? 'ONLINE',
        estimatedDurationMinutes: course?.estimatedDurationMinutes ?? undefined,
        cpdMinutes: course?.cpdMinutes ?? undefined,
        isMandatory: course?.isMandatory ?? false,
        requiresAssessment: course?.requiresAssessment ?? false,
        requiresManagerApproval: course?.requiresManagerApproval ?? false,
        passingScore: course?.passingScore ?? 80,
        certificateEnabled: course?.certificateEnabled ?? true,
        certificateValidityDays: course?.certificateValidityDays ?? undefined,
      })
    }
  }, [open, course, reset])

  const onSubmit = handleSubmit(async values => {
    const body: LearningCourseInput = {
      ...values,
      courseType: values.courseType || 'COURSE',
      deliveryMethod: values.deliveryMethod || 'ONLINE',
      categoryId: values.categoryId || undefined,
      shortDescription: values.shortDescription?.trim() || undefined,
      description: values.description?.trim() || undefined,
    }
    try {
      if (course) {
        await updateMut.mutateAsync({ id: course.id, body })
        toastSuccess('Course updated')
        onOpenChange(false)
      } else {
        const created = await createMut.mutateAsync(body)
        toastSuccess('Course created')
        onOpenChange(false)
        onCreated?.(created)
      }
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Save failed'))
    }
  })

  const categoryOptions = (categoriesQuery.data?.rows ?? []).map(c => ({
    value: c.id,
    label: c.name,
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{course ? 'Edit course details' : 'Create course'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="grid gap-4 sm:grid-cols-2">
            <FormField label="Title" className="sm:col-span-2" required>
              <Input {...register('title', { required: true })} />
            </FormField>
            <FormField label="Code" required>
              <Input {...register('code', { required: true })} />
            </FormField>
            <FormField label="Category">
              <Combobox
                value={watch('categoryId') ?? ''}
                onChange={v => setValue('categoryId', v || undefined)}
                options={categoryOptions}
                placeholder="Select category"
              />
            </FormField>
            <FormField label="Course type">
              <Combobox
                value={watch('courseType') ?? 'COURSE'}
                onChange={v => setValue('courseType', v as LearningCourseInput['courseType'])}
                options={LEARNING_COURSE_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                allowDeselect={false}
              />
            </FormField>
            <FormField label="Delivery method">
              <Combobox
                value={watch('deliveryMethod') ?? 'ONLINE'}
                onChange={v => setValue('deliveryMethod', v as LearningCourseInput['deliveryMethod'])}
                options={LEARNING_DELIVERY_METHOD_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                allowDeselect={false}
              />
            </FormField>
            <FormField label="Short description" className="sm:col-span-2">
              <Input {...register('shortDescription')} />
            </FormField>
            <FormField label="Estimated duration (minutes)">
              <Input type="number" {...register('estimatedDurationMinutes', { valueAsNumber: true })} />
            </FormField>
            <FormField label="CPD minutes">
              <Input type="number" {...register('cpdMinutes', { valueAsNumber: true })} />
            </FormField>
            <div className="sm:col-span-2 flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <Checkbox checked={watch('isMandatory')} onCheckedChange={v => setValue('isMandatory', !!v)} />
                Mandatory
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <Checkbox
                  checked={watch('requiresAssessment')}
                  onCheckedChange={v => setValue('requiresAssessment', !!v)}
                />
                Requires assessment
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <Checkbox
                  checked={watch('certificateEnabled')}
                  onCheckedChange={v => setValue('certificateEnabled', !!v)}
                />
                Certificate enabled
              </label>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || createMut.isPending || updateMut.isPending}>
              {course ? 'Save changes' : 'Create course'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
