import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, BookOpen, Loader2, PlayCircle, Search } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import type { MockInspectionTemplate } from '../types'
import { useMockInspectionTemplates } from '../hooks'
import { HELP } from '../help'
import { InfoTip } from '../components/InfoTip'
import { StartInspectionDialog } from '../components/StartInspectionDialog'
import { TemplateFacts } from '../components/TemplateDetail'

const HOW_IT_WORKS: { title: string; text: string }[] = [
  { title: 'Choose an inspection', text: 'Read what it covers, when to use it and what to check.' },
  { title: 'Start it for a branch', text: 'The current CQC evidence for that branch is taken for each statement.' },
  { title: 'Score and act', text: 'Score each statement 1 to 4, see the ratings, and add actions for anything weak.' },
]

/**
 * Governance → Mock CQC inspection → Ready-made inspections: inspections researched for home care,
 * from a full mock inspection to topic deep dives. Starting one creates a mock inspection with only
 * its quality statements and its guidance.
 */
export default function ReadyMadeInspectionsPage() {
  const navigate = useNavigate()
  const canStart = useAuthStore(s => s.can('cqc_mock_inspection.manage'))
  const query = useMockInspectionTemplates()
  const [search, setSearch] = React.useState('')
  const [group, setGroup] = React.useState('ALL')
  const read = (t: MockInspectionTemplate) =>
    void navigate({ to: '/governance/mock-inspections/ready-made/$templateCode', params: { templateCode: t.code } })
  const [starting, setStarting] = React.useState<MockInspectionTemplate | null>(null)

  const templates = React.useMemo(() => query.data ?? [], [query.data])
  const groups = React.useMemo(() => {
    const out: { code: string; name: string; count: number }[] = []
    for (const t of templates) {
      const g = out.find(x => x.code === t.groupCode)
      if (g) g.count += 1
      else out.push({ code: t.groupCode, name: t.groupName, count: 1 })
    }
    return out
  }, [templates])
  const q = search.trim().toLowerCase()
  const visible = templates.filter(
    t =>
      (group === 'ALL' || t.groupCode === group) &&
      (!q || `${t.title} ${t.summary} ${t.whenToUse} ${t.statements.map(s => s.title).join(' ')}`.toLowerCase().includes(q)),
  )
  const sections = groups.map(g => ({ group: g, items: visible.filter(t => t.groupCode === g.code) })).filter(s => s.items.length)

  const startButton = (t: MockInspectionTemplate, size: 'sm' | 'default') =>
    canStart ? (
      <Button
        type="button"
        size={size}
        onClick={() => setStarting(t)}
        disabled={!t.matchesFramework}
        data-testid="mock-template-start"
      >
        <PlayCircle className="mr-1 h-4 w-4" aria-hidden />
        Start this inspection
      </Button>
    ) : null

  return (
    <div className="w-full flex-1 px-4 py-6 sm:px-6" data-testid="ready-made-inspections-page">
      <div className="flex flex-wrap items-start gap-3 border-b border-border pb-5">
        <Button type="button" variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
          <Link to="/governance/mock-inspections">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to mock inspections</span>
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Ready-made inspections</h1>
            <InfoTip label="ready-made inspections">{HELP.readyMade}</InfoTip>
          </div>
          <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">
            Mock CQC inspections written for home care, from a full inspection to short checks on one topic, each with
            guidance on what to look at and who to ask.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <ol className="grid gap-2 sm:grid-cols-3" aria-label="How it works">
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
              placeholder="Search inspections or statements…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search ready-made inspections"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {templates.length} inspection{templates.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Groups">
          {[{ code: 'ALL', name: 'All', count: templates.length }, ...groups].map(g => (
            <button
              key={g.code}
              type="button"
              role="tab"
              aria-selected={group === g.code}
              onClick={() => setGroup(g.code)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium',
                group === g.code ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {g.name} <span className="tabular-nums">({g.count})</span>
            </button>
          ))}
        </div>

        {query.isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : query.isError ? (
          <p role="alert" className="text-sm text-destructive">
            The ready-made inspections could not be loaded.
          </p>
        ) : !templates.length ? (
          <p className="text-sm text-muted-foreground">No ready-made inspections are available yet.</p>
        ) : !sections.length ? (
          <p className="text-sm text-muted-foreground">No inspection matches your search.</p>
        ) : (
          sections.map(s => (
            <section key={s.group.code} className="space-y-2">
              <h2 className="text-sm font-semibold">{s.group.name}</h2>
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {s.items.map(t => (
                  <li key={t.code} className="flex flex-wrap items-start gap-3 px-3 py-3" data-testid="ready-made-inspection">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="text-left text-sm font-semibold hover:underline"
                          onClick={() => read(t)}
                        >
                          {t.title}
                        </button>
                        {!t.matchesFramework ? (
                          <Badge size="sm" variant="warning">
                            Needs updating for the new CQC framework
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{t.summary}</p>
                      <TemplateFacts t={t} />
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => read(t)}>
                        <BookOpen className="mr-1 h-4 w-4" aria-hidden />
                        Read
                      </Button>
                      {startButton(t, 'sm')}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>


      <StartInspectionDialog
        open={starting !== null}
        onOpenChange={o => !o && setStarting(null)}
        template={starting}
        onStarted={id => void navigate({ to: '/governance/mock-inspections/$inspectionId', params: { inspectionId: id } })}
      />
    </div>
  )
}
