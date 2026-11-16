import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  RECRUITMENT_RULES,
  fetchRecruitmentInboxSettings,
  saveRecruitmentInboxSettings,
  type RecruitmentInboxSettings,
  type RecruitmentRuleOutcome,
} from '@/features/hr/recruitment/api/recruitment-inbox.api'

const MODES = [
  ['RULES_AND_AI', 'Rules, then a quick check for unclear emails (recommended)', 'Cheapest without missing applicants.'],
  ['RULES', 'Rules only', 'Free. Emails the rules can’t place are read in full.'],
  ['OFF', 'Off: read every email in full', 'Every email costs a full read (a few pence each), adverts included.'],
] as const

const OUTCOMES: { value: RecruitmentRuleOutcome; label: string }[] = [
  { value: 'OFF', label: 'Not checked' },
  { value: 'NOTE', label: 'Note for staff' },
  { value: 'STAFF', label: 'Staff decide' },
  { value: 'DECLINE', label: 'Set aside when “no”' },
]

const toList = (text: string) =>
  text
    .split(/[\n,;\s]+/)
    .map(x => x.trim().toLowerCase())
    .filter(Boolean)

function Toggle({ label, hint, checked, onChange, disabled }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-start gap-2.5 rounded-md border border-border p-3 text-sm">
      <input type="checkbox" className="mt-0.5 h-4 w-4" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  )
}

const textareaClass = 'mt-1 min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm'

