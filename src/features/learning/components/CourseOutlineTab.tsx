import * as React from 'react'
import { AlertTriangle, BookOpen, ChevronDown, ChevronRight, ChevronUp, ChevronsDown, ChevronsUp, ClipboardCheck, Clock, FolderPlus, Layers, Pencil, Plus, Settings2, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { InlineConfirm } from '@/shared/ui/inline-confirm'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useCreateLearningSection,
  useDeleteLearningAssessment,
  useDeleteLearningContentItem,
  useDeleteLearningSection,
  useUpdateLearningSection,
} from '@/features/learning/hooks/useLearning'
import type {
  LearningCourse,
  LearningAssessment,
  LearningContentItem,
  LearningCourseVersion,
  LearningSection,
} from '@/features/learning/types/learning.types'
import { completionLabel, formatFileSize, lessonTypeInfo } from '@/features/learning/lib/learning-lesson'
import { LessonDialog } from '@/features/learning/components/LessonDialog'
import { LessonBody } from '@/features/learning/components/CoursePreviewDialog'
import { useQuizFlow } from '@/features/learning/components/QuizDialogs'
import { StatBox, TwoColumn } from '@/features/learning/components/builder-layout'
import { CompletionSummaryCard, CourseInfoCard, VersionHistoryCard } from '@/features/learning/components/CourseSidebarCards'

type Props = {
  course: LearningCourse
  version: LearningCourseVersion
  readOnly: boolean
  onChanged: () => void
}

