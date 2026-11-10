import * as React from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { useSurveySendCandidates } from '@/features/surveys/hooks/useSurveys'
import type { SurveySendCandidate } from '@/features/surveys/types'

/**
 * Pick people we support for a send: search within your branches, tick people, and see who has
 * a portal account and who already has the survey. Named surveys add people without a portal to
 * the list to phone, visit or post; anonymous surveys reach portal accounts only.
 */
export function SurveyChosenPeopleField({
  surveyId,
  anonymous,
  value,
  onChange,
  enabled = true,
}: {
  surveyId: string
  anonymous: boolean
  value: string[]
  onChange: (ids: string[]) => void
  enabled?: boolean
}) {
  const [search, setSearch] = React.useState('')
  const deferredSearch = React.useDeferredValue(search)
  const results = useSurveySendCandidates(surveyId, { search: deferredSearch }, enabled)
  // Names for the people already chosen (saved choices, or chosen before the search changed).
  const chosen = useSurveySendCandidates(surveyId, { ids: value }, enabled && value.length > 0)

  const known = React.useMemo(() => {
    const map = new Map<string, SurveySendCandidate>()
    for (const p of chosen.data ?? []) map.set(p.id, p)
    for (const p of results.data ?? []) map.set(p.id, p)
    return map
  }, [chosen.data, results.data])

  const selected = new Set(value)
  const toggle = (id: string) =>
    onChange(selected.has(id) ? value.filter(v => v !== id) : [...value, id])
  const chosenPeople = value.map(id => known.get(id) ?? { id, name: 'Loading…', hasPortal: true, alreadySent: null })
  const withoutPortal = chosenPeople.filter(p => !p.hasPortal).length

  return (
    <div className="space-y-2 text-sm" data-testid="chosen-people">
      <span className="font-medium">People</span>
      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or number…"
        aria-label="Search people we support"
      />
      <ul
        className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-1"
        aria-label="People we support"
        data-testid="chosen-people-results"
      >
        {results.isLoading ? (
          <li className="px-2 py-1.5 text-xs text-muted-foreground">Loading…</li>
        ) : (results.data ?? []).length === 0 ? (
          <li className="px-2 py-1.5 text-xs text-muted-foreground">No one in your branches matches.</li>
        ) : (
          (results.data ?? []).map(p => {
            const id = `chosen-person-${p.id}`
            return (
              <li key={p.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
                <Checkbox id={id} checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-1.5">
                  <span className="truncate">{p.name}</span>
                  {p.careEnded ? (
                    <Badge variant="muted" size="sm">
                      Care ended
                    </Badge>
                  ) : null}
                  {p.hasPortal ? null : (
                    <Badge variant="warning" size="sm">
                      No portal account
                    </Badge>
                  )}
                  {p.alreadySent ? (
                    <Badge variant="muted" size="sm">
                      Already has it
                    </Badge>
                  ) : null}
                </label>
              </li>
            )
          })
        )}
      </ul>

      {value.length ? (
        <div className="space-y-1">
          <span className="block text-xs font-medium">
            {value.length} chosen{withoutPortal ? ` · ${withoutPortal} without a portal account` : ''}
          </span>
          <ul className="flex flex-wrap gap-1.5" aria-label="Chosen people">
            {chosenPeople.map(p => (
              <li key={p.id}>
                <Badge variant={p.hasPortal ? 'secondary' : 'warning'} className="gap-1">
                  {p.name}
                  {p.careEnded ? <span className="text-[10px] font-normal opacity-80">(care ended)</span> : null}
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    aria-label={`Remove ${p.name}`}
                    className="rounded-sm opacity-70 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <span className="block text-xs text-muted-foreground">
        {anonymous
          ? 'Anonymous surveys go only to people with a portal account; record anyone else’s answers by phone or on a visit with Record response.'
          : 'People with a portal account get it in their portal plus an email. People without one are added to the list: phone, visit or post it, then use Record response.'}
      </span>
    </div>
  )
}
