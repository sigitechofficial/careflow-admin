import * as React from 'react'
import { AlertTriangle, Award, CheckCircle2, ChevronDown, ClipboardList, Eye, Pencil, Plus, Settings2, ShieldCheck, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { InlineConfirm } from '@/shared/ui/inline-confirm'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useDeleteAssessmentQuestion, useDeleteLearningAssessment } from '@/features/learning/hooks/useLearning'
import {
  AUTHORABLE_QUESTION_TYPES,
  LEARNING_QUESTION_TYPE_OPTIONS,
  type LearningAssessment,
  type LearningAssessmentQuestion,
  type LearningCourse,
  type LearningCourseVersion,
} from '@/features/learning/types/learning.types'
import { useQuizFlow } from '@/features/learning/components/QuizDialogs'
import { CheckLine, InfoRow, Panel, SideCard, TwoColumn } from '@/features/learning/components/builder-layout'
import { plural } from '@/features/learning/components/CourseSidebarCards'

type Props = {
  course: LearningCourse
  version: LearningCourseVersion
  readOnly: boolean
  onChanged: () => void
}

function failed(err: unknown, fallback: string) {
  toastApiError(err instanceof ApiError ? err : new Error(fallback))
}

function typeLabel(type: LearningAssessmentQuestion['questionType']) {
  return (
    AUTHORABLE_QUESTION_TYPES.find(t => t.value === type)?.label ??
    LEARNING_QUESTION_TYPE_OPTIONS.find(t => t.value === type)?.label ??
    type
  )
}

const SHORT_TYPE: Record<string, string> = {
  SINGLE_CHOICE: 'Single',
  MULTIPLE_CHOICE: 'Multiple',
  TRUE_FALSE: 'True/False',
}

/**
 * Builder step "Final assessment" (redesign 13 Nov 2026): quizzes with no module. Always required,
 * more than one allowed, optional for a training course. Carers can start them after finishing all
 * modules (enforced by the API). Old quizzes without a module are shown here too.
 */
export function FinalAssessmentTab({ course, version, readOnly, onChanged }: Props) {
  const finals = (version.assessments ?? []).filter(a => !a.sectionId)
  const deleteQuizMut = useDeleteLearningAssessment()
  const deleteQuestionMut = useDeleteAssessmentQuestion()
  const quizFlow = useQuizFlow(version, readOnly, onChanged)
  const assessmentOnly = course.courseType === 'ASSESSMENT'

  const removeQuiz = async (id: string) => {
    try {
      await deleteQuizMut.mutateAsync(id)
      toastSuccess('Final assessment deleted')
      onChanged()
    } catch (err) {
      failed(err, 'Could not delete the final assessment')
    }
  }
  const removeQuestion = async (id: string) => {
    try {
      await deleteQuestionMut.mutateAsync(id)
      toastSuccess('Question deleted')
      onChanged()
    } catch (err) {
      failed(err, 'Could not delete the question')
    }
  }

  const allQuestions = finals.flatMap(f => f.questions ?? [])
  const typeCounts = allQuestions.reduce<Record<string, number>>((acc, q) => {
    acc[q.questionType] = (acc[q.questionType] ?? 0) + 1
    return acc
  }, {})
  const totalPoints = allQuestions.reduce((n, q) => n + (q.points ?? 1), 0)
  const empty = finals.filter(f => !(f.questions?.length ?? 0))
  const issues = [
    ...empty.map(f => `"${f.title}" has no questions`),
    ...(assessmentOnly && finals.length === 0 ? ['An assessment-only course needs a final assessment'] : []),
  ]

  return (
    <TwoColumn
      main={
        <div className="space-y-4" data-testid="final-assessment-tab">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold">
                Final assessment <span className="ml-1 text-sm font-normal text-muted-foreground">{finals.length}</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Always required. Carers can start it after they finish all modules.
                {assessmentOnly ? ' An assessment-only course needs at least one.' : ''}
              </p>
            </div>
            {!readOnly && finals.length ? (
              <Button size="sm" onClick={() => quizFlow.addQuiz(null)}>
                <Plus className="mr-1 h-4 w-4" />
                Add final assessment
              </Button>
            ) : null}
          </div>

          {finals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center" data-testid="final-empty">
              <Award className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
              <p className="mt-2 text-sm font-medium">No final assessment</p>
              <p className="mb-3 text-sm text-muted-foreground">
                {assessmentOnly
                  ? 'This course is assessment only, so it needs a final assessment.'
                  : 'Add one if carers should pass a test at the end of the course. You can skip this.'}
              </p>
              {!readOnly ? (
                <Button size="sm" onClick={() => quizFlow.addQuiz(null)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add final assessment
                </Button>
              ) : null}
            </div>
          ) : (
            finals.map(quiz => (
              <FinalCard
                key={quiz.id}
                quiz={quiz}
                readOnly={readOnly}
                onSettings={() => quizFlow.openSettings(quiz.id)}
                onDelete={() => void removeQuiz(quiz.id)}
                onAddQuestion={() => quizFlow.openQuestion(quiz.id, null)}
                onEditQuestion={q => quizFlow.openQuestion(quiz.id, q.id)}
                onDeleteQuestion={q => void removeQuestion(q.id)}
              />
            ))
          )}
          {quizFlow.dialogs}
        </div>
      }
      side={
        <>
          <SideCard title="Assessment summary" icon={<ClipboardList className="h-4 w-4" />} testId="side-assessment-summary">
            <InfoRow label="Final assessments" value={finals.length} />
            <InfoRow label="Total questions" value={allQuestions.length} />
            <div className="flex items-center gap-2 py-1.5 text-sm">
              <span className="text-muted-foreground">Question types</span>
              <span className="ml-auto flex flex-wrap justify-end gap-1">
                {Object.keys(typeCounts).length
                  ? Object.entries(typeCounts).map(([t, n]) => (
                      <span key={t} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
                        {n} {SHORT_TYPE[t] ?? t}
                      </span>
                    ))
                  : '—'}
              </span>
            </div>
            <InfoRow label="Total points" value={totalPoints} />
          </SideCard>
          <SideCard title="Validation" icon={<ShieldCheck className="h-4 w-4" />} testId="side-assessment-validation">
            {finals.length === 0 && !assessmentOnly ? (
              <CheckLine state="off" hint="A training course can be published without one.">No final assessment</CheckLine>
            ) : issues.length ? (
              issues.map(i => (
                <CheckLine key={i} state="error">
                  {i}
                </CheckLine>
              ))
            ) : (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <span>
                  <span className="block font-medium">Assessment is ready</span>
                  <span className="text-xs text-muted-foreground">Every final assessment has questions.</span>
                </span>
              </div>
            )}
          </SideCard>
        </>
      }
    />
  )
}

