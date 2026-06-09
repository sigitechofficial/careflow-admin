/**
 * Typography scale for the enterprise assessment form.
 * One step larger than the legacy checklist, with clear hierarchy via size + weight.
 */

import { cn } from '@/shared/lib/utils'

/** Section title in the main form column (e.g. "4. Physical assessment") */
export const IA_SECTION_TITLE_CLASS = 'text-lg font-semibold tracking-tight text-teal-800 dark:text-teal-300'

/** Subsection / spec-ref group heading */
export const IA_GROUP_TITLE_CLASS = 'text-base font-semibold text-foreground'

/** Regulatory act divider strip */
export const IA_ACT_DIVIDER_TITLE_CLASS =
  'text-sm font-bold uppercase tracking-wide text-teal-900 dark:text-teal-200'

/** Person-centred card title (nested under a group) */
export const IA_CARD_TITLE_CLASS = 'text-sm font-semibold text-teal-950 dark:text-teal-100'

/** Embedded panel heading (vitals, meds, risk matrix, etc.) */
export const IA_PANEL_TITLE_CLASS = 'text-base font-semibold text-foreground'

/** Informational callout / banner title (smaller than panel heading) */
export const IA_CALLOUT_TITLE_CLASS = 'text-sm font-semibold'

/** Primary question label */
export const IA_QUESTION_LABEL_CLASS = 'text-sm font-medium leading-snug text-foreground'

/** Fieldset legend — same weight as labels, not bolded like a heading */
export const IA_LEGEND_CLASS = 'text-sm font-medium leading-snug text-foreground'

/** Checkbox / radio option text */
export const IA_OPTION_LABEL_CLASS = 'text-sm font-normal leading-snug text-foreground'

/** Secondary label (assessor notes, sub-fields) */
export const IA_LABEL_SECONDARY_CLASS = 'text-xs font-medium text-muted-foreground'

/** Help text, prefill hints, panel descriptions */
export const IA_HINT_CLASS = 'text-sm font-normal text-muted-foreground'

/** Section intro / muted body copy */
export const IA_INTRO_CLASS = 'text-sm font-normal text-muted-foreground'

/** Scoped wrapper — bumps control text; rich-text fields always span the full grid row. */
export const IA_FORM_ROOT_CLASS =
  'ia-assessment-form text-sm leading-relaxed text-foreground [&_input:not([type=checkbox]):not([type=radio])]:h-10 [&_input:not([type=checkbox]):not([type=radio])]:text-base [&_textarea]:text-base [&_[data-ia-rich-text]_.note-editable]:text-base [&_[data-slot=select-trigger]]:h-10 [&_[data-slot=select-trigger]]:text-base [&_.grid>*:has([data-ia-rich-text])]:col-span-full'

export const IA_FORM_TEXTAREA_CLASS =
  'min-h-[80px] w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Shorter textareas in §12 metadata panels and assessor notes. */
export const IA_FORM_TEXTAREA_COMPACT_CLASS =
  'min-h-[64px] w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Yes/no and score-grid controls — one size everywhere. */
export const IA_RADIO_CLASS = 'h-4 w-4 shrink-0 border-input text-teal-700 focus-visible:ring-teal-600'
export const IA_CHECKBOX_CLASS = 'h-4 w-4 shrink-0 rounded border-input text-teal-700 focus-visible:ring-teal-600'

/** Paper-style row label (yes/no, ADL score rows). */
export const IA_PAPER_ROW_LABEL_CLASS = IA_QUESTION_LABEL_CLASS

/** Meta flags on catalog questions (Risk, Care plan, Secure, Synced). */
export const IA_META_BADGE_CLASS =
  'rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide'

/** Vertical rhythm for section bodies and custom section layouts. */
export const IA_SECTION_BODY_CLASS = 'space-y-6'

/** Spec-ref group block inside the main form card. */
export const IA_SPEC_GROUP_CLASS = 'space-y-4 border-b border-border/60 pb-6 last:border-b-0 last:pb-0'

/** Informational callout shells */
export const IA_CALLOUT_BASE_CLASS = 'rounded-lg border px-4 py-3'
export const IA_CALLOUT_NEUTRAL_CLASS = cn(
  IA_CALLOUT_BASE_CLASS,
  'border-border bg-muted/40',
)
export const IA_CALLOUT_TEAL_CLASS = cn(
  IA_CALLOUT_BASE_CLASS,
  'border-teal-200 bg-teal-50/60 dark:border-teal-900 dark:bg-teal-950/30',
)
export const IA_CALLOUT_SKY_CLASS = cn(
  IA_CALLOUT_BASE_CLASS,
  'border-sky-200 bg-sky-50/80 dark:border-sky-900 dark:bg-sky-950/40',
)
export const IA_CALLOUT_VIOLET_CLASS = cn(
  IA_CALLOUT_BASE_CLASS,
  'border-violet-200 bg-violet-50/70 dark:border-violet-900 dark:bg-violet-950/30',
)
export const IA_CALLOUT_AMBER_CLASS = cn(
  IA_CALLOUT_BASE_CLASS,
  'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40',
)

/** Side nav */
export const IA_FORM_NAV_BUTTON_CLASS =
  'rounded-md px-3 py-2.5 text-left text-sm font-medium leading-snug transition-colors'

export const IA_FORM_NAV_META_CLASS = 'mt-0.5 block text-xs font-normal text-muted-foreground'

/** Consistent spacing between assessor-facing fields in a subsection. */
export const IA_FIELD_DIVIDER_CLASS = 'border-b border-border/60 py-4 last:border-b-0'

/** Flat §1 profile / person-centred field stack — no per-field borders. */
export const IA_SIMPLE_FIELD_STACK_CLASS = 'space-y-5'

/** Wrapper for a single field in the simplified §1 layout. */
export const IA_SIMPLE_FIELD_CLASS = 'space-y-1.5'

/** Short text inputs in §1 profile blocks. */
export const IA_SIMPLE_INPUT_CLASS = 'h-10 max-w-md text-base'

/** Shared subsection panel shell (§12 panels, embedded blocks). */
export const IA_SUBSECTION_PANEL_CLASS = 'overflow-hidden rounded-xl border border-border bg-card shadow-sm'
export const IA_SUBSECTION_PANEL_HEADER_CLASS =
  'border-b border-border bg-muted/40 px-4 py-2.5 dark:bg-muted/20'
export const IA_SUBSECTION_PANEL_TITLE_CLASS = IA_GROUP_TITLE_CLASS

/** @deprecated use IA_OPTION_LABEL_CLASS */
export const IA_FORM_CHECKBOX_LABEL_CLASS = IA_OPTION_LABEL_CLASS

/** @deprecated use IA_HINT_CLASS */
export const IA_FORM_HINT_CLASS = IA_HINT_CLASS

/** @deprecated use IA_LABEL_SECONDARY_CLASS */
export const IA_FORM_LABEL_SECONDARY_CLASS = IA_LABEL_SECONDARY_CLASS

/** @deprecated use IA_HINT_CLASS */
export const IA_FORM_MUTED_CLASS = IA_HINT_CLASS
