import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import type { SurveyAnswerInput, SurveyQuestion, SurveyTargetKind } from '@/features/surveys/types'
import { QuestionField } from '@/features/surveys/components/SurveyQuestionField'
import { CONTACT_ME_ON_ANONYMOUS, draftPreviewQuestion, emptyDraft, type QuestionDraft } from '@/features/surveys/survey-question-draft'
import {
  FORMAT_GROUPS,
  QUESTION_FORMATS,
  applyFormat,
  followUpNote,
  formatAudienceOf,
  formatDraft,
  formatReplacesTyped,
  type FormatAudience,
  type FormatExample,
  type QuestionFormat,
} from '@/features/surveys/survey-question-formats'

/** One live example: the real answer field, working, with nothing saved. */
function Example({ id, example, index = 0 }: { id: string; example: FormatExample; index?: number }) {
  const [value, setValue] = React.useState<SurveyAnswerInput | undefined>(undefined)
  const q = { ...draftPreviewQuestion(formatDraft(emptyDraft(), example)), id }
  return <QuestionField q={q} index={index} value={value} disabled={false} onChange={setValue} headingLevel={4} />
}

/** A follow-up: the earlier question, and the follow-up once it is answered Yes. */
function FollowUpExample({ id, lead, follow }: { id: string; lead: FormatExample; follow: FormatExample }) {
  const [value, setValue] = React.useState<SurveyAnswerInput | undefined>(undefined)
  const leadQ = { ...draftPreviewQuestion(formatDraft(emptyDraft(), lead)), id: `${id}-lead` }
  return (
    <div className="space-y-2">
      <QuestionField q={leadQ} index={0} value={value} disabled={false} onChange={setValue} headingLevel={4} />
      {value?.booleanValue === true ? (
        <Example id={`${id}-follow`} example={follow} index={1} />
      ) : (
        <p className="text-xs text-muted-foreground">Answer Yes to see the follow-up question.</p>
      )}
    </div>
  )
}

/**
 * "Choose a format": a working example of every way a question can be asked, grouped. The cards are
 * one radio group (one Tab stop; arrow keys move between them); "Use this format" — or Enter on a
 * card, or a double click — applies the chosen one. Each example is inert while browsing (no Tab
 * stops inside); "Try it" makes it clickable.
 */
