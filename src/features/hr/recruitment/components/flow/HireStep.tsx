import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import type { CandidateDetail } from "@/features/hr/recruitment/api/recruitment.api";
import { useConvertCandidate } from "@/features/hr/recruitment/hooks/useRecruitment";
import {
  formatDate,
  formatDateTime,
  toDateInput,
} from "@/features/hr/recruitment/utils/recruitment-display.util";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { toastApiError, toastSuccess, toastWarning } from "@/shared/lib/toast";
import { Detail, Field } from "./flow-ui";

export function HireStep({
  candidate,
  canConvert,
}: {
  candidate: CandidateDetail;
  canConvert: boolean;
}) {
  const navigate = useNavigate();
  const convert = useConvertCandidate(candidate.id);
  const [startDate, setStartDate] = React.useState(
    toDateInput(candidate.offerStartDate),
  );
  const hired = !!candidate.convertedEmployeeId;
  // The candidate's email is already on another employee's record: the new record needs its own.
  const clash = candidate.emailUsedByEmployee;
  const [email, setEmail] = React.useState("");
  const emailOk = !clash || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function handleHire() {
    try {
      const result = await convert.mutateAsync({
        startDate: startDate || undefined,
        email: clash ? email.trim() : undefined,
      });
      const copied = [
        result.checksCopied.length
          ? `Copied to compliance: ${result.checksCopied.join(", ")}.`
          : null,
        result.documentsCopied
          ? `${result.documentsCopied} document${result.documentsCopied === 1 ? "" : "s"} (CV, ID, …) added to HR documents.`
          : null,
      ].filter(Boolean);
      toastSuccess(
        "Employee record created",
        copied.length ? copied.join(" ") : undefined,
      );
      if (result.checksNotCopied.length) {
        toastWarning(
          "Some checks need adding on the employee record",
          `${result.checksNotCopied.join(", ")} — no matching compliance type in Settings.`,
        );
      }
      await navigate({
        to: "/hr/employees/$employeeId",
        params: { employeeId: result.employeeId },
      });
    } catch (err) {
      toastApiError(err, "Could not create the employee record");
    }
  }

  return (
    <>
      <dl className="grid gap-3 sm:grid-cols-3">
        <Detail label="Cleared on">
          {formatDateTime(candidate.clearedAt)}
        </Detail>
        <Detail label="Signed off by">{candidate.clearedByName}</Detail>
        <Detail label="Proposed start date">
          {formatDate(candidate.offerStartDate)}
        </Detail>
        {candidate.clearanceNotes ? (
          <div className="sm:col-span-3">
            <Detail label="Sign-off notes">
              <span className="whitespace-pre-wrap">
                {candidate.clearanceNotes}
              </span>
            </Detail>
          </div>
        ) : null}
      </dl>

      {hired ? (
        <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <p className="font-medium">
            Hired on {formatDate(candidate.convertedAt)}.
          </p>
          <p className="text-muted-foreground">
            Verified checks were copied to the employee&apos;s compliance
            record. Carry on with induction, the Care Certificate and the
            probation review on the employee record.
          </p>
          <Link
            to="/hr/employees/$employeeId"
            params={{ employeeId: candidate.convertedEmployeeId! }}
            className="inline-block text-primary hover:underline"
          >
            Open the employee record
          </Link>
        </div>
      ) : canConvert ? (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">Hire</p>
            <p className="text-xs text-muted-foreground">
              Creates the employee record with the job, location and manager
              from the vacancy. Verified checks and their files are copied to
              compliance, and the probation review is scheduled from the start
              date.
            </p>
          </div>
          {clash ? (
            <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              <p className="text-amber-800 dark:text-amber-300">
                {candidate.email} is already used by employee{" "}
                <Link
                  to="/hr/employees/$employeeId"
                  params={{ employeeId: clash.employeeId }}
                  className="font-medium underline underline-offset-2"
                >
                  {clash.name}
                </Link>
                . Each employee needs their own email, so enter a different one
                for this employee record. Nothing you have filled in is lost.
              </p>
              <Field label="Email for the employee record" htmlFor="hire-email" className="max-w-sm">
                <Input
                  id="hire-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </Field>
            </div>
          ) : null}
          <div className="flex flex-wrap items-end gap-3">
            <Field
              label="First day of work"
              htmlFor="hire-start"
              className="w-48"
            >
              <Input
                id="hire-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>
            <Button
              type="button"
              onClick={() => void handleHire()}
              disabled={convert.isPending || !candidate.dataProcessingConsent || !emailOk}
            >
              <UserPlus className="h-4 w-4" />
              {convert.isPending ? "Creating…" : "Create employee record"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Waiting for someone with hiring permission to create the employee
          record.
        </p>
      )}
    </>
  );
}
