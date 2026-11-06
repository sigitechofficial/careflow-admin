import * as React from 'react'
import { Search } from 'lucide-react'
import { useSurveyStrings } from '@/features/surveys/survey-ui-strings'

export type LookupOptionGroup = { group: string; options: Array<{ code: string; label: string }> }

/**
 * A long CareFlow list (e.g. the organisation's ethnicity list): a search box and the entries under
 * their group headings, as native radio buttons (one answer) or check boxes (several), so it works
 * with a keyboard, screen readers and on a phone. Answers are the entries' names (kept with their
 * codes by the API).
 */
export function SurveyLookupChoice({
  questionId,
  questionText,
  groups,
  multiple,
  selected,
  disabled,
  onChange,
}: {
  questionId: string
  questionText: string
  groups: LookupOptionGroup[]
  multiple: boolean
  selected: string[]
  disabled?: boolean
  onChange: (next: string[]) => void
}) {
  const t = useSurveyStrings()
  const [search, setSearch] = React.useState('')
  const id = React.useId()
  const term = search.trim().toLowerCase()
  const shown = groups
    .map((g) => ({
      ...g,
      options: term ? g.options.filter((o) => o.label.toLowerCase().includes(term) || g.group.toLowerCase().includes(term)) : g.options,
    }))
    .filter((g) => g.options.length)
  const count = shown.reduce((n, g) => n + g.options.length, 0)
  const toggle = (label: string, on: boolean) =>
    onChange(multiple ? (on ? [...selected, label] : selected.filter((s) => s !== label)) : on ? [label] : [])

  return (
    <div className="space-y-2" data-testid={`lookup-choice-${questionId}`}>
      <div>
        <label className="text-xs font-medium text-foreground" htmlFor={`${id}-search`}>
          {t('searchList')}
        </label>
        <div className="relative mt-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            id={`${id}-search`}
            type="search"
            className="w-full rounded-lg border border-input bg-background py-2 pl-8 pr-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            autoComplete="off"
            disabled={disabled}
            aria-describedby={`${id}-count`}
          />
        </div>
        <p id={`${id}-count`} className="mt-1 text-xs text-muted-foreground" aria-live="polite">
          {term ? (count === 1 ? t('answerMatches') : t('answersMatch', { n: count })) : t('answersCount', { n: count })}
          {selected.length ? ` · ${t('chosen', { list: selected.join(', ') })}` : ''}
        </p>
      </div>
      <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border border-border p-3" role="group" aria-label={questionText}>
        {shown.map((g) => (
          <fieldset key={g.group}>
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.group}</legend>
            <div className="mt-1 space-y-1">
              {g.options.map((o) => {
                const checked = selected.includes(o.label)
                return (
                  <label key={o.code} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted/60">
                    <input
                      type={multiple ? 'checkbox' : 'radio'}
                      name={`${id}-choice`}
                      checked={checked}
                      disabled={disabled}
                      onChange={(e) => toggle(o.label, e.target.checked)}
                      className="h-4 w-4"
                    />
                    {o.label}
                  </label>
                )
              })}
            </div>
          </fieldset>
        ))}
        {!shown.length ? <p className="text-sm text-muted-foreground">{t('nothingMatches')}</p> : null}
      </div>
    </div>
  )
}