/** Recruitment inbox settings, like the referral inbox's: screening, automation, rules and copies. */
export function RecruitmentInboxSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient()
  const canManage = useAuthStore(s => s.can('hr.candidates.update'))
  const q = useQuery({ queryKey: ['recruitment-inbox', 'settings'], queryFn: fetchRecruitmentInboxSettings, enabled: open })
  const [draft, setDraft] = React.useState<RecruitmentInboxSettings | null>(null)
  const [trusted, setTrusted] = React.useState('')
  const [blocked, setBlocked] = React.useState('')
  const [notifyTo, setNotifyTo] = React.useState('')
  React.useEffect(() => {
    if (!q.data || !open) return
    setDraft(q.data)
    setTrusted(q.data.screening.trustedSenders.join('\n'))
    setBlocked(q.data.screening.blockedSenders.join('\n'))
    setNotifyTo(q.data.notifyTo.join('\n'))
  }, [q.data, open])
  const set = (patch: Partial<RecruitmentInboxSettings>) => setDraft(d => (d ? { ...d, ...patch } : d))
  const save = useMutation({
    mutationFn: (s: RecruitmentInboxSettings) =>
      saveRecruitmentInboxSettings({
        screening: { mode: s.screening.mode, trustedSenders: toList(trusted), blockedSenders: toList(blocked) },
        autoCreateCandidate: s.autoCreateCandidate,
        autoAcknowledge: s.autoAcknowledge,
        rules: s.rules,
        notifyTo: toList(notifyTo),
      }),
    onSuccess: () => {
      toastSuccess('Recruitment inbox settings saved')
      void qc.invalidateQueries({ queryKey: ['recruitment-inbox'] })
      onOpenChange(false)
    },
    onError: e => toastApiError(e, 'Could not save'),
  })
  const disabled = !canManage || save.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Recruitment inbox settings</DialogTitle>
          <DialogDescription>Which emails Claude reads, what happens automatically, and who is told about new applications.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {!draft ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Tabs defaultValue="screening" className="space-y-4">
              <TabsList>
                <TabsTrigger value="screening">Screening</TabsTrigger>
                <TabsTrigger value="automation">Automation</TabsTrigger>
                <TabsTrigger value="rules">Rules</TabsTrigger>
                <TabsTrigger value="copies">Copies</TabsTrigger>
              </TabsList>

              <TabsContent value="screening" className="space-y-4" data-testid="recruitment-screening-settings">
                <p className="text-sm text-muted-foreground">
                  Which new emails Claude reads in full. Free rules come first; emails they can’t place get a quick check by Claude’s
                  smallest model (sender, subject and first lines: well under a penny). Set-aside emails are kept under “Set aside”
                  with the reason, and can be read anyway.
                </p>
                <div className="space-y-2" role="radiogroup" aria-label="Screening">
                  {MODES.map(([value, label, hint]) => (
                    <label key={value} className="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm">
                      <input
                        type="radio"
                        className="mt-1"
                        name="recruitment-screening-mode"
                        checked={draft.screening.mode === value}
                        disabled={disabled}
                        onChange={() => set({ screening: { ...draft.screening, mode: value } })}
                      />
                      <span>
                        <span className="font-medium">{label}</span>
                        <span className="block text-xs text-muted-foreground">{hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block text-sm">
                    <span className="font-medium">Always read (trusted senders)</span>
                    <span className="block text-xs text-muted-foreground">One per line: an address, @domain, or a domain ending like .co.uk.</span>
                    <textarea
                      className={textareaClass}
                      value={trusted}
                      disabled={disabled}
                      onChange={e => setTrusted(e.target.value)}
                      aria-label="Trusted senders"
                      placeholder={'@indeedemail.com\n@totaljobs.com'}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">Never read (blocked senders)</span>
                    <span className="block text-xs text-muted-foreground">Job alerts, agencies, mailing lists or anyone else whose emails are never applications.</span>
                    <textarea
                      className={textareaClass}
                      value={blocked}
                      disabled={disabled}
                      onChange={e => setBlocked(e.target.value)}
                      aria-label="Blocked senders"
                      placeholder={'@linkedin.com\njobs@agency.co.uk'}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Always read as well: anyone who has applied to us before, emails that mention a job, and emails with a CV-like file.
                  Never read: job alerts, no-reply and notification senders, and newsletters, alerts, receipts and offers (unless they
                  mention a job).
                </p>
              </TabsContent>

              <TabsContent value="automation" className="space-y-3">
                <p className="text-sm text-muted-foreground">What happens by itself once Claude has read a new application.</p>
                <Toggle
                  label="Create the candidate automatically"
                  hint="When Claude read a full name, an email address and the vacancy, and no rule needs staff. The CV and attachments are added, and the applicant is told we received it. Otherwise it waits under “To review” with the reason."
                  checked={draft.autoCreateCandidate}
                  disabled={disabled}
                  onChange={v => set({ autoCreateCandidate: v })}
                />
                <Toggle
                  label="Tell the applicant we received it"
                  hint="“We have received your application” goes to the applicant as soon as it is read (with the job title when the vacancy is clear). Never sent twice, and never for emails set aside by a rule."
                  checked={draft.autoAcknowledge}
                  disabled={disabled}
                  onChange={v => set({ autoAcknowledge: v })}
                />
                <p className="text-xs text-muted-foreground">Only new emails: “Read again” never creates a candidate or sends an email.</p>
              </TabsContent>

              <TabsContent value="rules" className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  What an application should show. Answers come from the email and CV; “not stated” is never set aside, staff ask instead.
                </p>
                <div className="divide-y divide-border rounded-md border border-border">
                  {RECRUITMENT_RULES.map(r => (
                    <label key={r.key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                      <span>
                        <span className="font-medium">{r.label}</span>
                        <span className="block text-xs text-muted-foreground">{r.hint}</span>
                      </span>
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={draft.rules[r.key]}
                        disabled={disabled}
                        aria-label={r.label}
                        onChange={e => set({ rules: { ...draft.rules, [r.key]: e.target.value as RecruitmentRuleOutcome } })}
                      >
                        {OUTCOMES.map(o => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  <li>Note for staff: shown on the email when the answer is no or not stated.</li>
                  <li>Staff decide: no automatic candidate when the answer is no or not stated.</li>
                  <li>Set aside when “no”: moved to “Set aside” with the reason; nothing is sent to the applicant. Not stated: staff decide.</li>
                </ul>
              </TabsContent>

              <TabsContent value="copies" className="space-y-3">
                <label className="block text-sm">
                  <span className="font-medium">Email each new application to</span>
                  <span className="block text-xs text-muted-foreground">
                    One address per line (up to 20). They get the applicant’s name, vacancy and summary with a link to the inbox.
                  </span>
                  <textarea
                    className={textareaClass}
                    value={notifyTo}
                    disabled={disabled}
                    onChange={e => setNotifyTo(e.target.value)}
                    aria-label="Copies to"
                    placeholder={'hr@yourcompany.co.uk'}
                  />
                </label>
                <p className="text-xs text-muted-foreground">Not for emails set aside by the screening or a rule.</p>
              </TabsContent>
            </Tabs>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {canManage ? (
            <Button type="button" disabled={!draft || save.isPending} onClick={() => draft && save.mutate(draft)}>
              {save.isPending ? 'Saving…' : 'Save settings'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