function failed(err: unknown, fallback: string) {
  toastApiError(err instanceof ApiError ? err : new Error(fallback))
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

/**
 * Builder step "Course outline" (redesign 13 Nov 2026): modules, each with a Lessons group and a
 * Quizzes group. Items stay in the order they were added (no re-ordering, agreed).
 */
export function CourseOutlineTab({ course, version, readOnly, onChanged }: Props) {
  const modules = version.sections ?? []
  const quizzesOf = (sectionId: string) => (version.assessments ?? []).filter(a => a.sectionId === sectionId)
  const lessonCount = modules.reduce((n, m) => n + (m.contentItems?.length ?? 0), 0)
  const quizCount = (version.assessments ?? []).filter(a => a.sectionId).length

  const deleteModuleMut = useDeleteLearningSection()
  const deleteLessonMut = useDeleteLearningContentItem()
  const deleteQuizMut = useDeleteLearningAssessment()
  const quizFlow = useQuizFlow(version, readOnly, onChanged)
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set())
  // Lessons opened to show what is inside them (17 Nov 2026).
  const [openLessons, setOpenLessons] = React.useState<Set<string>>(new Set())
  const toggleLesson = (id: string) =>
    setOpenLessons(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const [moduleDialog, setModuleDialog] = React.useState<{ open: boolean; module: LearningSection | null }>({
    open: false,
    module: null,
  })
  const [lessonDialog, setLessonDialog] = React.useState<{ open: boolean; sectionId: string; lesson: LearningContentItem | null }>({
    open: false,
    sectionId: '',
    lesson: null,
  })

  const toggle = (id: string) =>
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const remove = async (kind: 'module' | 'lesson' | 'quiz', id: string) => {
    try {
      if (kind === 'module') await deleteModuleMut.mutateAsync(id)
      if (kind === 'lesson') await deleteLessonMut.mutateAsync(id)
      if (kind === 'quiz') await deleteQuizMut.mutateAsync(id)
      toastSuccess(kind === 'module' ? 'Module deleted' : kind === 'lesson' ? 'Lesson deleted' : 'Quiz deleted')
      onChanged()
    } catch (err) {
      failed(err, `Could not delete the ${kind}`)
    }
  }

  const moduleSummary = (lessons: number, quizzes: LearningAssessment[]) => {
    const required = quizzes.filter(q => q.isRequired !== false).length
    return [
      plural(lessons, 'lesson', 'lessons'),
      quizzes.length ? `${plural(quizzes.length, 'quiz', 'quizzes')}${required ? ` (${required} required)` : ''}` : null,
    ]
      .filter(Boolean)
      .join(' · ')
  }

  return (
    <TwoColumn
      side={
        <>
          <CourseInfoCard course={course} version={version} />
          <VersionHistoryCard courseId={course.id} />
          <CompletionSummaryCard course={course} version={version} />
        </>
      }
      main={
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5" data-testid="course-outline-tab">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">Course outline</h3>
          <p className="text-xs text-muted-foreground">Build your course with modules, lessons and quizzes. Carers go through it from top to bottom.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatBox icon={<Layers className="h-4 w-4" />} value={modules.length} label="Modules" />
          <StatBox icon={<BookOpen className="h-4 w-4" />} value={lessonCount} label="Lessons" />
          <StatBox icon={<ClipboardCheck className="h-4 w-4" />} value={quizCount} label="Quizzes" />
        </div>
      </div>
      {modules.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setCollapsed(new Set())}>
            <ChevronsDown className="mr-1 h-4 w-4" />
            Expand all
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCollapsed(new Set(modules.map(m => m.id)))}>
            <ChevronsUp className="mr-1 h-4 w-4" />
            Collapse all
          </Button>
          {!readOnly ? (
            <Button size="sm" className="ml-auto" onClick={() => setModuleDialog({ open: true, module: null })}>
              <Plus className="mr-1 h-4 w-4" />
              Add module
            </Button>
          ) : null}
        </div>
      ) : null}

      {modules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center" data-testid="outline-empty">
          <FolderPlus className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="mt-2 text-sm font-medium">{readOnly ? 'No modules in this version' : 'Start your course outline'}</p>
          {!readOnly ? (
            <>
              <p className="mb-3 text-sm text-muted-foreground">Add a module, then add lessons and a quiz to it.</p>
              <Button size="sm" onClick={() => setModuleDialog({ open: true, module: null })}>
                <Plus className="mr-1 h-4 w-4" />
                Add module
              </Button>
            </>
          ) : null}
        </div>
      ) : (
        modules.map((module, mIndex) => {
          const lessons = module.contentItems ?? []
          const quizzes = quizzesOf(module.id)
          const isOpen = !collapsed.has(module.id)
          return (
            <section key={module.id} className="overflow-hidden rounded-xl border border-border bg-card" data-testid="outline-module">
              <div className="group flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={isOpen ? 'Collapse module' : 'Expand module'}
                  aria-expanded={isOpen}
                  onClick={() => toggle(module.id)}
                >
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                  aria-label={`Module ${mIndex + 1}`}
                >
                  {mIndex + 1}
                </span>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => toggle(module.id)}>
                  <h4 className="truncate text-sm font-semibold">{module.title}</h4>
                  {module.description ? <p className="truncate text-xs text-muted-foreground">{module.description}</p> : null}
                </button>
                <span className="hidden shrink-0 items-center gap-1.5 sm:flex" title={moduleSummary(lessons.length, quizzes)}>
                  <Chip>
                    <BookOpen className="mr-1 inline h-3 w-3" aria-hidden />
                    {plural(lessons.length, 'lesson', 'lessons')}
                  </Chip>
                  <Chip>
                    <ClipboardCheck className="mr-1 inline h-3 w-3" aria-hidden />
                    {plural(quizzes.length, 'quiz', 'quizzes')}
                  </Chip>
                </span>
                {!readOnly ? (
                  <HoverActions>
                    <Button size="icon-sm" variant="ghost" aria-label="Edit module" onClick={() => setModuleDialog({ open: true, module })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <InlineConfirm
                      title={`Delete "${module.title}"?`}
                      description={
                        lessons.length || quizzes.length
                          ? `Its ${[lessons.length ? plural(lessons.length, 'lesson', 'lessons') : null, quizzes.length ? plural(quizzes.length, 'quiz', 'quizzes') : null]
                              .filter(Boolean)
                              .join(' and ')} will be deleted too. This only changes this draft.`
                          : 'This only changes this draft.'
                      }
                      confirmLabel="Delete"
                      destructive
                      onConfirm={() => void remove('module', module.id)}
                    >
                      <Button size="icon-sm" variant="ghost" aria-label="Delete module">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </InlineConfirm>
                  </HoverActions>
                ) : null}
              </div>

              {isOpen ? (
                <div className="space-y-3 border-t border-border px-4 pb-4 pt-2 sm:pl-[4.5rem]">
                  <Group icon={<BookOpen className="h-3.5 w-3.5" aria-hidden />} title="Lessons" count={lessons.length}>
                    {lessons.map((lesson, lIndex) => {
                      const t = lessonTypeInfo(lesson.contentType)
                      const Icon = t.icon
                      return (
                        <Row
                          key={lesson.id}
                          number={`${mIndex + 1}.${lIndex + 1}`}
                          icon={<span className={`flex h-7 w-7 items-center justify-center rounded-md ${typeTone(lesson.contentType)}`}><Icon className="h-4 w-4" aria-hidden /></span>}
                          title={lesson.title}
                          subtitle={lessonSummary(lesson)}
                          expanded={openLessons.has(lesson.id)}
                          onToggle={() => toggleLesson(lesson.id)}
                          details={
                            <div className="space-y-2">
                              {lesson.description ? <p className="text-sm text-muted-foreground">{lesson.description}</p> : null}
                              <LessonBody lesson={lesson} />
                              {lesson.contentType === 'VIDEO' && lesson.videoUrl ? (
                                <p className="break-all text-xs text-muted-foreground">{lesson.videoUrl}</p>
                              ) : null}
                              {lesson.contentType === 'EXTERNAL_LINK' && lesson.externalUrl ? (
                                <p className="break-all text-xs text-muted-foreground">{lesson.externalUrl}</p>
                              ) : null}
                              <p className="text-xs text-muted-foreground">Completed when: {completionLabel(lesson.completionRule).toLowerCase()}</p>
                            </div>
                          }
                          tags={
                            <>
                              {lesson.estimatedDurationMinutes ? (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" aria-hidden />
                                  {lesson.estimatedDurationMinutes} min
                                </span>
                              ) : null}
                              <Tag title={completionLabel(lesson.completionRule)}>{t.label}</Tag>
                              <Tag tone={lesson.isRequired === false ? 'neutral' : 'success'}>
                                {lesson.isRequired === false ? 'Optional' : 'Required'}
                              </Tag>
                            </>
                          }
                        >
                          {!readOnly ? (
                            <HoverActions>
                              <Button size="icon-sm" variant="ghost" aria-label="Edit lesson" onClick={() => setLessonDialog({ open: true, sectionId: module.id, lesson })}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <InlineConfirm title="Delete this lesson?" confirmLabel="Delete" destructive onConfirm={() => void remove('lesson', lesson.id)}>
                                <Button size="icon-sm" variant="ghost" aria-label="Delete lesson">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </InlineConfirm>
                            </HoverActions>
                          ) : null}
                        </Row>
                      )
                    })}
                    {!readOnly ? (
                      <AddRow onClick={() => setLessonDialog({ open: true, sectionId: module.id, lesson: null })}>
                        Add lesson
                      </AddRow>
                    ) : lessons.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-muted-foreground">No lessons.</p>
                    ) : null}
                  </Group>

                  <Group icon={<ClipboardCheck className="h-3.5 w-3.5" aria-hidden />} title="Quizzes" count={quizzes.length}>
                    {quizzes.map(quiz => (
                      <QuizRow
                        key={quiz.id}
                        quiz={quiz}
                        readOnly={readOnly}
                        onQuestions={() => quizFlow.openQuestions(quiz.id)}
                        onSettings={() => quizFlow.openSettings(quiz.id)}
                        onDelete={() => void remove('quiz', quiz.id)}
                      />
                    ))}
                    {!readOnly ? (
                      <AddRow onClick={() => quizFlow.addQuiz(module.id, module.title)} note={quizzes.length ? undefined : 'optional'}>
                        {quizzes.length ? 'Add another quiz' : 'Add a quiz to check this module'}
                      </AddRow>
                    ) : quizzes.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-muted-foreground">No quizzes.</p>
                    ) : null}
                  </Group>
                </div>
              ) : null}
            </section>
          )
        })
      )}

      {!readOnly && modules.length ? (
        <AddRow large onClick={() => setModuleDialog({ open: true, module: null })}>
          Add module
        </AddRow>
      ) : null}

      <ModuleDialog
        open={moduleDialog.open}
        onOpenChange={open => setModuleDialog(prev => ({ ...prev, open }))}
        versionId={version.id}
        module={moduleDialog.module}
        onSaved={onChanged}
      />
      <LessonDialog
        open={lessonDialog.open}
        onOpenChange={open => setLessonDialog(prev => ({ ...prev, open }))}
        sectionId={lessonDialog.sectionId}
        sections={modules}
        lesson={lessonDialog.lesson}
        onSaved={onChanged}
      />
      {quizFlow.dialogs}
    </div>
      }
    />
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{children}</span>
}

