import * as React from "react";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import {
  candidateFlowApi,
  type CandidateDetail,
  type EmploymentHistoryEntry,
} from "@/features/hr/recruitment/api/recruitment.api";
import { useCandidateFlowAction } from "@/features/hr/recruitment/hooks/useRecruitment";
import { scrollToAndFlash } from "./flow-ui";
import {
  candidateSourceLabel,
  formatDate,
  formatMonth,
  toDateInput,
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
import { toastApiError, toastError, toastSuccess } from "@/shared/lib/toast";
import { Detail, Field, Textarea } from "./flow-ui";

function EditDetailsDialog({
  candidate,
  open,
  onOpenChange,
}: {
  candidate: CandidateDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useCandidateFlowAction(
    candidate.id,
    (p: Parameters<typeof candidateFlowApi.updateProfile>[1]) =>
      candidateFlowApi.updateProfile(candidate.id, p),
  );
  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    consent: false,
  });

  React.useEffect(() => {
    if (!open) return;
    setForm({
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email ?? "",
      phone: candidate.phone ?? "",
      dateOfBirth: toDateInput(candidate.dateOfBirth),
      address: candidate.address ?? "",
      consent: candidate.dataProcessingConsent,
    });
  }, [open, candidate]);

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save.mutateAsync({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        address: form.address.trim() || undefined,
        dataProcessingConsent: form.consent,
      });
      toastSuccess("Details saved");
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Could not save the details");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit candidate details</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" htmlFor="cd-first">
                <Input
                  id="cd-first"
                  value={form.firstName}
                  onChange={set("firstName")}
                  required
                />
              </Field>
              <Field label="Last name" htmlFor="cd-last">
                <Input
                  id="cd-last"
                  value={form.lastName}
                  onChange={set("lastName")}
                  required
                />
              </Field>
              <Field label="Email" htmlFor="cd-email">
                <Input
                  id="cd-email"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                />
              </Field>
              <Field label="Phone" htmlFor="cd-phone">
                <Input
                  id="cd-phone"
                  value={form.phone}
                  onChange={set("phone")}
                />
              </Field>
              <Field label="Date of birth" htmlFor="cd-dob">
                <Input
                  id="cd-dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={set("dateOfBirth")}
                />
              </Field>
            </div>
            <Field label="Address" htmlFor="cd-address">
              <Textarea
                id="cd-address"
                rows={2}
                value={form.address}
                onChange={set("address")}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, consent: e.target.checked }))
                }
                className="h-4 w-4 rounded border border-input"
              />
              Data processing consent received
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
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const emptyJob = (): EmploymentHistoryEntry => ({
  kind: "JOB",
  from: "",
  to: "",
  employer: "",
  jobTitle: "",
  reasonForLeaving: "",
  careRole: false,
});

