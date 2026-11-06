import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, BookCopy, CheckCircle2, FilePlus2, LayoutTemplate, Loader2, RefreshCw, Search } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import {
  useAdoptLibrarySurveys,
  useLibrarySurvey,
  useLibrarySurveys,
  type AdoptSurveysResult,
  type LibrarySurvey,
} from '@/features/surveys/api/survey-library.api'
import { NewSurveyDialog, type NewSurveySource, type NewSurveyStart } from '@/features/surveys/components/NewSurveyDialog'
import {
  LibraryCqcChips as CqcChips,
  LibraryFactsRow as FactsRow,
  LibrarySurveyDetail,
} from '@/features/surveys/components/LibrarySurveyDetail'
import { LibrarySurveyRespondentView } from '@/features/surveys/components/LibrarySurveyRespondentView'
import { cardSummary } from '@/features/surveys/survey-library-display'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Checkbox } from '@/shared/ui/toggle-controls'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

const HOW_IT_WORKS: { title: string; text: string }[] = [
  { title: 'Read a survey', text: 'See its questions, what people are told and how to act on the answers.' },
  { title: 'Adopt it', text: 'It is added to your Templates with your organisation’s name.' },
  {
    title: 'Start a survey from your template',
    text: 'Send it, schedule it, or open it for phone and paper answers.',
  },
]

function StatusBadge({ s }: { s: LibrarySurvey }) {
  if (!s.adoptedTemplateId) return null
  return s.updateAvailable ? (
    <Badge variant="warning" size="md" className="shrink-0 gap-1" title={s.revisionNote ?? undefined}>
      <RefreshCw className="h-3 w-3" aria-hidden />
      Update available
    </Badge>
  ) : (
    <Badge variant="success" size="md" className="shrink-0 gap-1">
      <CheckCircle2 className="h-3 w-3" aria-hidden />
      Adopted
    </Badge>
  )
}

const templateFor = (
  s: Pick<LibrarySurvey, 'id' | 'reference' | 'audience' | 'anonymous' | 'questionCount'>,
  templateId: string,
  title: string,
): NewSurveySource => ({
  id: templateId,
  title,
  targetKind: s.audience,
  isAnonymous: s.anonymous,
  // Adopted templates are company-wide.
  locationIds: [],
  roleIds: [],
  questionCount: s.questionCount,
  librarySourceId: s.id,
  libraryReference: s.reference,
})

/**
 * Surveys → Ready-made surveys: surveys researched for CQC-registered home care. Adopting one adds
 * it to Templates (company-wide, with the organisation's name filled in); "Use this template" then
 * starts a survey from it as usual.
 */
