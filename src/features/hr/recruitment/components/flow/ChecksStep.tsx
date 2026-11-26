import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Mail,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";
import {
  candidateFlowApi,
  type CandidateCheck,
  type ClearanceBlocker,
  type CandidateCheckStatus,
  type CandidateCheckType,
  type CandidateDetail,
  type CheckPayload,
} from "@/features/hr/recruitment/api/recruitment.api";
import {
  useCandidateFlowAction,
  useUploadCandidateDocument,
} from "@/features/hr/recruitment/hooks/useRecruitment";
import {
  CHECK_STATUS_LABELS,
  formatDate,
  toDateInput,
} from "@/features/hr/recruitment/utils/recruitment-display.util";
import { getApiBaseUrl } from "@/shared/lib/api-base";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
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
import { Field, Textarea, scrollToAndFlash } from "./flow-ui";
import { EmailCheckbox } from "./OfferStep";

import { DateInput } from '@/shared/ui/date-time-input'
/** What to record for each check: the reference field, the "who / how" field, and whether it has dates. */
const CHECK_FIELDS: Record<
  CandidateCheckType,
  { reference?: string; provider?: string; dates: boolean; hint: string }
> = {
  PROOF_OF_ID: {
    reference: "Document number",
    provider: "Document seen (passport, driving licence…)",
    dates: true,
    hint: "Photo ID seen in person or by video, with a recent photograph kept on file.",
  },
  RIGHT_TO_WORK: {
    reference: "Share code or document number",
    provider: "How it was checked (Home Office online, IDSP, documents)",
    dates: true,
    hint: "Record the expiry for time-limited permission so a follow-up check is due.",
  },
  DBS: {
    reference: "DBS certificate number",
    provider: "Level and Update Service status",
    dates: true,
    hint: "Enhanced certificate with the adults barred list. Note if checked through the Update Service.",
  },
  REFERENCE_1: {
    provider: "Referee name, organisation and contact",
    dates: false,
    hint: "From the most recent employer. For a past care job, confirm conduct and why the job ended.",
  },
  REFERENCE_2: {
    provider: "Referee name, organisation and contact",
    dates: false,
    hint: "A second employer, or a character reference if there is no other employer.",
  },
  QUALIFICATIONS: {
    reference: "Qualification",
    provider: "Awarding body",
    dates: true,
    hint: "Certificates for qualifications relevant to the role, where they can be obtained.",
  },
  HEALTH_DECLARATION: {
    dates: false,
    hint: "Health questionnaire completed; note any reasonable adjustments agreed.",
  },
  OVERSEAS_POLICE_CHECK: {
    reference: "Certificate number",
    provider: "Country",
    dates: true,
    hint: "Needed because the candidate lived or worked abroad for 6+ months in the last 5 years.",
  },
  DRIVING: {
    reference: "Licence number",
    provider: "Business insurance and MOT details",
    dates: true,
    hint: "Full licence, business use insurance and a valid MOT for the car used for work.",
  },
};

const STATUS_ORDER: CandidateCheckStatus[] = [
  "NOT_STARTED",
  "REQUESTED",
  "RECEIVED",
  "VERIFIED",
  "FAILED",
  "NOT_REQUIRED",
];

function statusTone(status: CandidateCheckStatus) {
  switch (status) {
    case "VERIFIED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "FAILED":
      return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
    case "RECEIVED":
      return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300";
    case "REQUESTED":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    default:
      return "border-border text-muted-foreground";
  }
}

function resolveUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${getApiBaseUrl()?.replace(/\/$/, "") ?? ""}${path}`;
}

/** Reference 1 / 2: email the referee, prefilled from the referees the candidate gave when applying. */
function RefereeRequest({
  candidate,
  check,
  onSent,
}: {
  candidate: CandidateDetail;
  check: CandidateCheck;
  onSent: () => void;
}) {
  const given = candidate.referees?.[check.type === "REFERENCE_1" ? 0 : 1];
  const [name, setName] = React.useState(given?.name ?? "");
  const [email, setEmail] = React.useState(given?.email ?? "");
  const send = useCandidateFlowAction(candidate.id, () =>
    candidateFlowApi.requestReference(candidate.id, check.id, {
      name: name.trim(),
      email: email.trim(),
      relationship: given?.relationship || undefined,
    }),
  );
  const done = check.status === "VERIFIED" || check.status === "NOT_REQUIRED";
  if (done) return null;

  async function handleSend() {
    try {
      await send.mutateAsync(undefined);
      toastSuccess("Reference requested", `Emailed to ${email.trim()}.`);
      onSent();
    } catch (err) {
      toastApiError(err, "Could not email the referee");
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Mail className="h-3.5 w-3.5" aria-hidden /> Request by email
        </p>
        <p className="text-xs text-muted-foreground">
          {check.requestedAt
            ? `Last requested ${formatDate(check.requestedAt)}. You can send it again.`
            : given
              ? "Prefilled from the referees the candidate gave when applying."
              : "The candidate did not give referees when applying. Enter the referee's details."}{" "}
          The email asks about conduct, reliability, safeguarding and why they left.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Referee name" htmlFor="ck-ref-name">
          <Input id="ck-ref-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Referee email" htmlFor="ck-ref-email">
          <Input
            id="ck-ref-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={send.isPending || !name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
        onClick={() => void handleSend()}
      >
        <Send className="h-3.5 w-3.5" />{" "}
        {send.isPending ? "Sending…" : check.requestedAt ? "Send again" : "Send request"}
      </Button>
    </div>
  );
}

function CheckDialog({
  candidate,
  check,
  onOpenChange,
}: {
  candidate: CandidateDetail;
  check: CandidateCheck;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useCandidateFlowAction(candidate.id, (p: CheckPayload) =>
    candidateFlowApi.updateCheck(candidate.id, check.id, p),
  );
  const upload = useUploadCandidateDocument(candidate.id);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const fields = CHECK_FIELDS[check.type];

  const [status, setStatus] = React.useState<CandidateCheckStatus>(
    check.status,
  );
  const [reference, setReference] = React.useState(check.referenceNumber ?? "");
  const [provider, setProvider] = React.useState(check.provider ?? "");
  const [issueDate, setIssueDate] = React.useState(
    toDateInput(check.issueDate),
  );
  const [expiryDate, setExpiryDate] = React.useState(
    toDateInput(check.expiryDate),
  );
  const [notes, setNotes] = React.useState(check.notes ?? "");

  const needsReason = status === "FAILED" || status === "NOT_REQUIRED";

  async function handleUpload(file: File) {
    try {
      await upload.mutateAsync({
        file,
        documentType: "CHECK_EVIDENCE",
        checkId: check.id,
      });
      toastSuccess("Evidence uploaded");
    } catch (err) {
      toastApiError(err, "Upload failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save.mutateAsync({
        status,
        referenceNumber: fields.reference ? reference : undefined,
        provider: fields.provider ? provider : undefined,
        issueDate: fields.dates ? issueDate || null : undefined,
        expiryDate: fields.dates ? expiryDate || null : undefined,
        notes,
      });
      toastSuccess(
        `${check.label}: ${CHECK_STATUS_LABELS[status].toLowerCase()}`,
      );
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Could not save the check");
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{check.label}</DialogTitle>
          <DialogDescription>{fields.hint}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogBody className="space-y-4">
            {check.type === "REFERENCE_1" || check.type === "REFERENCE_2" ? (
              // Closes the dialog once sent, so the unsaved status here cannot overwrite "Requested".
              <RefereeRequest
                candidate={candidate}
                check={check}
                onSent={() => onOpenChange(false)}
              />
            ) : null}
            <Field label="Status">
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as CandidateCheckStatus)}
              >
                <SelectTrigger aria-label="Check status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {CHECK_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {fields.reference ? (
              <Field label={fields.reference} htmlFor="ck-ref">
                <Input
                  id="ck-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </Field>
            ) : null}
            {fields.provider ? (
              <Field label={fields.provider} htmlFor="ck-provider">
                <Input
                  id="ck-provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                />
              </Field>
            ) : null}
            {fields.dates ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Issue date" htmlFor="ck-issue">
                  <DateInput
                    id="ck-issue"
                   
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </Field>
                <Field label="Expiry date" htmlFor="ck-expiry">
                  <DateInput
                    id="ck-expiry"
                   
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </Field>
              </div>
            ) : null}
            <Field
              label={
                needsReason
                  ? status === "FAILED"
                    ? "Why did it fail?"
                    : "Why is it not needed?"
                  : "Notes"
              }
              htmlFor="ck-notes"
            >
              <Textarea
                id="ck-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required={needsReason}
              />
            </Field>

            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Evidence</p>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(file);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={upload.isPending}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />{" "}
                  {upload.isPending ? "Uploading…" : "Upload file"}
                </Button>
              </div>
              {check.documents.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No files yet. PDF, JPG, PNG or Word, up to 10 MB.
                </p>
              ) : (
                <ul className="space-y-1">
                  {check.documents.map((d) => (
                    <li key={d.id}>
                      <a
                        href={resolveUrl(d.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" /> {d.fileName}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
              disabled={save.isPending || (needsReason && !notes.trim())}
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Manager sign-off: all checks satisfactory, the candidate is fit and proper to start. */
export function ClearDialog({
  candidate,
  open,
  onOpenChange,
}: {
  candidate: CandidateDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const clear = useCandidateFlowAction(
    candidate.id,
    (p: { notes?: string; notifyCandidate: boolean; welcomeMessage?: string }) =>
      candidateFlowApi.clear(candidate.id, p),
  );
  const [confirmed, setConfirmed] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [notify, setNotify] = React.useState(true);
  const [welcome, setWelcome] = React.useState("");
  const hasEmail = !!candidate.email;
  React.useEffect(() => {
    if (open) {
      setConfirmed(false);
      setNotes("");
      setNotify(true);
      setWelcome("");
    }
  }, [open]);

  async function handleConfirm() {
    const emailing = hasEmail && notify;
    try {
      await clear.mutateAsync({
        notes: notes.trim() || undefined,
        notifyCandidate: emailing,
        welcomeMessage: emailing ? welcome.trim() || undefined : undefined,
      });
      toastSuccess(
        "Cleared to start",
        emailing ? `A welcome email is being sent to ${candidate.email}.` : undefined,
      );
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Could not clear the candidate");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clear to start</DialogTitle>
          <DialogDescription>
            Your sign-off is saved with your name and the date as evidence for
            CQC (Regulation 19).
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border border-input"
            />
            I have reviewed every check and the employment history.{" "}
            {candidate.firstName} is fit and proper to work in this role.
          </label>
          <Field label="Notes (staff only, not emailed)" htmlFor="clear-notes">
            <Textarea
              id="clear-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <EmailCheckbox
            checked={hasEmail && notify}
            disabled={!hasEmail}
            onChange={setNotify}
            title="Email the candidate a welcome"
            hint={
              hasEmail
                ? `To ${candidate.email}. Says they are cleared to start, with the role, start date and hours.`
                : "No email address for this candidate — add one on the Application step."
            }
          />
          {hasEmail && notify ? (
            <Field label="Message in the welcome email (optional)" htmlFor="clear-welcome">
              <Textarea
                id="clear-welcome"
                rows={3}
                maxLength={2000}
                placeholder="e.g. Please come to our office at 9:30am on your first day for your induction. Bring your bank details."
                value={welcome}
                onChange={(e) => setWelcome(e.target.value)}
              />
            </Field>
          ) : null}
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
            type="button"
            disabled={!confirmed || clear.isPending}
            onClick={() => void handleConfirm()}
          >
            {clear.isPending ? "Saving…" : "Clear to start"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ChecksStep({
  candidate,
  canEdit,
  onGoToApplication,
}: {
  candidate: CandidateDetail;
  canEdit: boolean;
  /** Open the Application step at consent or employment history (a blocker was clicked). */
  onGoToApplication?: (target: "CONSENT" | "EMPLOYMENT_HISTORY") => void;
}) {
  const [editing, setEditing] = React.useState<CandidateCheck | null>(null);
  const editable = canEdit && candidate.stage === "VETTING";

  /** A blocker was clicked: go to the place that fixes it. */
  function goTo(b: ClearanceBlocker) {
    if (b.target === "CONSENT" || b.target === "EMPLOYMENT_HISTORY") {
      onGoToApplication?.(b.target);
      return;
    }
    if (b.target === "CHECK") {
      const check = candidate.checks.find((c) => c.type === b.checkType);
      if (!check) return;
      scrollToAndFlash(document.getElementById(`check-${check.id}`));
      if (editable) setEditing(check);
    }
  }
  const linkable = (b: ClearanceBlocker) =>
    b.target === "CHECK" ||
    (!!onGoToApplication && (b.target === "CONSENT" || b.target === "EMPLOYMENT_HISTORY"));
  const required = candidate.checks.filter((c) => c.required);
  const done = required.filter(
    (c) => c.status === "VERIFIED" || c.status === "NOT_REQUIRED",
  ).length;

  if (candidate.checks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        The checks list is created when the candidate accepts the conditional
        offer.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {done} of {required.length} required checks done
          </span>
          <span className="text-xs text-muted-foreground">CQC Schedule 3</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className="h-full rounded-full bg-emerald-600 transition-all"
            style={{
              width: `${required.length ? (done / required.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {candidate.checks.map((c) => (
          <li
            key={c.id}
            id={`check-${c.id}`}
            className="flex scroll-mt-24 flex-wrap items-center justify-between gap-3 px-3 py-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {c.status === "VERIFIED" ? (
                  <CheckCircle2
                    className="h-4 w-4 text-emerald-600"
                    aria-hidden
                  />
                ) : c.status === "FAILED" ? (
                  <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden />
                ) : (
                  <ShieldCheck
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden
                  />
                )}
                {c.label}
                {!c.required ? (
                  <Badge
                    variant="outline"
                    className="font-normal text-muted-foreground"
                  >
                    Optional
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {[
                  c.referenceNumber,
                  c.provider,
                  c.status === "REQUESTED" && c.requestedAt
                    ? `requested ${formatDate(c.requestedAt)}`
                    : null,
                  c.expiryDate ? `expires ${formatDate(c.expiryDate)}` : null,
                  c.verifiedAt
                    ? `verified ${formatDate(c.verifiedAt)}${c.verifiedByName ? ` by ${c.verifiedByName}` : ""}`
                    : null,
                  c.documents.length
                    ? `${c.documents.length} file${c.documents.length > 1 ? "s" : ""}`
                    : null,
                  (c.status === "FAILED" || c.status === "NOT_REQUIRED") &&
                  c.notes
                    ? c.notes
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Nothing recorded yet"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("font-normal", statusTone(c.status))}
              >
                {CHECK_STATUS_LABELS[c.status]}
              </Badge>
              {editable ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(c)}
                >
                  Update
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {candidate.stage === "VETTING" &&
      candidate.clearanceBlockers.length > 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Before clearing to start
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-amber-800 dark:text-amber-300">
            {candidate.clearanceBlockers.map((b) => (
              <li key={b.message}>
                {linkable(b) ? (
                  <button
                    type="button"
                    onClick={() => goTo(b)}
                    className="inline-flex items-center gap-1 text-left font-medium underline decoration-amber-500/50 underline-offset-2 hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {b.message}
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  </button>
                ) : (
                  b.message
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {editing ? (
        <CheckDialog
          key={editing.id}
          candidate={candidate}
          check={candidate.checks.find((c) => c.id === editing.id) ?? editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      ) : null}
    </>
  );
}