function EmploymentHistoryEditor({
  candidate,
  canEdit,
  focusKey,
}: {
  candidate: CandidateDetail;
  canEdit: boolean;
  /** Changes when a "Before clearing to start" item points here. */
  focusKey?: number;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const save = useCandidateFlowAction(
    candidate.id,
    (entries: EmploymentHistoryEntry[]) =>
      candidateFlowApi.saveEmploymentHistory(candidate.id, entries),
  );
  const [editing, setEditing] = React.useState(false);
  const [rows, setRows] = React.useState<EmploymentHistoryEntry[]>([]);

  function startEditing(extra?: EmploymentHistoryEntry) {
    const current = candidate.employmentHistory.map((e) => ({ ...e }));
    setRows(
      extra ? [...current, extra] : current.length ? current : [emptyJob()],
    );
    setEditing(true);
  }

  function update(idx: number, patch: Partial<EmploymentHistoryEntry>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    const missingEnd = rows.findIndex((r) => r.to === "");
    if (missingEnd >= 0) {
      toastError(
        "Employment history is incomplete",
        `Row ${missingEnd + 1}: add the end month, or tick "still ongoing".`,
      );
      return;
    }
    try {
      await save.mutateAsync(rows);
      toastSuccess("Employment history saved");
      setEditing(false);
    } catch (err) {
      toastApiError(err, "Could not save the employment history");
    }
  }

  const history = candidate.employmentHistory;

  React.useEffect(() => {
    if (!focusKey) return;
    scrollToAndFlash(rootRef.current);
    // Nothing recorded yet: open the editor straight away.
    if (canEdit && candidate.employmentHistory.length === 0) startEditing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  return (
    <div ref={rootRef} className="scroll-mt-24 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Employment history</h3>
          <p className="text-xs text-muted-foreground">
            Every job since leaving education. Any month not covered by a job
            needs an explanation (CQC).
          </p>
        </div>
        {canEdit && !editing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => startEditing()}
          >
            <Pencil className="h-3.5 w-3.5" />{" "}
            {history.length ? "Edit history" : "Add history"}
          </Button>
        ) : null}
      </div>

      {!editing && candidate.unexplainedGaps.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          {candidate.unexplainedGaps.map((gap) => (
            <div
              key={`${gap.from}-${gap.to}`}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                Gap not explained: {formatMonth(gap.from)} –{" "}
                {formatMonth(gap.to)}
              </span>
              {canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    startEditing({
                      kind: "GAP",
                      from: gap.from,
                      to: gap.to,
                      explanation: "",
                    })
                  }
                >
                  Explain gap
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {!editing ? (
        history.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No employment history yet.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {history.map((e, i) => (
              <li
                key={i}
                className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  {e.kind === "JOB" ? (
                    <>
                      <div className="font-medium">
                        {e.jobTitle ? `${e.jobTitle} · ` : ""}
                        {e.employer}
                        {e.careRole ? (
                          <Badge variant="outline" className="ml-2 font-normal">
                            Care role
                          </Badge>
                        ) : null}
                      </div>
                      {e.reasonForLeaving ? (
                        <p className="text-xs text-muted-foreground">
                          Left: {e.reasonForLeaving}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-muted-foreground">
                        Not working
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {e.explanation}
                      </p>
                    </>
                  )}
                </div>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatMonth(e.from)} – {formatMonth(e.to)}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div
              key={i}
              className="space-y-3 rounded-lg border border-border p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex overflow-hidden rounded-md border border-input text-xs">
                  {(["JOB", "GAP"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => update(i, { kind: k })}
                      className={
                        r.kind === k
                          ? "bg-primary px-3 py-1 text-primary-foreground"
                          : "px-3 py-1 hover:bg-muted"
                      }
                    >
                      {k === "JOB" ? "Job" : "Gap (not working)"}
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove row ${i + 1}`}
                  onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="From" htmlFor={`eh-from-${i}`}>
                  <Input
                    id={`eh-from-${i}`}
                    type="month"
                    value={r.from}
                    onChange={(e) => update(i, { from: e.target.value })}
                  />
                </Field>
                <Field label="To" htmlFor={`eh-to-${i}`}>
                  <Input
                    id={`eh-to-${i}`}
                    type="month"
                    value={r.to ?? ""}
                    disabled={r.to === null}
                    onChange={(e) => update(i, { to: e.target.value })}
                  />
                </Field>
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={r.to === null}
                    onChange={(e) =>
                      update(i, { to: e.target.checked ? null : "" })
                    }
                    className="h-4 w-4 rounded border border-input"
                  />
                  {r.kind === "JOB" ? "Still works here" : "Still ongoing"}
                </label>
              </div>
              {r.kind === "JOB" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Employer" htmlFor={`eh-employer-${i}`}>
                    <Input
                      id={`eh-employer-${i}`}
                      value={r.employer ?? ""}
                      onChange={(e) => update(i, { employer: e.target.value })}
                    />
                  </Field>
                  <Field label="Job title" htmlFor={`eh-title-${i}`}>
                    <Input
                      id={`eh-title-${i}`}
                      value={r.jobTitle ?? ""}
                      onChange={(e) => update(i, { jobTitle: e.target.value })}
                    />
                  </Field>
                  <Field label="Reason for leaving" htmlFor={`eh-reason-${i}`}>
                    <Input
                      id={`eh-reason-${i}`}
                      value={r.reasonForLeaving ?? ""}
                      onChange={(e) =>
                        update(i, { reasonForLeaving: e.target.value })
                      }
                    />
                  </Field>
                  <label className="flex items-end gap-2 pb-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!r.careRole}
                      onChange={(e) =>
                        update(i, { careRole: e.target.checked })
                      }
                      className="h-4 w-4 rounded border border-input"
                    />
                    Care or support work (with children or vulnerable adults)
                  </label>
                </div>
              ) : (
                <Field
                  label="What was the candidate doing?"
                  htmlFor={`eh-expl-${i}`}
                  hint="For example: caring for family, studying, travelling, looking for work."
                >
                  <Input
                    id={`eh-expl-${i}`}
                    value={r.explanation ?? ""}
                    onChange={(e) => update(i, { explanation: e.target.value })}
                  />
                </Field>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRows((rs) => [...rs, emptyJob()])}
              >
                <Plus className="h-3.5 w-3.5" /> Add job
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setRows((rs) => [
                    ...rs,
                    { kind: "GAP", from: "", to: "", explanation: "" },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add gap
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSave()}
                disabled={save.isPending}
              >
                {save.isPending ? "Saving…" : "Save history"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ApplicationStep({
  candidate,
  canEdit,
  focus,
}: {
  candidate: CandidateDetail;
  canEdit: boolean;
  /** Set when a "Before clearing to start" item sends the user here. */
  focus?: { target: "CONSENT" | "EMPLOYMENT_HISTORY"; key: number } | null;
}) {
  const [editOpen, setEditOpen] = React.useState(false);
  const detailsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (focus?.target !== "CONSENT") return;
    scrollToAndFlash(detailsRef.current);
    // Consent is recorded in Edit details.
    if (canEdit) setEditOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key]);
  return (
    <>
      <div ref={detailsRef} className="scroll-mt-24 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Candidate details</h3>
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit details
            </Button>
          ) : null}
        </div>
        <dl className="grid gap-3 sm:grid-cols-3">
          <Detail label="Email">{candidate.email}</Detail>
          <Detail label="Phone">{candidate.phone}</Detail>
          <Detail label="Date of birth">
            {candidate.dateOfBirth ? formatDate(candidate.dateOfBirth) : null}
          </Detail>
          <Detail label="Source">
            {candidateSourceLabel(candidate.source)}
          </Detail>
          <Detail label="Applied">{formatDate(candidate.createdAt)}</Detail>
          <Detail label="Data consent">
            {candidate.dataProcessingConsent ? (
              "Yes"
            ) : (
              <span className="text-amber-700 dark:text-amber-300">
                Not recorded
              </span>
            )}
          </Detail>
          <div className="sm:col-span-3">
            <Detail label="Address">{candidate.address}</Detail>
          </div>
          {candidate.coverLetter ? (
            <div className="sm:col-span-3">
              <Detail label="Cover letter">
                <span className="whitespace-pre-wrap">
                  {candidate.coverLetter}
                </span>
              </Detail>
            </div>
          ) : null}
        </dl>
      </div>
      <EmploymentHistoryEditor
        candidate={candidate}
        canEdit={canEdit}
        focusKey={focus?.target === "EMPLOYMENT_HISTORY" ? focus.key : undefined}
      />
      <EditDetailsDialog
        candidate={candidate}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
