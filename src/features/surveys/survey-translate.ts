import type { PublicSurveyForm, PublicSurveyQuestion, SurveyLanguageOption } from '@/features/surveys/types'

/**
 * Show the answer page in another language or easy read (Phase 3). The survey's published translation
 * gives texts by key (careflow-api/src/surveys/survey-translation.util.ts); anything without a translation
 * stays in English. Answers keep their English values: only what people read changes, so what is sent,
 * saved and reported is the same in every language.
 */
export function translateSurveyForm(form: PublicSurveyForm, code: string | null): PublicSurveyForm {
  const t = code ? form.translations?.[code] : undefined
  if (!t) return form
  const intros = form.sectionIntros ?? {}
  const sectionTitle = (english: string) => t[`section:${english}:title`] || english
  const translatedIntros: Record<string, string> = {}
  for (const [english, intro] of Object.entries(intros)) {
    translatedIntros[sectionTitle(english)] = t[`section:${english}:intro`] || intro
  }
  const questions: PublicSurveyQuestion[] = form.questions.map(q => {
    const k = (part: string) => t[`q:${q.id}:${part}`]
    const optionLabels: Record<string, string> = {}
    for (const o of q.options ?? []) {
      const label = k(`option:${o}`)
      if (label) optionLabels[o] = label
    }
    if (q.otherOption) {
      const label = k('otherLabel')
      if (label) optionLabels[q.otherOption.label] = label
    }
    return {
      ...q,
      questionText: k('text') || q.questionText,
      helpText: q.helpText ? k('help') || q.helpText : q.helpText,
      sectionTitle: q.sectionTitle ? sectionTitle(q.sectionTitle) : q.sectionTitle,
      ...(Object.keys(optionLabels).length ? { optionLabels } : {}),
      ...(q.otherOption ? { otherOption: { ...q.otherOption, textPrompt: k('otherPrompt') || q.otherOption.textPrompt } } : {}),
      ...(q.commentConfig ? { commentConfig: { ...q.commentConfig, prompt: k('commentPrompt') || q.commentConfig.prompt } } : {}),
      ...(q.answerGroups?.length
        ? { answerGroups: q.answerGroups.map(g => ({ ...g, heading: k(`group:${g.heading}`) || g.heading })) }
        : {}),
    }
  })
  return {
    ...form,
    title: t.title || form.title,
    description: form.description ? t.description || form.description : form.description,
    sectionIntros: translatedIntros,
    questions,
  }
}

/** The answer page's own wording from a translation (keys `ui:<key>`). */
export function uiOverrides(form: PublicSurveyForm, code: string | null): Record<string, string> | null {
  return (code && form.translations?.[code]) || null
}

export function languageOf(form: PublicSurveyForm, code: string | null): SurveyLanguageOption | null {
  return (code && form.languages?.find(l => l.code === code)) || null
}

export const STORAGE_KEY = 'careflow-survey-language'

/**
 * The language to start in: the one this person chose before (kept on this device only), else their
 * browser's language when the survey has it, else English.
 */
export function startingLanguage(form: PublicSurveyForm): string | null {
  const offered = form.languages ?? []
  if (!offered.length) return null
  let saved: string | null = null
  try {
    saved = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    saved = null
  }
  if (saved === 'en') return null
  if (saved && offered.some(l => l.code === saved)) return saved
  const browser = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : []
  for (const b of browser) {
    const exact = offered.find(l => l.code.toLowerCase() === b.toLowerCase())
    if (exact) return exact.code
    const base = b.split('-')[0]?.toLowerCase()
    const match = offered.find(l => l.code.toLowerCase() === base)
    if (match && base !== 'en') return match.code
  }
  return null
}

export function rememberLanguage(code: string | null): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, code ?? 'en')
  } catch {
    /* private browsing: not remembered */
  }
}
