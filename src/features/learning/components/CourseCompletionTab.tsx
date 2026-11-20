import * as React from 'react'
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  Save,
  Settings,
  UserCheck,
  UserCog,
} from 'lucide-react'
import { Combobox } from '@/shared/ui/combobox'
import { CheckLine, Panel, SideCard, TwoColumn } from '@/features/learning/components/builder-layout'
import { plural } from '@/features/learning/components/CourseSidebarCards'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { FormField } from '@/shared/ui/form-field'
import { Checkbox, Switch } from '@/shared/ui/toggle-controls'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useLearningSettings, useUpdateLearningCourse } from '@/features/learning/hooks/useLearning'
import { courseKindOf, type LearningCourse, type LearningCourseVersion } from '@/features/learning/types/learning.types'
import { CompetencyLink } from '@/features/learning/components/CompetencyLink'

type Props = {
  course: LearningCourse
  version: LearningCourseVersion
  readOnly: boolean
  onSaved: () => void
}

type Form = {
  isMandatory: boolean
  requiresPracticalAssessment: boolean
  requiresManagerApproval: boolean
  certificateEnabled: boolean
  validityDays: string
  cpdMinutes: string
  refresher: boolean
}

type Errors = Partial<Record<'validityDays' | 'cpdMinutes', string>>

function formFrom(course: LearningCourse, version: LearningCourseVersion): Form {
  return {
    isMandatory: !!course.isMandatory,
    requiresPracticalAssessment: !!version.requiresPracticalAssessment,
    requiresManagerApproval: !!version.requiresManagerApproval,
    certificateEnabled: !!version.certificateEnabled,
    validityDays: version.certificateValidityDays ? String(version.certificateValidityDays) : '',
    cpdMinutes: version.cpdMinutes != null ? String(version.cpdMinutes) : '',
    refresher: !!version.refresherFrequencyDays,
  }
}

/**
 * Builder step "Finish and certificate". Completion and certificate rules are saved on the draft version (via the
 * course update) and frozen at publish, so carers keep the rules of the version they started.
 */
