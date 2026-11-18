import * as React from "react";
import type {
  CandidateDetail,
  CandidateStage,
} from "@/features/hr/recruitment/api/recruitment.api";
import { useUpdateCandidateStage } from "@/features/hr/recruitment/hooks/useRecruitment";
import { candidateStageLabel } from "@/features/hr/recruitment/utils/recruitment-display.util";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/utils";
import { toastApiError, toastSuccess } from "@/shared/lib/toast";
import { Field, Textarea } from "./flow-ui";
import { EmailCheckbox } from "./OfferStep";

/** Reject the candidate, or record that they withdrew. A reason is required. */
export function CloseApplicationDialog({
  candidate,
  open,
  onOpenChange,
}: {
  candidate: CandidateDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const move = useUpdateCandidateStage(candidate.id);
  const [outcome, setOutcome] = React.useState<"REJECTED" | "WITHDRAWN">(
    "REJECTED",
  );
  const [reason, setReason] = React.useState("");
  const [notify, setNotify] = React.useState(true);
  const hasEmail = !!candidate.email;
  React.useEffect(() => {
    if (open) {
      setOutcome("REJECTED");
      setReason("");
      setNotify(true);
    }
  }, [open]);

  async function handleConfirm() {
    const emailing = outcome === "REJECTED" && hasEmail && notify;
    try {
      await move.mutateAsync({
        stage: outcome,
        notes: reason.trim(),
        notifyCandidate: emailing,
      });
      toastSuccess(
        outcome === "REJECTED" ? "Candidate rejected" : "Marked as withdrawn",
        emailing
          ? `A polite "not successful" email is being sent to ${candidate.email}.`
          : undefined,
      );
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Could not close the application");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close this application</DialogTitle>
          <DialogDescription>
            It can be reopened later at the same step.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="inline-flex overflow-hidden rounded-md border border-input text-sm">
            {(["REJECTED", "WITHDRAWN"] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOutcome(o)}
                className={cn(
                  "px-3 py-1.5",
                  outcome === o
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {o === "REJECTED" ? "We rejected them" : "They withdrew"}
              </button>
            ))}
          </div>
          <Field label="Reason (staff only, not emailed)" htmlFor="close-reason">
            <Textarea
              id="close-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </Field>
          {outcome === "REJECTED" ? (
            <EmailCheckbox
              checked={hasEmail && notify}
              disabled={!hasEmail}
              onChange={setNotify}
              title="Email the candidate that they were not successful"
              hint={
                hasEmail
                  ? `To ${candidate.email}. A short, polite email — the reason above is not included.`
                  : "No email address for this candidate."
              }
            />
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
            variant="destructive"
            disabled={!reason.trim() || move.isPending}
            onClick={() => void handleConfirm()}
          >
            {move.isPending ? "Saving…" : "Close application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Confirm a plain stage move (one step back, start screening, reopen). */
export function ConfirmMoveDialog({
  candidate,
  to,
  title,
  description,
  confirmLabel,
  onOpenChange,
}: {
  candidate: CandidateDetail;
  to: CandidateStage | null;
  title: string;
  description: string;
  confirmLabel: string;
  onOpenChange: (open: boolean) => void;
}) {
  const move = useUpdateCandidateStage(candidate.id);

  async function handleConfirm() {
    if (!to) return;
    try {
      await move.mutateAsync({ stage: to });
      toastSuccess(`Moved to ${candidateStageLabel(to)}`);
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Could not move the candidate");
    }
  }

  return (
    <Dialog open={to !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
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
            disabled={move.isPending}
            onClick={() => void handleConfirm()}
          >
            {move.isPending ? "Saving…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
