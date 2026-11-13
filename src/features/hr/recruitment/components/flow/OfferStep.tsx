import * as React from "react";
import { Mail, MailWarning, Pencil, Send } from "lucide-react";
import {
  candidateFlowApi,
  type CandidateDetail,
  type OfferPayload,
} from "@/features/hr/recruitment/api/recruitment.api";
import { useCandidateFlowAction } from "@/features/hr/recruitment/hooks/useRecruitment";
import {
  formatDate,
  formatDateTime,
  toDateInput,
} from "@/features/hr/recruitment/utils/recruitment-display.util";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { toastApiError, toastSuccess } from "@/shared/lib/toast";
import { Detail, Field, Textarea } from "./flow-ui";

/** Make or change the conditional offer. From the interview step this moves the candidate to the offer step. */
export function OfferDialog({
  candidate,
  open,
  onOpenChange,
}: {
  candidate: CandidateDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useCandidateFlowAction(candidate.id, (p: OfferPayload) =>
    candidateFlowApi.saveOffer(candidate.id, p),
  );
  const [startDate, setStartDate] = React.useState("");
  const [hours, setHours] = React.useState("");
  const [pay, setPay] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [notify, setNotify] = React.useState(true);
  const hasEmail = !!candidate.email;
  const changing = !!candidate.offerSentAt && candidate.stage === "OFFER";

  React.useEffect(() => {
    if (!open) return;
    setStartDate(toDateInput(candidate.offerStartDate));
    setHours(candidate.offerHoursPerWeek ?? "");
    setPay(candidate.offerPayRate ?? "");
    setNotes(candidate.offerNotes ?? "");
    setNotify(true);
  }, [open, candidate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) return;
    try {
      await save.mutateAsync({
        startDate,
        hoursPerWeek: hours.trim() || undefined,
        payRate: pay.trim() || undefined,
        notes: notes.trim() || undefined,
        notifyCandidate: hasEmail && notify,
      });
      toastSuccess(
        "Conditional offer saved",
        hasEmail && notify
          ? `The offer is being emailed to ${candidate.email}.`
          : undefined,
      );
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Could not save the offer");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {candidate.offerSentAt
              ? "Change conditional offer"
              : "Make conditional offer"}
          </DialogTitle>
          <DialogDescription>
            The offer depends on satisfactory pre-employment checks (DBS,
            references, right to work). The email tells the candidate this.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogBody className="space-y-4">
            <Field label="Proposed start date" htmlFor="of-start">
              <Input
                id="of-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Hours per week" htmlFor="of-hours">
                <Input
                  id="of-hours"
                  placeholder="e.g. 30 or Zero hours"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </Field>
              <Field label="Pay rate" htmlFor="of-pay">
                <Input
                  id="of-pay"
                  placeholder="e.g. £12.60 / hour"
                  value={pay}
                  onChange={(e) => setPay(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Notes (staff only, not emailed)" htmlFor="of-notes">
              <Textarea
                id="of-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            <EmailCheckbox
              checked={hasEmail && notify}
              disabled={!hasEmail}
              onChange={setNotify}
              title={
                changing
                  ? "Email the new offer details to the candidate"
                  : "Email the offer to the candidate"
              }
              hint={
                hasEmail
                  ? `To ${candidate.email}. Includes the start date, hours and pay, and asks them to reply.`
                  : "No email address for this candidate — add one on the Application step."
              }
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || !startDate}>
              {save.isPending ? "Saving…" : "Save offer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A checkbox asking whether to email the candidate. */
export function EmailCheckbox({
  checked,
  disabled,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={
        "flex items-start gap-2.5 rounded-lg border border-border p-3 text-sm " +
        (disabled ? "opacity-70" : "bg-muted/20")
      }
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border border-input"
      />
      <span>
        <span className="flex items-center gap-1.5 font-medium">
          <Mail className="h-3.5 w-3.5" aria-hidden /> {title}
        </span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}

/** Whether the current offer was emailed, with a way to send it again while it waits for a reply. */
function OfferEmailStatus({
  candidate,
  canSend,
}: {
  candidate: CandidateDetail;
  canSend: boolean;
}) {
  const send = useCandidateFlowAction(candidate.id, () =>
    candidateFlowApi.emailOffer(candidate.id),
  );
  const waiting = candidate.offerStatus === "SENT";

  async function handleSend() {
    try {
      await send.mutateAsync(undefined);
      toastSuccess("Offer emailed", `Sent to ${candidate.email}.`);
    } catch (err) {
      toastApiError(err, "Could not email the candidate");
    }
  }

  if (!candidate.email) {
    return waiting ? (
      <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
        <MailWarning className="h-3.5 w-3.5" aria-hidden /> Not emailed — no
        email address on file
      </p>
    ) : null;
  }

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {candidate.offerEmailedAt ? (
        <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
          <Mail className="h-3.5 w-3.5" aria-hidden /> Offer emailed{" "}
          {formatDateTime(candidate.offerEmailedAt)}
        </span>
      ) : waiting ? (
        <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
          <MailWarning className="h-3.5 w-3.5" aria-hidden /> These offer
          details have not been emailed
        </span>
      ) : null}
      {canSend && waiting ? (
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={send.isPending}
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline disabled:opacity-60"
        >
          <Send className="h-3 w-3" aria-hidden />
          {send.isPending
            ? "Sending…"
            : candidate.offerEmailedAt
              ? "Resend"
              : "Email now"}
        </button>
      ) : null}
    </p>
  );
}

/** Record the candidate's answer to the offer: accepted starts the checks, declined closes the application. */
export function OfferResponseDialog({
  candidate,
  accepted,
  onOpenChange,
}: {
  candidate: CandidateDetail;
  accepted: boolean | null;
  onOpenChange: (open: boolean) => void;
}) {
  const respond = useCandidateFlowAction(
    candidate.id,
    (p: { accepted: boolean; notes?: string }) =>
      candidateFlowApi.respondToOffer(candidate.id, p.accepted, p.notes),
  );
  const [notes, setNotes] = React.useState("");
  React.useEffect(() => setNotes(""), [accepted]);

  async function handleConfirm() {
    if (accepted === null) return;
    try {
      await respond.mutateAsync({ accepted, notes: notes.trim() || undefined });
      toastSuccess(
        accepted
          ? "Offer accepted — pre-employment checks are ready"
          : "Offer declined",
      );
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Could not record the reply");
    }
  }

  return (
    <Dialog open={accepted !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {accepted
              ? "Candidate accepted the offer"
              : "Candidate declined the offer"}
          </DialogTitle>
          <DialogDescription>
            {accepted
              ? "The pre-employment checks list is created next: ID, right to work, DBS, references and health declaration."
              : "The application is closed as withdrawn. You can reopen it later if needed."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Field
            label={accepted ? "Notes (optional)" : "Reason (optional)"}
            htmlFor="of-reply-notes"
          >
            <Textarea
              id="of-reply-notes"
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
            variant={accepted ? "default" : "destructive"}
            disabled={respond.isPending}
            onClick={() => void handleConfirm()}
          >
            {respond.isPending
              ? "Saving…"
              : accepted
                ? "Confirm accepted"
                : "Confirm declined"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OfferStep({
  candidate,
  canEdit,
}: {
  candidate: CandidateDetail;
  canEdit: boolean;
}) {
  const [editOpen, setEditOpen] = React.useState(false);
  const editable = canEdit && candidate.stage === "OFFER";

  if (!candidate.offerSentAt) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        No offer made yet.
      </p>
    );
  }

  const reply =
    candidate.offerStatus === "ACCEPTED"
      ? `Accepted on ${formatDate(candidate.offerRespondedAt)}`
      : candidate.offerStatus === "DECLINED"
        ? `Declined on ${formatDate(candidate.offerRespondedAt)}`
        : "Waiting for the candidate";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Offer details</h3>
        {editable ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" /> Change offer
          </Button>
        ) : null}
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        <Detail label="Offer made">{formatDate(candidate.offerSentAt)}</Detail>
        <Detail label="Proposed start date">
          {formatDate(candidate.offerStartDate)}
        </Detail>
        <Detail label="Candidate's reply">{reply}</Detail>
        <Detail label="Hours per week">{candidate.offerHoursPerWeek}</Detail>
        <Detail label="Pay rate">{candidate.offerPayRate}</Detail>
        {candidate.offerNotes ? (
          <div className="sm:col-span-3">
            <Detail label="Notes">
              <span className="whitespace-pre-wrap">
                {candidate.offerNotes}
              </span>
            </Detail>
          </div>
        ) : null}
      </dl>
      <OfferEmailStatus candidate={candidate} canSend={editable} />
      <p className="text-xs text-muted-foreground">
        Tip: upload the signed offer letter under Documents (type “Offer
        letter”).
      </p>
      <OfferDialog
        candidate={candidate}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
