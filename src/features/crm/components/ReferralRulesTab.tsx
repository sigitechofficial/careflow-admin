import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import type {
  CustomRule,
  KindAction,
  ReferralAutomationSettings,
  ReferralRules,
  RuleDef,
  RuleOutcome,
  RuleSetting,
} from '@/features/crm/api/referral-inbox.api'

const OUTCOME_LABEL: Record<RuleOutcome, string> = {
  OFF: 'Off',
  NOTE: 'Note only',
  MANAGER: 'Manager decides',
  DECLINE: 'Decline',
}
const OUTCOME_STYLE: Record<RuleOutcome, string> = {
  OFF: 'text-muted-foreground',
  NOTE: 'text-sky-700 dark:text-sky-400',
  MANAGER: 'text-amber-700 dark:text-amber-400',
  DECLINE: 'text-destructive',
}
const KIND_LABEL: Record<KindAction, string> = {
  AUTO: 'Handle automatically',
  STAFF: 'Staff handle it',
  IGNORE: 'Ignore',
}

const selectCls = 'h-8 rounded-md border border-input bg-background px-2 text-sm'

type Props = {
  settings: ReferralAutomationSettings
  rules: ReferralRules
  onChange: (rules: ReferralRules) => void
  disabled: boolean
}

/** Referral rules: what to do with each kind of email, which care we note, hand to a manager or decline, and our own rules. */
export function ReferralRulesTab({ settings, rules, onChange, disabled }: Props) {
  const [branch, setBranch] = React.useState<string>('')
  const branchName = settings.coverage.find(c => c.locationId === branch)?.branchName
  const groups = React.useMemo(() => {
    const map = new Map<string, RuleDef[]>()
    for (const r of settings.ruleCatalog) map.set(r.group, [...(map.get(r.group) ?? []), r])
    return [...map.entries()]
  }, [settings.ruleCatalog])

  const find = (key: string, loc: string | null) => rules.rules.find(r => r.key === key && (r.locationId ?? null) === loc)
  const global = (def: RuleDef): { outcome: RuleOutcome; value: number | string | null } => {
    const g = find(def.key, null)
    return { outcome: g?.outcome ?? def.defaultOutcome, value: g?.value ?? def.value?.default ?? null }
  }
  const upsert = (def: RuleDef, loc: string | null, patch: Partial<RuleSetting> | null) => {
    const others = rules.rules.filter(r => !(r.key === def.key && (r.locationId ?? null) === loc))
    if (!patch) return onChange({ ...rules, rules: others })
    const base = find(def.key, loc) ?? { key: def.key, locationId: loc, ...global(def) }
    onChange({ ...rules, rules: [...others, { ...base, ...patch, key: def.key, locationId: loc }] })
  }
  const setCustom = (i: number, patch: Partial<CustomRule> | null) =>
    onChange({
      ...rules,
      custom: patch ? rules.custom.map((c, n) => (n === i ? { ...c, ...patch } : c)) : rules.custom.filter((_, n) => n !== i),
    })
  const addCustom = () => {
    const used = new Set(rules.custom.map(c => c.id))
    let n = rules.custom.length + 1
    while (used.has(`r${n}`)) n++
    onChange({ ...rules, custom: [...rules.custom, { id: `r${n}`, text: '', outcome: 'MANAGER', locationId: branch || null, isActive: true }] })
  }

  return (
    <div className="space-y-5" data-testid="referral-rules">
      <div className="rounded-md border border-sky-500/30 bg-sky-500/5 p-3 text-sm">
        <p className="font-medium">How rules work</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
          <li><span className={OUTCOME_STYLE.NOTE}>Note only</span>: shown to staff on the email and the enquiry; changes nothing.</li>
          <li><span className={OUTCOME_STYLE.MANAGER}>Manager decides</span>: the answer is at most “Possibly” and the reply waits for a manager.</li>
          <li><span className={OUTCOME_STYLE.DECLINE}>Decline</span>: the answer is “Can’t take it”. A decline is never sent automatically.</li>
        </ul>
      </div>

      <label className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">Rules for</span>
        <select className={selectCls} value={branch} onChange={e => setBranch(e.target.value)} aria-label="Rules for branch">
          <option value="">All branches</option>
          {settings.coverage.map(c => (
            <option key={c.locationId} value={c.locationId}>
              {c.branchName} only
            </option>
          ))}
        </select>
        {branch ? <span className="text-xs text-muted-foreground">Rules set here apply to {branchName} instead of the all-branches rule.</span> : null}
      </label>

      {!branch ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Kinds of email</h3>
          <p className="text-xs text-muted-foreground">
            Claude says what each email is. “Staff handle it”: checked and shown in the inbox, never answered automatically.
            “Ignore”: kept, nothing else done. Only the first five can create a new enquiry.
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            {settings.emailKinds.map(k => (
              <div key={k.key} className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{k.label}</p>
                  <p className="text-xs text-muted-foreground">{k.hint}</p>
                </div>
                <select
                  className={selectCls}
                  aria-label={`Action for ${k.label}`}
                  disabled={disabled}
                  value={rules.kinds[k.key] ?? k.defaultAction}
                  onChange={e => onChange({ ...rules, kinds: { ...rules.kinds, [k.key]: e.target.value as KindAction } })}
                >
                  {(['AUTO', 'STAFF', 'IGNORE'] as KindAction[]).map(a => (
                    <option key={a} value={a}>
                      {KIND_LABEL[a]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {groups.map(([group, defs]) => (
        <section key={group} className="space-y-2">
          <h3 className="text-sm font-semibold">{group}</h3>
          <div className="overflow-hidden rounded-lg border border-border">
            {defs.map(def => {
              const all = global(def)
              const own = branch ? find(def.key, branch) : find(def.key, null)
              const current = own ? { outcome: own.outcome, value: own.value ?? all.value } : all
              const inherited = Boolean(branch && !own)
              return (
                <div key={def.key} className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span>{def.label}</span>
                      {def.value ? (
                        <>
                          <Input
                            type={def.value.kind === 'time' ? 'time' : 'number'}
                            min={0}
                            className="h-7 w-24"
                            aria-label={`${def.label} value`}
                            disabled={disabled || inherited}
                            value={String(current.value ?? '')}
                            onChange={e =>
                              upsert(def, branch || null, {
                                value: def.value!.kind === 'time' ? e.target.value : e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                          />
                          {def.value.label ? <span className="font-normal text-muted-foreground">{def.value.label}</span> : null}
                        </>
                      ) : null}
                    </div>
                    {def.hint ? <p className="text-xs text-muted-foreground">{def.hint}</p> : null}
                  </div>
                  <select
                    className={`${selectCls} ${OUTCOME_STYLE[current.outcome]}`}
                    aria-label={`Outcome for ${def.label}`}
                    disabled={disabled}
                    value={inherited ? 'INHERIT' : current.outcome}
                    onChange={e =>
                      e.target.value === 'INHERIT'
                        ? upsert(def, branch, null)
                        : upsert(def, branch || null, { outcome: e.target.value as RuleOutcome })
                    }
                  >
                    {branch ? <option value="INHERIT">Same as all branches ({OUTCOME_LABEL[all.outcome]})</option> : null}
                    {(['OFF', 'NOTE', 'MANAGER', 'DECLINE'] as RuleOutcome[]).map(o => (
                      <option key={o} value={o}>
                        {OUTCOME_LABEL[o]}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Our own rules</h3>
        <p className="text-xs text-muted-foreground">
          Write any other rule in plain English, e.g. “We don’t take double-handed calls in Sutton until we’ve recruited”.
          Claude checks each new email against these. They can only be a note or go to a manager — never a decline — because
          Claude can misread a rule or an email. Changed rules apply to new emails; use “Read again” for an older one.
        </p>
        {rules.custom.length ? (
          <div className="space-y-2">
            {rules.custom.map((c, i) =>
              branch && c.locationId && c.locationId !== branch ? null : (
                <div key={c.id} className="flex flex-wrap items-start gap-2 rounded-md border border-border p-2">
                  <textarea
                    className="min-h-[38px] flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    rows={2}
                    maxLength={500}
                    placeholder="Write the rule…"
                    aria-label={`Rule ${i + 1}`}
                    disabled={disabled}
                    value={c.text}
                    onChange={e => setCustom(i, { text: e.target.value })}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className={`${selectCls} ${OUTCOME_STYLE[c.outcome]}`}
                      aria-label={`Outcome for rule ${i + 1}`}
                      disabled={disabled}
                      value={c.outcome}
                      onChange={e => setCustom(i, { outcome: e.target.value as CustomRule['outcome'] })}
                    >
                      <option value="NOTE">Note only</option>
                      <option value="MANAGER">Manager decides</option>
                    </select>
                    <select
                      className={selectCls}
                      aria-label={`Branch for rule ${i + 1}`}
                      disabled={disabled}
                      value={c.locationId ?? ''}
                      onChange={e => setCustom(i, { locationId: e.target.value || null })}
                    >
                      <option value="">All branches</option>
                      {settings.coverage.map(b => (
                        <option key={b.locationId} value={b.locationId}>
                          {b.branchName}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={c.isActive} disabled={disabled} onChange={e => setCustom(i, { isActive: e.target.checked })} />
                      On
                    </label>
                    <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => setCustom(i, null)} aria-label={`Delete rule ${i + 1}`}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ),
            )}
          </div>
        ) : null}
        {!disabled ? (
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addCustom} disabled={rules.custom.length >= 50}>
            <Plus className="h-4 w-4" aria-hidden /> Add a rule
          </Button>
        ) : null}
      </section>
    </div>
  )
}
