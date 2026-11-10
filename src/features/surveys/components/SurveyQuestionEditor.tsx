import * as React from 'react'

/** CareFlow lists a choice question can take its answers from (API: survey-lookup-options.ts). */
export const CAREFLOW_LISTS = [
  { key: 'ETHNICITY', label: 'Ethnic group' },
  { key: 'SEXUAL_ORIENTATION', label: 'Sexual orientation' },
  { key: 'GENDER', label: 'Gender' },
  { key: 'SEX', label: 'Sex' },
  { key: 'LANGUAGE', label: 'Language' },
  { key: 'MARITAL_STATUS', label: 'Marriage or civil partnership' },
] as const
import {
  AlignLeft,
  CircleDot,
  Eye,
  Gauge,
  Hash,
  Library,
  ListChecks,
  SlidersHorizontal,
  ToggleLeft,
  Type,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Switch } from '@/shared/ui/toggle-controls'
import { Combobox } from '@/shared/ui/combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import {
  CHOICE_QUESTION_TYPES,
  type SurveyAnswerInput,
  type SurveyQuestion,
  type SurveyQuestionType,
  type SurveyTargetKind,
} from '@/features/surveys/types'
import { answerChoices, describeShowIf } from '@/features/surveys/survey-logic'
import { STANDARD_SCALES } from '@/features/surveys/survey-likert'
import { QuestionField } from '@/features/surveys/components/SurveyQuestionField'
import { SurveySectionHeading } from '@/features/surveys/components/SurveySectionHeading'
import { SurveyAnswerRows } from '@/features/surveys/components/SurveyAnswerRows'
import { SurveyQuestionFormatDialog } from '@/features/surveys/components/SurveyQuestionFormatGallery'
import { SurveyQuestionBankDialog, bankAudienceForSurvey } from '@/features/surveys/components/SurveyQuestionBankDialog'
import type { BankQuestion } from '@/features/surveys/api/survey-library.api'
import {
  MAX_PROMPT,
  NO_COMMENT_TYPES,
  NOT_COUNTED_TYPES,
  STANDARD_ANSWER_SETS,
  answerRows,
  bankQuestionToDraft,
  CONTACT_ME_ON_ANONYMOUS,
  commentDraftError,
  isContactMeDraft,
  draftAnswerChoices,
  draftPreviewQuestion,
  notCountedDraftError,
  questionDraftError,
  standardSetOf,
  type QuestionDraft,
} from '@/features/surveys/survey-question-draft'

/** "How they answer": every question type as a picture tile. */
export const QUESTION_TYPE_TILES: { type: SurveyQuestionType; label: string; icon: LucideIcon }[] = [
  { type: 'YES_NO', label: 'Yes / No', icon: ToggleLeft },
  { type: 'SINGLE_SELECT', label: 'One answer', icon: CircleDot },
  { type: 'MULTI_SELECT', label: 'Several answers', icon: ListChecks },
  { type: 'LIKERT', label: 'Scale', icon: SlidersHorizontal },
  { type: 'RATING', label: 'Score', icon: Gauge },
  { type: 'NUMBER', label: 'Number', icon: Hash },
  { type: 'TEXT', label: 'Short text', icon: Type },
  { type: 'TEXTAREA', label: 'Long text', icon: AlignLeft },
]

const NEW_SECTION = '__new__'
const NO_SECTION = '__none__'

/** A textarea that grows with its text. */
function GrowingTextarea({
  value,
  onChange,
  className,
  ...rest
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & { value: string; onChange: (v: string) => void }) {
  const ref = React.useRef<HTMLTextAreaElement>(null)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cn(
        'block w-full resize-none overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring read-only:bg-muted/40',
        className,
      )}
      {...rest}
    />
  )
}

/** A chip that is on or off (aria-pressed), or one of a set (role radio). */
function Chip({
  on,
  onClick,
  disabled,
  children,
  radio,
  testId,
}: {
  on: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  radio?: boolean
  testId?: string
}) {
  return (
    <button
      type="button"
      {...(radio ? { role: 'radio', 'aria-checked': on, tabIndex: on ? 0 : -1 } : { 'aria-pressed': on })}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        on ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-background text-muted-foreground hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-60 hover:text-muted-foreground',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Arrow keys within a radio group (the type tiles and the radio chips): move to the next or
 * previous choice and pick it, as a radio group does. Only the chosen one is a Tab stop.
 */
function radioGroupKeys(e: React.KeyboardEvent<HTMLElement>) {
  const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
  if (!delta) return
  const radios = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])'))
  const at = radios.indexOf(document.activeElement as HTMLElement)
  if (at < 0 || radios.length < 2) return
  e.preventDefault()
  const next = radios[(at + delta + radios.length) % radios.length]!
  next.focus()
  next.click()
}