export default function ReadyMadeSurveysPage() {
  const navigate = useNavigate()
  const canAdopt = useAuthStore(s => s.can('surveys.manage'))
  // Adopted templates are shared by every branch, so only users with access to all branches adopt them.
  const branchRestricted = useAuthStore(s => Array.isArray(s.user?.assignedLocationIds))
  const mayAdopt = canAdopt && !branchRestricted
  // Starting a survey from a company template is open to anyone who manages surveys.
  const mayStart = canAdopt
  const library = useLibrarySurveys()
  const adopt = useAdoptLibrarySurveys()
  const [search, setSearch] = React.useState('')
  const [group, setGroup] = React.useState<string>('ALL')
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [previewId, setPreviewId] = React.useState<string | null>(null)
  /** The Read dialog shows the survey as people answer it first; guidance is one click away. */
  const [detailView, setDetailView] = React.useState<'respondent' | 'details'>('respondent')
  const [adopted, setAdopted] = React.useState<AdoptSurveysResult | null>(null)
  const [newSurvey, setNewSurvey] = React.useState<NewSurveyStart | null>(null)
  const preview = useLibrarySurvey(previewId)

  const surveys = React.useMemo(() => library.data ?? [], [library.data])
  const groups = React.useMemo(() => {
    const byCode = new Map<string, LibrarySurvey['group'] & { count: number }>()
    for (const s of surveys) {
      const g = byCode.get(s.group.code)
      if (g) g.count += 1
      else byCode.set(s.group.code, { ...s.group, count: 1 })
    }
    return [...byCode.values()].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
  }, [surveys])
  const q = search.trim().toLowerCase()
  const visible = surveys.filter(
    s =>
      (group === 'ALL' || s.group.code === group) &&
      (!q || `${s.title} ${s.reference} ${s.summary} ${s.respondents}`.toLowerCase().includes(q)),
  )
  const sections = groups.map(g => ({ group: g, items: visible.filter(s => s.group.code === g.code) })).filter(g => g.items.length)
  const adoptedCount = surveys.filter(s => s.adoptedTemplateId).length
  const selectable = visible.filter(s => !s.adoptedTemplateId)

  const toggle = (id: string, on: boolean) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const onAdopt = (ids: string[]) =>
    adopt.mutate(ids, {
      onSuccess: result => {
        setSelected(new Set())
        setPreviewId(null)
        if (result.created.length) {
          setAdopted(result)
        } else {
          toastSuccess(
            'Nothing new was added to your Templates',
            result.skipped.map(s => `${s.reference || s.title} (${s.reason})`).join('; '),
          )
        }
      },
      onError: e => toastApiError(e, 'Could not adopt the surveys'),
    })

  const openTemplate = (templateId: string) => {
    setAdopted(null)
    setPreviewId(null)
    void navigate({ to: '/surveys/$surveyId', params: { surveyId: templateId } })
  }

  const startSurvey = (libraryId: string, templateId: string, title: string) => {
    const s = surveys.find(x => x.id === libraryId) ?? (preview.data?.id === libraryId ? preview.data : undefined)
    if (!s) return
    setAdopted(null)
    setPreviewId(null)
    setNewSurvey({ kind: 'template', template: templateFor(s, templateId, title) })
  }

  /** The card's and the Read dialog's actions after Read: Adopt, or Open template / Start a survey. */
  const nextActions = (s: LibrarySurvey, size: 'sm' | 'default') =>
    s.adoptedTemplateId ? (
      <>
        <Button type="button" variant="outline" size={size} onClick={() => openTemplate(s.adoptedTemplateId!)}>
          <LayoutTemplate className="mr-1 h-4 w-4" aria-hidden />
          Open template
        </Button>
        {mayStart ? (
          <Button type="button" size={size} onClick={() => startSurvey(s.id, s.adoptedTemplateId!, s.title)}>
            <FilePlus2 className="mr-1 h-4 w-4" aria-hidden />
            Start a survey
          </Button>
        ) : null}
      </>
    ) : mayAdopt ? (
      <Button type="button" size={size} onClick={() => onAdopt([s.id])} disabled={adopt.isPending}>
        {adopt.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <BookCopy className="mr-1 h-4 w-4" />}
        Adopt
      </Button>
    ) : null

  const shown = preview.data
  const shownSummary = shown ? surveys.find(s => s.id === shown.id) ?? shown : undefined
  const oneAdopted = adopted?.created.length === 1 ? adopted.created[0]! : null

  return (
    <div className="w-full flex-1 px-4 py-6 sm:px-6" data-testid="ready-made-surveys-page">
      <div className="flex flex-wrap items-start gap-3 border-b border-border pb-5">
        <Button type="button" variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
          <Link to="/surveys">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to surveys</span>
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Ready-made surveys</h1>
          <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">
            Surveys written for CQC-registered home care, with guidance on running them and acting on the results.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <ol className="grid gap-2 sm:grid-cols-3" aria-label="How it works" data-testid="ready-made-how-it-works">
          {HOW_IT_WORKS.map((step, i) => (
            <li key={step.title} className="flex gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search surveys…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search ready-made surveys"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {surveys.length} survey{surveys.length === 1 ? '' : 's'} · {adoptedCount} adopted
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Groups">
          {[{ code: 'ALL', name: 'All', count: surveys.length }, ...groups].map(g => (
            <button
              key={g.code}
              type="button"
              role="tab"
              aria-selected={group === g.code}
              onClick={() => setGroup(g.code)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium',
                group === g.code
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {g.name} <span className="tabular-nums">({g.count})</span>
            </button>
          ))}
        </div>

        {canAdopt && branchRestricted ? (
          <p className="text-xs text-muted-foreground" data-testid="ready-made-branch-note">
            Adopted surveys become templates shared by every branch, so someone with access to all branches adopts
            them. You can read them here and use adopted templates from Templates.
          </p>
        ) : null}

        {mayAdopt && surveys.length ? (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
            data-testid="ready-made-selection-bar"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!selectable.length}
                onClick={() => setSelected(new Set(selectable.map(s => s.id)))}
              >
                Select all not yet adopted ({selectable.length})
              </Button>
              {selected.size ? (
                <>
                  <span className="text-muted-foreground">
                    {selected.size} survey{selected.size === 1 ? '' : 's'} selected
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())} disabled={adopt.isPending}>
                    Clear
                  </Button>
                </>
              ) : null}
            </div>
            <Button type="button" size="sm" onClick={() => onAdopt([...selected])} disabled={!selected.size || adopt.isPending}>
              {adopt.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <BookCopy className="mr-1 h-4 w-4" />}
              Adopt selected
            </Button>
          </div>
        ) : null}

        {library.isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : library.isError ? (
          <p role="alert" className="text-sm text-destructive">
            The ready-made surveys could not be loaded.
          </p>
        ) : !surveys.length ? (
          <p className="text-sm text-muted-foreground">No ready-made surveys are available yet.</p>
        ) : (
          sections.map(g => (
            <section key={g.group.code} className="space-y-2">
              <h2 className="text-sm font-semibold">{g.group.name}</h2>
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {g.items.map(s => (
                  <li key={s.id} className="flex items-start gap-3 px-3 py-3" data-testid="ready-made-survey">
                    {mayAdopt ? (
                      <Checkbox
                        className="mt-1"
                        checked={selected.has(s.id)}
                        disabled={Boolean(s.adoptedTemplateId)}
                        onCheckedChange={v => toggle(s.id, v === true)}
                        aria-label={`Select ${s.title}`}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <button type="button" className="text-left text-sm font-semibold hover:underline" onClick={() => setPreviewId(s.id)}>
                          {s.title}
                        </button>
                        <StatusBadge s={s} />
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid="ready-made-summary">
                        {cardSummary(s.summary)}
                      </p>
                      <FactsRow s={s} />
                      <div className="flex flex-wrap items-center gap-2">
                        <CqcChips s={s} />
                        <span className="text-[11px] text-muted-foreground">{s.reference}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button type="button" variant="outline" size="sm" onClick={() => setPreviewId(s.id)}>
                          Read
                        </Button>
                        {nextActions(s, 'sm')}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <Dialog open={Boolean(previewId)} onOpenChange={open => (open ? null : setPreviewId(null))}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{shown?.title ?? 'Survey'}</DialogTitle>
            <DialogDescription>{shown ? `${shown.reference} · ${shown.group.name} · revision ${shown.revision}` : null}</DialogDescription>
          </DialogHeader>
          <div className="px-6 pt-1">
            <div role="group" aria-label="How to show this survey" className="inline-flex rounded-md border border-border p-0.5">
              {(
                [
                  ['respondent', 'As people see it'],
                  ['details', 'Questions and guidance'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={detailView === value}
                  onClick={() => setDetailView(value)}
                  className={`min-h-8 rounded px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    detailView === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <DialogBody className="max-h-[70vh] space-y-5 overflow-y-auto" data-testid="ready-made-survey-detail">
            {detailView === 'respondent' && shown && !preview.isLoading && !preview.isError ? (
              <LibrarySurveyRespondentView key={shown.id} survey={shown} />
            ) : (
              <LibrarySurveyDetail survey={shown} isLoading={preview.isLoading} isError={preview.isError} />
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreviewId(null)}>
              Close
            </Button>
            {shownSummary ? nextActions(shownSummary, 'default') : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(adopted)} onOpenChange={open => (open ? null : setAdopted(null))}>
        <DialogContent size="md" data-testid="ready-made-adopted-dialog">
          <DialogHeader>
            <DialogTitle>Added to your templates</DialogTitle>
            <DialogDescription>
              {oneAdopted
                ? 'The template has your organisation’s name filled in. Check the wording and change anything you need — the template itself is never sent; you start surveys from it.'
                : 'Each template has your organisation’s name filled in. Check the wording and change anything you need — templates are never sent themselves; you start surveys from them.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3 text-sm">
            {adopted && !oneAdopted ? (
              <ul className="list-disc space-y-0.5 pl-5" data-testid="ready-made-adopted-list">
                {adopted.created.map(c => (
                  <li key={c.templateId}>
                    {c.title} <span className="text-xs text-muted-foreground">({c.reference})</span>
                  </li>
                ))}
              </ul>
            ) : oneAdopted ? (
              <p className="font-medium">{oneAdopted.title}</p>
            ) : null}
            {adopted?.skipped.length ? (
              <p className="text-xs text-muted-foreground">
                Not added: {adopted.skipped.map(s => `${s.reference || s.title} (${s.reason})`).join('; ')}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter className="flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => setAdopted(null)}>
              Stay here
            </Button>
            {oneAdopted ? (
              <>
                <Button type="button" variant="outline" onClick={() => openTemplate(oneAdopted.templateId)}>
                  Open the template
                </Button>
                {mayStart ? (
                  <Button
                    type="button"
                    onClick={() => startSurvey(oneAdopted.libraryId, oneAdopted.templateId, oneAdopted.title)}
                  >
                    Start a survey now
                  </Button>
                ) : null}
              </>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  setAdopted(null)
                  void navigate({ to: '/surveys', search: { view: 'templates' } })
                }}
              >
                Go to Templates
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewSurveyDialog start={newSurvey} onClose={() => setNewSurvey(null)} />
    </div>
  )
}
