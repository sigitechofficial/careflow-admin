import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
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
                  <Input
                    id="ck-issue"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </Field>
                <Field label="Expiry date" htmlFor="ck-expiry">
                  <Input
                    id="ck-expiry"
                    type="date"
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
  const clear = useCandidateFlowAction(candidate.id, (notes?: string) =>
    candidateFlowApi.clear(candidate.id, notes),
  );
  const [confirmed, setConfirmed] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  React.useEffect(() => {
    if (open) {
      setConfirmed(false);
      setNotes("");
    }
  }, [open]);

  async function handleConfirm() {
    try {
      await clear.mutateAsync(notes.trim() || undefined);
      toastSuccess("Cleared to start");
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
          <Field label="Notes (optional)" htmlFor="clear-notes">
            <Textarea
              id="clear-notes"
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
