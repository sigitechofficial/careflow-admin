import * as React from "react";
import { Check } from "lucide-react";
import type { CandidateStage } from "@/features/hr/recruitment/api/recruitment.api";
import {
  PIPELINE_STAGES,
  candidateStageLabel,
} from "@/features/hr/recruitment/utils/recruitment-display.util";
import { cn } from "@/shared/lib/utils";

export const textareaClass = cn(
  "flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "shadow-sm placeholder:text-muted-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return <textarea {...props} className={cn(textareaClass, props.className)} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Yes / No buttons; `null` means not answered yet. */
export function YesNo({
  value,
  onChange,
  disabled,
  name,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  name: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className="inline-flex overflow-hidden rounded-md border border-input"
    >
      {[
        { v: true, label: "Yes" },
        { v: false, label: "No" },
      ].map((opt) => (
        <button
          key={opt.label}
          type="button"
          role="radio"
          aria-checked={value === opt.v}
          disabled={disabled}
          onClick={() => onChange(opt.v)}
          className={cn(
            "px-4 py-1.5 text-sm transition-colors disabled:opacity-60",
            value === opt.v
              ? opt.v
                ? "bg-primary text-primary-foreground"
                : "bg-foreground text-background"
              : "bg-background hover:bg-muted",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children ?? "—"}</dd>
    </div>
  );
}

/** A step's panel: what this step is for, its content, and the action that moves the candidate on. */
export function StepPanel({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <header className="border-b border-border px-4 py-3 md:px-6">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </header>
      <div className="space-y-5 px-4 py-4 md:px-6">{children}</div>
      {footer ? (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-3 md:px-6">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

/** Shows the six recruitment steps; done steps get a tick and any reached step can be opened. */
export function FlowStepper({
  stage,
  hired,
  viewing,
  onView,
}: {
  /** The candidate's step (for a closed application: the step it was closed at). */
  stage: CandidateStage;
  hired: boolean;
  viewing: CandidateStage;
  onView: (stage: CandidateStage) => void;
}) {
  const currentIdx = PIPELINE_STAGES.indexOf(stage);
  return (
    <nav aria-label="Recruitment steps" className="overflow-x-auto">
      <ol className="flex min-w-max items-stretch gap-1 rounded-xl border border-border bg-card p-1.5 shadow-sm">
        {PIPELINE_STAGES.map((s, idx) => {
          const done = idx < currentIdx || (hired && idx === currentIdx);
          const current = idx === currentIdx && !hired;
          const reachable = idx <= currentIdx;
          const active = s === viewing;
          return (
            <li key={s} className="flex-1">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onView(s)}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  active
                    ? "bg-primary/10 ring-1 ring-primary/30"
                    : reachable
                      ? "hover:bg-muted"
                      : "",
                  !reachable && "cursor-default opacity-50",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    done
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : current
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    idx + 1
                  )}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap",
                    current && "font-semibold",
                  )}
                >
                  {candidateStageLabel(s)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Scroll to a section and outline it briefly, so the eye lands on what needs doing. */
export function scrollToAndFlash(el: HTMLElement | null) {
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const cls = ["ring-2", "ring-amber-400", "ring-offset-2", "ring-offset-background", "rounded-lg"];
  el.classList.add(...cls);
  window.setTimeout(() => el.classList.remove(...cls), 1800);
}
