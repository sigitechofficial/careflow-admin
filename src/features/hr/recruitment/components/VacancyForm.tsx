import * as React from "react";
import {
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  MapPin,
  Plus,
  PoundSterling,
  Trash2,
  X,
} from "lucide-react";
import { useEmployeeLookups } from "@/features/employees/hooks/useEmployees";
import { useHrEmployees } from "@/features/hr/hooks/useHr";
import {
  useCreateVacancy,
  useUpdateVacancy,
  useUpdateVacancyStatus,
  useVacancies,
} from "@/features/hr/recruitment/hooks/useRecruitment";
import type {
  CvRequirement,
  HoursType,
  NotifyMode,
  QuestionKind,
  RecruitmentEmploymentType,
  SalaryPeriod,
  ScreeningQuestion,
  ShiftKind,
  VacancyRow,
  VacancyStatus,
  WorkSetting,
} from "@/features/hr/recruitment/api/recruitment.api";
import {
  BENEFIT_SUGGESTIONS,
  HOURS_TYPE_OPTIONS,
  SALARY_PERIOD_OPTIONS,
  SHIFT_OPTIONS,
  WORK_SETTING_OPTIONS,
  employmentTypeLabel,
  formatClosingDate,
  formatPay,
  hoursText,
  payNumbersFromText,
  shiftLabel,
  vacancyStatusLabel,
  workSettingLabel,
} from "@/features/hr/recruitment/utils/recruitment-display.util";
import {
  QUESTION_LIBRARY,
  answersOf,
  defaultQuestions,
  fromLibrary,
  newQuestionId,
} from "@/features/hr/recruitment/utils/vacancy-questions.util";
import { toastApiError, toastSuccess } from "@/shared/lib/toast";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

const EMPLOYMENT_TYPES: RecruitmentEmploymentType[] = [
  "PERMANENT",
  "FIXED_TERM",
  "BANK",
  "AGENCY",
  "APPRENTICE",
  "VOLUNTEER",
];

const STEPS = ["Basics", "Pay & shifts", "Description", "Questions", "Review"] as const;
const NONE = "__none__";

const fieldClass = "flex flex-col gap-1.5";
const labelClass = "block text-sm font-medium leading-none text-foreground";
const hintClass = "text-xs text-muted-foreground";
const optional = <span className="font-normal text-muted-foreground"> (optional)</span>;

