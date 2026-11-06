import * as React from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { TranslationDetail, TranslationLanguage, TranslationList } from '@/features/surveys/translations/SurveyTranslationsPanel'

/**
 * The paper copy in another language (Phase 3): the survey's published languages, and the chosen
 * language's texts that are translated and still match the English (as the answer page shows them).
 */
export function usePaperTranslation(surveyId: string, language: string | null): {
  languages: TranslationLanguage[]
  texts: Record<string, string> | null
} {
  const list = useQuery({
    queryKey: ['surveys', 'translations', surveyId],
    queryFn: async () => (await apiJson<ApiEnvelope<TranslationList>>(`/surveys/${surveyId}/translations`, { method: 'GET' })).data,
    enabled: Boolean(surveyId),
  })
  const detail = useQuery({
    queryKey: ['surveys', 'translations', surveyId, language],
    queryFn: async () =>
      (await apiJson<ApiEnvelope<TranslationDetail>>(`/surveys/${surveyId}/translations/${encodeURIComponent(language!)}`, { method: 'GET' })).data,
    enabled: Boolean(surveyId && language),
  })
  const languages = (list.data?.translations ?? [])
    .filter(t => t.status === 'PUBLISHED')
    .map(({ language: code, name, nativeName, dir }) => ({ code, name, nativeName, dir }))
  const texts = detail.data
    ? Object.fromEntries(detail.data.strings.filter(s => s.translation.trim() && !s.outOfDate).map(s => [s.key, s.translation]))
    : null
  return { languages, texts }
}

/**
 * Preview (staff): every translation, drafts included (marked), so a language can be checked on the
 * real page before it is offered. Each language's texts that are translated and up to date.
 */
export function usePreviewTranslations(surveyId: string): {
  languages: TranslationLanguage[]
  translations: Record<string, Record<string, string>>
} {
  const list = useQuery({
    queryKey: ['surveys', 'translations', surveyId],
    queryFn: async () => (await apiJson<ApiEnvelope<TranslationList>>(`/surveys/${surveyId}/translations`, { method: 'GET' })).data,
    enabled: Boolean(surveyId),
  })
  const codes = (list.data?.translations ?? []).map(t => t.language)
  const details = useQueries({
    queries: codes.map(code => ({
      queryKey: ['surveys', 'translations', surveyId, code],
      queryFn: async () =>
        (await apiJson<ApiEnvelope<TranslationDetail>>(`/surveys/${surveyId}/translations/${encodeURIComponent(code)}`, { method: 'GET' })).data,
    })),
  })
  const detailData = details.map(d => d.data)
  const key = detailData.map(d => (d ? d.strings.length + (d.status ?? '') : '-')).join('|')
  // Stable between renders (the answer page rebuilds only when the translations really change).
  const languages = React.useMemo(
    () =>
      (list.data?.translations ?? []).map(t => ({
        code: t.language,
        name: t.status === 'PUBLISHED' ? t.name : `${t.name} (draft)`,
        nativeName: t.status === 'PUBLISHED' ? t.nativeName : `${t.nativeName} (draft)`,
        dir: t.dir,
      })),
    [list.data],
  )
  const translations = React.useMemo(() => {
    const out: Record<string, Record<string, string>> = {}
    detailData.forEach((d, i) => {
      if (d) out[codes[i]!] = Object.fromEntries(d.strings.filter(s => s.translation.trim() && !s.outOfDate).map(s => [s.key, s.translation]))
    })
    return out
  }, [key, list.data])
  return { languages, translations }
}
