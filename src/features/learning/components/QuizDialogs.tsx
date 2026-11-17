import * as React from 'react'
import { Pencil, Plus, Settings2, Trash2, X } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { InlineConfirm } from '@/shared/ui/inline-confirm'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useCreateAssessmentQuestion,
  useCreateLearningAssessment,
  useDeleteAssessmentQuestion,
  useUpdateAssessmentQuestion,
  useUpdateLearningAssessment,
} from '@/features/learning/hooks/useLearning'
import {
  AUTHORABLE_QUESTION_TYPES,
  LEARNING_QUESTION_TYPE_OPTIONS,
  type LearningAssessment,
  type LearningAssessmentQuestion,
  type LearningCourseVersion,
  type LearningQuestionType,
} from '@/features/learning/types/learning.types'

/** Agreed quiz defaults: pass mark 80%, 3 tries. */
export const QUIZ_DEFAULT_PASS_MARK = 80
export const QUIZ_DEFAULT_ATTEMPTS = 3
const MAX_ANSWERS = 10

function failed(err: unknown, fallback: string) {
  toastApiError(err instanceof ApiError ? err : new Error(fallback))
}

function wholeNumber(value: string): number | null {
  if (!value.trim()) return null
  const n = Number(value)
  return Number.isInteger(n) ? n : Number.NaN
}

export function quizSummary(quiz: LearningAssessment) {
  const tries = quiz.maximumAttempts ? `${quiz.maximumAttempts} ${quiz.maximumAttempts === 1 ? 'try' : 'tries'}` : 'no try limit'
  const n = quiz.questions?.length ?? 0
  return `${n ? `${n} question${n === 1 ? '' : 's'}` : 'No questions yet'} · pass ${quiz.passingScore}% · ${tries}`
}

// ─── Quiz (add / settings) ───────────────────────────────────

type QuizErrors = Partial<Record<'title' | 'passingScore' | 'maximumAttempts' | 'retakeDelay', string>>

/**
 * Add a module quiz (Required / Optional) or a final assessment (always required), or edit
 * an existing quiz's settings. Adding goes straight on to writing questions.
 */
