import * as React from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, PlusCircle, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Stepper } from '@/shared/ui/stepper'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import { feedbackSelectClass, feedbackTextareaClass } from '@/features/complaints/components/FeedbackFormDialog'
import { InfoTip } from '@/features/cqc-mock-inspection/components/InfoTip'
import { useBranchOptions } from '@/features/cqc-mock-inspection/components/StartInspectionDialog'
import type { AuditFrequency, AuditTemplateDetail, SaveTemplateInput } from '../types'
import { useAuditAreas, useAuditTemplate, useCreateAuditArea, useCreateAuditTemplate, useUpdateAuditTemplate } from '../hooks'
import { FREQUENCIES, FREQUENCY_LABEL } from '../labels'
import { HELP } from '../help'
import { AreaIcon } from '../components/AreaIcon'

type DraftStandard = { key: string; id?: string; text: string; hint: string }
type DraftSection = { key: string; title: string; standards: DraftStandard[] }
let seq = 0
const key = () => `k${++seq}`
const blankStandard = (): DraftStandard => ({ key: key(), text: '', hint: '' })
const blankSection = (title = ''): DraftSection => ({ key: key(), title, standards: [blankStandard()] })

const STEPS = [
  { id: 'area', label: 'Area' },
  { id: 'details', label: 'Details' },
  { id: 'standards', label: 'Standards' },
]

function fromTemplate(t: AuditTemplateDetail, keepIds: boolean): DraftSection[] {
  return t.sections.map(s => ({
    key: key(),
    title: s.title,
    standards: s.standards.map(st => ({ key: key(), id: keepIds ? st.id : undefined, text: st.text, hint: st.hint ?? '' })),
  }))
}