function Step({ n, title, children, testId }: { n: number; title: string; children: React.ReactNode; testId: string }) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-background p-4" data-testid={testId} aria-label={title}>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] text-primary">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  )
}

/** Picks answers as chips (keeps the answers' own order). */
function AnswerChips({
  choices,
  selected,
  onChange,
  disabled,
  testId,
}: {
  choices: readonly string[]
  selected: readonly string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  testId: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5" data-testid={testId}>
      {choices.map(choice => {
        const on = selected.includes(choice)
        return (
          <Chip
            key={choice}
            on={on}
            disabled={disabled}
            onClick={() => onChange(choices.filter(c => (c === choice ? !on : selected.includes(c))))}
          >
            {choice}
          </Chip>
        )
      })}
    </div>
  )
}

export type SurveyQuestionEditorProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The draft to start from (a new question, or the question being edited). */
  initial: QuestionDraft
  /** Editing: "Edit question N of M"; adding: the new question's number. */
  editing?: { number: number; total: number } | null
  newNumber?: number
  /** Answered survey: only the help text, section and comment box can change. */
  locked?: boolean
  /** Earlier, always-asked questions this one can depend on. */
  earlier: SurveyQuestion[]
  /** Questions that depend on this one (then it is always asked). */
  dependents: SurveyQuestion[]
  /** The survey's section headings. */
  sections: string[]
  pending?: boolean
  /** Anonymous survey: the question bank leaves out the contact-me question. */
  anonymous?: boolean
  /** The survey's audience: the question bank starts filtered to it, and examples suit it. */
  targetKind?: SurveyTargetKind | null
  /** Shown under the question types when the editor opens (a format chosen on the survey page). */
  initialNote?: string | null
  onSave: (draft: QuestionDraft) => void
}

/**
 * Add / Edit question: the form on the left in five steps — the question, how they answer, their
 * own words, when it is asked and its section — and on the right what people see, live.
 */
