import * as React from 'react'
import { FileArchive, FileText, ShieldAlert } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { feedbackSelectClass } from '@/features/complaints/components/FeedbackFormDialog'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { useCqcFrameworkOutline, useDownloadEvidencePack } from '../hooks'
import { HELP } from '../help'
import { FieldWithInfo, InfoTip } from './InfoTip'
import { useBranchOptions } from './StartInspectionDialog'

/** Who may download an evidence pack. */
export function useCanDownloadEvidencePack() {
  return useAuthStore(s => s.can('cqc_evidence.export'))
}

const EVERY = ''
/** Scope select values: "" every statement, "kq:SAFE" a key question, "st:<id>" one statement. */
const kqValue = (code: string) => `kq:${code}`
const stValue = (id: string) => `st:${id}`

export type EvidencePackStart = {
  /** Start on one statement (its title is shown even before the framework loads). */
  statement?: { id: string; code: string; title: string }
  /** Start on a branch (e.g. the inspection's). */
  locationId?: string | null
}

/**
 * Download a CQC evidence pack: every quality statement, one key question or one statement, for every branch or one,
 * as a PDF or a ZIP with the attached files and policies.
 */
export function EvidencePackDialog({
  open,
  onOpenChange,
  start,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  start?: EvidencePackStart
}) {
  const canSeePolicies = useAuthStore(s => s.can('policies.read'))
  const canReadFramework = useAuthStore(s => s.can('cqc_evidence.read'))
  const framework = useCqcFrameworkOutline(open && canReadFramework)
  const { wholeOrg, options } = useBranchOptions(open)
  const download = useDownloadEvidencePack()

  const [scope, setScope] = React.useState(EVERY)
  const [locationId, setLocationId] = React.useState('')
  const [format, setFormat] = React.useState<'pdf' | 'zip'>('pdf')
  const [includeFiles, setIncludeFiles] = React.useState(true)
  const [includePolicies, setIncludePolicies] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setScope(start?.statement ? stValue(start.statement.id) : EVERY)
    setLocationId(start?.locationId ?? '')
    setFormat('pdf')
    setIncludeFiles(true)
    setIncludePolicies(true)
    setError(null)
    // Only reset when the dialog opens.
  }, [open])

  const keyQuestions = framework.data?.keyQuestions ?? []
  const statementCode = React.useMemo(() => {
    if (!scope.startsWith('st:')) return undefined
    const id = scope.slice(3)
    if (start?.statement?.id === id) return start.statement.code
    return keyQuestions.flatMap(k => k.statements).find(s => s.id === id)?.code
  }, [scope, keyQuestions, start])
  const startInList = !start?.statement || keyQuestions.some(k => k.statements.some(s => s.id === start.statement!.id))

  const onDownload = async () => {
    setError(null)
    try {
      await download.mutateAsync({
        input: {
          format,
          keyQuestionCode: scope.startsWith('kq:') ? scope.slice(3) : undefined,
          statementId: scope.startsWith('st:') ? scope.slice(3) : undefined,
          locationId: locationId || undefined,
          includeFiles,
          includePolicies: canSeePolicies && includePolicies,
        },
        statementCode,
      })
      toastSuccess('Evidence pack downloaded', format === 'zip' ? 'Open the PDF in the ZIP first: it lists everything inside.' : undefined)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not make the evidence pack.')
    }
  }

  const formatCard = (value: 'pdf' | 'zip', title: string, text: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setFormat(value)}
      aria-pressed={format === value}
      className={cn(
        'flex flex-1 items-start gap-2 rounded-lg border p-3 text-left transition-colors',
        format === value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/60',
      )}
      data-testid={`evidence-pack-format-${value}`}
    >
      <span className="mt-0.5 text-primary">{icon}</span>
      <span>
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{text}</span>
      </span>
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="evidence-pack-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            CQC evidence pack <InfoTip label="CQC evidence pack">{HELP.evidencePack}</InfoTip>
          </DialogTitle>
          <DialogDescription>
            Everything an inspector asks for, in one download: your current evidence, the published policies behind each
            quality statement, and what your mock inspections found.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <FieldWithInfo id="evidence-pack-scope" label="What to include" help={HELP.packScope}>
            <select
              id="evidence-pack-scope"
              className={feedbackSelectClass}
              value={scope}
              onChange={e => setScope(e.target.value)}
              data-testid="evidence-pack-scope"
            >
              <option value={EVERY}>Every quality statement</option>
              {start?.statement && !startInList ? (
                <option value={stValue(start.statement.id)}>{start.statement.title}</option>
              ) : null}
              {keyQuestions.map(k => (
                <optgroup key={k.code} label={k.title}>
                  <option value={kqValue(k.code)}>{`${k.title}: every statement`}</option>
                  {k.statements.map(s => (
                    <option key={s.id} value={stValue(s.id)}>
                      {s.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </FieldWithInfo>

          <FieldWithInfo id="evidence-pack-location" label="Service" help={HELP.packService}>
            <select
              id="evidence-pack-location"
              className={feedbackSelectClass}
              value={locationId}
              onChange={e => setLocationId(e.target.value)}
              data-testid="evidence-pack-location"
            >
              <option value="">{wholeOrg ? 'Every branch' : 'All my branches'}</option>
              {options.map(o => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </FieldWithInfo>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Format</span>
              <InfoTip label="Format">{HELP.packFormat}</InfoTip>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {formatCard('pdf', 'PDF', 'One document to read or print.', <FileText className="h-4 w-4" aria-hidden />)}
              {formatCard(
                'zip',
                'ZIP folder',
                'The PDF plus the attached files, policies and a spreadsheet.',
                <FileArchive className="h-4 w-4" aria-hidden />,
              )}
            </div>
          </div>

          <div className="space-y-2">
            {format === 'zip' ? (
              <label className="flex items-start gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={includeFiles}
                  onChange={e => setIncludeFiles(e.target.checked)}
                  data-testid="evidence-pack-files"
                />
                <span>
                  Add the files attached to the evidence
                  <span className="block text-xs text-muted-foreground">Up to 300 MB. Leave out to make a smaller pack.</span>
                </span>
              </label>
            ) : null}
            {canSeePolicies ? (
              <label className="flex items-start gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={includePolicies}
                  onChange={e => setIncludePolicies(e.target.checked)}
                  data-testid="evidence-pack-policies"
                />
                <span>
                  Add the published policies
                  <span className="block text-xs text-muted-foreground">
                    Only published ones; drafts and archived policies are left out.
                    {format === 'zip' ? ' Each one is added as a PDF.' : ''}
                  </span>
                </span>
              </label>
            ) : null}
          </div>

          {format === 'zip' && includeFiles ? (
            <p
              className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2.5 text-xs text-foreground"
              data-testid="evidence-pack-warning"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              Attached files may hold personal information about people you support or staff. Share the pack only with
              the CQC, and keep it somewhere secure.
            </p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void onDownload()} disabled={download.isPending} data-testid="evidence-pack-download">
            {download.isPending ? 'Making the pack…' : `Download ${format === 'zip' ? 'ZIP' : 'PDF'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
