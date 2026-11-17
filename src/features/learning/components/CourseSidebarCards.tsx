import { BookOpen, CircleHelp, Clock, Layers, ListChecks, Monitor, Tag, History, Info } from 'lucide-react'
import { useLearningCategories, useLearningSettings } from '@/features/learning/hooks/useLearning'
import {
  CREATABLE_COURSE_TYPES,
  LEARNING_COURSE_TYPE_OPTIONS,
  LEARNING_DELIVERY_METHOD_OPTIONS,
  type LearningCourse,
  type LearningCourseVersion,
} from '@/features/learning/types/learning.types'
import { CheckLine, InfoRow, SideCard } from '@/features/learning/components/builder-layout'
import { VersionHistoryPanel } from '@/features/learning/components/VersionHistoryPanel'

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

/** Counts and labels every builder tab shows, worked out from the course and its version. */
export function useCourseFacts(course: LearningCourse, version: LearningCourseVersion) {
  const categories = useLearningCategories({ limit: 100 })
  const { data: settings } = useLearningSettings()
  const modules = version.sections ?? []
  const lessons = modules.flatMap(m => m.contentItems ?? [])
  const quizzes = version.assessments ?? []
  const moduleQuizzes = quizzes.filter(q => q.sectionId)
  const finals = quizzes.filter(q => !q.sectionId)
  const requiredModuleQuizzes = moduleQuizzes.filter(q => q.isRequired !== false)
  return {
    categoryName: categories.data?.rows.find(c => c.id === course.categoryId)?.name ?? '—',
    typeLabel:
      CREATABLE_COURSE_TYPES.find(t => t.value === course.courseType)?.label ??
      LEARNING_COURSE_TYPE_OPTIONS.find(t => t.value === course.courseType)?.label ??
      '—',
    deliveryLabel: LEARNING_DELIVERY_METHOD_OPTIONS.find(o => o.value === course.deliveryMethod)?.label ?? '—',
    duration: course.estimatedDurationMinutes ? `${course.estimatedDurationMinutes} minutes` : 'Not set',
    modules,
    lessons,
    requiredLessons: lessons.filter(l => l.isRequired !== false),
    quizzes,
    moduleQuizzes,
    requiredModuleQuizzes,
    finals,
    questionCount: quizzes.reduce((n, q) => n + (q.questions?.length ?? 0), 0),
    validityDays: version.certificateValidityDays ?? settings?.defaultCertificateValidityDays ?? null,
  }
}

export function CourseInfoCard({ course, version }: { course: LearningCourse; version: LearningCourseVersion }) {
  const f = useCourseFacts(course, version)
  const required = f.requiredModuleQuizzes.length + f.finals.length
  return (
    <SideCard title="Course information" icon={<Info className="h-4 w-4" />} testId="side-course-info">
      <InfoRow icon={<Clock className="h-4 w-4" />} label="Estimated duration" value={f.duration} />
      <InfoRow icon={<BookOpen className="h-4 w-4" />} label="Total lessons" value={f.lessons.length} />
      <InfoRow
        icon={<CircleHelp className="h-4 w-4" />}
        label="Assessments"
        value={`${f.quizzes.length}${f.quizzes.length ? ` (${required} required)` : ''}`}
      />
      <InfoRow icon={<Layers className="h-4 w-4" />} label="Course type" value={f.typeLabel} />
      <InfoRow icon={<Monitor className="h-4 w-4" />} label="Delivery method" value={f.deliveryLabel} />
      <InfoRow icon={<Tag className="h-4 w-4" />} label="Category" value={f.categoryName} />
    </SideCard>
  )
}

export function CompletionSummaryCard({ course, version }: { course: LearningCourse; version: LearningCourseVersion }) {
  const f = useCourseFacts(course, version)
  const requiredQuizzes = f.requiredModuleQuizzes.length + f.finals.length
  return (
    <SideCard title="Completion rules" icon={<ListChecks className="h-4 w-4" />} collapsible testId="side-completion">
      <CheckLine state="on">Complete every required lesson ({f.requiredLessons.length})</CheckLine>
      <CheckLine state={requiredQuizzes ? 'on' : 'off'}>
        {requiredQuizzes ? `Pass required assessments (${requiredQuizzes})` : 'No assessment to pass'}
      </CheckLine>
      <CheckLine state={version.requiresPracticalAssessment ? 'on' : 'off'}>Practical competency</CheckLine>
      <CheckLine state={version.requiresManagerApproval ? 'on' : 'off'}>Manager approval</CheckLine>
      <CheckLine state={version.certificateEnabled ? 'on' : 'off'}>
        {version.certificateEnabled ? `Certificate · ${f.validityDays ?? '—'} days` : 'No certificate'}
      </CheckLine>
    </SideCard>
  )
}

export function VersionHistoryCard({ courseId }: { courseId: string }) {
  return (
    <SideCard title="Version history" icon={<History className="h-4 w-4" />} collapsible testId="side-version-history">
      <VersionHistoryPanel courseId={courseId} compact />
    </SideCard>
  )
}

export function courseSummaryLine(course: LearningCourse) {
  return plural(course.estimatedDurationMinutes ?? 0, 'minute', 'minutes')
}
