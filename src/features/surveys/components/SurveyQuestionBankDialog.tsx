import * as React from 'react'
import { ChevronLeft, ChevronRight, Eye, Loader2, Search } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Checkbox, RadioGroup, RadioGroupItem } from '@/shared/ui/toggle-controls'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import {
  BANK_AUDIENCE_LABELS,
  BANK_TYPE_LABELS,
  describeQuestionType,
  useQuestionBank,
  type BankAnswerType,
  type BankAudience,
  type BankQuestion,
} from '@/features/surveys/api/survey-library.api'
import { describeLikertScale } from '@/features/surveys/survey-likert'
import { QuestionField } from '@/features/surveys/components/SurveyQuestionField'
import type { PublicSurveyQuestion, SurveyAnswerInput } from '@/features/surveys/types'

const PAGE_SIZE = 25
/** "Put them in": keep each question's ready-made section heading. */
export const BANK_OWN_SECTIONS = '__ready-made__'
const NO_SECTION = '__none__'

/** Answers in short: "Scale: Always … Never", "Choose one: Phone / Portal". */
export function describeBankAnswers(q: BankQuestion): string {
  return q.questionType === 'LIKERT' ? describeLikertScale(q.options) : describeQuestionType(q)
}

function previewOf(q: BankQuestion): PublicSurveyQuestion {
  return {
    id: `bank-${q.id}`,
    questionText: q.questionText,
    helpText: q.helpText,
    questionType: q.questionType,
    options: q.options,
    config: q.config,
    isRequired: q.isRequired,
    sortOrder: 0,
    otherOption: q.otherOption ?? null,
    exclusiveOptions: q.exclusiveOptions ?? [],
    commentConfig: q.commentConfig ?? null,
    showIf: null,
  }
}

function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        on ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function BankPreview({ q }: { q: BankQuestion }) {
  const [value, setValue] = React.useState<SurveyAnswerInput | undefined>(undefined)
  return (
    <div className="mt-2" data-testid="bank-preview">
      <QuestionField q={previewOf(q)} index={0} value={value} disabled={false} onChange={setValue} headingLevel={4} />
    </div>
  )
}

/** The results: tick boxes (several) or one radio group (single choice). */
function ResultsList({
  single,
  value,
  onSingle,
  children,
}: {
  single: boolean
  value: string
  onSingle: (id: string) => void
  children: React.ReactNode
}) {
  if (!single) {
    return (
      <ul className="space-y-2" data-testid="bank-results">
        {children}
      </ul>
    )
  }
  return (
    <RadioGroup value={value} onValueChange={onSingle} aria-label="Questions" className="gap-2" data-testid="bank-results">
      <ul className="space-y-2">{children}</ul>
    </RadioGroup>
  )
}

/** The bank's starting filter for a survey's audience (public surveys: everyone). */
export function bankAudienceForSurvey(targetKind: string | null | undefined): BankAudience | null {
  return targetKind === 'EMPLOYEE' ? 'STF' : targetKind === 'SERVICE_USER' ? 'PWS' : null
}

export type SurveyQuestionBankDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** single: "Use this question" (the question editor); multi: "Add N questions" (the survey page). */
  mode: 'single' | 'multi'
  /** Anonymous survey: the contact-me question cannot be added (we could not reply). */
  anonymous?: boolean
  /** The survey's own audience: the bank starts filtered to it (null = unfiltered). */
  defaultAudience?: BankAudience | null
  /** Multi: the survey's section headings, for "Put them in". */
  sections?: string[]
  pending?: boolean
  /** The questions chosen, in the order chosen; section: undefined = their ready-made headings, null = none. */
  onUse: (questions: BankQuestion[], section: string | null | undefined) => void
}

/**
 * The question bank: the ready-made library's questions to start from. Search and filter by who it
 * is for, topic and answer type; preview a question as people see it; choose one (the editor) or
 * several (the survey page).
 */
