import * as React from "react";
import {
  candidateFlowApi,
  type CandidateDetail,
  type ScreeningPayload,
} from "@/features/hr/recruitment/api/recruitment.api";
import { useCandidateFlowAction } from "@/features/hr/recruitment/hooks/useRecruitment";
import { Button } from "@/shared/ui/button";
import { toastApiError, toastSuccess } from "@/shared/lib/toast";
import { Field, Textarea, YesNo } from "./flow-ui";

type Answers = {
  hasRightToWork: boolean | null;
  needsSponsorship: boolean | null;
  drivesForWork: boolean | null;
  livedOverseas: boolean | null;
  screeningNotes: string;
};

const QUESTIONS: {
  key: Exclude<keyof Answers, "screeningNotes">;
  label: string;
  hint: string;
}[] = [
  {
    key: "hasRightToWork",
    label: "Does the candidate have the right to work in the UK?",
    hint: "Checked properly with documents at the pre-employment checks step.",
  },
  {
    key: "needsSponsorship",
    label: "Will they need visa sponsorship?",
    hint: "Only answer yes if your organisation can sponsor this role.",
  },
  {
    key: "drivesForWork",
    label: "Will they drive for work?",
    hint: "Yes adds a driving licence and business insurance check.",
  },
  {
    key: "livedOverseas",
    label: "Lived or worked abroad for 6 months or more in the last 5 years?",
    hint: "Yes adds an overseas police check.",
  },
];

export function ScreeningStep({
  candidate,
  canEdit,
}: {
  candidate: CandidateDetail;
  canEdit: boolean;
}) {
  const save = useCandidateFlowAction(candidate.id, (p: ScreeningPayload) =>
    candidateFlowApi.updateScreening(candidate.id, p),
  );
  const saved: Answers = React.useMemo(
    () => ({
      hasRightToWork: candidate.hasRightToWork,
      needsSponsorship: candidate.needsSponsorship,
      drivesForWork: candidate.drivesForWork,
      livedOverseas: candidate.livedOverseas,
      screeningNotes: candidate.screeningNotes ?? "",
    }),
    [candidate],
  );
  const [answers, setAnswers] = React.useState<Answers>(saved);
  React.useEffect(() => setAnswers(saved), [saved]);

  const dirty = JSON.stringify(answers) !== JSON.stringify(saved);

  async function handleSave() {
    try {
      await save.mutateAsync({
        hasRightToWork: answers.hasRightToWork,
        needsSponsorship: answers.needsSponsorship,
        drivesForWork: answers.drivesForWork,
        livedOverseas: answers.livedOverseas,
        screeningNotes: answers.screeningNotes.trim(),
      });
      toastSuccess("Screening answers saved");
    } catch (err) {
      toastApiError(err, "Could not save the screening answers");
    }
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {QUESTIONS.map((q) => (
          <li
            key={q.key}
            className="flex flex-wrap items-center justify-between gap-3 px-3 py-3"
          >
            <div className="min-w-0 max-w-xl">
              <p className="text-sm font-medium">{q.label}</p>
              <p className="text-xs text-muted-foreground">{q.hint}</p>
            </div>
            <YesNo
              name={q.label}
              value={answers[q.key]}
              disabled={!canEdit}
              onChange={(v) => setAnswers((a) => ({ ...a, [q.key]: v }))}
            />
          </li>
        ))}
      </ul>
      {answers.hasRightToWork === false ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300">
          A candidate without the right to work in the UK cannot move on to an
          interview.
        </p>
      ) : null}
      <Field
        label="Screening notes"
        htmlFor="screening-notes"
        hint="Availability, experience, anything to follow up at interview."
      >
        <Textarea
          id="screening-notes"
          rows={3}
          value={answers.screeningNotes}
          disabled={!canEdit}
          onChange={(e) =>
            setAnswers((a) => ({ ...a, screeningNotes: e.target.value }))
          }
        />
      </Field>
      {canEdit ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant={dirty ? "default" : "outline"}
            disabled={!dirty || save.isPending}
            onClick={() => void handleSave()}
          >
            {save.isPending ? "Saving…" : dirty ? "Save answers" : "Saved"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
