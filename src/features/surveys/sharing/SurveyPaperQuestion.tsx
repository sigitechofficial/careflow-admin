import type { PublicSurveyQuestion } from '@/features/surveys/types'
import { choiceOptions, ratingValues } from '@/features/surveys/components/SurveyQuestionField'

/**
 * One question as it is printed on the paper copy: the same answers, Other choice, comment box and
 * "Show only if" rule as on screen (the same helpers as the online form), drawn as tick boxes and
 * writing lines. Staff later type a returned copy in with Record response.
 */

function Box() {
  return <span aria-hidden className="mr-2 inline-block h-4 w-4 shrink-0 translate-y-0.5 border-[1.5px] border-black" />
}

function Lines({ count, label }: { count: number; label: string }) {
  return (
    <div role="img" aria-label={label} className="mt-1 space-y-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-5 border-b border-black/70" />
      ))}
    </div>
  )
}

function Ticks({ options }: { options: string[] }) {
  return (
    <ul className="mt-1.5 space-y-1.5">
      {options.map(o => (
        <li key={o} className="flex items-start text-[13px] leading-snug">
          <Box />
          <span>{o}</span>
        </li>
      ))}
    </ul>
  )
}

export function SurveyPaperQuestion({
  q,
  number,
  /** "Show only if" rule, already said in words with the earlier question's number. */
  onlyIf,
  anonymous,
}: {
  q: PublicSurveyQuestion
  number: number
  onlyIf: string | null
  anonymous: boolean
}) {
  const other = q.otherOption ?? null
  const comment = q.commentConfig ?? null
  const isChoice = q.questionType === 'SINGLE_SELECT' || q.questionType === 'MULTI_SELECT' || q.questionType === 'LIKERT'
  const instruction =
    q.questionType === 'MULTI_SELECT'
      ? `Tick all that apply${q.exclusiveOptions?.length ? ` (or just “${q.exclusiveOptions.join('” or “')}”)` : ''}.`
      : isChoice || q.questionType === 'YES_NO'
        ? 'Tick one box.'
        : q.questionType === 'RATING'
          ? 'Circle one number.'
          : null

  return (
    <section className="break-inside-avoid py-3" data-testid="paper-question">
      <h3 className="text-[14px] font-semibold leading-snug">
        {number}. {q.questionText}
        {q.isRequired ? <span aria-label="needs an answer"> *</span> : null}
      </h3>
      {onlyIf ? <p className="mt-0.5 text-[12px] italic">{onlyIf}</p> : null}
      {q.helpText ? <p className="mt-0.5 text-[12px] text-black/75">{q.helpText}</p> : null}
      {instruction ? <p className="mt-0.5 text-[12px] text-black/75">{instruction}</p> : null}

      {q.questionType === 'YES_NO' ? (
        <Ticks options={['Yes', 'No']} />
      ) : isChoice && q.optionGroups?.length ? (
        <div className="mt-1.5 columns-2 gap-6">
          {q.optionGroups.map(g => (
            <div key={g.group} className="mb-2 break-inside-avoid">
              <p className="text-[12px] font-semibold">{g.group}</p>
              <Ticks options={g.options.map(o => o.label)} />
            </div>
          ))}
        </div>
      ) : isChoice ? (
        <Ticks options={choiceOptions(q)} />
      ) : q.questionType === 'RATING' ? (
        <p className="mt-1.5 flex flex-wrap gap-3 text-[14px] tabular-nums">
          {ratingValues(q.config).map(n => (
            <span key={n} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/60">
              {n}
            </span>
          ))}
        </p>
      ) : q.questionType === 'NUMBER' ? (
        <div role="img" aria-label="Write a number" className="mt-1.5 h-8 w-32 border border-black" />
      ) : (
        <Lines count={q.questionType === 'TEXTAREA' ? 4 : 1} label="Write your answer" />
      )}

      {other && (q.questionType === 'SINGLE_SELECT' || q.questionType === 'MULTI_SELECT') ? (
        <div className="mt-1.5 text-[13px]">
          <p className="flex items-start">
            <Box />
            <span>
              {other.label}: {other.textPrompt}
            </span>
          </p>
          <Lines count={1} label={other.textPrompt} />
        </div>
      ) : null}

      {comment ? (
        <div className="mt-2 text-[13px]">
          <p>
            {comment.showWhen?.length ? `If you answered ${comment.showWhen.join(' or ')}: ` : ''}
            {comment.prompt} (optional)
          </p>
          <Lines count={2} label={comment.prompt} />
        </div>
      ) : null}
      {anonymous && (q.questionType === 'TEXT' || q.questionType === 'TEXTAREA' || comment || other) ? (
        <p className="mt-1 text-[11px] text-black/70">Please do not write any names.</p>
      ) : null}
    </section>
  )
}
