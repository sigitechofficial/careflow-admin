import * as React from "react";
import { CalendarClock, ClipboardCheck, Mail, MailWarning, Send } from "lucide-react";
import {
  candidateFlowApi,
  type CandidateDetail,
  type CandidateInterview,
  type CandidateInterviewMode,
  type CandidateInterviewOutcome,
  type CandidateInterviewStatus,
  type InterviewPayload,
} from "@/features/hr/recruitment/api/recruitment.api";
import { useCandidateFlowAction } from "@/features/hr/recruitment/hooks/useRecruitment";
import {
  DEFAULT_INTERVIEW_QUESTIONS,
  INTERVIEW_MODE_LABELS,
  INTERVIEW_OUTCOME_LABELS,
  INTERVIEW_STATUS_LABELS,
  formatDateTime,
} from "@/features/hr/recruitment/utils/recruitment-display.util";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";
import { toastApiError, toastSuccess } from "@/shared/lib/toast";
import { Field, Textarea } from "./flow-ui";

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Book (or move) an interview. Booking the first one moves the candidate from screening to interview. */
export function ArrangeInterviewDialog({
  candidate,
  interview,
  open,
  onOpenChange,
}: {
  candidate: CandidateDetail;
  interview?: CandidateInterview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useCandidateFlowAction(candidate.id, (p: InterviewPayload) =>
    interview
      ? candidateFlowApi.updateInterview(candidate.id, interview.id, p)
      : candidateFlowApi.createInterview(candidate.id, p),
  );
  const [when, setWhen] = React.useState("");
  const [mode, setMode] = React.useState<CandidateInterviewMode>("IN_PERSON");
  const [location, setLocation] = React.useState("");
  const [interviewers, setInterviewers] = React.useState("");
  const [notify, setNotify] = React.useState(true);
  const hasEmail = !!candidate.email;

  React.useEffect(() => {
    if (!open) return;
    setWhen(toLocalInput(interview?.scheduledAt));
    setMode(interview?.mode ?? "IN_PERSON");
    setLocation(interview?.location ?? "");
    setInterviewers(interview?.interviewers ?? "");
    setNotify(true);
  }, [open, interview]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!when) return;
    try {
      await save.mutateAsync({
        scheduledAt: new Date(when).toISOString(),
        mode,
        location: location.trim(),
        interviewers: interviewers.trim(),
        notifyCandidate: hasEmail && notify,
      });
      const emailed = hasEmail && notify;
      toastSuccess(
        interview ? "Interview updated" : "Interview arranged",
        emailed
          ? interview
            ? `If the time, type or place changed, the new details are being emailed to ${candidate.email}.`
            : `The invitation is being emailed to ${candidate.email}, with a calendar file.`
          : undefined,
      );
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Could not save the interview");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {interview ? "Change interview" : "Arrange interview"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogBody className="space-y-4">
            <Field label="Date and time" htmlFor="iv-when">
              <Input
                id="iv-when"
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                required
              />
            </Field>
            <Field label="How">
              <Select
                value={mode}
                onValueChange={(v) => setMode(v as CandidateInterviewMode)}
              >
                <SelectTrigger aria-label="Interview type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(
                      INTERVIEW_MODE_LABELS,
                    ) as CandidateInterviewMode[]
                  ).map((m) => (
                    <SelectItem key={m} value={m}>
                      {INTERVIEW_MODE_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label={
                mode === "VIDEO"
                  ? "Video link"
                  : mode === "PHONE"
                    ? "Phone number"
                    : "Where"
              }
              htmlFor="iv-where"
            >
              <Input
                id="iv-where"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </Field>
            <Field
              label="Interview panel"
              htmlFor="iv-panel"
              hint="Who will interview, e.g. Registered manager and a senior carer."
            >
              <Input
                id="iv-panel"
                value={interviewers}
                onChange={(e) => setInterviewers(e.target.value)}
              />
            </Field>
            <label
              className={cn(
                "flex items-start gap-2.5 rounded-lg border border-border p-3 text-sm",
                hasEmail ? "bg-muted/20" : "opacity-70",
              )}
            >
              <input
                type="checkbox"
                checked={hasEmail && notify}
                disabled={!hasEmail}
                onChange={(e) => setNotify(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border border-input"
              />
              <span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  {interview ? "Email the new details to the candidate" : "Email the invitation to the candidate"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {hasEmail
                    ? `To ${candidate.email}, with a calendar file.${interview ? " Only sent if the time, type or place changes." : ""}`
                    : "No email address for this candidate — add one on the Application step."}
                </span>
              </span>
            </label>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || !when}>
              {save.isPending
                ? "Saving…"
                : interview
                  ? "Save"
                  : "Arrange interview"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type AnswerRow = { question: string; score: number | null; notes: string };

function InterviewOutcomeDialog({
  candidate,
  interview,
  open,
  onOpenChange,
}: {
  candidate: CandidateDetail;
  interview: CandidateInterview;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useCandidateFlowAction(candidate.id, (p: InterviewPayload) =>
    candidateFlowApi.updateInterview(candidate.id, interview.id, p),
  );
  const [attended, setAttended] = React.useState<
    "COMPLETED" | "NO_SHOW" | "CANCELLED"
  >("COMPLETED");
  const [answers, setAnswers] = React.useState<AnswerRow[]>([]);
  const [recommendation, setRecommendation] =
    React.useState<CandidateInterviewOutcome | null>(null);
  const [gapsDiscussed, setGapsDiscussed] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [notifyCancel, setNotifyCancel] = React.useState(true);
  const canEmailCancel = !!candidate.email && interview.status === "SCHEDULED";

  React.useEffect(() => {
    if (!open) return;
    setAttended(
      interview.status === "NO_SHOW" || interview.status === "CANCELLED"
        ? interview.status
        : "COMPLETED",
    );
    setAnswers(
      interview.answers.length
        ? interview.answers.map((a) => ({
            question: a.question,
            score: a.score,
            notes: a.notes ?? "",
          }))
        : DEFAULT_INTERVIEW_QUESTIONS.map((q) => ({
            question: q,
            score: null,
            notes: "",
          })),
    );
    setRecommendation(interview.recommendation);
    setGapsDiscussed(interview.gapsDiscussed);
    setNotifyCancel(true);
    setNotes(interview.notes ?? "");
  }, [open, interview]);

  const scored = answers.filter((a) => a.score !== null);
  const average = scored.length
    ? scored.reduce((s, a) => s + (a.score ?? 0), 0) / scored.length
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save.mutateAsync(
        attended === "COMPLETED"
          ? {
              status: "COMPLETED",
              answers: answers.map((a) => ({
                question: a.question,
                score: a.score,
                notes: a.notes.trim() || undefined,
              })),
              recommendation,
              gapsDiscussed,
              notes: notes.trim(),
            }
          : {
              status: attended,
              notes: notes.trim(),
              notifyCandidate: attended === "CANCELLED" && canEmailCancel && notifyCancel,
            },
      );
      toastSuccess(
        "Interview outcome saved",
        attended === "CANCELLED" && canEmailCancel && notifyCancel
          ? `The cancellation is being emailed to ${candidate.email}.`
          : undefined,
      );
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Could not save the interview");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Interview outcome — {formatDateTime(interview.scheduledAt)}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogBody className="space-y-5">
            <Field label="Did the interview go ahead?">
              <div className="inline-flex overflow-hidden rounded-md border border-input text-sm">
                {(["COMPLETED", "NO_SHOW", "CANCELLED"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAttended(s)}
                    className={cn(
                      "px-3 py-1.5",
                      attended === s
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    {s === "COMPLETED"
                      ? "Yes, it happened"
                      : INTERVIEW_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </Field>

            {attended === "CANCELLED" && canEmailCancel ? (
              <label className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/20 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={notifyCancel}
                  onChange={(e) => setNotifyCancel(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border border-input"
                />
                <span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Mail className="h-3.5 w-3.5" aria-hidden /> Email the candidate that it is cancelled
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    To {candidate.email}. The calendar entry they were sent is removed too.
                  </span>
                </span>
              </label>
            ) : null}

            {attended === "COMPLETED" ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">
                      Values-based questions
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Score 1 (poor) to 5 (excellent)
                      {average !== null
                        ? ` · average ${average.toFixed(1)}`
                        : ""}
                    </p>
                  </div>
                  {answers.map((a, i) => (
                    <div
                      key={i}
                      className="space-y-2 rounded-lg border border-border p-3"
                    >
                      <p className="text-sm">{a.question}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <div
                          role="radiogroup"
                          aria-label={`Score for question ${i + 1}`}
                          className="inline-flex gap-1"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              role="radio"
                              aria-checked={a.score === n}
                              onClick={() =>
                                setAnswers((rows) =>
                                  rows.map((r, j) =>
                                    j === i
                                      ? {
                                          ...r,
                                          score: r.score === n ? null : n,
                                        }
                                      : r,
                                  ),
                                )
                              }
                              className={cn(
                                "h-8 w-8 rounded-md border text-sm",
                                a.score === n
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-input hover:bg-muted",
                              )}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        <Input
                          aria-label={`Notes for question ${i + 1}`}
                          placeholder="Notes (optional)"
                          value={a.notes}
                          onChange={(e) =>
                            setAnswers((rows) =>
                              rows.map((r, j) =>
                                j === i ? { ...r, notes: e.target.value } : r,
                              ),
                            )
                          }
                          className="min-w-[200px] flex-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={gapsDiscussed}
                    onChange={(e) => setGapsDiscussed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border border-input"
                  />
                  <span>
                    Employment history and any gaps were talked through with the
                    candidate
                    {candidate.unexplainedGaps.length ? (
                      <span className="block text-xs text-amber-700 dark:text-amber-300">
                        {candidate.unexplainedGaps.length} gap(s) are still not
                        explained on the Application step.
                      </span>
                    ) : null}
                  </span>
                </label>

                <Field label="Recommendation">
                  <div className="inline-flex overflow-hidden rounded-md border border-input text-sm">
                    {(["HIRE", "MAYBE", "DO_NOT_HIRE"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRecommendation(r)}
                        className={cn(
                          "px-3 py-1.5",
                          recommendation === r
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted",
                        )}
                      >
                        {INTERVIEW_OUTCOME_LABELS[r]}
                      </button>
                    ))}
                  </div>
                </Field>
              </>
            ) : null}

            <Field label="Notes" htmlFor="iv-notes">
              <Textarea
                id="iv-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                save.isPending || (attended === "COMPLETED" && !recommendation)
              }
            >
              {save.isPending ? "Saving…" : "Save outcome"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function statusTone(status: CandidateInterviewStatus) {
  if (status === "COMPLETED")
    return "border-emerald-500/30 text-emerald-700 dark:text-emerald-300";
  if (status === "SCHEDULED")
    return "border-sky-500/30 text-sky-700 dark:text-sky-300";
  return "border-border text-muted-foreground";
}

/** Whether the candidate was emailed about this interview, with a way to send it again. */
function InterviewEmailStatus({
  candidate,
  interview,
  canResend,
}: {
  candidate: CandidateDetail;
  interview: CandidateInterview;
  canResend: boolean;
}) {
  const resend = useCandidateFlowAction(candidate.id, () =>
    candidateFlowApi.emailInterview(candidate.id, interview.id),
  );
  const scheduled = interview.status === "SCHEDULED";

  async function handleResend() {
    try {
      await resend.mutateAsync(undefined);
      toastSuccess("Interview details emailed", `Sent to ${candidate.email}, with a calendar file.`);
    } catch (err) {
      toastApiError(err, "Could not email the candidate");
    }
  }

  if (!candidate.email) {
    return scheduled ? (
      <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
        <MailWarning className="h-3.5 w-3.5" aria-hidden /> Not emailed — no email address on file
      </p>
    ) : null;
  }

  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {interview.candidateEmailedAt ? (
        <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
          <Mail className="h-3.5 w-3.5" aria-hidden /> Emailed {formatDateTime(interview.candidateEmailedAt)}
        </span>
      ) : scheduled ? (
        <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
          <MailWarning className="h-3.5 w-3.5" aria-hidden /> Candidate not emailed yet
        </span>
      ) : null}
      {canResend && scheduled ? (
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={resend.isPending}
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline disabled:opacity-60"
        >
          <Send className="h-3 w-3" aria-hidden />
          {resend.isPending ? "Sending…" : interview.candidateEmailedAt ? "Resend" : "Email now"}
        </button>
      ) : null}
    </p>
  );
}

export function InterviewStep({
  candidate,
  canEdit,
}: {
  candidate: CandidateDetail;
  canEdit: boolean;
}) {
  const [arrangeFor, setArrangeFor] = React.useState<
    CandidateInterview | null | undefined
  >(undefined);
  const [outcomeFor, setOutcomeFor] = React.useState<CandidateInterview | null>(
    null,
  );
  const editable = canEdit && candidate.stage === "INTERVIEW";

  return (
    <>
      {candidate.interviews.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          No interview arranged yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {candidate.interviews.map((iv) => {
            const scored = iv.answers.filter((a) => a.score !== null);
            const avg = scored.length
              ? scored.reduce((s, a) => s + (a.score ?? 0), 0) / scored.length
              : null;
            return (
              <li
                key={iv.id}
                className="space-y-2 rounded-lg border border-border p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <CalendarClock
                        className="h-4 w-4 text-muted-foreground"
                        aria-hidden
                      />
                      {formatDateTime(iv.scheduledAt)} ·{" "}
                      {INTERVIEW_MODE_LABELS[iv.mode]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        iv.location,
                        iv.interviewers ? `Panel: ${iv.interviewers}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                    <InterviewEmailStatus
                      candidate={candidate}
                      interview={iv}
                      canResend={editable}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("font-normal", statusTone(iv.status))}
                    >
                      {INTERVIEW_STATUS_LABELS[iv.status]}
                    </Badge>
                    {iv.recommendation ? (
                      <Badge variant="outline" className="font-normal">
                        {INTERVIEW_OUTCOME_LABELS[iv.recommendation]}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                {iv.status === "COMPLETED" ? (
                  <p className="text-xs text-muted-foreground">
                    {avg !== null
                      ? `Average score ${avg.toFixed(1)} of 5 · `
                      : ""}
                    {iv.gapsDiscussed ? "Gaps discussed" : "Gaps not discussed"}
                    {iv.completedByName
                      ? ` · recorded by ${iv.completedByName}`
                      : ""}
                  </p>
                ) : null}
                {iv.notes ? (
                  <p className="whitespace-pre-wrap text-sm">{iv.notes}</p>
                ) : null}
                {editable ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        iv.status === "SCHEDULED" ? "default" : "outline"
                      }
                      onClick={() => setOutcomeFor(iv)}
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      {iv.status === "SCHEDULED"
                        ? "Record outcome"
                        : "Edit outcome"}
                    </Button>
                    {iv.status === "SCHEDULED" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setArrangeFor(iv)}
                      >
                        Change time
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {editable ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setArrangeFor(null)}
        >
          <CalendarClock className="h-3.5 w-3.5" /> Arrange another interview
        </Button>
      ) : null}

      <ArrangeInterviewDialog
        candidate={candidate}
        interview={arrangeFor ?? null}
        open={arrangeFor !== undefined}
        onOpenChange={(o) => !o && setArrangeFor(undefined)}
      />
      {outcomeFor ? (
        <InterviewOutcomeDialog
          candidate={candidate}
          interview={outcomeFor}
          open={!!outcomeFor}
          onOpenChange={(o) => !o && setOutcomeFor(null)}
        />
      ) : null}
    </>
  );
}

export function hasPositiveInterview(candidate: CandidateDetail): boolean {
  return candidate.interviews.some(
    (i) =>
      i.status === "COMPLETED" &&
      (i.recommendation === "HIRE" || i.recommendation === "MAYBE"),
  );
}