function Tag({ children, title, tone = 'neutral' }: { children: React.ReactNode; title?: string; tone?: 'neutral' | 'success' | 'warning' }) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
        : 'border border-border text-muted-foreground'
  return (
    <span title={title} className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] ${toneClass}`}>
      {children}
    </span>
  )
}

/** Edit / delete: shown when the row is hovered or a control in it has keyboard focus. */
function HoverActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
      {children}
    </div>
  )
}

function Group({ icon, title, count, children }: { icon: React.ReactNode; title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {title} · {count}
      </p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  )
}

function typeTone(type: string) {
  switch (type) {
    case 'VIDEO':
      return 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
    case 'PDF':
      return 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
    case 'IMAGE':
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
    case 'DOCUMENT':
      return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
    case 'EXTERNAL_LINK':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
    default:
      return 'bg-primary/10 text-primary'
  }
}

/** One-line "what is inside" for a lesson (17 Nov 2026). */
function lessonSummary(lesson: LearningContentItem): string | null {
  switch (lesson.contentType) {
    case 'TEXT': {
      const text = (lesson.contentBody ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
      return text ? (text.length > 110 ? `${text.slice(0, 110)}…` : text) : 'No text yet'
    }
    case 'PDF':
    case 'DOCUMENT':
    case 'IMAGE':
      return lesson.file ? `${lesson.file.originalName} · ${formatFileSize(lesson.file.fileSize)}` : 'No file uploaded'
    case 'VIDEO':
      return lesson.videoUrl ? hostOf(lesson.videoUrl) : 'No video link'
    case 'EXTERNAL_LINK':
      return lesson.externalUrl ? hostOf(lesson.externalUrl) : 'No link'
    default:
      return null
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

function Row({
  number,
  icon,
  title,
  subtitle,
  tags,
  warning,
  children,
  expanded,
  onToggle,
  details,
}: {
  number?: string
  icon: React.ReactNode
  title: string
  subtitle?: string | null
  tags?: React.ReactNode
  warning?: React.ReactNode
  children?: React.ReactNode
  expanded?: boolean
  onToggle?: () => void
  details?: React.ReactNode
}) {
  const head = (
    <>
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{title}</span>
        {subtitle ? <span className="block truncate text-xs text-muted-foreground">{subtitle}</span> : null}
      </span>
    </>
  )
  return (
    <li className="group rounded-md px-2 py-1.5 hover:bg-muted/50">
      <div className="flex items-center gap-2.5 text-sm">
        {number ? <span className="w-7 shrink-0 rounded bg-muted px-1 py-0.5 text-center text-[11px] text-muted-foreground">{number}</span> : null}
        {onToggle ? (
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
            aria-expanded={!!expanded}
            onClick={onToggle}
            title={expanded ? 'Hide lesson details' : 'Show lesson details'}
          >
            {head}
            {expanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
          </button>
        ) : (
          head
        )}
        {tags ? <span className="flex shrink-0 items-center gap-1">{tags}</span> : null}
        {children}
      </div>
      {expanded && details ? (
        <div className="mt-2 rounded-md border border-border bg-background p-3 sm:ml-9" data-testid="lesson-details">
          {details}
        </div>
      ) : null}
      {warning}
    </li>
  )
}

function AddRow({ children, onClick, note, large }: { children: React.ReactNode; onClick: () => void; note?: string; large?: boolean }) {
  return (
    <li className="list-none">
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-2 rounded-md border border-dashed border-border text-left text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground ${large ? 'justify-center rounded-xl py-3' : 'px-2 py-1.5'}`}
      >
        <Plus className="h-4 w-4" aria-hidden />
        {children}
        {note ? <span className="ml-auto text-[11px]">{note}</span> : null}
      </button>
    </li>
  )
}

