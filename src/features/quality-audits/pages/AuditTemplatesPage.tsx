import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CalendarPlus, Copy, Eye, Library, Pencil, PlayCircle, PlusCircle, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import { PageHeader } from '@/shared/ui/page-elements'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { InlineConfirm } from '@/shared/ui/inline-confirm'
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import type { AuditTemplateSummary } from '../types'
import { useAuditAreas, useAuditTemplate, useAuditTemplates, useRetireAuditTemplate } from '../hooks'
import { FREQUENCY_LABEL } from '../labels'
import { AreaIcon } from '../components/AreaIcon'
import { ConductAuditDialog } from '../components/ConductAuditDialog'
import { ScheduleAuditDialog } from '../components/ScheduleAuditDialog'

/** Governance → Audits → Templates: the audit library and the organisation's own templates. */
export default function AuditTemplatesPage() {
  const navigate = useNavigate()
  const canManage = useAuthStore(s => s.can('quality_audits.manage'))
  const areas = useAuditAreas()
  const [area, setArea] = React.useState('')
  const [kind, setKind] = React.useState<'' | 'library' | 'custom'>('')
  const templates = useAuditTemplates({ areaCode: area || undefined, kind: kind || undefined })
  const retire = useRetireAuditTemplate()
  const [preview, setPreview] = React.useState<string | null>(null)
  const [conductCode, setConductCode] = React.useState<string | null>(null)
  const [scheduleCode, setScheduleCode] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const rows = templates.data ?? []

  const remove = async (t: AuditTemplateSummary) => {
    setError(null)
    try {
      await retire.mutateAsync(t.code)
      toastSuccess('Template removed', t.title)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not remove the template.')
    }
  }

  return (
    <div className="flex flex-col gap-4" data-testid="audit-templates-page">
      <PageHeader
        title="Audit templates"
        description="Ready-made audits from the library, and audits you make for your own service."
        icon={<Library className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Governance' }, { label: 'Audits', href: '/governance/audits' }, { label: 'Templates' }]}
        actions={
          canManage
            ? [
                {
                  label: 'Create template',
                  onClick: () => void navigate({ to: '/governance/audits/templates/new', search: {} }),
                  icon: <PlusCircle className="h-4 w-4" />,
                },
              ]
            : []
        }
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Areas">
        <AreaChip active={!area} onClick={() => setArea('')} label="All areas" />
        {(areas.data ?? []).map(a => (
          <AreaChip key={a.code} active={area === a.code} onClick={() => setArea(a.code)} label={a.name} code={a.code} count={a.templateCount} />
        ))}
      </div>
      <div className="flex gap-1 text-sm" role="group" aria-label="Which templates">
        {([
          ['', 'All'],
          ['library', 'Library'],
          ['custom', 'Your own'],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn('rounded-md px-3 py-1.5', kind === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
            aria-pressed={kind === k}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {templates.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No templates here yet.{canManage ? ' Create one of your own.' : ''}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(t => (
            <article key={t.code} className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="audit-template-card">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <AreaIcon code={t.area?.code} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground">{t.title}</h3>
                  <p className="text-xs text-muted-foreground">{t.area?.name ?? 'No area'}</p>
                </div>
                <Badge size="sm" variant={t.isCustom ? 'info' : 'outline'}>
                  {t.isCustom ? 'Your own' : 'Library'}
                </Badge>
              </div>
              {t.summary ? <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{t.summary}</p> : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {t.standardCount} standards · {FREQUENCY_LABEL[t.frequency]} · {t.earlyDays} day(s) early / {t.lateDays} late
                {t.activeSchedules ? ` · scheduled ${t.activeSchedules}×` : ''}
                {t.auditedItemLabel ? ` · records "${t.auditedItemLabel}"` : ''}
              </p>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                <Button size="sm" variant="outline" onClick={() => setPreview(t.code)} data-testid="audit-template-preview">
                  <Eye className="mr-1 h-3.5 w-3.5" aria-hidden />
                  View
                </Button>
                {canManage ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setConductCode(t.code)}>
                      <PlayCircle className="mr-1 h-3.5 w-3.5" aria-hidden />
                      Conduct
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setScheduleCode(t.code)}>
                      <CalendarPlus className="mr-1 h-3.5 w-3.5" aria-hidden />
                      Schedule
                    </Button>
                    {t.isCustom ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void navigate({ to: '/governance/audits/templates/$code/edit', params: { code: t.code } })}
                          data-testid="audit-template-edit"
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden />
                          Edit
                        </Button>
                        <InlineConfirm
                          title="Remove this template?"
                          description="Audits already done from it are kept."
                          confirmLabel="Remove"
                          destructive
                          onConfirm={() => void remove(t)}
                        >
                          <Button size="sm" variant="ghost" className="text-destructive" aria-label={`Remove ${t.title}`}>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                        </InlineConfirm>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void navigate({ to: '/governance/audits/templates/new', search: { copy: t.code } })}
                        data-testid="audit-template-copy"
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" aria-hidden />
                        Make a copy
                      </Button>
                    )}
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <TemplatePreview code={preview} onClose={() => setPreview(null)} />
      <ConductAuditDialog
        open={conductCode !== null}
        templateCode={conductCode}
        onOpenChange={o => !o && setConductCode(null)}
        onStarted={id => void navigate({ to: '/governance/audits/$auditId', params: { auditId: id } })}
      />
      <ScheduleAuditDialog open={scheduleCode !== null} templateCode={scheduleCode} onOpenChange={o => !o && setScheduleCode(null)} />
    </div>
  )
}

function AreaChip({ active, onClick, label, code, count }: { active: boolean; onClick: () => void; label: string; code?: string; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
        active ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted/40',
      )}
      data-testid="audit-area-chip"
    >
      {code ? <AreaIcon code={code} className="h-4 w-4" /> : null}
      {label}
      {count !== undefined ? <span className="text-xs tabular-nums text-muted-foreground">{count}</span> : null}
    </button>
  )
}

/** The standards of one template, read-only. */
function TemplatePreview({ code, onClose }: { code: string | null; onClose: () => void }) {
  const t = useAuditTemplate(code)
  let n = 0
  return (
    <Dialog open={code !== null} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl" data-testid="audit-template-preview-dialog">
        <DialogHeader>
          <DialogTitle>{t.data?.title ?? 'Template'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[70vh] space-y-4 overflow-y-auto">
          {t.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {t.data?.introduction ? <p className="text-sm text-muted-foreground">{t.data.introduction}</p> : null}
          {t.data?.sections.map(s => (
            <section key={s.title}>
              <h3 className="mb-1 text-sm font-semibold text-foreground">{s.title}</h3>
              <ol className="space-y-1.5">
                {s.standards.map(st => {
                  n += 1
                  return (
                    <li key={st.id} className="flex gap-2 text-sm">
                      <span className="w-6 shrink-0 text-right font-semibold tabular-nums text-primary">{n}.</span>
                      <span>
                        {st.text}
                        {st.hint ? <span className="block text-xs text-muted-foreground">{st.hint}</span> : null}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
          {t.data && !t.data.isCustom && t.data.sources.length ? (
            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              Written in CareFlow&apos;s own words from: {t.data.sources.map(s => s.source).join('; ')}.
            </p>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