const textareaClass = cn(
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "shadow-sm placeholder:text-muted-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

type Form = {
  title: string;
  jobTitleId: string;
  locationId: string;
  workSetting: WorkSetting | "";
  employmentType: RecruitmentEmploymentType;
  hoursType: HoursType | "";
  hoursMin: string;
  hoursMax: string;
  numberOfPositions: string;
  startAsap: boolean;
  startDate: string;
  closingDate: string;
  hiringManagerId: string;
  payMin: string;
  payMax: string;
  salaryPeriod: SalaryPeriod | "";
  shifts: ShiftKind[];
  benefits: string[];
  description: string;
  requirements: string;
  questions: ScreeningQuestion[];
  cvRequirement: CvRequirement;
  notifyMode: NotifyMode;
};

const blankForm = (): Form => ({
  title: "",
  jobTitleId: "",
  locationId: "",
  workSetting: "HOME_VISITS",
  employmentType: "PERMANENT",
  hoursType: "",
  hoursMin: "",
  hoursMax: "",
  numberOfPositions: "1",
  startAsap: true,
  startDate: "",
  closingDate: "",
  hiringManagerId: "",
  payMin: "",
  payMax: "",
  salaryPeriod: "HOUR",
  shifts: [],
  benefits: [],
  description: "",
  requirements: "",
  questions: defaultQuestions(),
  cvRequirement: "OPTIONAL",
  notifyMode: "EACH",
});

const numText = (n: number | null | undefined) => (n == null ? "" : String(n));

/** The form filled from a vacancy: to edit it, or as a copy for a new one (dates left empty). */
function formFrom(v: VacancyRow, copy: boolean): Form {
  // Older vacancies have pay only as text: read the numbers from it when possible.
  const fromText = v.payMin == null && v.payMax == null ? payNumbersFromText(v.salaryRange) : null;
  return {
    title: v.title,
    jobTitleId: v.jobTitleId ?? "",
    locationId: v.locationId ?? "",
    workSetting: v.workSetting ?? "",
    employmentType: v.employmentType,
    hoursType: v.hoursType ?? "",
    hoursMin: numText(v.hoursPerWeekMin),
    hoursMax: numText(v.hoursPerWeekMax),
    numberOfPositions: String(v.numberOfPositions ?? 1),
    startAsap: copy || !v.startDate,
    startDate: copy ? "" : (v.startDate ?? ""),
    closingDate: copy ? "" : (v.closingDate ?? ""),
    hiringManagerId: v.hiringManagerId ?? "",
    payMin: numText(fromText ? fromText.min : v.payMin),
    payMax: numText(fromText ? fromText.max : v.payMax),
    salaryPeriod: v.salaryPeriod ?? "",
    shifts: [...(v.shifts ?? [])],
    benefits: [...(v.benefits ?? [])],
    description: v.description ?? "",
    requirements: v.requirements ?? "",
    // Copies get new question ids; an older vacancy without questions starts from the usual ones.
    questions: v.screeningQuestions?.length
      ? v.screeningQuestions.map((q) => ({ ...q, id: copy ? newQuestionId() : q.id }))
      : copy
        ? defaultQuestions()
        : [],
    cvRequirement: v.cvRequirement ?? "OPTIONAL",
    notifyMode: v.notifyMode ?? "EACH",
  };
}

const toNumber = (s: string) => (s.trim() === "" ? null : Number(s));

/** What is wrong with a step, or null. */
function stepProblem(step: number, f: Form): string | null {
  if (step === 0) {
    if (!f.title.trim()) return "Give the job a title.";
    const lo = toNumber(f.hoursMin);
    const hi = toNumber(f.hoursMax);
    if ((lo != null && (lo < 1 || lo > 80)) || (hi != null && (hi < 1 || hi > 80))) return "Hours a week must be between 1 and 80.";
    if (lo != null && hi != null && lo > hi) return "The lowest hours must not be more than the highest.";
    if (!f.startAsap && !f.startDate) return "Choose the start date, or tick “As soon as possible”.";
  }
  if (step === 1) {
    const lo = toNumber(f.payMin);
    const hi = toNumber(f.payMax);
    if ((lo != null && (Number.isNaN(lo) || lo < 0)) || (hi != null && (Number.isNaN(hi) || hi < 0))) return "Enter pay as a number, e.g. 12.60.";
    if (lo != null && hi != null && lo > hi) return "The lowest pay must not be more than the highest.";
    if ((lo != null || hi != null) && !f.salaryPeriod) return "Choose what the pay is per (hour, month…).";
  }
  if (step === 3) {
    for (const q of f.questions) {
      if (!q.text.trim()) return "Every question needs its wording.";
      if (q.type === "CHOICE" && (q.options ?? []).filter((o) => o.trim()).length < 2) return `“${q.text}” needs at least two answers.`;
    }
  }
  return null;
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-muted",
      )}
    >
      {selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
      {children}
    </button>
  );
}

function Stepper({ step, onStep, maxStep }: { step: number; onStep: (s: number) => void; maxStep: number }) {
  return (
    <ol className="flex flex-wrap gap-1 lg:flex-col" aria-label="Steps">
      {STEPS.map((label, i) => (
        <li key={label}>
          <button
            type="button"
            disabled={i > maxStep}
            onClick={() => onStep(i)}
            aria-current={i === step ? "step" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 lg:w-full lg:rounded-lg lg:px-3 lg:py-2 lg:text-sm",
              i === step ? "bg-primary text-primary-foreground" : i < step ? "text-primary hover:bg-primary/10" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] lg:h-5 lg:w-5 lg:text-xs",
                i === step ? "bg-primary-foreground/20" : i < step ? "bg-primary/15" : "bg-muted",
              )}
            >
              {i < step ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
            </span>
            {label}
          </button>
        </li>
      ))}
    </ol>
  );
}