export function QuizRow({
  quiz,
  readOnly,
  onQuestions,
  onSettings,
  onDelete,
}: {
  quiz: LearningAssessment
  readOnly: boolean
  onQuestions: () => void
  onSettings: () => void
  onDelete: () => void
}) {
  const final = !quiz.sectionId
  const count = quiz.questions?.length ?? 0
  const required = final || quiz.isRequired !== false
  return (
    <Row
      icon={<ClipboardCheck className="h-4 w-4" aria-hidden />}
      title={quiz.title}
      tags={
        <>
          {count ? <Tag>{`${plural(count, 'question', 'questions')} · ${quiz.passingScore}%`}</Tag> : null}
          <Tag tone={required ? 'success' : 'neutral'}>{required ? 'Required' : 'Optional'}</Tag>
        </>
      }
      warning={
        count === 0 ? (
          <p className="ml-6 mt-1 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400" data-testid="quiz-no-questions">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            No questions yet.{' '}
            {readOnly ? 'Carers cannot take this quiz.' : (
              <>
                Add questions before publishing.
                <button type="button" className="font-medium underline underline-offset-2" onClick={onQuestions}>
                  Add questions
                </button>
              </>
            )}
          </p>
        ) : null
      }
    >
      {count || readOnly ? (
        <Button size="sm" variant="ghost" className="h-7" onClick={onQuestions}>
          Questions
        </Button>
      ) : null}
      {!readOnly ? (
        <HoverActions>
          <Button size="icon-sm" variant="ghost" aria-label="Quiz settings" onClick={onSettings}>
            <Settings2 className="h-4 w-4" />
          </Button>
          <InlineConfirm
            title={`Delete "${quiz.title}"?`}
            description={count ? `Its ${plural(count, 'question', 'questions')} will be deleted too.` : undefined}
            confirmLabel="Delete"
            destructive
            onConfirm={onDelete}
          >
            <Button size="icon-sm" variant="ghost" aria-label="Delete quiz">
              <Trash2 className="h-4 w-4" />
            </Button>
          </InlineConfirm>
        </HoverActions>
      ) : null}
    </Row>
  )
}