export function CourseCompletionTab({ course, version, readOnly, onSaved }: Props) {
  const updateMut = useUpdateLearningCourse()
  const { data: settings } = useLearningSettings()
  const [form, setForm] = React.useState<Form>(() => formFrom(course, version))
  const [errors, setErrors] = React.useState<Errors>({})

  React.useEffect(() => {
    setForm(formFrom(course, version))
    setErrors({})
  }, [course, version])

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(prev => ({ ...prev, [key]: value }))

  const defaultValidity = settings?.defaultCertificateValidityDays
  // Which quizzes the carer must pass comes from the quizzes themselves (Required / final).
  const moduleTitle = (id?: string | null) => (version.sections ?? []).find(s => s.id === id)?.title
  const requiredQuizzes = (version.assessments ?? []).filter(a => !a.sectionId || a.isRequired !== false)
  const optionalQuizzes = (version.assessments ?? []).length - requiredQuizzes.length
  const requiredLessons = (version.sections ?? []).reduce(
    (n, s) => n + (s.contentItems ?? []).filter(c => c.isRequired !== false).length,
    0,
  )

  const save = async () => {
    const next: Errors = {}
    let validity: number | null = null
    if (form.validityDays.trim()) {
      validity = Number(form.validityDays)
      if (!Number.isInteger(validity) || validity < 1) next.validityDays = 'Enter whole days, 1 or more'
    }
    let cpd: number | null = null
    if (form.cpdMinutes.trim()) {
      cpd = Number(form.cpdMinutes)
      if (!Number.isInteger(cpd) || cpd < 0 || cpd > 10000) next.cpdMinutes = 'Enter whole minutes, 0 to 10000'
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    // The refresher is assigned when the certificate expires (Learning jobs), so the value stored
    // is the certificate's validity in days.
    const refresherDays =
      form.certificateEnabled && form.refresher ? (validity ?? defaultValidity ?? null) : null
    try {
      await updateMut.mutateAsync({
        id: course.id,
        body: {
          isMandatory: form.isMandatory,
          requiresPracticalAssessment: form.requiresPracticalAssessment,
          requiresManagerApproval: form.requiresManagerApproval,
          certificateEnabled: form.certificateEnabled,
          certificateValidityDays: validity,
          cpdMinutes: cpd,
          refresherFrequencyDays: refresherDays,
        },
      })
      toastSuccess('Finish and certificate saved')
      onSaved()
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Save failed'))
    }
  }

  const requiredModuleQuizzes = requiredQuizzes.filter(q => q.sectionId)
  const finals = requiredQuizzes.filter(q => !q.sectionId)
  const selected = 1 + (requiredQuizzes.length ? 1 : 0) + (form.requiresPracticalAssessment ? 1 : 0) + (form.requiresManagerApproval ? 1 : 0)
  const validityShown = form.validityDays.trim() || (defaultValidity ? String(defaultValidity) : '—')
  const warnings: string[] = []
  if (course.courseType === 'PRACTICAL_COMPETENCY' && !form.requiresPracticalAssessment) {
    warnings.push('This is a practical course but the practical test is not required.')
  }
  requiredQuizzes.filter(q => !(q.questions?.length ?? 0)).forEach(q => warnings.push(`"${q.title}" has no questions yet.`))
  if (!form.certificateEnabled) warnings.push('No certificate will be issued.')
  if (form.refresher && settings && settings.automaticRefresherAssignment === false) {
    warnings.push('Automatic refreshers are switched off in Learning settings, so none will be assigned.')
  }

  return (
    <TwoColumn
      main={
        <div className="space-y-5" data-testid="course-completion-tab">
          <Panel title="Completion requirements" description="What carers must do to finish this course.">
            <div className="space-y-2">
              <RequirementCard
                icon={<BookOpen className="h-5 w-5" />}
                checked
                locked
                title="Complete required lessons"
                hint={`Carers must complete every lesson marked required (${requiredLessons}).`}
              />
              <RequirementCard
                icon={<ClipboardCheck className="h-5 w-5" />}
                checked={requiredQuizzes.length > 0}
                locked
                title="Pass required assessments"
                hint={
                  requiredQuizzes.length
                    ? `${plural(requiredModuleQuizzes.length, 'module quiz', 'module quizzes')} and ${plural(finals.length, 'final assessment', 'final assessments')}. Set in Course outline and Final assessment.`
                    : 'No required quiz. Add one in Course outline or Final assessment.'
                }
              >
                {requiredQuizzes.length ? (
                  <ul className="mt-2 space-y-1">
                    {requiredQuizzes.map(q => (
                      <li key={q.id} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                        <span>{q.sectionId ? `${q.title} · ${moduleTitle(q.sectionId) ?? ''}` : `${q.title} · final`}</span>
                        <span className="text-muted-foreground">
                          {plural(q.questions?.length ?? 0, 'question', 'questions')} · pass {q.passingScore}%
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {optionalQuizzes ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {optionalQuizzes} optional quiz{optionalQuizzes === 1 ? '' : 'zes'}: practice only.
                  </p>
                ) : null}
              </RequirementCard>
              {courseKindOf(course) !== 'ONLINE' || form.requiresPracticalAssessment ? (
              <RequirementCard
                icon={<UserCheck className="h-5 w-5" />}
                checked={form.requiresPracticalAssessment}
                onChange={v => set('requiresPracticalAssessment', v)}
                disabled={readOnly}
                title="Practical test"
                hint="The manager watches the carer do the task and fills the checklist (Met / Not met with comments)."
              >
                {form.requiresPracticalAssessment || course.courseType === 'PRACTICAL_COMPETENCY' || version.competencyId ? (
                  <div className="mt-2">
                    <CompetencyLink course={course} version={version} readOnly={readOnly} onChanged={onSaved} />
                  </div>
                ) : null}
              </RequirementCard>
              ) : null}
              <RequirementCard
                icon={<UserCog className="h-5 w-5" />}
                checked={form.requiresManagerApproval}
                onChange={v => set('requiresManagerApproval', v)}
                disabled={readOnly}
                title="Manager approval"
                hint="A manager confirms the completion before it counts."
              />
            </div>
          </Panel>

          <Panel title="Certification and CPD" description="Certificate, CPD and renewal for this course.">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Switch
                    checked={form.certificateEnabled}
                    onCheckedChange={v => {
                      set('certificateEnabled', v)
                      if (!v) set('refresher', false)
                    }}
                    disabled={readOnly}
                    aria-label="Certificate enabled"
                  />
                  <span>
                    <span className="block text-sm font-medium">Certificate enabled</span>
                    <span className="text-xs text-muted-foreground">Issued automatically when every requirement is met.</span>
                  </span>
                </div>
                <FormField label="Certificate template" hint="Demo: one template for now, not saved yet.">
                  <Combobox
                    value="standard"
                    onChange={() => undefined}
                    options={[{ value: 'standard', label: 'CareFlow – Standard Certificate' }]}
                    allowDeselect={false}
                    disabled={readOnly || !form.certificateEnabled}
                  />
                </FormField>
              </div>
              <div className="space-y-4">
                <FormField label="CPD minutes" hint="Shown on the certificate. Empty = none" error={errors.cpdMinutes}>
                  <Input type="number" min={0} value={form.cpdMinutes} onChange={e => set('cpdMinutes', e.target.value)} disabled={readOnly} />
                </FormField>
                <FormField
                  label="Certificate valid for (days)"
                  hint={defaultValidity ? `Empty = Learning settings default (${defaultValidity} days)` : 'Empty = Learning settings default'}
                  error={errors.validityDays}
                >
                  <Input
                    type="number"
                    min={1}
                    value={form.validityDays}
                    placeholder={defaultValidity ? String(defaultValidity) : undefined}
                    onChange={e => set('validityDays', e.target.value)}
                    disabled={readOnly || !form.certificateEnabled}
                  />
                </FormField>
              </div>
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <RequirementCard
                icon={<RefreshCw className="h-5 w-5" />}
                checked={form.refresher}
                onChange={v => set('refresher', v)}
                disabled={readOnly || !form.certificateEnabled}
                title="Assign this course again when a carer's certificate expires"
                hint={
                  form.certificateEnabled
                    ? 'Carers who have already finished this course get it again automatically on the day their certificate expires.'
                    : 'Needs a certificate.'
                }
              />
            </div>
          </Panel>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/20 p-4 text-sm" data-testid="eligibility-summary">
            <span className="font-medium">Certificate eligibility</span>
            <span className="text-muted-foreground">
              Required lessons{requiredQuizzes.length ? ' + required assessments' : ''}
              {form.requiresPracticalAssessment ? ' + practical' : ''}
              {form.requiresManagerApproval ? ' + manager approval' : ''}
            </span>
            <span className="ml-auto rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-400">
              {form.certificateEnabled ? 'Certificate will be issued' : 'No certificate'}
            </span>
          </div>

          {!readOnly ? (
            <div className="flex justify-end">
              <Button type="button" onClick={() => void save()} disabled={updateMut.isPending}>
                <Save className="mr-1 h-4 w-4" />
                Save
              </Button>
            </div>
          ) : null}
        </div>
      }
      side={
        <>
          <SideCard
            title="Configuration summary"
            icon={<Settings className="h-4 w-4" />}
            badge={<span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{selected} of 4 selected</span>}
          >
            <CheckLine state="on">Complete required lessons</CheckLine>
            <CheckLine state={requiredQuizzes.length ? 'on' : 'off'}>
              Pass assessments{requiredQuizzes.length ? ` (${requiredQuizzes.length})` : ''}
            </CheckLine>
            <CheckLine state={form.requiresPracticalAssessment ? 'on' : 'off'}>Practical competency</CheckLine>
            <CheckLine state={form.requiresManagerApproval ? 'on' : 'off'}>Manager approval</CheckLine>
          </SideCard>
          <SideCard title="Certificate preview" icon={<Award className="h-4 w-4" />} testId="certificate-preview">
            {form.certificateEnabled ? (
              <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-4 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">CareFlow</p>
                <p className="mt-1 font-serif text-base">Certificate of Completion</p>
                <p className="mt-2 text-[11px] text-muted-foreground">This is to certify that</p>
                <p className="font-serif text-lg font-semibold">Carer name</p>
                <p className="text-[11px] text-muted-foreground">has completed the training course</p>
                <p className="mt-1 text-sm font-semibold">{course.title}</p>
                <div className="mt-3 flex justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
                  <span>CPD: {form.cpdMinutes.trim() ? `${form.cpdMinutes} minutes` : '—'}</span>
                  <span>Valid for: {validityShown} days</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Certificate is turned off.</p>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">Demo preview of the standard template.</p>
          </SideCard>
          <SideCard
            title={`Warnings (${warnings.length})`}
            icon={<AlertTriangle className="h-4 w-4" />}
            testId="finish-warnings"
          >
            {warnings.length ? (
              warnings.map(w => (
                <CheckLine key={w} state="warn">
                  {w}
                </CheckLine>
              ))
            ) : (
              <CheckLine state="on">Nothing to look at.</CheckLine>
            )}
          </SideCard>
        </>
      }
    />
  )
}

function RequirementCard({
  icon,
  checked,
  onChange,
  disabled,
  locked,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode
  checked: boolean
  onChange?: (v: boolean) => void
  disabled?: boolean
  locked?: boolean
  title: string
  hint?: string
  children?: React.ReactNode
}) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${checked ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
      <Checkbox
        checked={checked}
        onCheckedChange={v => onChange?.(!!v)}
        disabled={disabled || locked}
        aria-label={title}
        className="mt-1"
      />
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        {children}
      </div>
    </div>
  )
}