function FinalCard({
  quiz,
  readOnly,
  onSettings,
  onDelete,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
}: {
  quiz: LearningAssessment
  readOnly: boolean
  onSettings: () => void
  onDelete: () => void
  onAddQuestion: () => void
  onEditQuestion: (q: LearningAssessmentQuestion) => void
  onDeleteQuestion: (q: LearningAssessmentQuestion) => void
}) {
  const questions = quiz.questions ?? []
  const [open, setOpen] = React.useState<string | null>(questions[0]?.id ?? null)
  return (
    <Panel
      testId="final-card"
      icon={<Award className="h-5 w-5" />}
      title={quiz.title}
      description={
        <span className="flex flex-wrap items-center gap-1.5">
          <span>{plural(questions.length, 'question', 'questions')}</span>·<span>pass {quiz.passingScore}%</span>·
          <span>{quiz.maximumAttempts ? plural(quiz.maximumAttempts, 'try', 'tries') : 'no try limit'}</span>
          <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
            Required
          </span>
        </span>
      }
      actions={
        !readOnly ? (
          <>
            <Button size="sm" variant="outline" onClick={onSettings}>
              <Settings2 className="mr-1 h-4 w-4" />
              Settings
            </Button>
            <InlineConfirm
              title={`Delete "${quiz.title}"?`}
              description={questions.length ? `Its ${plural(questions.length, 'question', 'questions')} will be deleted too.` : undefined}
              confirmLabel="Delete"
              destructive
              onConfirm={onDelete}
            >
              <Button size="icon-sm" variant="ghost" aria-label="Delete final assessment">
                <Trash2 className="h-4 w-4" />
              </Button>
            </InlineConfirm>
          </>
        ) : null
      }
    >
      {quiz.instructions ? <p className="mb-3 rounded-md bg-muted/40 px-3 py-2 text-xs">{quiz.instructions}</p> : null}

      {questions.length === 0 ? (
        <p className="mb-3 flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400" data-testid="quiz-no-questions">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          No questions yet. {readOnly ? 'Carers cannot take this assessment.' : 'Add questions before publishing.'}
        </p>
      ) : (
        <div className="mb-3">
          <p className="mb-2 text-sm font-medium">Questions ({questions.length})</p>
          <ol className="space-y-1.5">
            {questions.map((q, i) => {
              const isOpen = open === q.id
              return (
                <li key={q.id} className="group rounded-lg border border-border" data-testid="final-question">
                  <div className="flex items-center gap-2.5 px-3 py-2 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{i + 1}</span>
                    <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => setOpen(isOpen ? null : q.id)}>
                      {q.questionText}
                    </button>
                    <span className="hidden whitespace-nowrap rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary sm:inline">{typeLabel(q.questionType)}</span>
                    <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">{plural(q.points ?? 1, 'pt', 'pts')}</span>
                    {!readOnly ? (
                      <span className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        <Button size="icon-sm" variant="ghost" aria-label="Edit question" onClick={() => onEditQuestion(q)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <InlineConfirm title="Delete this question?" confirmLabel="Delete" destructive onConfirm={() => onDeleteQuestion(q)}>
                          <Button size="icon-sm" variant="ghost" aria-label="Delete question">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </InlineConfirm>
                      </span>
                    ) : null}
                    <button type="button" aria-label={isOpen ? 'Hide answers' : 'Show answers'} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : q.id)}>
                      <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                    </button>
                  </div>
                  {isOpen ? (
                    <div className="border-t border-border px-3 py-2">
                      <p className="mb-1 text-xs text-muted-foreground">Answer options</p>
                      <ul className="space-y-1">
                        {(q.options ?? []).map((o, oi) => (
                          <li
                            key={o.id}
                            className={cn(
                              'flex items-center gap-2 rounded-md px-2 py-1 text-sm',
                              o.isCorrect && 'border border-emerald-500/40 bg-emerald-500/10',
                            )}
                          >
                            <span className="w-4 text-xs text-muted-foreground">{String.fromCharCode(65 + oi)}.</span>
                            <span className="flex-1">{o.optionText}</span>
                            {o.isCorrect ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Correct answer
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                      {q.explanation ? <p className="mt-2 text-xs text-muted-foreground">Why: {q.explanation}</p> : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {!readOnly ? (
        <button
          type="button"
          onClick={onAddQuestion}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add question
        </button>
      ) : null}
      {readOnly && questions.length ? (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5" aria-hidden /> Read-only
        </p>
      ) : null}
    </Panel>
  )
}
