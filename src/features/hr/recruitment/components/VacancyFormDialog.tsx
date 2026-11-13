import * as React from "react";
import { useEmployeeLookups } from "@/features/employees/hooks/useEmployees";
import { useHrEmployees } from "@/features/hr/hooks/useHr";
import {
  useCreateVacancy,
  useUpdateVacancy,
} from "@/features/hr/recruitment/hooks/useRecruitment";
import type {
  RecruitmentEmploymentType,
  SalaryPeriod,
  VacancyRow,
} from "@/features/hr/recruitment/api/recruitment.api";
import {
  SALARY_PERIOD_OPTIONS,
  employmentTypeLabel,
  formatClosingDate,
  formatPay,
} from "@/features/hr/recruitment/utils/recruitment-display.util";
import { toastApiError, toastSuccess } from "@/shared/lib/toast";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
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

const NONE = "__none__";

const fieldClass = "flex flex-col gap-1.5";
const labelClass = "block text-sm font-medium leading-none text-foreground";

const textareaClass = cn(
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "shadow-sm placeholder:text-muted-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

/** Create a vacancy, or edit one when `vacancy` is given. */
export function VacancyFormDialog({
  open,
  onOpenChange,
  vacancy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacancy?: VacancyRow | null;
}) {
  const lookupsQuery = useEmployeeLookups(open);
  // The API allows at most 100 per page (PaginationQueryDto); asking for more fails with 400.
  const managersQuery = useHrEmployees({ page: 1, limit: 100 }, open);
  const createMutation = useCreateVacancy();
  const updateMutation = useUpdateVacancy(vacancy?.id ?? "");
  const editing = !!vacancy;
  const saving = createMutation.isPending || updateMutation.isPending;

  const [title, setTitle] = React.useState("");
  const [jobTitleId, setJobTitleId] = React.useState("");
  const [locationId, setLocationId] = React.useState("");
  const [employmentType, setEmploymentType] =
    React.useState<RecruitmentEmploymentType>("PERMANENT");
  const [salaryRange, setSalaryRange] = React.useState("");
  const [salaryPeriod, setSalaryPeriod] = React.useState<SalaryPeriod | "">("");
  const [closingDate, setClosingDate] = React.useState("");
  const [numberOfPositions, setNumberOfPositions] = React.useState("1");
  const [hiringManagerId, setHiringManagerId] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [requirements, setRequirements] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    // Opening: start from the vacancy being edited, or from a blank form.
    setTitle(vacancy?.title ?? "");
    setJobTitleId(vacancy?.jobTitleId ?? "");
    setLocationId(vacancy?.locationId ?? "");
    setEmploymentType(vacancy?.employmentType ?? "PERMANENT");
    setSalaryRange(vacancy?.salaryRange ?? "");
    setSalaryPeriod(vacancy?.salaryPeriod ?? "");
    setClosingDate(vacancy?.closingDate ?? "");
    setNumberOfPositions(String(vacancy?.numberOfPositions ?? 1));
    setHiringManagerId(vacancy?.hiringManagerId ?? "");
    setDescription(vacancy?.description ?? "");
    setRequirements(vacancy?.requirements ?? "");
  }, [open, vacancy]);

  const today = new Date().toISOString().slice(0, 10);
  const payPreview = formatPay(salaryRange, salaryPeriod || null);

  const lookups = lookupsQuery.data;
  const managers = managersQuery.data?.data ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      employmentType,
      jobTitleId: jobTitleId || undefined,
      locationId: locationId || undefined,
      salaryRange: salaryRange.trim() || undefined,
      salaryPeriod: salaryPeriod || null,
      closingDate: closingDate || null,
      numberOfPositions: Number(numberOfPositions) || 1,
      hiringManagerId: hiringManagerId || undefined,
      description: description.trim() || undefined,
      requirements: requirements.trim() || undefined,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync(payload);
        toastSuccess("Vacancy updated");
      } else {
        await createMutation.mutateAsync(payload);
        toastSuccess("Vacancy created");
      }
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, editing ? "Could not update the vacancy" : "Could not create the vacancy");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${vacancy?.vacancyReference}` : "Create vacancy"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogBody className="space-y-5">
            <div className={fieldClass}>
              <label htmlFor="vacancy-title" className={labelClass}>
                Title
              </label>
              <Input
                id="vacancy-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className={fieldClass}>
                <label className={labelClass}>Job title<span className="font-normal text-muted-foreground"> (optional)</span></label>
                <Select
                  value={jobTitleId || undefined}
                  onValueChange={(v) => setJobTitleId(v === NONE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select job title" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value={NONE}>None</SelectItem>
                    {(lookups?.jobTitles ?? []).map((jt) => (
                      <SelectItem key={jt.id} value={jt.id}>
                        {jt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={fieldClass}>
                <label className={labelClass}>Location<span className="font-normal text-muted-foreground"> (optional)</span></label>
                <Select
                  value={locationId || undefined}
                  onValueChange={(v) => setLocationId(v === NONE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value={NONE}>None</SelectItem>
                    {(lookups?.locations ?? []).map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className={fieldClass}>
                <label className={labelClass}>Employment type</label>
                <Select
                  value={employmentType}
                  onValueChange={(v) =>
                    setEmploymentType(v as RecruitmentEmploymentType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {EMPLOYMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {employmentTypeLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={fieldClass}>
                <label htmlFor="vacancy-positions" className={labelClass}>
                  Positions
                </label>
                <Input
                  id="vacancy-positions"
                  type="number"
                  min={1}
                  value={numberOfPositions}
                  onChange={(e) => setNumberOfPositions(e.target.value)}
                />
              </div>
            </div>

            <div className={fieldClass}>
              <label htmlFor="vacancy-salary" className={labelClass}>
                Pay
                <span className="font-normal text-muted-foreground"> (optional)</span>
              </label>
              <div className="grid grid-cols-[1fr_150px] gap-2">
                <Input
                  id="vacancy-salary"
                  value={salaryRange}
                  onChange={(e) => setSalaryRange(e.target.value)}
                  placeholder="e.g. 12.60 – 13.50 or 2,500"
                />
                <Select
                  value={salaryPeriod || undefined}
                  onValueChange={(v) => setSalaryPeriod(v === NONE ? "" : (v as SalaryPeriod))}
                >
                  <SelectTrigger aria-label="Pay period">
                    <SelectValue placeholder="per…" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value={NONE}>No period</SelectItem>
                    {SALARY_PERIOD_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                {payPreview ? (
                  <>
                    Careers page shows: <span className="font-medium text-foreground">{payPreview}</span>
                  </>
                ) : (
                  "Shown on the careers page with the period, e.g. £2,500 per month."
                )}
              </p>
            </div>

            <div className={fieldClass}>
              <label htmlFor="vacancy-closing" className={labelClass}>
                Closing date
                <span className="font-normal text-muted-foreground"> (optional)</span>
              </label>
              <Input
                id="vacancy-closing"
                type="date"
                min={editing ? undefined : today}
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                className="sm:w-56"
              />
              <p className="text-xs text-muted-foreground">
                {closingDate
                  ? `People can apply until the end of ${formatClosingDate(closingDate)}. After that the job leaves the careers page.`
                  : "Last day to apply. Leave empty to keep taking applications until you close the vacancy."}
              </p>
            </div>

            <div className={fieldClass}>
              <label className={labelClass}>Hiring manager<span className="font-normal text-muted-foreground"> (optional)</span></label>
              <Select
                value={hiringManagerId || undefined}
                onValueChange={(v) => setHiringManagerId(v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      managersQuery.isLoading
                        ? "Loading…"
                        : managersQuery.isError
                          ? "Unable to load managers"
                          : "Select hiring manager"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="z-[100] max-h-64">
                  <SelectItem value={NONE}>None</SelectItem>
                  {managers.map((emp) => (
                    <SelectItem key={emp.employeeId} value={emp.employeeId}>
                      {emp.name}
                      {emp.jobTitle ? ` — ${emp.jobTitle}` : ""}
                    </SelectItem>
                  ))}
                  {!managersQuery.isLoading && managers.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      No employees found
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
              {managersQuery.isError ? (
                <p className="text-xs text-destructive">
                  Could not load hiring managers. Check you have HR employee
                  access.
                </p>
              ) : null}
            </div>

            <div className={fieldClass}>
              <label htmlFor="vacancy-description" className={labelClass}>
                Description
              </label>
              <textarea
                id="vacancy-description"
                className={textareaClass}
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDescription(e.target.value)
                }
                rows={3}
              />
            </div>

            <div className={fieldClass}>
              <label htmlFor="vacancy-requirements" className={labelClass}>
                Requirements
              </label>
              <textarea
                id="vacancy-requirements"
                className={textareaClass}
                value={requirements}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setRequirements(e.target.value)
                }
                rows={3}
              />
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
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create vacancy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