/** Governance → Audits → Templates → create or edit your own template, in three steps. */
export default function AuditTemplateWizardPage() {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { code?: string }
  const search = useSearch({ strict: false }) as { copy?: string }
  const editCode = params.code ?? null
  const source = useAuditTemplate(editCode ?? search.copy ?? null)
  const canManage = useAuthStore(s => s.can('quality_audits.manage'))
  const { wholeOrg, options: branches } = useBranchOptions(true)
  const areas = useAuditAreas()
  const addArea = useCreateAuditArea()
  const create = useCreateAuditTemplate()
  const update = useUpdateAuditTemplate(editCode ?? '')

  const [step, setStep] = React.useState(0)
  const [locationIds, setLocationIds] = React.useState<string[]>([])
  const [areaCode, setAreaCode] = React.useState('')
  const [newArea, setNewArea] = React.useState<string | null>(null)
  const [title, setTitle] = React.useState('')
  const [useItem, setUseItem] = React.useState(false)
  const [itemLabel, setItemLabel] = React.useState('')
  const [frequency, setFrequency] = React.useState<AuditFrequency>('MONTHLY')
  const [early, setEarly] = React.useState('2')
  const [late, setLate] = React.useState('2')
  const [intro, setIntro] = React.useState('')
  const [sections, setSections] = React.useState<DraftSection[]>([blankSection()])
  const [error, setError] = React.useState<string | null>(null)

  // Fill the form from the template being edited or copied, once it loads.
  const filled = React.useRef(false)
  React.useEffect(() => {
    const t = source.data
    if (!t || filled.current) return
    filled.current = true
    setAreaCode(t.area?.code ?? '')
    setTitle(editCode ? t.title : `${t.title} (our version)`)
    setUseItem(Boolean(t.auditedItemLabel))
    setItemLabel(t.auditedItemLabel ?? '')
    setFrequency(t.frequency)
    setEarly(String(t.earlyDays))
    setLate(String(t.lateDays))
    setIntro(t.introduction ?? '')
    setLocationIds(editCode ? t.locationIds : [])
    setSections(fromTemplate(t, Boolean(editCode)))
  }, [source.data, editCode])

  if (!canManage) return <p className="p-6 text-sm text-muted-foreground">You cannot create audit templates.</p>
  if ((editCode || search.copy) && source.isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>

  const days = (v: string) => (/^\d{1,2}$/.test(v) && Number(v) <= 60 ? Number(v) : null)
  const checkStep = (s: number): string | null => {
    if (s === 0) {
      if (!areaCode) return 'Choose the audit area.'
      if (!wholeOrg && !locationIds.length) return 'Choose at least one of your branches.'
    }
    if (s === 1) {
      if (title.trim().length < 3) return 'Give the audit a title.'
      if (useItem && !itemLabel.trim()) return 'Give the audited item a label, for example "Person supported".'
      if (days(early) === null || days(late) === null) return 'The days early and late must be 0 to 60.'
    }
    if (s === 2) {
      if (!sections.length) return 'Add at least one section.'
      for (const sec of sections) {
        if (sec.title.trim().length < 2) return 'Give every section a title.'
        if (!sec.standards.some(st => st.text.trim())) return `Add at least one standard to "${sec.title || 'the section'}".`
        if (sec.standards.some(st => st.text.trim() && st.text.trim().length < 3)) return 'Each standard needs a few words.'
      }
    }
    return null
  }
  const next = () => {
    const problem = checkStep(step)
    setError(problem)
    if (!problem) setStep(s => s + 1)
  }

  const save = async () => {
    for (const s of [0, 1, 2]) {
      const problem = checkStep(s)
      if (problem) {
        setStep(s)
        return setError(problem)
      }
    }
    setError(null)
    const body: SaveTemplateInput = {
      areaCode,
      title: title.trim(),
      introduction: intro.trim() || undefined,
      frequency,
      earlyDays: days(early) ?? 2,
      lateDays: days(late) ?? 2,
      auditedItemLabel: useItem ? itemLabel.trim() : undefined,
      locationIds,
      sections: sections.map(s => ({
        title: s.title.trim(),
        standards: s.standards
          .filter(st => st.text.trim())
          .map(st => ({ ...(st.id ? { id: st.id } : {}), text: st.text.trim(), ...(st.hint.trim() ? { hint: st.hint.trim() } : {}) })),
      })),
    }
    try {
      if (editCode) await update.mutateAsync(body)
      else await create.mutateAsync(body)
      toastSuccess(editCode ? 'Template saved' : 'Template created', body.title)
      void navigate({ to: '/governance/audits/templates' })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the template.')
    }
  }

  const addNewArea = async () => {
    if (!newArea?.trim()) return
    try {
      const a = await addArea.mutateAsync({ name: newArea.trim() })
      setAreaCode(a.code)
      setNewArea(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add the area.')
    }
  }

  const patchSection = (k: string, patch: Partial<DraftSection>) =>
    setSections(list => list.map(s => (s.key === k ? { ...s, ...patch } : s)))
  const patchStandard = (sk: string, k: string, patch: Partial<DraftStandard>) =>
    setSections(list =>
      list.map(s => (s.key === sk ? { ...s, standards: s.standards.map(st => (st.key === k ? { ...st, ...patch } : st)) } : s)),
    )
  const move = <T,>(list: T[], i: number, by: number) => {
    const j = i + by
    if (j < 0 || j >= list.length) return list
    const copy = [...list]
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
    return copy
  }
  let number = 0
  const saving = create.isPending || update.isPending

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5" data-testid="audit-template-wizard">
      <div className="flex items-center gap-3 rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-sm">
        <button
          type="button"
          onClick={() => void navigate({ to: '/governance/audits/templates' })}
          className="inline-flex items-center gap-1 text-sm text-primary-foreground/90 hover:text-primary-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </button>
        <h1 className="flex-1 text-center text-base font-semibold">{editCode ? 'Edit audit template' : 'Create a new audit template'}</h1>
        <span className="w-12" />
      </div>
      <Stepper steps={STEPS} currentStep={step} onStepChange={s => s < step && setStep(s)} className="justify-center" />

      {step === 0 ? (
        <section className="space-y-5" data-testid="wizard-step-area">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              Branches that use it
              <InfoTip label="branches">{HELP.templateBranches}</InfoTip>
            </h2>
            <div className="mt-2 grid gap-1.5 rounded-lg border border-border p-3 sm:grid-cols-2">
              {branches.map(b => (
                <label key={b.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/40">
                  <input
                    type="checkbox"
                    checked={locationIds.includes(b.id)}
                    onChange={e => setLocationIds(ids => (e.target.checked ? [...ids, b.id] : ids.filter(i => i !== b.id)))}
                  />
                  {b.label}
                </label>
              ))}
            </div>
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {locationIds.length ? `${locationIds.length} branch(es) chosen` : wholeOrg ? 'Every branch' : 'Choose your branches'}
            </p>
          </div>
          <div>
            <h2 className="flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-foreground">
              Select the audit area for your template
              <InfoTip label="area">{HELP.templateArea}</InfoTip>
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Audit area">
              {(areas.data ?? []).map(a => (
                <button
                  key={a.code}
                  type="button"
                  role="radio"
                  aria-checked={areaCode === a.code}
                  onClick={() => setAreaCode(a.code)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border p-4 text-center text-sm transition-colors',
                    areaCode === a.code ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:bg-muted/30',
                  )}
                  data-testid="wizard-area"
                >
                  <AreaIcon code={a.code} className="h-8 w-8" />
                  <span className="font-medium text-foreground">{a.name}</span>
                  {a.isSystem ? <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Library</span> : null}
                </button>
              ))}
            </div>
            <div className="mt-3 flex justify-center">
              {newArea === null ? (
                <Button variant="outline" onClick={() => setNewArea('')} data-testid="wizard-add-area">
                  <PlusCircle className="mr-1.5 h-4 w-4" aria-hidden />
                  Add new area
                </Button>
              ) : (
                <div className="flex w-full max-w-md gap-2">
                  <Input

                    placeholder="Name of the area"
                    value={newArea}
                    onChange={e => setNewArea(e.target.value)}
                    aria-label="New area name"
                    data-testid="wizard-new-area"
                  />
                  <Button onClick={() => void addNewArea()} disabled={addArea.isPending}>
                    Add
                  </Button>
                  <Button variant="ghost" onClick={() => setNewArea(null)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-4" data-testid="wizard-step-details">
          <div>
            <label htmlFor="wizard-title" className="text-sm font-medium text-foreground">
              Audit title <span className="text-destructive">*</span>
            </label>
            <Input id="wizard-title" className="mt-1" value={title} onChange={e => setTitle(e.target.value)} data-testid="wizard-title" />
            <div className="mt-2 rounded-lg bg-muted/40 p-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={useItem} onChange={e => setUseItem(e.target.checked)} data-testid="wizard-use-item" />
                Use an audited item field for this template
                <InfoTip label="audited item">{HELP.templateAuditedItem}</InfoTip>
              </label>
              {useItem ? (
                <Input
                  className="mt-2"
                  placeholder='Label, e.g. "Person supported"'
                  value={itemLabel}
                  onChange={e => setItemLabel(e.target.value)}
                  aria-label="Audited item label"
                  data-testid="wizard-item-label"
                />
              ) : null}
            </div>
          </div>
          <div>
            <label htmlFor="wizard-frequency" className="text-sm font-medium text-foreground">
              Audit frequency
            </label>
            <div className="mt-1 space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
              <select
                id="wizard-frequency"
                className={`${feedbackSelectClass} max-w-[14rem]`}
                value={frequency}
                onChange={e => setFrequency(e.target.value as AuditFrequency)}
                data-testid="wizard-frequency"
              >
                {FREQUENCIES.map(f => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABEL[f]}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap items-center gap-2">
                can be completed up to
                <Input className="h-8 w-16" inputMode="numeric" value={early} onChange={e => setEarly(e.target.value)} aria-label="Days early" />
                day(s) early,
              </div>
              <div className="flex flex-wrap items-center gap-2">
                or up to
                <Input className="h-8 w-16" inputMode="numeric" value={late} onChange={e => setLate(e.target.value)} aria-label="Days late" />
                day(s) late, after which the audit is marked as missed
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="wizard-intro" className="text-sm font-medium text-foreground">
              Introduction (optional)
            </label>
            <textarea
              id="wizard-intro"
              className={`${feedbackTextareaClass} mt-1`}
              rows={4}
              value={intro}
              onChange={e => setIntro(e.target.value)}
              placeholder="Shown at the top of the audit: what it is for and how to carry it out"
            />
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4" data-testid="wizard-step-standards">
          {sections.map((s, si) => (
            <div key={s.key} className="rounded-xl border border-border bg-card p-4 shadow-sm" data-testid="wizard-section">
              <div className="flex items-center gap-2">
                <Input
                  value={s.title}
                  placeholder="Section title, e.g. Policy and training"
                  onChange={e => patchSection(s.key, { title: e.target.value })}
                  aria-label={`Section ${si + 1} title`}
                  className="font-medium"
                  data-testid="wizard-section-title"
                />
                <Button size="sm" variant="ghost" aria-label="Move section up" onClick={() => setSections(l => move(l, si, -1))}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" aria-label="Move section down" onClick={() => setSections(l => move(l, si, 1))}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  aria-label="Remove section"
                  disabled={sections.length === 1}
                  onClick={() => setSections(l => l.filter(x => x.key !== s.key))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <ol className="mt-3 space-y-2">
                {s.standards.map((st, i) => {
                  number += 1
                  return (
                    <li key={st.key} className="flex items-start gap-2" data-testid="wizard-standard">
                      <span className="mt-2 flex h-6 min-w-6 items-center justify-center rounded-md bg-primary px-1 text-xs font-semibold text-primary-foreground">
                        {number}
                      </span>
                      <div className="flex-1 space-y-1">
                        <textarea
                          rows={2}
                          className={feedbackTextareaClass}
                          placeholder="The standard, e.g. Staff have read the infection control policy"
                          value={st.text}
                          onChange={e => patchStandard(s.key, st.key, { text: e.target.value })}
                          aria-label={`Standard ${number}`}
                          data-testid="wizard-standard-text"
                        />
                        <Input
                          placeholder="How to check it (optional)"
                          value={st.hint}
                          onChange={e => patchStandard(s.key, st.key, { hint: e.target.value })}
                          aria-label={`How to check standard ${number}`}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex flex-col">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Move standard up"
                          onClick={() => patchSection(s.key, { standards: move(s.standards, i, -1) })}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Move standard down"
                          onClick={() => patchSection(s.key, { standards: move(s.standards, i, 1) })}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          aria-label="Remove standard"
                          disabled={s.standards.length === 1}
                          onClick={() => patchSection(s.key, { standards: s.standards.filter(x => x.key !== st.key) })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ol>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => patchSection(s.key, { standards: [...s.standards, blankStandard()] })}
                data-testid="wizard-add-standard"
              >
                <PlusCircle className="mr-1.5 h-4 w-4" aria-hidden />
                Add standard
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={() => setSections(l => [...l, blankSection()])} data-testid="wizard-add-section">
            <PlusCircle className="mr-1.5 h-4 w-4" aria-hidden />
            Add section
          </Button>
        </section>
      ) : null}

      {error ? (
        <p className="text-center text-sm text-destructive" data-testid="wizard-error">
          {error}
        </p>
      ) : null}
      <div className="flex justify-center gap-3 pb-6">
        <Button
          variant="outline"
          className="min-w-[9rem]"
          onClick={() => (step === 0 ? void navigate({ to: '/governance/audits/templates' }) : setStep(s => s - 1))}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
          Back
        </Button>
        {step < 2 ? (
          <Button className="min-w-[9rem]" onClick={next} data-testid="wizard-next">
            Next
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
          </Button>
        ) : (
          <Button className="min-w-[9rem]" onClick={() => void save()} disabled={saving} data-testid="wizard-save">
            {saving ? 'Saving…' : editCode ? 'Save template' : 'Create template'}
          </Button>
        )}
      </div>
    </div>
  )
}