export const SurveyQuestionFormatGallery = React.memo(function SurveyQuestionFormatGallery({
  audience,
  anonymous = false,
  onUse,
}: {
  audience: FormatAudience
  /** Anonymous survey: Contact me cannot be chosen. */
  anonymous?: boolean
  onUse: (format: QuestionFormat) => void
}) {
  const available = (f: QuestionFormat) => !(anonymous && f.contactMe)
  const [chosen, setChosen] = React.useState<string>(QUESTION_FORMATS[0]!.key)
  const [trying, setTrying] = React.useState<Set<string>>(new Set())
  const refs = React.useRef(new Map<string, HTMLElement>())
  const order = QUESTION_FORMATS.filter(available).map(f => f.key)
  const chosenFormat = QUESTION_FORMATS.find(f => f.key === chosen)!

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Only on the cards themselves (not "Try it", "Use this format" or a live example).
    if ((e.target as HTMLElement).getAttribute('role') !== 'radio') return
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onUse(chosenFormat)
      return
    }
    if (e.key === 'Home' || e.key === 'End' || delta) {
      e.preventDefault()
      const at = order.indexOf(chosen)
      const next =
        e.key === 'Home' ? order[0]! : e.key === 'End' ? order[order.length - 1]! : order[(at + delta + order.length) % order.length]!
      setChosen(next)
      refs.current.get(next)?.focus()
    }
  }

  return (
    <div className="space-y-4" data-testid="format-gallery">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Choose a format by its example. You can change the question, answers and settings afterwards.
        </p>
      </div>
      <div role="radiogroup" aria-label="Choose a format" onKeyDown={onKeyDown} className="space-y-4">
        {FORMAT_GROUPS.map(group => (
          <section key={group} className="space-y-2" aria-label={group}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</h4>
            <div className="grid gap-3 xl:grid-cols-2">
              {QUESTION_FORMATS.filter(f => f.group === group).map(f => {
                const on = f.key === chosen
                const disabled = !available(f)
                const example = f.example(audience)
                const isTrying = trying.has(f.key)
                return (
                  <div
                    key={f.key}
                    className={cn(
                      'space-y-2 rounded-lg border p-3 transition-colors',
                      on ? 'border-primary bg-primary/5 ring-1 ring-primary/40' : 'border-border',
                      disabled && 'opacity-60',
                    )}
                    data-testid={`format-${f.key}`}
                  >
                    <div
                      ref={el => {
                        if (el) refs.current.set(f.key, el)
                        else refs.current.delete(f.key)
                      }}
                      role="radio"
                      aria-checked={on}
                      aria-disabled={disabled || undefined}
                      aria-label={f.name}
                      aria-describedby={`format-${f.key}-when`}
                      tabIndex={on ? 0 : -1}
                      onClick={() => !disabled && setChosen(f.key)}
                      onDoubleClick={() => !disabled && onUse(f)}
                      className="cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <p className="text-sm font-medium text-foreground">{f.name}</p>
                      <p id={`format-${f.key}-when`} className="text-xs text-muted-foreground">
                        {disabled ? CONTACT_ME_ON_ANONYMOUS : f.when}
                      </p>
                    </div>
                    {/* Inert while browsing: no Tab stops inside the examples. */}
                    <div inert={!isTrying} className={cn(!isTrying && 'pointer-events-none select-none')} data-testid={`format-${f.key}-example`}>
                      {f.followUp ? (
                        <FollowUpExample id={`format-${f.key}`} lead={f.followUp.lead(audience)} follow={example} />
                      ) : (
                        <Example id={`format-${f.key}`} example={example} />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        aria-pressed={isTrying}
                        onClick={() =>
                          setTrying(t => {
                            const next = new Set(t)
                            if (next.has(f.key)) next.delete(f.key)
                            else next.add(f.key)
                            return next
                          })
                        }
                      >
                        {isTrying ? 'Stop trying' : 'Try it'}
                        <span className="sr-only"> ({f.name})</span>
                      </Button>
                      {on && !disabled ? (
                        <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={() => onUse(f)}>
                          Use this format
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
})

/**
 * "See example questions": the format gallery in its own dialog (like the question bank). Choosing a
 * format fills the draft — its type, example answers and settings; the person's own question text is
 * kept, and before answers they typed are replaced they are asked. Then they are back in the editor.
 */
export function SurveyQuestionFormatDialog({
  open,
  onOpenChange,
  draft,
  targetKind,
  anonymous = false,
  earlier,
  onApply,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The draft the format is applied to. */
  draft: QuestionDraft
  /** The survey's audience: staff or person-facing examples. */
  targetKind?: SurveyTargetKind | null
  anonymous?: boolean
  /** Earlier questions a follow-up can be asked after. */
  earlier: readonly SurveyQuestion[]
  /** The filled draft, and a note to show (follow-ups). */
  onApply: (draft: QuestionDraft, note: string | null) => void
}) {
  const audience = formatAudienceOf(targetKind)
  const [pending, setPending] = React.useState<QuestionFormat | null>(null)
  React.useEffect(() => {
    if (open) setPending(null)
  }, [open])
  const apply = (format: QuestionFormat, replaceTyped: boolean) => {
    const { draft: next, followUpOn } = applyFormat(draft, format, { audience, replaceTyped, earlier })
    onApply(next, followUpNote(format, next, followUpOn))
  }
  // A stable callback, so the live examples are not re-rendered needlessly.
  const latest = React.useRef({ draft, audience, apply })
  latest.current = { draft, audience, apply }
  const onUse = React.useCallback((format: QuestionFormat) => {
    const { draft: d, audience: a, apply: run } = latest.current
    if (formatReplacesTyped(d, format, a)) setPending(format)
    else run(format, true)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" data-testid="format-dialog">
        <DialogHeader>
          <DialogTitle>Example questions</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {pending ? (
            <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm" role="alert" data-testid="format-replace-confirm">
              <p className="text-foreground">
                “{pending.name}” comes with example answers{pending.setsText ? ' and its own question' : ''}. Replace what you
                typed with the example, or keep yours and only change the format?
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => apply(pending, true)}>
                  Replace with the example
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => apply(pending, false)}>
                  Keep mine
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPending(null)}>
                  Back to the examples
                </Button>
              </div>
            </div>
          ) : (
            <SurveyQuestionFormatGallery audience={audience} anonymous={anonymous} onUse={onUse} />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