export function SurveyQuestionEditor({
  open,
  onOpenChange,
  initial,
  editing,
  newNumber = 1,
  locked = false,
  earlier,
  dependents,
  sections,
  pending,
  anonymous = false,
  targetKind = null,
  initialNote = null,
  onSave,
}: SurveyQuestionEditorProps) {
  const [draft, setDraft] = React.useState<QuestionDraft>(initial)
  const [customScale, setCustomScale] = React.useState(false)
  const [newSection, setNewSection] = React.useState(false)
  const [preview, setPreview] = React.useState<SurveyAnswerInput | undefined>(undefined)
  const [bankOpen, setBankOpen] = React.useState(false)
  /** The question chosen from the bank had a "Show only if" rule, which is not copied. */
  const [bankShowIfDropped, setBankShowIfDropped] = React.useState<string | null>(null)
  /** "See example questions": the format gallery, in its own dialog. */
  const [formatsOpen, setFormatsOpen] = React.useState(false)
  /** Said after a follow-up format is applied: which question it follows, or what to do first. */
  const [formatNote, setFormatNote] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setDraft(initial)
    setCustomScale(initial.questionType === 'LIKERT' && !standardSetOf(initial.scale, STANDARD_SCALES))
    setNewSection(Boolean(initial.sectionTitle.trim()) && !sections.includes(initial.sectionTitle.trim()))
    setPreview(undefined)
    setBankShowIfDropped(null)
    setFormatNote(initialNote)
    // Only when the editor opens (initial is a new object each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = (patch: Partial<QuestionDraft>) => setDraft(d => ({ ...d, ...patch }))
  const isChoice = CHOICE_QUESTION_TYPES.includes(draft.questionType)
  const canComment = !NO_COMMENT_TYPES.includes(draft.questionType)
  const choices = draftAnswerChoices(draft)
  // An answered (locked) question: only its comment box can be wrong — the rest is as saved.
  const error = locked
    ? (commentDraftError(draft) ?? notCountedDraftError(draft))
    : anonymous && isContactMeDraft(draft)
      ? CONTACT_ME_ON_ANONYMOUS
      : draft.questionText.trim()
        ? questionDraftError(draft)
        : null
  const scaleKey = standardSetOf(draft.scale, STANDARD_SCALES)
  const source = earlier.find(q => q.key === draft.showIfKey) ?? null
  const sourceChoices = source ? (answerChoices(source) ?? []) : []
  const number = editing?.number ?? newNumber
  const previewQ = draftPreviewQuestion(draft)

  /** A question from the bank fills the draft (it stays editable); "Show only if" is never copied. */
  const useBankQuestion = (q: BankQuestion) => {
    const section = draft.sectionTitle.trim() || q.topic || ''
    const next = bankQuestionToDraft(q, section || null)
    setDraft(next)
    setCustomScale(next.questionType === 'LIKERT' && !standardSetOf(next.scale, STANDARD_SCALES))
    setNewSection(Boolean(section) && !sections.includes(section))
    setPreview(undefined)
    setBankShowIfDropped(q.askedOnlyIf ? (q.askedOnlyIf.questionText ?? 'another question') : null)
    setFormatNote(null)
    setBankOpen(false)
  }

  /** A format from "See example questions" fills the draft; the editor stays as it is. */
  const applyExampleFormat = (format: QuestionDraft, formatNoteText: string | null) => {
    // Other questions are asked only after an answer to this one, so it must stay always asked: a
    // follow-up format changes its answers, never when it is asked.
    const keepsAlways = dependents.length > 0 && Boolean(format.showIfKey)
    const next = keepsAlways ? { ...format, showIfKey: '', showIfAnswers: [] } : format
    const note = keepsAlways
      ? 'Other questions are asked only after an answer to this one, so it stays always asked. To make it a follow-up, change those questions first.'
      : formatNoteText
    setDraft(next)
    setCustomScale(next.questionType === 'LIKERT' && !standardSetOf(next.scale, STANDARD_SCALES))
    setPreview(undefined)
    setBankShowIfDropped(null)
    setFormatNote(note)
    setFormatsOpen(false)
  }

  const pickType = (type: SurveyQuestionType) => {
    if (type === draft.questionType) return
    set({ questionType: type, commentShowWhen: [], commentWhen: 'ANY' })
    setPreview(undefined)
  }

  const sectionOptions = [
    { value: NO_SECTION, label: 'No section' },
    ...sections.map(s => ({ value: s, label: s })),
    { value: NEW_SECTION, label: 'New section…' },
  ]
  const sectionValue = newSection ? NEW_SECTION : draft.sectionTitle.trim() ? draft.sectionTitle.trim() : NO_SECTION

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" data-testid="question-editor">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit question ${editing.number} of ${editing.total}` : 'Add question'}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <div className="space-y-4">
              {locked ? (
                <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100" data-testid="question-locked">
                  People have already answered this survey, so the question, how they answer and its answers are fixed —
                  changing them would misrepresent the answers. You can still change the help text, section, comment box
                  and which answers are not counted in percentages, or add a new question.
                </p>
              ) : null}

              <Step n={1} title="The question" testId="step-question">
                {!editing ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Start from one of CareFlow’s ready-made questions, then change it as you like.</p>
                    <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setBankOpen(true)}>
                      <Library className="h-3.5 w-3.5" aria-hidden />
                      Choose from question bank
                    </Button>
                  </div>
                ) : null}
                {bankShowIfDropped ? (
                  <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100" data-testid="bank-show-if-dropped">
                    In the ready-made survey this question is asked only after an answer to “{bankShowIfDropped}”. That rule
                    was not copied: set “When it is asked” below if you need it.
                  </p>
                ) : null}
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Question *</span>
                  <GrowingTextarea
                    value={draft.questionText}
                    readOnly={locked}
                    onChange={v => set({ questionText: v })}
                    maxLength={500}
                    placeholder="e.g. How supported do you feel by your manager?"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Help text</span>
                  <GrowingTextarea
                    value={draft.helpText}
                    onChange={v => set({ helpText: v })}
                    maxLength={500}
                    placeholder="Optional guidance shown under the question"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={draft.isRequired}
                    disabled={locked}
                    onCheckedChange={v => set({ isRequired: v })}
                    aria-label="People must answer this"
                  />
                  People must answer this
                </label>
              </Step>

              <Step n={2} title="How they answer" testId="step-type">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="How they answer" onKeyDown={radioGroupKeys}>
                  {QUESTION_TYPE_TILES.map(t => {
                    const on = draft.questionType === t.type
                    const Icon = t.icon
                    return (
                      <button
                        key={t.type}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        tabIndex={on ? 0 : -1}
                        disabled={locked && !on}
                        onClick={() => !locked && pickType(t.type)}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors',
                          on ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                          locked && !on && 'opacity-40',
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                        {t.label}
                      </button>
                    )
                  })}
                </div>
                {!locked ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setFormatsOpen(true)}>
                      <Eye className="h-3.5 w-3.5" aria-hidden />
                      See example questions
                    </Button>
                    <span className="text-xs text-muted-foreground">Not sure which to pick? See each format working.</span>
                  </div>
                ) : null}
                {formatNote ? (
                  <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-foreground" data-testid="format-note">
                    {formatNote}
                  </p>
                ) : null}

                {isChoice ? (
                  <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="question-options-from">
                      Answers come from
                    </label>
                    <select
                      id="question-options-from"
                      className="block w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm"
                      value={draft.optionsFrom}
                      disabled={locked}
                      onChange={e => set({ optionsFrom: e.target.value })}
                      aria-describedby="question-options-from-hint"
                    >
                      <option value="">Answers you write here</option>
                      {CAREFLOW_LISTS.map(l => (
                        <option key={l.key} value={l.key}>
                          Your CareFlow list: {l.label}
                        </option>
                      ))}
                    </select>
                    <p id="question-options-from-hint" className="text-xs text-muted-foreground">
                      {draft.optionsFrom
                        ? 'People choose from your list in Settings (only entries in use). Results show each group (for example “Asian”) and a detailed answer only when at least 10 people chose it.'
                        : 'For equality questions such as ethnic group, use your CareFlow list so answers match your records.'}
                    </p>
                  </div>
                ) : null}

                {isChoice && !draft.optionsFrom ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">Answers</p>
                      {locked ? null : (
                        <Select
                          value=""
                          onValueChange={key => {
                            const set_ = STANDARD_ANSWER_SETS.find(s => s.key === key)
                            if (set_) set({ options: answerRows(set_.options) })
                          }}
                        >
                          <SelectTrigger className="h-8 w-48" aria-label="Use a standard set">
                            <SelectValue placeholder="Use a standard set" />
                          </SelectTrigger>
                          <SelectContent>
                            {STANDARD_ANSWER_SETS.map(s => (
                              <SelectItem key={s.key} value={s.key}>
                                {s.label}: {s.options[0]} … {s.options[s.options.length - 1]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <SurveyAnswerRows
                      rows={draft.options}
                      onChange={options => set({ options })}
                      label="Answer"
                      locked={locked}
                      notCountedLocked={false}
                      showExclusive={draft.questionType === 'MULTI_SELECT'}
                      showNotCounted
                    />
                  </div>
                ) : null}

                {draft.questionType === 'LIKERT' ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Scale</p>
                    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Scale" onKeyDown={radioGroupKeys}>
                      {STANDARD_SCALES.map(s => (
                        <Chip
                          key={s.key}
                          radio
                          on={!customScale && scaleKey === s.key}
                          disabled={locked}
                          onClick={() => {
                            setCustomScale(false)
                            set({ scale: answerRows(s.options) })
                          }}
                        >
                          {s.label}: {s.options.join(' · ')}
                        </Chip>
                      ))}
                      <Chip radio on={customScale || !scaleKey} disabled={locked} onClick={() => setCustomScale(true)}>
                        Your own labels
                      </Chip>
                    </div>
                    <SurveyAnswerRows
                      rows={draft.scale}
                      onChange={scale => set({ scale })}
                      label="Scale label"
                      addLabel="Add label"
                      locked={locked}
                      notCountedLocked={false}
                      fixedText={!customScale && Boolean(scaleKey)}
                      showNotCounted
                    />
                  </div>
                ) : null}

                {draft.questionType === 'RATING' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1 text-sm">
                      <span className="font-medium">Lowest score</span>
                      <Input type="number" value={draft.ratingMin} readOnly={locked} onChange={e => set({ ratingMin: e.target.value })} />
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span className="font-medium">Highest score</span>
                      <Input type="number" value={draft.ratingMax} readOnly={locked} onChange={e => set({ ratingMax: e.target.value })} />
                    </label>
                  </div>
                ) : null}
                {draft.questionType === 'NUMBER' ? (
                  <p className="text-xs text-muted-foreground">People type a number.</p>
                ) : null}
                {NOT_COUNTED_TYPES.includes(draft.questionType) ? (
                  <p className="text-xs text-muted-foreground">
                    Answers “Not counted in percentages” (such as Don’t know) are shown on their own in the results.
                  </p>
                ) : null}
              </Step>

              {isChoice || canComment ? (
                <Step n={3} title="Their own words" testId="step-words">
                  <div className="flex flex-wrap gap-1.5">
                    {isChoice ? (
                      <Chip on={draft.otherEnabled} disabled={locked} onClick={() => set({ otherEnabled: !draft.otherEnabled })} testId="other-enabled">
                        + Other with a text box
                      </Chip>
                    ) : null}
                    {canComment ? (
                      <Chip on={draft.commentEnabled} onClick={() => set({ commentEnabled: !draft.commentEnabled })} testId="comment-enabled">
                        Comment box
                      </Chip>
                    ) : null}
                  </div>
                  {isChoice && draft.otherEnabled ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block space-y-1 text-xs">
                        <span className="font-medium">Other choice label</span>
                        <Input value={draft.otherLabel} maxLength={MAX_PROMPT} readOnly={locked} onChange={e => set({ otherLabel: e.target.value })} data-testid="other-label" />
                      </label>
                      <label className="block space-y-1 text-xs">
                        <span className="font-medium">Text box prompt</span>
                        <Input value={draft.otherPrompt} maxLength={MAX_PROMPT} readOnly={locked} onChange={e => set({ otherPrompt: e.target.value })} data-testid="other-prompt" />
                      </label>
                      <label className="flex items-center gap-2 text-xs sm:col-span-2">
                        <Switch
                          size="sm"
                          checked={draft.otherRequired}
                          disabled={locked}
                          onCheckedChange={v => set({ otherRequired: v })}
                          aria-label="They must fill in the text box"
                        />
                        They must fill in the text box when they choose it
                      </label>
                    </div>
                  ) : null}
                  {canComment && draft.commentEnabled ? (
                    <div className="space-y-2">
                      <label className="block space-y-1 text-xs">
                        <span className="font-medium">Comment box prompt</span>
                        <Input value={draft.commentPrompt} maxLength={MAX_PROMPT} onChange={e => set({ commentPrompt: e.target.value })} data-testid="comment-prompt" />
                      </label>
                      {choices.length ? (
                        <div className="space-y-1.5 text-xs">
                          <p className="font-medium">Show the comment box after</p>
                          <div className="flex flex-wrap gap-1.5" data-testid="comment-show-when">
                            <Chip
                              on={draft.commentWhen === 'ANY'}
                              onClick={() => set({ commentWhen: 'ANY', commentShowWhen: [] })}
                              testId="comment-when-any"
                            >
                              Any answer
                            </Chip>
                            {choices.map(c => {
                              const on = draft.commentWhen === 'SOME' && draft.commentShowWhen.includes(c)
                              return (
                                <Chip
                                  key={c}
                                  on={on}
                                  onClick={() => {
                                    const picked = choices.filter(x => (x === c ? !on : draft.commentWhen === 'SOME' && draft.commentShowWhen.includes(x)))
                                    set(picked.length ? { commentWhen: 'SOME', commentShowWhen: picked } : { commentWhen: 'ANY', commentShowWhen: [] })
                                  }}
                                >
                                  {c}
                                </Chip>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Shown once they have answered.</p>
                      )}
                    </div>
                  ) : null}
                </Step>
              ) : null}

              <Step n={isChoice || canComment ? 4 : 3} title="When it is asked" testId="step-when">
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="When it is asked" onKeyDown={radioGroupKeys}>
                  <Chip radio on={!draft.showIfKey} disabled={locked} onClick={() => set({ showIfKey: '', showIfAnswers: [] })}>
                    Always
                  </Chip>
                  <Chip
                    radio
                    on={Boolean(draft.showIfKey)}
                    disabled={locked || dependents.length > 0 || earlier.length === 0}
                    onClick={() => !draft.showIfKey && set({ showIfKey: earlier[0]?.key ?? '', showIfAnswers: [] })}
                    testId="show-if-only-after"
                  >
                    Only after certain answers
                  </Chip>
                </div>
                {dependents.length ? (
                  <p className="text-xs text-muted-foreground" data-testid="show-if-dependents">
                    Always — {dependents.length === 1 ? 'another question depends' : `${dependents.length} questions depend`} on
                    this one, so it is always asked.
                  </p>
                ) : !earlier.length ? (
                  <p className="text-xs text-muted-foreground">
                    To ask it only after certain answers, add the question it depends on first (yes / no, choice, scale or score).
                  </p>
                ) : null}
                {draft.showIfKey ? (
                  <div className="space-y-2">
                    <Select
                      value={draft.showIfKey}
                      disabled={locked}
                      onValueChange={key => set({ showIfKey: key, showIfAnswers: [] })}
                    >
                      <SelectTrigger className="h-auto min-h-9 text-left [&>span]:whitespace-normal" aria-label="Earlier question" data-testid="show-if-question">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {earlier.map(q => (
                          <SelectItem key={q.key!} value={q.key!} className="whitespace-normal">
                            {q.questionText}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {source ? (
                      <>
                        <p className="text-xs text-muted-foreground">…is answered with any of:</p>
                        <AnswerChips
                          choices={sourceChoices}
                          selected={draft.showIfAnswers}
                          disabled={locked}
                          onChange={showIfAnswers => set({ showIfAnswers })}
                          testId="show-if-answers"
                        />
                        <p className="text-xs text-muted-foreground">Otherwise the question is skipped and not required.</p>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </Step>

              <Step n={isChoice || canComment ? 5 : 4} title="Section" testId="step-section">
                <Combobox
                  aria-label="Section"
                  data-testid="section-picker"
                  options={sectionOptions}
                  value={sectionValue}
                  allowDeselect={false}
                  onChange={v => {
                    if (v === NEW_SECTION) {
                      setNewSection(true)
                      set({ sectionTitle: '' })
                    } else {
                      setNewSection(false)
                      set({ sectionTitle: v === NO_SECTION ? '' : v })
                    }
                  }}
                />
                {newSection ? (
                  <label className="block space-y-1 text-xs">
                    <span className="font-medium">New section heading</span>
                    <Input
                      value={draft.sectionTitle}
                      maxLength={200}
                      onChange={e => set({ sectionTitle: e.target.value })}
                      placeholder="e.g. Your visits — shown above the first question in the section"
                    />
                  </label>
                ) : null}
              </Step>
            </div>

            <aside className="space-y-2 lg:sticky lg:top-0 lg:self-start" aria-label="What people see" data-testid="question-preview">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What people see</p>
              {previewQ.sectionTitle ? <SurveySectionHeading title={previewQ.sectionTitle} className="pt-0" /> : null}
              <QuestionField
                key={`${draft.questionType}`}
                q={previewQ}
                index={number - 1}
                value={preview}
                disabled={false}
                headingLevel={previewQ.sectionTitle ? 4 : 3}
                onChange={setPreview}
              />
              {draft.showIfKey && source && draft.showIfAnswers.length ? (
                <p className="text-xs text-muted-foreground" data-testid="preview-show-if">
                  {describeShowIf({ answers: draft.showIfAnswers }, source.questionText)}; otherwise it is skipped.
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">Try it: answers here are not saved.</p>
            </aside>
          </div>
        </DialogBody>
        <DialogFooter className="flex-wrap gap-2">
          {error ? (
            <p className="mr-auto text-xs text-destructive" role="alert" data-testid="question-error">
              {error}
            </p>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!draft.questionText.trim() || Boolean(error) || pending}
            onClick={() => onSave(draft)}
          >
            {pending ? 'Saving…' : editing ? 'Save changes' : 'Add question'}
          </Button>
        </DialogFooter>
      </DialogContent>
      {formatsOpen ? (
        <SurveyQuestionFormatDialog
          open
          onOpenChange={setFormatsOpen}
          draft={draft}
          targetKind={targetKind}
          anonymous={anonymous}
          earlier={earlier}
          onApply={applyExampleFormat}
        />
      ) : null}
      {bankOpen ? (
        <SurveyQuestionBankDialog
          open
          onOpenChange={setBankOpen}
          mode="single"
          anonymous={anonymous}
          defaultAudience={bankAudienceForSurvey(targetKind)}
          onUse={([q]) => q && useBankQuestion(q)}
        />
      ) : null}
    </Dialog>
  )
}