export function QuizDialog({
  open,
  onOpenChange,
  versionId,
  sectionId,
  moduleTitle,
  quiz,
  onCreated,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  versionId: string
  /** Module for a new quiz; null = final assessment. Ignored when editing. */
  sectionId: string | null
  moduleTitle?: string
  quiz: LearningAssessment | null
  onCreated?: (quiz: LearningAssessment) => void
  onSaved: () => void
}) {
  const createMut = useCreateLearningAssessment()
  const updateMut = useUpdateLearningAssessment()
  const isFinal = quiz ? !quiz.sectionId : !sectionId
  const [title, setTitle] = React.useState('')
  const [required, setRequired] = React.useState(true)
  const [instructions, setInstructions] = React.useState('')
  const [passingScore, setPassingScore] = React.useState('')
  const [maximumAttempts, setMaximumAttempts] = React.useState('')
  const [retakeDelay, setRetakeDelay] = React.useState('')
  const [errors, setErrors] = React.useState<QuizErrors>({})

  React.useEffect(() => {
    if (!open) return
    setTitle(quiz?.title ?? (isFinal ? 'Final assessment' : 'Check your knowledge'))
    setRequired(quiz ? quiz.isRequired !== false : true)
    setInstructions(quiz?.instructions ?? '')
    setPassingScore(String(quiz?.passingScore ?? QUIZ_DEFAULT_PASS_MARK))
    setMaximumAttempts(quiz ? (quiz.maximumAttempts ? String(quiz.maximumAttempts) : '') : String(QUIZ_DEFAULT_ATTEMPTS))
    setRetakeDelay(quiz?.retakeDelayMinutes ? String(quiz.retakeDelayMinutes) : '')
    setErrors({})
  }, [open, quiz, isFinal])

  const save = async () => {
    const pass = wholeNumber(passingScore)
    const attempts = wholeNumber(maximumAttempts)
    const delay = wholeNumber(retakeDelay)
    const next: QuizErrors = {}
    if (!title.trim()) next.title = 'Enter a name'
    if (pass === null || Number.isNaN(pass) || pass < 1 || pass > 100) next.passingScore = 'Enter 1 to 100'
    if (attempts !== null && (Number.isNaN(attempts) || attempts < 1)) next.maximumAttempts = 'Enter 1 or more, or leave empty'
    if (delay !== null && (Number.isNaN(delay) || delay < 0)) next.retakeDelay = 'Enter whole minutes, or leave empty'
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    const body = {
      title: title.trim(),
      instructions: instructions.trim(),
      passingScore: pass as number,
      maximumAttempts: attempts,
      retakeDelayMinutes: delay || null,
      isRequired: isFinal ? true : required,
    }
    try {
      if (quiz) {
        await updateMut.mutateAsync({ id: quiz.id, body })
        toastSuccess('Quiz saved')
        onOpenChange(false)
        onSaved()
      } else {
        const created = await createMut.mutateAsync({
          versionId,
          body: { ...body, ...(sectionId ? { sectionId } : {}) },
        })
        toastSuccess(isFinal ? 'Final assessment added' : 'Quiz added')
        onOpenChange(false)
        onSaved()
        onCreated?.(created)
      }
    } catch (err) {
      failed(err, 'Could not save the quiz')
    }
  }

  const heading = quiz ? 'Quiz settings' : isFinal ? 'Add final assessment' : `Add quiz${moduleTitle ? ` · ${moduleTitle}` : ''}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <FormField label="Name" required error={errors.title}>
            <Input value={title} maxLength={200} onChange={e => setTitle(e.target.value)} />
          </FormField>
          {isFinal ? (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Final assessments are always required. Carers can start them after they finish all modules.
            </p>
          ) : (
            <FormField label="Does the carer have to pass it?">
              <div className="grid gap-2" role="radiogroup" aria-label="Required or optional">
                {[
                  { value: true, label: 'Required', hint: 'The carer must pass it to finish the course' },
                  { value: false, label: 'Optional', hint: 'Practice only, does not stop the course finishing' },
                ].map(o => (
                  <button
                    key={o.label}
                    type="button"
                    role="radio"
                    aria-checked={required === o.value}
                    onClick={() => setRequired(o.value)}
                    className={cn(
                      'rounded-md border px-3 py-2 text-left',
                      required === o.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span className="block text-xs text-muted-foreground">{o.hint}</span>
                  </button>
                ))}
              </div>
            </FormField>
          )}
          {quiz ? (
            <FormField label="Instructions for the carer">
              <Textarea value={instructions} rows={2} maxLength={2000} onChange={e => setInstructions(e.target.value)} />
            </FormField>
          ) : null}
          <div className={cn('grid gap-4', quiz ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
            <FormField label="Pass mark (%)" required error={errors.passingScore}>
              <Input type="number" min={1} max={100} value={passingScore} onChange={e => setPassingScore(e.target.value)} />
            </FormField>
            <FormField label="Tries" hint="Empty = no limit" error={errors.maximumAttempts}>
              <Input type="number" min={1} value={maximumAttempts} onChange={e => setMaximumAttempts(e.target.value)} />
            </FormField>
            {quiz ? (
              <FormField label="Wait between tries (min)" hint="Empty = no wait" error={errors.retakeDelay}>
                <Input type="number" min={0} value={retakeDelay} onChange={e => setRetakeDelay(e.target.value)} />
              </FormField>
            ) : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={createMut.isPending || updateMut.isPending}>
            {quiz ? 'Save' : 'Add and write questions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Question ────────────────────────────────────────────────

type Answer = { key: number; text: string; correct: boolean }
type QuestionErrors = Partial<Record<'text' | 'answers' | 'points', string>>

let answerKey = 0
const newAnswer = (text = '', correct = false): Answer => ({ key: ++answerKey, text, correct })
const trueFalse = (): Answer[] => [newAnswer('True'), newAnswer('False')]

/** Mirrors the API rules (learning-quiz-rules.util) so the admin sees the problem before saving. */
export function questionProblem(type: LearningQuestionType, text: string, answers: Answer[]): QuestionErrors {
  const errors: QuestionErrors = {}
  if (!text.trim()) errors.text = 'Write the question'
  const texts = answers.map(a => a.text.trim())
  const correct = answers.filter(a => a.correct).length
  if (texts.some(t => !t)) errors.answers = 'Every answer needs text'
  else if (new Set(texts.map(t => t.toLowerCase())).size !== texts.length) errors.answers = 'Two answers have the same text'
  else if (type !== 'TRUE_FALSE' && answers.length < 2) errors.answers = 'Add at least 2 answers'
  else if ((type === 'SINGLE_CHOICE' || type === 'TRUE_FALSE') && correct !== 1) errors.answers = 'Mark the one correct answer'
  else if (type === 'MULTIPLE_CHOICE' && correct < 1) errors.answers = 'Mark at least one correct answer'
  return errors
}

/**
 * Add or edit one question. When adding, "Save and add next" keeps the dialog open for the
 * next question so a whole quiz can be written in one go.
 */
export function QuestionDialog({
  open,
  onOpenChange,
  quiz,
  question,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  quiz: LearningAssessment | null
  question: LearningAssessmentQuestion | null
  onSaved: () => void
}) {
  const createMut = useCreateAssessmentQuestion()
  const updateMut = useUpdateAssessmentQuestion()
  const [type, setType] = React.useState<LearningQuestionType>('SINGLE_CHOICE')
  const [text, setText] = React.useState('')
  const [answers, setAnswers] = React.useState<Answer[]>([])
  const [explanation, setExplanation] = React.useState('')
  const [points, setPoints] = React.useState('1')
  const [errors, setErrors] = React.useState<QuestionErrors>({})
  const textRef = React.useRef<HTMLTextAreaElement>(null)

  const reset = React.useCallback(
    (from: LearningAssessmentQuestion | null, keepType?: LearningQuestionType) => {
      const startType =
        from && AUTHORABLE_QUESTION_TYPES.some(t => t.value === from.questionType)
          ? from.questionType
          : (keepType ?? 'SINGLE_CHOICE')
      setType(startType)
      setText(from?.questionText ?? '')
      setAnswers(
        from?.options?.length
          ? from.options.map(o => newAnswer(o.optionText, !!o.isCorrect))
          : startType === 'TRUE_FALSE'
            ? trueFalse()
            : [newAnswer(), newAnswer()],
      )
      setExplanation(from?.explanation ?? '')
      setPoints(String(from?.points ?? 1))
      setErrors({})
    },
    [],
  )

  React.useEffect(() => {
    if (!open) return
    reset(question)
  }, [open, question, reset])

  const onTypeChange = (next: LearningQuestionType) => {
    if (next === type) return
    setType(next)
    setErrors({})
    if (next === 'TRUE_FALSE') setAnswers(trueFalse())
    else if (type === 'TRUE_FALSE') setAnswers([newAnswer(), newAnswer()])
    else if (next === 'SINGLE_CHOICE' && answers.filter(a => a.correct).length > 1) {
      let kept = false
      setAnswers(prev => prev.map(a => (a.correct && !kept ? ((kept = true), a) : { ...a, correct: false })))
    }
  }

  const markCorrect = (key: number) => {
    setErrors(prev => ({ ...prev, answers: undefined }))
    setAnswers(prev =>
      prev.map(a =>
        type === 'MULTIPLE_CHOICE' ? (a.key === key ? { ...a, correct: !a.correct } : a) : { ...a, correct: a.key === key },
      ),
    )
  }

  const save = async (then: 'close' | 'next') => {
    if (!quiz) return
    const found = questionProblem(type, text, answers)
    const p = wholeNumber(points)
    if (p === null || Number.isNaN(p) || p < 1 || p > 100) found.points = 'Enter 1 to 100'
    setErrors(found)
    if (Object.values(found).some(Boolean)) return
    const body = {
      questionType: type,
      questionText: text.trim(),
      explanation: explanation.trim(),
      points: p as number,
      options: answers.map((a, i) => ({ optionText: a.text.trim(), isCorrect: a.correct, displayOrder: i })),
    }
    try {
      if (question) await updateMut.mutateAsync({ questionId: question.id, body })
      else await createMut.mutateAsync({ assessmentId: quiz.id, body })
      onSaved()
      if (then === 'next' && !question) {
        toastSuccess('Question saved')
        reset(null, type)
        textRef.current?.focus()
      } else {
        toastSuccess(question ? 'Question saved' : 'Question added')
        onOpenChange(false)
      }
    } catch (err) {
      failed(err, 'Could not save the question')
    }
  }

  const isTF = type === 'TRUE_FALSE'
  const number = question
    ? (quiz?.questions?.findIndex(q => q.id === question.id) ?? -1) + 1
    : // The quiz is re-read after each save, so its count already includes saved questions.
      (quiz?.questions?.length ?? 0) + 1
  const saving = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {question ? `Edit question ${number}` : `Add question ${number}`}
            {quiz ? <span className="ml-2 text-sm font-normal text-muted-foreground">· {quiz.title}</span> : null}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <FormField label="Question type" required>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Question type">
              {AUTHORABLE_QUESTION_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={t.value === type}
                  onClick={() => onTypeChange(t.value)}
                  className={cn(
                    'rounded-md border px-3 py-2 text-left',
                    t.value === type ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
                  )}
                >
                  <span className="block text-sm font-medium">{t.label}</span>
                  <span className="block text-xs text-muted-foreground">{t.hint}</span>
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Question" required error={errors.text}>
            <Textarea
              ref={textRef}
              value={text}
              rows={2}
              maxLength={1000}
              onChange={e => {
                setText(e.target.value)
                if (errors.text) setErrors(prev => ({ ...prev, text: undefined }))
              }}
            />
          </FormField>

          <FormField
            label="Answers"
            required
            error={errors.answers}
            hint={type === 'MULTIPLE_CHOICE' ? 'Tick every correct answer' : 'Select the correct answer'}
          >
            <div className="space-y-2">
              {answers.map((a, i) => (
                <div key={a.key} className="flex items-center gap-2">
                  {type === 'MULTIPLE_CHOICE' ? (
                    <Checkbox checked={a.correct} onCheckedChange={() => markCorrect(a.key)} aria-label={`Answer ${i + 1} is correct`} />
                  ) : (
                    <input
                      type="radio"
                      name="correct-answer"
                      className="h-4 w-4 accent-primary"
                      checked={a.correct}
                      onChange={() => markCorrect(a.key)}
                      aria-label={`Answer ${i + 1} is correct`}
                    />
                  )}
                  <Input
                    value={a.text}
                    maxLength={500}
                    disabled={isTF}
                    placeholder={`Answer ${i + 1}`}
                    onChange={e => {
                      const value = e.target.value
                      setAnswers(prev => prev.map(x => (x.key === a.key ? { ...x, text: value } : x)))
                      if (errors.answers) setErrors(prev => ({ ...prev, answers: undefined }))
                    }}
                  />
                  {!isTF ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Remove answer ${i + 1}`}
                      disabled={answers.length <= 2}
                      onClick={() => setAnswers(prev => prev.filter(x => x.key !== a.key))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
              {!isTF && answers.length < MAX_ANSWERS ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => setAnswers(prev => [...prev, newAnswer()])}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add answer
                </Button>
              ) : null}
            </div>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <FormField label="Explanation" hint="Optional: why this is the right answer">
              <Textarea value={explanation} rows={2} maxLength={2000} onChange={e => setExplanation(e.target.value)} />
            </FormField>
            <FormField label="Points" error={errors.points}>
              <Input type="number" min={1} max={100} value={points} onChange={e => setPoints(e.target.value)} />
            </FormField>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            variant={question ? 'default' : 'outline'}
            onClick={() => void save('close')}
            disabled={saving}
          >
            {question ? 'Save question' : 'Save and close'}
          </Button>
          {!question ? (
            <Button type="button" onClick={() => void save('next')} disabled={saving}>
              Save and add next
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Questions panel ─────────────────────────────────────────

function questionTypeLabel(type: LearningAssessmentQuestion['questionType']) {
  return (
    AUTHORABLE_QUESTION_TYPES.find(t => t.value === type)?.label ??
    LEARNING_QUESTION_TYPE_OPTIONS.find(t => t.value === type)?.label ??
    type
  )
}

/** All questions of one quiz: read, edit, delete, add. */
export function QuestionsPanel({
  open,
  onOpenChange,
  quiz,
  readOnly,
  onAdd,
  onEdit,
  onSettings,
  onChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  quiz: LearningAssessment | null
  readOnly: boolean
  onAdd: () => void
  onEdit: (question: LearningAssessmentQuestion) => void
  onSettings: () => void
  onChanged: () => void
}) {
  const deleteMut = useDeleteAssessmentQuestion()
  const questions = quiz?.questions ?? []
  const isFinal = quiz ? !quiz.sectionId : false

  const remove = async (id: string) => {
    try {
      await deleteMut.mutateAsync(id)
      toastSuccess('Question deleted')
      onChanged()
    } catch (err) {
      failed(err, 'Could not delete the question')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{quiz?.title ?? 'Questions'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {quiz ? (
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{isFinal ? 'Final assessment · required' : quiz.isRequired === false ? 'Module quiz · optional' : 'Module quiz · required'}</span>
              <span>· pass {quiz.passingScore}% · {quiz.maximumAttempts ? `${quiz.maximumAttempts} tries` : 'no try limit'}</span>
              {!readOnly ? (
                <button type="button" className="inline-flex items-center gap-1 text-primary hover:underline" onClick={onSettings}>
                  <Settings2 className="h-3 w-3" /> Settings
                </button>
              ) : null}
            </p>
          ) : null}
          {questions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No questions yet. Carers can't take this quiz until it has at least one.
            </p>
          ) : (
            <ol className="divide-y divide-border rounded-lg border border-border">
              {questions.map((q, i) => {
                const correct = (q.options ?? []).filter(o => o.isCorrect).map(o => o.optionText)
                return (
                  <li key={q.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                    <span className="w-5 shrink-0 text-muted-foreground">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{q.questionText}</p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        {questionTypeLabel(q.questionType)} · {correct.join(', ') || 'no correct answer'}
                      </p>
                    </div>
                    {!readOnly ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button size="icon-sm" variant="ghost" aria-label="Edit question" onClick={() => onEdit(q)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <InlineConfirm title="Delete this question?" confirmLabel="Delete" destructive onConfirm={() => void remove(q.id)}>
                          <Button size="icon-sm" variant="ghost" aria-label="Delete question">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </InlineConfirm>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          )}
        </DialogBody>
        <DialogFooter>
          {!readOnly ? (
            <Button type="button" variant="outline" onClick={onAdd}>
              <Plus className="mr-1 h-4 w-4" />
              Add question
            </Button>
          ) : null}
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Flow: add quiz → write questions → questions panel ──────

/**
 * Shared by the Course outline and Final assessment tabs: one place that owns the quiz,
 * question and questions-panel dialogs, reading the live quiz from the version.
 */
export function useQuizFlow(version: LearningCourseVersion, readOnly: boolean, onChanged: () => void) {
  const [add, setAdd] = React.useState<{ open: boolean; sectionId: string | null; moduleTitle?: string }>({
    open: false,
    sectionId: null,
  })
  const [settingsFor, setSettingsFor] = React.useState<string | null>(null)
  const [panelFor, setPanelFor] = React.useState<string | null>(null)
  const [questionDlg, setQuestionDlg] = React.useState<{ open: boolean; quizId: string | null; questionId: string | null }>({
    open: false,
    quizId: null,
    questionId: null,
  })

  const quizById = (id: string | null) => (id ? (version.assessments ?? []).find(a => a.id === id) ?? null : null)
  const questionQuiz = quizById(questionDlg.quizId)
  const editingQuestion = questionQuiz?.questions?.find(q => q.id === questionDlg.questionId) ?? null

  const dialogs = (
    <>
      <QuizDialog
        open={add.open}
        onOpenChange={open => setAdd(prev => ({ ...prev, open }))}
        versionId={version.id}
        sectionId={add.sectionId}
        moduleTitle={add.moduleTitle}
        quiz={null}
        onSaved={onChanged}
        onCreated={created => setQuestionDlg({ open: true, quizId: created.id, questionId: null })}
      />
      <QuizDialog
        open={!!settingsFor}
        onOpenChange={open => !open && setSettingsFor(null)}
        versionId={version.id}
        sectionId={null}
        quiz={quizById(settingsFor)}
        onSaved={onChanged}
      />
      <QuestionsPanel
        open={!!panelFor && !questionDlg.open && !settingsFor}
        onOpenChange={open => !open && setPanelFor(null)}
        quiz={quizById(panelFor)}
        readOnly={readOnly}
        onAdd={() => setQuestionDlg({ open: true, quizId: panelFor, questionId: null })}
        onEdit={q => setQuestionDlg({ open: true, quizId: panelFor, questionId: q.id })}
        onSettings={() => setSettingsFor(panelFor)}
        onChanged={onChanged}
      />
      <QuestionDialog
        open={questionDlg.open}
        onOpenChange={open => setQuestionDlg(prev => ({ ...prev, open }))}
        quiz={questionQuiz}
        question={editingQuestion}
        onSaved={onChanged}
      />
    </>
  )

  return {
    dialogs,
    addQuiz: (sectionId: string | null, moduleTitle?: string) => setAdd({ open: true, sectionId, moduleTitle }),
    openQuestions: (quizId: string) => setPanelFor(quizId),
    openSettings: (quizId: string) => setSettingsFor(quizId),
    /** Add (null) or edit one question straight from a page, without the questions panel. */
    openQuestion: (quizId: string, questionId: string | null) => setQuestionDlg({ open: true, quizId, questionId }),
  }
}
