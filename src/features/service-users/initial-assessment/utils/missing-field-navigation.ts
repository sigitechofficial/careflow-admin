import type {
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import {
  iaQuestionDisplayLabelOverride,
  iaQuestionLabel,
} from '@/features/service-users/initial-assessment/utils/holistic-assessment-labels'
import {
  findQuestionByFieldKey,
  findQuestionBySpecRef,
} from '@/features/service-users/initial-assessment/utils/question-lookup'

/**
 * Marks the inline "Required" / "Sign-off required" message of a question so the page can find the
 * field on screen (jump from the submit dialog, "Next missing" bar). Only rendered while the field
 * shows an error, so the attribute set on screen = the missing fields the user can see.
 */
export const IA_MISSING_QUESTION_ATTR = 'data-ia-missing-question'

export function iaMissingQuestionAttrs(questionId: string): Record<string, string> {
  return { [IA_MISSING_QUESTION_ATTR]: questionId }
}

const FIELD_ISSUE_PREFIXES = ['Required: ', 'Assessor sign-off required: '] as const

/** Question text named by a field-level validation message, or null for other issues. */
export function questionTextFromFieldIssue(message: string): string | null {
  const prefix = FIELD_ISSUE_PREFIXES.find((p) => message.startsWith(p))
  return prefix ? message.slice(prefix.length) : null
}

/**
 * Question a field-level validation message points at. The server names the stored `questionText`;
 * the browser check names the on-screen label (`metadata.displayLabel`) — both are matched.
 */
function questionForValidationMessage(
  message: string,
  sections: InitialAssessmentSection[],
): InitialAssessmentQuestion | null {
  // Issues worded without the question text but raised for one question (same lookups as the check).
  if (message.startsWith('Emergency contact 1 not recorded')) return findQuestionBySpecRef(sections, '13.3') ?? null
  if (message.startsWith('Next review date is required')) return findQuestionByFieldKey(sections, 'nextReviewDate') ?? null
  const text = questionTextFromFieldIssue(message)
  if (text == null) return null
  for (const section of sections) {
    const match = section.questions.find((q) => q.questionText === text)
    if (match) return match
  }
  for (const section of sections) {
    const match = section.questions.find((q) => iaQuestionDisplayLabelOverride(q) === text)
    if (match) return match
  }
  return null
}

export function questionIdForValidationMessage(
  message: string,
  sections: InitialAssessmentSection[],
): string | null {
  return questionForValidationMessage(message, sections)?.id ?? null
}

/**
 * One entry per question: the submit check can raise two messages for the same field (e.g.
 * "Required: Assessor Name" and "Assessor sign-off required: Assessor Name"). Keeps the first, or a
 * must-fix one over a skippable one. Display only — submit rules use the full list.
 */
export function dedupeIssuesByQuestion<T extends { message: string }>(
  issues: T[],
  sections: InitialAssessmentSection[],
  isMustFix: (issue: T) => boolean,
): T[] {
  const out: T[] = []
  const indexByQuestion = new Map<string, number>()
  for (const issue of issues) {
    const questionId = questionIdForValidationMessage(issue.message, sections)
    if (!questionId) {
      out.push(issue)
      continue
    }
    const at = indexByQuestion.get(questionId)
    if (at == null) {
      indexByQuestion.set(questionId, out.length)
      out.push(issue)
    } else if (isMustFix(issue) && !isMustFix(out[at]!)) {
      out[at] = issue
    }
  }
  return out
}

/** Inline text under a field for its validation message. */
export function fieldIssueInlineLabel(message: string): string {
  return message.startsWith('Assessor sign-off required: ') ? 'Sign-off required' : 'Required'
}

/**
 * Issues that belong to a worksheet panel rather than one question: the panel to scroll to.
 * Selectors use the panels' existing test ids.
 */
const ISSUE_PANEL_SELECTORS: ReadonlyArray<{ matches: (message: string) => boolean; selector: string }> = [
  { matches: (m) => m.startsWith('ADL dependency scores incomplete'), selector: '[data-testid="ia-adl-worksheet"]' },
  {
    // Yes/No card on the Personal Details ADL block or the §12.8 equipment panel (radio names).
    matches: (m) => m.startsWith('Mobility aids'),
    selector:
      '.ia-yes-no-card:has([name="paper-adl-mobility-aids"]), .ia-yes-no-card:has([name="adl-mobility-aids"])',
  },
  { matches: (m) => m.startsWith('Agreed goals:'), selector: '[data-testid="ia-agreed-goals"]' },
  { matches: (m) => m.startsWith('Capacity assessment incomplete'), selector: '[data-testid="ia-capacity-decisions"]' },
]

export function issuePanelSelectorForMessage(message: string): string | null {
  return ISSUE_PANEL_SELECTORS.find((p) => p.matches(message))?.selector ?? null
}

/**
 * Message as the assessor should read it: a field-level issue names the question with the same
 * wording the form shows. Display only — the stored message (used by submit rules) is unchanged.
 */
export function validationMessageForDisplay(message: string, sections: InitialAssessmentSection[]): string {
  const prefix = FIELD_ISSUE_PREFIXES.find((p) => message.startsWith(p))
  if (!prefix) return message
  const question = questionForValidationMessage(message, sections)
  return question ? `${prefix}${iaQuestionLabel(question)}` : message
}

/** Visible missing-field markers inside `root`, in on-screen (document) order, one per question. */
export function missingFieldElements(root: ParentNode | null | undefined): HTMLElement[] {
  if (!root) return []
  const seen = new Set<string>()
  const out: HTMLElement[] = []
  root.querySelectorAll<HTMLElement>(`[${IA_MISSING_QUESTION_ATTR}]`).forEach((el) => {
    const id = el.getAttribute(IA_MISSING_QUESTION_ATTR)
    if (!id || seen.has(id)) return
    if (el.getClientRects().length === 0) return
    seen.add(id)
    out.push(el)
  })
  return out
}

export function missingFieldElementFor(
  root: ParentNode | null | undefined,
  questionId: string,
): HTMLElement | null {
  return missingFieldElements(root).find((el) => el.getAttribute(IA_MISSING_QUESTION_ATTR) === questionId) ?? null
}

/**
 * Next / previous marker relative to `currentId`. When `currentId` is no longer on screen (it was
 * answered), picks by position: the first marker below the middle of the viewport, or the last
 * one above it.
 */
export function adjacentMissingField(
  list: HTMLElement[],
  currentId: string | null,
  direction: 'next' | 'previous',
): HTMLElement | null {
  if (list.length === 0) return null
  const index = currentId == null ? -1 : list.findIndex((el) => el.getAttribute(IA_MISSING_QUESTION_ATTR) === currentId)
  if (index >= 0) {
    return list[direction === 'next' ? index + 1 : index - 1] ?? null
  }
  const middle = window.innerHeight / 2
  if (direction === 'next') {
    return list.find((el) => el.getBoundingClientRect().top > middle) ?? null
  }
  return [...list].reverse().find((el) => el.getBoundingClientRect().top < middle) ?? null
}

const HIGHLIGHT_CLASSES = ['ring-2', 'ring-amber-500', 'ring-offset-2', 'rounded-md', 'ring-offset-background']
const HIGHLIGHT_MS = 2600
/** Only one field is outlined at a time: the one the assessor was just taken to. */
let highlighted: { el: HTMLElement; timer: ReturnType<typeof setTimeout> } | null = null

function clearHighlight(): void {
  if (!highlighted) return
  clearTimeout(highlighted.timer)
  highlighted.el.classList.remove(...HIGHLIGHT_CLASSES)
  highlighted = null
}

/** Scrolls the field into the middle of the screen and outlines it for a moment. */
export function revealMissingField(marker: HTMLElement): void {
  revealElement(marker.parentElement ?? marker)
}

/** Text-like controls first, so the assessor can start typing straight away. */
const TYPING_CONTROLS = [
  'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="file"]):not([disabled]):not([readonly])',
  'textarea:not([disabled]):not([readonly])',
  '[contenteditable="true"]',
].join(', ')
/** Otherwise the first choice control (radio, checkbox, dropdown, button). */
const CHOICE_CONTROLS = [
  'input[type="radio"]:not([disabled])',
  '[role="radio"]:not([disabled]):not([aria-disabled="true"])',
  'input[type="checkbox"]:not([disabled])',
  '[role="checkbox"]:not([disabled]):not([aria-disabled="true"])',
  '[role="combobox"]:not([disabled])',
  'select:not([disabled])',
  'button:not([disabled])',
].join(', ')

function isOnScreen(el: HTMLElement): boolean {
  return el.getClientRects().length > 0
}

/**
 * Puts the cursor in the field (without moving the scroll, which is already animating). A text box
 * gets focus so typing starts at once; a Yes/No or dropdown gets keyboard focus (Space / arrows).
 */
export function focusFirstControl(target: HTMLElement): void {
  const pick = (selector: string) =>
    [...target.querySelectorAll<HTMLElement>(selector)].find(isOnScreen) ?? null
  const control = pick(TYPING_CONTROLS) ?? pick(CHOICE_CONTROLS)
  control?.focus({ preventScroll: true })
}

/** Scrolls an element (field or panel) into view and outlines it for a moment. */
export function revealElement(target: HTMLElement): void {
  const tall = target.getBoundingClientRect().height > window.innerHeight * 0.6
  // Keep the top clear of the sticky missing-fields bar when a tall panel is scrolled to the top.
  target.style.scrollMarginTop = '96px'
  target.scrollIntoView({ block: tall ? 'start' : 'center', behavior: 'smooth' })
  focusFirstControl(target)
  clearHighlight()
  target.classList.add(...HIGHLIGHT_CLASSES)
  highlighted = { el: target, timer: setTimeout(clearHighlight, HIGHLIGHT_MS) }
}