/** One question: its wording, answers, required, and (optionally) the answers the job needs. */
function QuestionEditor({
  q,
  onChange,
  onRemove,
  locked,
}: {
  q: ScreeningQuestion;
  onChange: (q: ScreeningQuestion) => void;
  onRemove?: () => void;
  locked?: boolean;
}) {
  const answers = answersOf(q);
  const dealBreaker = !!q.acceptedAnswers?.length;
  const toggleAccepted = (a: string) => {
    const now = q.acceptedAnswers ?? [];
    const next = now.includes(a) ? now.filter((x) => x !== a) : [...now, a];
    onChange({ ...q, acceptedAnswers: next });
  };
  return (
    <div className={cn("space-y-3 rounded-lg border p-3", dealBreaker ? "border-amber-500/40 bg-amber-500/5" : "border-border")}>
      <div className="flex items-start gap-2">
        <Input
          value={q.text}
          onChange={(e) => onChange({ ...q, text: e.target.value })}
          aria-label="Question"
          className="flex-1"
        />
        {onRemove ? (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label="Remove question">
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {q.kind === "CUSTOM" ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">Answer:</span>
          {(["YES_NO", "CHOICE", "TEXT"] as const).map((t) => (
            <label key={t} className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`type-${q.id}`}
                checked={q.type === t}
                onChange={() =>
                  onChange({
                    ...q,
                    type: t,
                    options: t === "CHOICE" ? (q.options?.length ? q.options : ["", ""]) : undefined,
                    acceptedAnswers: undefined,
                  })
                }
              />
              {t === "YES_NO" ? "Yes / No" : t === "CHOICE" ? "Choose one" : "Written answer"}
            </label>
          ))}
        </div>
      ) : null}
      {q.type === "CHOICE" && q.kind === "CUSTOM" ? (
        <div className="space-y-2">
          {(q.options ?? []).map((o, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={o}
                placeholder={`Answer ${i + 1}`}
                onChange={(e) => {
                  const options = [...(q.options ?? [])];
                  const before = options[i];
                  options[i] = e.target.value;
                  onChange({ ...q, options, acceptedAnswers: q.acceptedAnswers?.map((a) => (a === before ? e.target.value : a)) });
                }}
              />
              {(q.options ?? []).length > 2 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Remove answer"
                  onClick={() => onChange({ ...q, options: (q.options ?? []).filter((_, j) => j !== i), acceptedAnswers: q.acceptedAnswers?.filter((a) => a !== o) })}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))}
          {(q.options ?? []).length < 10 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...q, options: [...(q.options ?? []), ""] })}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add answer
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={q.required} disabled={locked} onChange={(e) => onChange({ ...q, required: e.target.checked })} />
          Must be answered
        </label>
        {answers.length ? (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={dealBreaker}
              onChange={(e) =>
                // Yes / No: "Yes" is needed. A list: every answer but the first (usually "None").
                onChange({
                  ...q,
                  acceptedAnswers: e.target.checked
                    ? (q.type === "YES_NO" ? ["Yes"] : answers.slice(1)).filter((a) => a.trim())
                    : undefined,
                })
              }
            />
            Deal breaker
          </label>
        ) : null}
      </div>
      {dealBreaker ? (
        <div className="space-y-1.5">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            The job needs one of these answers. Anyone answering differently is still received, marked in red for you to decide.
          </p>
          <div className="flex flex-wrap gap-2">
            {answers.filter((a) => a.trim()).map((a) => (
              <Chip key={a} selected={!!q.acceptedAnswers?.includes(a)} onClick={() => toggleAccepted(a)}>
                {a}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Create a vacancy step by step (or edit one when `vacancy` is given), on its own page. */
export function VacancyForm({
  vacancy,
  onDone,
  onCancel,
}: {
  vacancy?: VacancyRow | null;
  /** Saved: back to the list. */
  onDone: () => void;
  onCancel: () => void;
}) {
  const lookupsQuery = useEmployeeLookups(true);
  // The API allows at most 100 per page (PaginationQueryDto); asking for more fails with 400.
  const managersQuery = useHrEmployees({ page: 1, limit: 100 }, true);
  const vacanciesQuery = useVacancies({ page: 1, limit: 100 });
  const createMutation = useCreateVacancy();
  const updateMutation = useUpdateVacancy(vacancy?.id ?? "");
  const statusMutation = useUpdateVacancyStatus(vacancy?.id ?? "");
  const editing = !!vacancy;
  const saving = createMutation.isPending || updateMutation.isPending || statusMutation.isPending;

  const [form, setForm] = React.useState<Form>(blankForm);
  const [step, setStep] = React.useState(0);
  const [maxStep, setMaxStep] = React.useState(0);
  const [problem, setProblem] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<VacancyStatus>("OPEN");
  const [copiedFrom, setCopiedFrom] = React.useState<string | null>(null);
  const [benefitDraft, setBenefitDraft] = React.useState("");

  React.useEffect(() => {
    // Start from the vacancy being edited, or from a blank form. Only when the vacancy changes:
    // a background refetch must not wipe what is being typed.
    setForm(vacancy ? formFrom(vacancy, false) : blankForm());
    setStatus(vacancy?.status ?? "OPEN");
    setStep(0);
    setMaxStep(vacancy ? STEPS.length - 1 : 0);
    setProblem(null);
    setCopiedFrom(null);
    setBenefitDraft("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacancy?.id]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const lookups = lookupsQuery.data;
  const managers = managersQuery.data?.data ?? [];
  const others = (vacanciesQuery.data?.data ?? []).filter((v) => v.id !== vacancy?.id);
  const today = new Date().toISOString().slice(0, 10);

  const payText = (() => {
    const lo = toNumber(form.payMin);
    const hi = toNumber(form.payMax);
    if (lo == null && hi == null) return null;
    const a = lo ?? hi!;
    const b = hi ?? lo!;
    return formatPay(a === b ? String(a) : `${Math.min(a, b)} – ${Math.max(a, b)}`, form.salaryPeriod || null);
  })();
  const sameJobTitleText = form.jobTitleId
    ? others.find((v) => v.jobTitleId === form.jobTitleId && (v.description || v.requirements))
    : undefined;

  function copyFrom(id: string) {
    const v = others.find((x) => x.id === id);
    if (!v) return;
    setForm(formFrom(v, true));
    setCopiedFrom(`${v.vacancyReference} — ${v.title}`);
    setProblem(null);
  }

  function goTo(next: number) {
    // Moving on checks the steps in between; going back is always allowed.
    if (next > step) {
      for (let s = step; s < next; s += 1) {
        const p = stepProblem(s, form);
        if (p) {
          setStep(s);
          setProblem(p);
          return;
        }
      }
    }
    setProblem(null);
    setStep(next);
    setMaxStep((m) => Math.max(m, next));
  }

  const toggleShift = (s: ShiftKind) => set("shifts", form.shifts.includes(s) ? form.shifts.filter((x) => x !== s) : [...form.shifts, s]);
  const toggleBenefit = (b: string) => set("benefits", form.benefits.includes(b) ? form.benefits.filter((x) => x !== b) : [...form.benefits, b]);
  const addBenefit = () => {
    const b = benefitDraft.trim();
    if (b && !form.benefits.includes(b)) set("benefits", [...form.benefits, b]);
    setBenefitDraft("");
  };
  const libraryOn = (kind: QuestionKind) => form.questions.some((q) => q.kind === kind);
  const toggleLibrary = (kind: Exclude<QuestionKind, "CUSTOM">) =>
    set("questions", libraryOn(kind) ? form.questions.filter((q) => q.kind !== kind) : [...form.questions, fromLibrary(kind)]);
  const updateQuestion = (q: ScreeningQuestion) => set("questions", form.questions.map((x) => (x.id === q.id ? q : x)));

  async function save(asStatus?: "DRAFT" | "OPEN") {
    for (let s = 0; s < STEPS.length - 1; s += 1) {
      const p = stepProblem(s, form);
      if (p) {
        setStep(s);
        setProblem(p);
        return;
      }
    }
    const payMin = toNumber(form.payMin);
    const payMax = toNumber(form.payMax);
    const payload = {
      title: form.title.trim(),
      employmentType: form.employmentType,
      jobTitleId: form.jobTitleId || undefined,
      locationId: form.locationId || undefined,
      workSetting: form.workSetting || null,
      hoursType: form.hoursType || null,
      hoursPerWeekMin: toNumber(form.hoursMin),
      hoursPerWeekMax: toNumber(form.hoursMax),
      numberOfPositions: Number(form.numberOfPositions) || 1,
      startDate: form.startAsap ? null : form.startDate || null,
      closingDate: form.closingDate || null,
      hiringManagerId: form.hiringManagerId || undefined,
      payMin,
      payMax,
      salaryPeriod: form.salaryPeriod || null,
      shifts: form.shifts,
      benefits: form.benefits,
      description: form.description.trim() || undefined,
      requirements: form.requirements.trim() || undefined,
      screeningQuestions: form.questions.map((q) => ({
        ...q,
        text: q.text.trim(),
        ...(q.options ? { options: q.options.map((o) => o.trim()).filter(Boolean) } : {}),
      })),
      cvRequirement: form.cvRequirement,
      notifyMode: form.notifyMode,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync(payload);
        if (status !== vacancy?.status) await statusMutation.mutateAsync(status);
        toastSuccess("Vacancy saved");
      } else {
        await createMutation.mutateAsync({ ...payload, status: asStatus ?? "OPEN" });
        toastSuccess(asStatus === "DRAFT" ? "Draft saved" : "Vacancy published", asStatus === "DRAFT" ? "It is not on the careers page until you publish it." : "It is on the careers page now.");
      }
      onDone();
    } catch (err) {
      toastApiError(err, editing ? "Could not save the vacancy" : "Could not create the vacancy");
    }
  }

  const last = step === STEPS.length - 1;

  return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!last) goTo(step + 1);
          }}
          className="grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)]"
        >
          <nav className="rounded-xl border border-border bg-card p-3 shadow-sm lg:sticky lg:top-4" aria-label="Vacancy steps">
            <Stepper step={step} onStep={goTo} maxStep={maxStep} />
          </nav>
          <div className="min-w-0 rounded-xl border border-border bg-card shadow-sm">
          <div className="space-y-5 p-4 md:p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Step {step + 1} of {STEPS.length}
              </p>
              <h2 className="text-lg font-semibold">{STEPS[step]}</h2>
            </div>

            {step === 0 ? (
              <div className="space-y-5">
                {!editing && others.length ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-3">
                    <Copy className="h-4 w-4 text-muted-foreground" aria-hidden />
                    <span className="text-sm">Start from an earlier vacancy</span>
                    <Select value="" onValueChange={copyFrom}>
                      <SelectTrigger className="h-8 w-auto min-w-[220px]" aria-label="Copy an earlier vacancy">
                        <SelectValue placeholder={copiedFrom ?? "Choose one to copy…"} />
                      </SelectTrigger>
                      <SelectContent className="z-[100] max-h-64">
                        {others.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.vacancyReference} — {v.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {copiedFrom ? <span className={hintClass}>Copied. Check the dates before publishing.</span> : null}
                  </div>
                ) : null}

                <div className={fieldClass}>
                  <label htmlFor="vacancy-title" className={labelClass}>Job title shown to applicants</label>
                  <Input id="vacancy-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Home Care Worker" />
                  <p className={hintClass}>Use the words people search for. Keep pay and location out of the title.</p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className={fieldClass}>
                    <label className={labelClass}>Job title (HR list){optional}</label>
                    <Select value={form.jobTitleId || undefined} onValueChange={(v) => set("jobTitleId", v === NONE ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select job title" /></SelectTrigger>
                      <SelectContent className="z-[100]">
                        <SelectItem value={NONE}>None</SelectItem>
                        {(lookups?.jobTitles ?? []).map((jt) => (
                          <SelectItem key={jt.id} value={jt.id}>{jt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={fieldClass}>
                    <label className={labelClass}>Branch / location{optional}</label>
                    <Select value={form.locationId || undefined} onValueChange={(v) => set("locationId", v === NONE ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                      <SelectContent className="z-[100]">
                        <SelectItem value={NONE}>None</SelectItem>
                        {(lookups?.locations ?? []).map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className={fieldClass}>
                  <span className={labelClass}>Where the work is</span>
                  <div className="flex flex-wrap gap-2">
                    {WORK_SETTING_OPTIONS.map((o) => (
                      <Chip key={o.value} selected={form.workSetting === o.value} onClick={() => set("workSetting", form.workSetting === o.value ? "" : o.value)}>
                        {o.label}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className={fieldClass}>
                    <label className={labelClass}>Contract</label>
                    <Select value={form.employmentType} onValueChange={(v) => set("employmentType", v as RecruitmentEmploymentType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="z-[100]">
                        {EMPLOYMENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{employmentTypeLabel(t)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={fieldClass}>
                    <label htmlFor="vacancy-positions" className={labelClass}>How many people</label>
                    <Input id="vacancy-positions" type="number" min={1} value={form.numberOfPositions} onChange={(e) => set("numberOfPositions", e.target.value)} />
                  </div>
                </div>

                <div className={fieldClass}>
                  <span className={labelClass}>Hours</span>
                  <div className="flex flex-wrap gap-2">
                    {HOURS_TYPE_OPTIONS.map((o) => (
                      <Chip key={o.value} selected={form.hoursType === o.value} onClick={() => set("hoursType", form.hoursType === o.value ? "" : o.value)}>
                        {o.label}
                      </Chip>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Input type="number" min={1} max={80} value={form.hoursMin} onChange={(e) => set("hoursMin", e.target.value)} placeholder="From" aria-label="Hours a week from" className="w-24" />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input type="number" min={1} max={80} value={form.hoursMax} onChange={(e) => set("hoursMax", e.target.value)} placeholder="To" aria-label="Hours a week to" className="w-24" />
                    <span className="text-sm text-muted-foreground">hours a week</span>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className={fieldClass}>
                    <span className={labelClass}>Start</span>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.startAsap} onChange={(e) => set("startAsap", e.target.checked)} /> As soon as possible
                    </label>
                    {!form.startAsap ? (
                      <Input type="date" min={today} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} aria-label="Start date" />
                    ) : null}
                  </div>
                  <div className={fieldClass}>
                    <label htmlFor="vacancy-closing" className={labelClass}>Closing date{optional}</label>
                    <Input id="vacancy-closing" type="date" min={editing ? undefined : today} value={form.closingDate} onChange={(e) => set("closingDate", e.target.value)} />
                    <p className={hintClass}>
                      {form.closingDate ? `Applications close at the end of ${formatClosingDate(form.closingDate)}.` : "Empty = open until you close it."}
                    </p>
                  </div>
                </div>

                <div className={fieldClass}>
                  <label className={labelClass}>Hiring manager{optional}</label>
                  <Select value={form.hiringManagerId || undefined} onValueChange={(v) => set("hiringManagerId", v === NONE ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={managersQuery.isLoading ? "Loading…" : managersQuery.isError ? "Unable to load managers" : "Select hiring manager"} />
                    </SelectTrigger>
                    <SelectContent className="z-[100] max-h-64">
                      <SelectItem value={NONE}>None</SelectItem>
                      {managers.map((emp) => (
                        <SelectItem key={emp.employeeId} value={emp.employeeId}>
                          {emp.name}
                          {emp.jobTitle ? ` — ${emp.jobTitle}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className={hintClass}>They are told about new applications (step 4).</p>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-5">
                <div className={fieldClass}>
                  <span className={labelClass}>Pay{optional}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">£</span>
                    <Input type="number" min={0} step="0.01" value={form.payMin} onChange={(e) => set("payMin", e.target.value)} placeholder="From" aria-label="Pay from" className="w-28" />
                    <span className="text-sm text-muted-foreground">to £</span>
                    <Input type="number" min={0} step="0.01" value={form.payMax} onChange={(e) => set("payMax", e.target.value)} placeholder="To" aria-label="Pay to" className="w-28" />
                    <Select value={form.salaryPeriod || undefined} onValueChange={(v) => set("salaryPeriod", v === NONE ? "" : (v as SalaryPeriod))}>
                      <SelectTrigger aria-label="Pay period" className="w-36"><SelectValue placeholder="per…" /></SelectTrigger>
                      <SelectContent className="z-[100]">
                        {SALARY_PERIOD_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className={hintClass}>
                    {payText ? <>Careers page shows: <span className="font-medium text-foreground">{payText}</span>. </> : null}
                    Adverts with pay get far more applications. One figure only? Fill “From”.
                  </p>
                </div>

                <div className={fieldClass}>
                  <span className={labelClass}>Shifts</span>
                  <div className="flex flex-wrap gap-2">
                    {SHIFT_OPTIONS.map((o) => (
                      <Chip key={o.value} selected={form.shifts.includes(o.value)} onClick={() => toggleShift(o.value)}>{o.label}</Chip>
                    ))}
                  </div>
                </div>

                <div className={fieldClass}>
                  <span className={labelClass}>Benefits</span>
                  <div className="flex flex-wrap gap-2">
                    {[...BENEFIT_SUGGESTIONS, ...form.benefits.filter((b) => !BENEFIT_SUGGESTIONS.includes(b))].map((b) => (
                      <Chip key={b} selected={form.benefits.includes(b)} onClick={() => toggleBenefit(b)}>{b}</Chip>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Input
                      value={benefitDraft}
                      onChange={(e) => setBenefitDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addBenefit();
                        }
                      }}
                      placeholder="Another benefit"
                      maxLength={60}
                      className="max-w-xs"
                    />
                    <Button type="button" variant="outline" onClick={addBenefit} disabled={!benefitDraft.trim()}>
                      <Plus className="mr-1 h-4 w-4" /> Add
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                {sameJobTitleText && !form.description && !form.requirements ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-3 text-sm">
                    <span>
                      {sameJobTitleText.vacancyReference} has the same job title. Use its wording to start?
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setForm((f) => ({ ...f, description: sameJobTitleText.description ?? "", requirements: sameJobTitleText.requirements ?? "" }))}
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" /> Use its text
                    </Button>
                  </div>
                ) : null}
                <div className={fieldClass}>
                  <label htmlFor="vacancy-description" className={labelClass}>About the job</label>
                  <textarea id="vacancy-description" className={textareaClass} rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What the job is, who they will support, and what a day looks like." />
                </div>
                <div className={fieldClass}>
                  <label htmlFor="vacancy-requirements" className={labelClass}>What you are looking for</label>
                  <textarea id="vacancy-requirements" className={textareaClass} rows={5} value={form.requirements} onChange={(e) => set("requirements", e.target.value)} placeholder="One per line: experience, qualities, driving…" />
                  <p className={hintClass}>Short lines read better than long paragraphs.</p>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-5">
                <div className={fieldClass}>
                  <span className={labelClass}>Questions to ask</span>
                  <p className={hintClass}>Switch on the ones you need. A deal breaker marks an application in red; it is never turned away automatically.</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {QUESTION_LIBRARY.filter((q) => q.kind !== "RIGHT_TO_WORK").map((q) => (
                      <Chip key={q.kind} selected={libraryOn(q.kind)} onClick={() => toggleLibrary(q.kind)}>
                        {q.label}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  {form.questions.map((q) => (
                    <QuestionEditor
                      key={q.id}
                      q={q}
                      locked={q.kind === "RIGHT_TO_WORK"}
                      onChange={updateQuestion}
                      onRemove={q.kind === "RIGHT_TO_WORK" ? undefined : () => set("questions", form.questions.filter((x) => x.id !== q.id))}
                    />
                  ))}
                  {!form.questions.some((q) => q.kind === "RIGHT_TO_WORK") ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => set("questions", [fromLibrary("RIGHT_TO_WORK"), ...form.questions])}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Ask about the right to work
                    </Button>
                  ) : null}
                  {form.questions.length < 15 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => set("questions", [...form.questions, { id: newQuestionId(), kind: "CUSTOM", text: "", type: "YES_NO", required: false }])}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Your own question
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <fieldset className={fieldClass}>
                    <legend className={cn(labelClass, "mb-1.5")}>CV</legend>
                    {(
                      [
                        ["REQUIRED", "Must attach a CV"],
                        ["OPTIONAL", "CV optional"],
                        ["HIDDEN", "Don't ask for a CV"],
                      ] as const
                    ).map(([v, label]) => (
                      <label key={v} className="flex items-center gap-2 text-sm">
                        <input type="radio" name="cv" checked={form.cvRequirement === v} onChange={() => set("cvRequirement", v)} /> {label}
                      </label>
                    ))}
                  </fieldset>
                  <fieldset className={fieldClass}>
                    <legend className={cn(labelClass, "mb-1.5")}>Tell the hiring manager</legend>
                    {(
                      [
                        ["EACH", "Email for each application"],
                        ["DAILY", "One summary email a day (8am)"],
                        ["NONE", "No email (in-app only)"],
                      ] as const
                    ).map(([v, label]) => (
                      <label key={v} className="flex items-center gap-2 text-sm">
                        <input type="radio" name="notify" checked={form.notifyMode === v} onChange={() => set("notifyMode", v)} /> {label}
                      </label>
                    ))}
                    {!form.hiringManagerId && form.notifyMode !== "NONE" ? (
                      <p className="text-xs text-amber-700 dark:text-amber-300">Choose a hiring manager in step 1, or no email is sent.</p>
                    ) : null}
                  </fieldset>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-4">
                <p className={hintClass}>This is how the job looks on your careers page.</p>
                <article className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div>
                    <h3 className="text-lg font-semibold">{form.title || "Job title"}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {lookups?.locations?.find((l) => l.id === form.locationId)?.name ? (
                        <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden />{lookups.locations.find((l) => l.id === form.locationId)!.name}</span>
                      ) : null}
                      {payText ? <span className="inline-flex items-center gap-1"><PoundSterling className="h-4 w-4" aria-hidden />{payText}</span> : null}
                      <span className="inline-flex items-center gap-1"><Briefcase className="h-4 w-4" aria-hidden />{employmentTypeLabel(form.employmentType)}</span>
                      {hoursText(form.hoursType || null, toNumber(form.hoursMin), toNumber(form.hoursMax)) ? (
                        <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden />{hoursText(form.hoursType || null, toNumber(form.hoursMin), toNumber(form.hoursMax))}</span>
                      ) : null}
                    </div>
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    {form.workSetting ? <div><dt className="text-xs text-muted-foreground">Where</dt><dd>{workSettingLabel(form.workSetting)}</dd></div> : null}
                    <div><dt className="text-xs text-muted-foreground">Start</dt><dd>{form.startAsap ? "As soon as possible" : formatClosingDate(form.startDate)}</dd></div>
                    {form.shifts.length ? <div><dt className="text-xs text-muted-foreground">Shifts</dt><dd>{form.shifts.map(shiftLabel).join(", ")}</dd></div> : null}
                    {form.closingDate ? <div><dt className="text-xs text-muted-foreground">Apply by</dt><dd>{formatClosingDate(form.closingDate)}</dd></div> : null}
                  </dl>
                  {form.benefits.length ? (
                    <div className="flex flex-wrap gap-2">
                      {form.benefits.map((b) => (
                        <span key={b} className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-800 dark:text-emerald-300">{b}</span>
                      ))}
                    </div>
                  ) : null}
                  {form.description ? <p className="whitespace-pre-wrap text-sm">{form.description}</p> : <p className={hintClass}>No description yet.</p>}
                  {form.requirements ? (
                    <div>
                      <p className="text-sm font-medium">What we are looking for</p>
                      <p className="whitespace-pre-wrap text-sm">{form.requirements}</p>
                    </div>
                  ) : null}
                </article>

                <div className="rounded-lg border border-border p-4 text-sm">
                  <p className="font-medium">When applying they answer</p>
                  {form.questions.length ? (
                    <ul className="mt-2 space-y-1">
                      {form.questions.map((q) => (
                        <li key={q.id} className="flex flex-wrap items-baseline gap-2">
                          <span>{q.text}</span>
                          {q.required ? <span className="text-xs text-muted-foreground">required</span> : null}
                          {q.acceptedAnswers?.length ? (
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-300">needs: {q.acceptedAnswers.join(" or ")}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={hintClass}>No questions (right to work is asked as before).</p>
                  )}
                  <p className="mt-2 text-muted-foreground">
                    CV: {form.cvRequirement === "REQUIRED" ? "must attach" : form.cvRequirement === "OPTIONAL" ? "optional" : "not asked"} · Hiring manager:{" "}
                    {form.notifyMode === "EACH" ? "an email for each application" : form.notifyMode === "DAILY" ? "a summary each morning" : "in-app only"}
                  </p>
                </div>

                {editing ? (
                  <div className={cn(fieldClass, "sm:w-64")}>
                    <label className={labelClass}>Status</label>
                    <Select value={status} onValueChange={(v) => setStatus(v as VacancyStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="z-[100]">
                        {(["DRAFT", "OPEN", "PAUSED", "CLOSED"] as VacancyStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>{vacancyStatusLabel(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className={hintClass}>Only Open vacancies are on the careers page.</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {problem ? <p className="text-sm text-destructive" role="alert">{problem}</p> : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-xl border-t border-border bg-muted/20 px-4 py-3 md:px-6">
            <Button type="button" variant="ghost" onClick={() => (step === 0 ? onCancel() : goTo(step - 1))}>
              {step === 0 ? "Cancel" : (<><ChevronLeft className="mr-1 h-4 w-4" /> Back</>)}
            </Button>
            <div className="flex flex-wrap gap-2">
              {!editing ? (
                <Button type="button" variant="outline" disabled={saving || !form.title.trim()} onClick={() => void save("DRAFT")}>
                  Save as draft
                </Button>
              ) : null}
              {last ? (
                <Button type="button" disabled={saving} onClick={() => void save("OPEN")}>
                  {saving ? "Saving…" : editing ? "Save changes" : "Publish"}
                </Button>
              ) : (
                <Button type="submit">
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          </div>
        </form>
  );
}
