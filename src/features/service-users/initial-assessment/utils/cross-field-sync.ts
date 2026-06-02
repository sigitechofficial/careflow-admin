import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

export type CrossFieldSyncResult = {
  answers: Record<string, InitialAssessmentAnswerInput>
  syncedQuestionIds: string[]
}

function metaString(q: InitialAssessmentQuestion, key: string): string | undefined {
  const v = q.metadata?.[key]
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

export function syncKeyOf(q: InitialAssessmentQuestion): string | undefined {
  return metaString(q, 'syncKey')
}

export function syncFromKeyOf(q: InitialAssessmentQuestion): string | undefined {
  return metaString(q, 'syncFromKey')
}

function allQuestions(sections: InitialAssessmentSection[]): InitialAssessmentQuestion[] {
  return sections.flatMap((s) => s.questions)
}

function isYesValue(value: InitialAssessmentAnswerInput | undefined): boolean {
  return value?.checked === true || value?.booleanValue === true
}

function isNoValue(value: InitialAssessmentAnswerInput | undefined): boolean {
  return value?.checked === false || value?.booleanValue === false
}

function textValueOf(value: InitialAssessmentAnswerInput | undefined): string {
  return value?.textValue?.trim() ?? ''
}

function boolPatch(q: InitialAssessmentQuestion, yes: boolean): InitialAssessmentAnswerInput {
  return {
    questionId: q.id,
    checked: yes,
    booleanValue: yes,
  }
}

function textPatch(q: InitialAssessmentQuestion, text: string): InitialAssessmentAnswerInput {
  return {
    questionId: q.id,
    textValue: text,
  }
}

function applyBidirectionalSyncKey(
  sections: InitialAssessmentSection[],
  source: InitialAssessmentQuestion,
  patch: InitialAssessmentAnswerInput,
  answers: Record<string, InitialAssessmentAnswerInput>,
  synced: Set<string>,
): void {
  const key = syncKeyOf(source)
  if (!key) return

  const peers = allQuestions(sections).filter((q) => q.id !== source.id && syncKeyOf(q) === key)
  if (peers.length === 0) return

  if (source.questionType === 'YES_NO' || source.questionType === 'CHECKBOX') {
    const yes = patch.checked === true || patch.booleanValue === true
    const no = patch.checked === false || patch.booleanValue === false
    if (!yes && !no) return
    for (const peer of peers) {
      answers[peer.id] = boolPatch(peer, yes)
      synced.add(peer.id)
    }
    return
  }

  if (
    source.questionType === 'TEXT' ||
    source.questionType === 'TEXTAREA' ||
    source.questionType === 'SINGLE_SELECT'
  ) {
    const text = patch.textValue?.trim() ?? textValueOf(answers[source.id])
    if (!text) return
    for (const peer of peers) {
      if (peer.questionType === 'YES_NO' || peer.questionType === 'CHECKBOX') continue
      answers[peer.id] = textPatch(peer, text)
      synced.add(peer.id)
    }
  }
}

function applyMirrorFromKey(
  sections: InitialAssessmentSection[],
  source: InitialAssessmentQuestion,
  patch: InitialAssessmentAnswerInput,
  answers: Record<string, InitialAssessmentAnswerInput>,
  synced: Set<string>,
): void {
  const key = syncKeyOf(source)
  if (!key) return

  const targets = allQuestions(sections).filter((q) => syncFromKeyOf(q) === key)
  const text = patch.textValue?.trim() ?? textValueOf(answers[source.id])
  if (!text) return

  for (const target of targets) {
    const mode = metaString(target, 'syncMode') ?? 'mirror'
    const existing = textValueOf(answers[target.id])
    if (mode === 'append-if-empty' && existing) continue
    answers[target.id] = textPatch(target, text)
    synced.add(target.id)
  }
}

/** When a target with syncFromKey is edited, push back to the canonical syncKey source if empty. */
function applyReverseFromKey(
  sections: InitialAssessmentSection[],
  source: InitialAssessmentQuestion,
  patch: InitialAssessmentAnswerInput,
  answers: Record<string, InitialAssessmentAnswerInput>,
  synced: Set<string>,
): void {
  const fromKey = syncFromKeyOf(source)
  if (!fromKey) return

  const text = patch.textValue?.trim() ?? textValueOf(answers[source.id])
  if (!text) return

  const canonical = allQuestions(sections).find((q) => syncKeyOf(q) === fromKey)
  if (!canonical || canonical.id === source.id) return

  const existing = textValueOf(answers[canonical.id])
  if (existing) return

  answers[canonical.id] = textPatch(canonical, text)
  synced.add(canonical.id)
}

export function applyCrossFieldSync(
  sections: InitialAssessmentSection[],
  changedQuestionId: string,
  patch: InitialAssessmentAnswerInput,
  answers: Record<string, InitialAssessmentAnswerInput>,
): CrossFieldSyncResult {
  const source = allQuestions(sections).find((q) => q.id === changedQuestionId)
  if (!source) {
    return { answers: { ...answers, [changedQuestionId]: patch }, syncedQuestionIds: [] }
  }

  const next = { ...answers, [changedQuestionId]: patch }
  const synced = new Set<string>()

  applyBidirectionalSyncKey(sections, source, patch, next, synced)
  applyMirrorFromKey(sections, source, patch, next, synced)
  applyReverseFromKey(sections, source, patch, next, synced)

  // Interpreter Yes → ensure language fields stay visible (no answer change needed)
  if (syncKeyOf(source) === 'interpreterRequired' && isNoValue(patch)) {
    for (const langQ of allQuestions(sections).filter((q) => syncKeyOf(q) === 'languageRequired')) {
      if (textValueOf(next[langQ.id])) {
        next[langQ.id] = textPatch(langQ, '')
        synced.add(langQ.id)
      }
    }
  }

  return { answers: next, syncedQuestionIds: [...synced] }
}

export function collectAnswersForSave(
  section: InitialAssessmentSection,
  draftAnswers: Record<string, InitialAssessmentAnswerInput>,
  extraQuestionIds: Iterable<string> = [],
): InitialAssessmentAnswerInput[] {
  const ids = new Set(section.questions.map((q) => q.id))
  for (const id of extraQuestionIds) ids.add(id)
  return [...ids]
    .map((id) => draftAnswers[id])
    .filter((a): a is InitialAssessmentAnswerInput => Boolean(a))
}