export function SurveyQuestionBankDialog({
  open,
  onOpenChange,
  mode,
  anonymous = false,
  defaultAudience = null,
  sections = [],
  pending,
  onUse,
}: SurveyQuestionBankDialogProps) {
  const [searchText, setSearchText] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [audience, setAudience] = React.useState<BankAudience | null>(null)
  const [topic, setTopic] = React.useState<string | null>(null)
  const [type, setType] = React.useState<BankAnswerType | null>(null)
  const [page, setPage] = React.useState(1)
  const [chosen, setChosen] = React.useState<BankQuestion[]>([])
  const [previewId, setPreviewId] = React.useState<string | null>(null)
  const [allTopics, setAllTopics] = React.useState(false)
  const [section, setSection] = React.useState(BANK_OWN_SECTIONS)

  React.useEffect(() => {
    if (!open) return
    setSearchText('')
    setSearch('')
    setAudience(defaultAudience)
    setTopic(null)
    setType(null)
    setPage(1)
    setChosen([])
    setPreviewId(null)
    setSection(BANK_OWN_SECTIONS)
  }, [open])

  React.useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchText.trim())
      setPage(1)
    }, 250)
    return () => clearTimeout(t)
  }, [searchText])

  const { data, isLoading, isError } = useQuestionBank(
    {
      search: search || undefined,
      audience: audience ?? undefined,
      topic: topic ?? undefined,
      type: type ?? undefined,
      page,
      pageSize: PAGE_SIZE,
    },
    open,
  )
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const topics = data?.topics ?? []
  const shownTopics = allTopics ? topics : topics.slice(0, 12)
  const isChosen = (q: BankQuestion) => chosen.some(c => c.id === q.id)
  const toggle = (q: BankQuestion) => {
    if (mode === 'single') setChosen(isChosen(q) ? [] : [q])
    else setChosen(c => (isChosen(q) ? c.filter(x => x.id !== q.id) : [...c, q]))
  }
  const filterReset = (fn: () => void) => {
    fn()
    setPage(1)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" data-testid="question-bank">
        <DialogHeader>
          <DialogTitle>Question bank</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Questions from CareFlow’s ready-made surveys. Choose one to start from — you can change anything before
            saving, and it becomes your own question.
          </p>
          <Input
            aria-label="Search questions"
            placeholder="Search questions, help text and answers"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            leftElement={<Search className="h-4 w-4" />}
          />
          <div className="space-y-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Who it is for">
              <span className="w-24 shrink-0 font-medium text-muted-foreground">Who it is for</span>
              {(Object.keys(BANK_AUDIENCE_LABELS) as BankAudience[]).map(a => (
                <FilterChip key={a} on={audience === a} onClick={() => filterReset(() => setAudience(audience === a ? null : a))}>
                  {BANK_AUDIENCE_LABELS[a]}
                </FilterChip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Topic">
              <span className="w-24 shrink-0 font-medium text-muted-foreground">Topic</span>
              {shownTopics.map(t => (
                <FilterChip key={t} on={topic === t} onClick={() => filterReset(() => setTopic(topic === t ? null : t))}>
                  {t}
                </FilterChip>
              ))}
              {topics.length > 12 ? (
                <button type="button" className="text-xs font-medium text-primary underline-offset-2 hover:underline" onClick={() => setAllTopics(v => !v)}>
                  {allTopics ? 'Fewer topics' : `All ${topics.length} topics`}
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Answer type">
              <span className="w-24 shrink-0 font-medium text-muted-foreground">Answer type</span>
              {(Object.keys(BANK_TYPE_LABELS) as BankAnswerType[]).map(t => (
                <FilterChip key={t} on={type === t} onClick={() => filterReset(() => setType(type === t ? null : t))}>
                  {BANK_TYPE_LABELS[t]}
                </FilterChip>
              ))}
            </div>
          </div>

          {audience ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-primary/5 px-3 py-1.5 text-xs" data-testid="bank-audience-filter">
              <span>
                Showing questions for <span className="font-medium">{BANK_AUDIENCE_LABELS[audience]}</span>
                {audience === defaultAudience ? ', like this survey' : ''}.
              </span>
              <button
                type="button"
                className="font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => filterReset(() => setAudience(null))}
              >
                Show questions for everyone
              </button>
            </div>
          ) : null}
          <div aria-live="polite" className="text-xs text-muted-foreground" data-testid="bank-count">
            {isLoading ? 'Loading questions…' : `${total} question${total === 1 ? '' : 's'}`}
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading the question bank…
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">The question bank could not be loaded. Please try again.</p>
          ) : items.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              {audience && !search && !topic && !type
                ? `No ready-made questions for ${BANK_AUDIENCE_LABELS[audience]} yet. Choose “Show questions for everyone” to see the rest.`
                : 'No questions match. Try fewer filters or other words.'}
            </p>
          ) : (
            <ResultsList
              single={mode === 'single'}
              value={chosen[0]?.id ?? ''}
              onSingle={id => {
                const q = items.find(x => x.id === id)
                if (q) setChosen([q])
              }}
            >
              {items.map(q => {
                const blocked = anonymous && q.contactRequest
                const id = `bank-q-${q.id}`
                return (
                  <li key={q.id} className={cn('rounded-lg border border-border bg-card px-3 py-2.5', isChosen(q) && 'border-primary')} data-testid="bank-question">
                    <div className="flex items-start gap-2.5">
                      {mode === 'single' ? (
                        <RadioGroupItem
                          id={id}
                          value={q.id}
                          disabled={blocked}
                          aria-label={`Choose “${q.questionText}”`}
                          className="mt-0.5"
                        />
                      ) : (
                        <Checkbox
                          id={id}
                          checked={isChosen(q)}
                          disabled={blocked}
                          onCheckedChange={() => toggle(q)}
                          aria-label={`Choose “${q.questionText}”`}
                          className="mt-0.5"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <label htmlFor={id} className="block text-sm font-medium text-foreground">
                          {q.questionText}
                        </label>
                        <p className="text-xs text-muted-foreground">{describeBankAnswers(q)}</p>
                        <p className="text-xs text-muted-foreground" title={q.sources.map(s => `${s.reference} ${s.title}`).join('\n')}>
                          {q.sources.length > 1
                            ? `Used in ${q.sources.length} ready-made surveys`
                            : `From ${q.sources[0]?.reference ?? ''} ${q.sources[0]?.title ?? ''}`.trim()}
                          {q.topic ? ` · ${q.topic}` : ''}
                        </p>
                        {q.askedOnlyIf ? (
                          <p className="text-xs text-muted-foreground" data-testid="bank-asked-only-if">
                            In the ready-made survey it is asked only after an answer to “{q.askedOnlyIf.questionText}”. That
                            rule is not copied: set “When it is asked” yourself if you need it.
                          </p>
                        ) : null}
                        {blocked ? (
                          <p className="text-xs text-amber-700 dark:text-amber-300" data-testid="bank-contact-blocked">
                            Not for an anonymous survey: nobody could be contacted, because answers are not linked to anyone.
                          </p>
                        ) : null}
                        {previewId === q.id ? <BankPreview q={q} /> : null}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 shrink-0 gap-1 px-2 text-xs"
                        aria-expanded={previewId === q.id}
                        onClick={() => setPreviewId(previewId === q.id ? null : q.id)}
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                        {previewId === q.id ? 'Hide preview' : 'Preview'}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ResultsList>
          )}
          {pages > 1 ? (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Button type="button" size="sm" variant="outline" className="h-8 gap-1" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Previous
              </Button>
              Page {page} of {pages}
              <Button type="button" size="sm" variant="outline" className="h-8 gap-1" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter className="flex-wrap gap-2">
          {mode === 'multi' ? (
            <div className="mr-auto flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Put them in</span>
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger className="h-8 w-56" aria-label="Put them in">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BANK_OWN_SECTIONS}>Their ready-made sections</SelectItem>
                  {sections.map(s => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                  <SelectItem value={NO_SECTION}>No section</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!chosen.length || pending}
            onClick={() =>
              onUse(chosen, mode === 'single' || section === BANK_OWN_SECTIONS ? undefined : section === NO_SECTION ? null : section)
            }
          >
            {pending
              ? 'Adding…'
              : mode === 'single'
                ? 'Use this question'
                : `Add ${chosen.length || ''} question${chosen.length === 1 ? '' : 's'}`.replace('  ', ' ')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
