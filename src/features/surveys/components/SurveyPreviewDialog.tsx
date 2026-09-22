import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useSurvey } from '@/features/surveys/hooks/useSurveys'
import type { SurveyQuestion } from '@/features/surveys/types'

function YesNo() {
  return (
    <div className="flex gap-4">
      {['Yes', 'No'].map(o => (
        <label key={o} className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="radio" disabled className="h-4 w-4" />
          {o}
        </label>
      ))}
    </div>
  )
}

function Choice({ options, multi }: { options: string[]; multi?: boolean }) {
  return (
    <div className="space-y-1.5">
      {options.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">No options defined</p>
      ) : (
        options.map(o => (
          <label key={o} className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type={multi ? 'checkbox' : 'radio'} disabled className="h-4 w-4" />
            {o}
          </label>
        ))
      )}
    </div>
  )
}

function Rating({ config }: { config: Record<string, unknown> | null }) {
  const min = typeof config?.min === 'number' ? (config.min as number) : 0
  const max = typeof config?.max === 'number' ? (config.max as number) : 10
  const values = Array.from({ length: Math.max(0, max - min) + 1 }, (_, i) => min + i)
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map(v => (
        <span
          key={v}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-input text-sm text-muted-foreground"
        >
          {v}
        </span>
      ))}
    </div>
  )
}

function QuestionPreview({ q, index }: { q: SurveyQuestion; index: number }) {
  const options = q.options ?? []
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-sm font-medium text-foreground">
        {index + 1}. {q.questionText}
        {q.isRequired ? <span className="ml-1 text-destructive">*</span> : null}
      </p>
      {q.helpText ? <p className="mt-0.5 text-xs text-muted-foreground">{q.helpText}</p> : null}
      <div className="mt-2.5">
        {q.questionType === 'YES_NO' ? (
          <YesNo />
        ) : q.questionType === 'SINGLE_SELECT' ? (
          <Choice options={options} />
        ) : q.questionType === 'MULTI_SELECT' ? (
          <Choice options={options} multi />
        ) : q.questionType === 'LIKERT' ? (
          <Choice options={options.length ? options : ['Strongly agree', 'Agree', 'Neutral', 'Disagree', 'Strongly disagree']} />
        ) : q.questionType === 'RATING' ? (
          <Rating config={q.config} />
        ) : q.questionType === 'NUMBER' ? (
          <input
            type="number"
            disabled
            placeholder="0"
            className="h-9 w-32 rounded-md border border-input bg-background px-3 text-sm"
          />
        ) : q.questionType === 'TEXTAREA' ? (
          <textarea
            disabled
            rows={3}
            placeholder="Long answer…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        ) : (
          <input
            type="text"
            disabled
            placeholder="Short answer…"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        )}
      </div>
    </div>
  )
}

export function SurveyPreviewDialog({
  surveyId,
  open,
  onOpenChange,
}: {
  surveyId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: survey, isLoading } = useSurvey(open ? surveyId ?? undefined : undefined)
  const questions = survey ? [...survey.questions].sort((a, b) => a.sortOrder - b.sortOrder) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{survey?.title ?? 'Survey preview'}</DialogTitle>
          {survey?.description ? (
            <DialogDescription>{survey.description}</DialogDescription>
          ) : (
            <DialogDescription>
              Read-only preview of how recipients see this survey.
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogBody className="space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading survey…
            </div>
          ) : questions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              This survey has no questions yet.
            </p>
          ) : (
            <>
              {survey?.isAnonymous ? (
                <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Responses to this survey are anonymous.
                </p>
              ) : null}
              {questions.map((q, i) => (
                <QuestionPreview key={q.id} q={q} index={i} />
              ))}
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
