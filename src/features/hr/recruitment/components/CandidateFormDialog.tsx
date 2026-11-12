import * as React from "react";
import {
  useVacancies,
  useCreateCandidate,
} from "@/features/hr/recruitment/hooks/useRecruitment";
import type { CandidateSource } from "@/features/hr/recruitment/api/recruitment.api";
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

const SOURCES: CandidateSource[] = [
  "WEBSITE",
  "REFERRAL",
  "AGENCY",
  "INTERNAL",
  "MANUAL",
];

const textareaClass = cn(
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "shadow-sm placeholder:text-muted-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

export function CandidateFormDialog({
  open,
  onOpenChange,
  defaultVacancyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultVacancyId?: string;
}) {
  const vacanciesQuery = useVacancies(
    { page: 1, limit: 100, status: "OPEN" },
    open,
  );
  const createMutation = useCreateCandidate();

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [vacancyId, setVacancyId] = React.useState(defaultVacancyId ?? "");
  const [source, setSource] = React.useState<CandidateSource>("MANUAL");
  const [coverLetter, setCoverLetter] = React.useState("");
  const [consent, setConsent] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setVacancyId(defaultVacancyId ?? "");
    } else {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setVacancyId("");
      setSource("MANUAL");
      setCoverLetter("");
      setConsent(false);
    }
  }, [open, defaultVacancyId]);

  const vacancies = vacanciesQuery.data?.data ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !vacancyId) return;
    await createMutation.mutateAsync({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      vacancyId,
      source,
      coverLetter: coverLetter.trim() || undefined,
      dataProcessingConsent: consent,
      consentDate: consent ? new Date().toISOString() : undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add candidate</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="candidate-first-name"
                  className="text-sm font-medium"
                >
                  First name
                </label>
                <Input
                  id="candidate-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="candidate-last-name"
                  className="text-sm font-medium"
                >
                  Last name
                </label>
                <Input
                  id="candidate-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="candidate-email"
                  className="text-sm font-medium"
                >
                  Email
                </label>
                <Input
                  id="candidate-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="candidate-phone"
                  className="text-sm font-medium"
                >
                  Phone
                </label>
                <Input
                  id="candidate-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Vacancy</label>
              <Select value={vacancyId} onValueChange={setVacancyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vacancy" />
                </SelectTrigger>
                <SelectContent>
                  {vacancies.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.vacancyReference} — {v.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Source</label>
              <Select
                value={source}
                onValueChange={(v) => setSource(v as CandidateSource)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="candidate-cover" className="text-sm font-medium">
                Cover letter
              </label>
              <textarea
                id="candidate-cover"
                className={textareaClass}
                value={coverLetter}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setCoverLetter(e.target.value)
                }
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="candidate-consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="h-4 w-4 rounded border border-input"
              />
              <label
                htmlFor="candidate-consent"
                className="text-sm font-normal"
              >
                Data processing consent received
              </label>
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
              disabled={createMutation.isPending || !vacancyId}
            >
              {createMutation.isPending ? "Creating…" : "Add candidate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