function ModuleDialog({
  open,
  onOpenChange,
  versionId,
  module,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  versionId: string
  module: LearningSection | null
  onSaved: () => void
}) {
  const createMut = useCreateLearningSection()
  const updateMut = useUpdateLearningSection()
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setTitle(module?.title ?? '')
    setDescription(module?.description ?? '')
    setError(null)
  }, [open, module])

  const save = async () => {
    if (!title.trim()) {
      setError('Enter a module title')
      return
    }
    try {
      if (module) {
        await updateMut.mutateAsync({ sectionId: module.id, body: { title: title.trim(), description: description.trim() } })
        toastSuccess('Module saved')
      } else {
        await createMut.mutateAsync({ versionId, body: { title: title.trim(), description: description.trim() || undefined } })
        toastSuccess('Module added')
      }
      onOpenChange(false)
      onSaved()
    } catch (err) {
      failed(err, 'Could not save the module')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{module ? 'Edit module' : 'Add module'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <FormField label="Module title" required error={error ?? undefined}>
            <Input
              value={title}
              maxLength={200}
              placeholder="Recognising abuse"
              onChange={e => {
                setTitle(e.target.value)
                if (error) setError(null)
              }}
            />
          </FormField>
          <FormField label="Short description" hint="What this module covers (optional)">
            <Textarea value={description} rows={2} maxLength={1000} onChange={e => setDescription(e.target.value)} />
          </FormField>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={createMut.isPending || updateMut.isPending}>
            {module ? 'Save' : 'Add module'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
