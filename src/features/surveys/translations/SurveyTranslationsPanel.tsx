import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Languages, Upload } from 'lucide-react'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { cn } from '@/shared/lib/utils'

/** API: careflow-api src/surveys/survey-translations.service.ts (roadmap Phase 3). */
export type TranslationLanguage = { code: string; name: string; nativeName: string; dir: 'ltr' | 'rtl' }
export type TranslationProgress = { total: number; done: number; outOfDate: number; missing: number }
/** A started translation, as the API lists it: the language's code is in `language`. */
export type TranslationSummary = Omit<TranslationLanguage, 'code'> & {
  language: string
  status: 'DRAFT' | 'PUBLISHED'
  publishedAt: string | null
  updatedAt: string
  progress: TranslationProgress
}
export type TranslationList = {
  surveyId: string
  editedOnSurveyId: string | null
  languages: TranslationLanguage[]
  translations: TranslationSummary[]
}
export type TranslationString = {
  key: string
  where: string
  english: string
  translation: string
  outOfDate: boolean
  translatedFrom: string | null
}
export type TranslationDetail = {
  surveyId: string
  language: TranslationLanguage
  status: 'DRAFT' | 'PUBLISHED' | null
  publishedAt: string | null
  progress: TranslationProgress
  strings: TranslationString[]
  imported?: { taken: number; englishChanged: string[]; unknownKeys: string[]; blank: number }
}

const listKey = (id: string) => ['surveys', 'translations', id] as const
const detailKey = (id: string, code: string) => ['surveys', 'translations', id, code] as const
const card = 'rounded-xl border border-border bg-card p-4'

const progressText = (p: TranslationProgress) =>
  `${p.done} of ${p.total} translated${p.outOfDate ? ` · ${p.outOfDate} out of date` : ''}`

/** The page's own wording is optional to publish (it falls back to English); the survey's texts are not. */
const isPageWording = (key: string) => key.startsWith('ui:')

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Survey settings → Other languages and easy read (Phase 3). Translate the survey on screen or send a
 * translator's pack (a spreadsheet) and load it back; publish a language to offer it on the answer page.
 * Answers are always kept in English, so results are the same in every language.
 */
export function SurveyTranslationsPanel({ surveyId, canEdit }: { surveyId: string; canEdit: boolean }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: listKey(surveyId),
    queryFn: async () => (await apiJson<ApiEnvelope<TranslationList>>(`/surveys/${surveyId}/translations`, { method: 'GET' })).data,
  })
  const [adding, setAdding] = React.useState('')
  const [editing, setEditing] = React.useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = React.useState<TranslationSummary | null>(null)
  const action = useMutation({
    mutationFn: ({ code, what }: { code: string; what: 'publish' | 'unpublish' | 'delete' }) =>
      what === 'delete'
        ? apiJson(`/surveys/${surveyId}/translations/${encodeURIComponent(code)}`, { method: 'DELETE' })
        : apiJson(`/surveys/${surveyId}/translations/${encodeURIComponent(code)}/${what}`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['surveys', 'translations', surveyId] }),
  })
  if (!data) return null
  const editable = canEdit && !data.editedOnSurveyId
  const have = new Set(data.translations.map(t => t.language))
  const available = data.languages.filter(l => !have.has(l.code))

  const run = async (code: string, what: 'publish' | 'unpublish' | 'delete', ok: string, fail: string) => {
    try {
      await action.mutateAsync({ code, what })
      toastSuccess(ok)
    } catch (e) {
      toastApiError(e, fail)
    }
  }

  return (
    <section className={card} aria-labelledby="translations-heading" data-testid="survey-translations">
      <h3 id="translations-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Languages className="h-4 w-4 text-muted-foreground" aria-hidden /> Other languages and easy read
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Offer this survey in another language or in easy read. People choose the language at the top of the survey.
        Their answers are kept in English, so results are the same whatever language they answer in.
      </p>
      {data.editedOnSurveyId ? <p className="mt-1 text-xs text-muted-foreground">Translations are set on the repeating survey.</p> : null}

      {data.translations.length ? (
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
          {data.translations.map(t => (
            <li key={t.language} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
              <div className="min-w-0">
                <span className="font-medium text-foreground">{t.name}</span>
                {t.nativeName !== t.name ? (
                  <span className="ml-1.5 text-muted-foreground" lang={t.language} dir={t.dir}>
                    {t.nativeName}
                  </span>
                ) : null}
                <span
                  className={cn(
                    'ml-2 rounded-full px-2 py-0.5 text-xs font-medium',
                    t.status === 'PUBLISHED' ? 'bg-teal-600/10 text-teal-800 dark:text-teal-200' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {t.status === 'PUBLISHED' ? 'Offered to people' : 'Draft'}
                </span>
                <p className="mt-0.5 text-xs text-muted-foreground">{progressText(t.progress)}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button type="button" size="sm" variant="outline" onClick={() => setEditing(t.language)}>
                  {editable ? 'Translate' : 'View'}
                </Button>
                {editable ? (
                  t.status === 'PUBLISHED' ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => void run(t.language, 'unpublish', `${t.name} is no longer offered`, 'Could not withdraw it')}>
                      Stop offering
                    </Button>
                  ) : (
                    <Button type="button" size="sm" onClick={() => void run(t.language, 'publish', `${t.name} is now offered to people`, 'Could not publish it')}>
                      Offer to people
                    </Button>
                  )
                ) : null}
                {editable ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(t)}>
                    Delete
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">This survey is in English only.</p>
      )}

      {editable && available.length ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="translation-add" className="block text-xs font-medium text-foreground">
              Add a language
            </label>
            <select
              id="translation-add"
              value={adding}
              onChange={e => setAdding(e.target.value)}
              className="mt-1 h-9 rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="">Choose…</option>
              {available.map(l => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" size="sm" disabled={!adding} onClick={() => {
            setEditing(adding)
            setAdding('')
          }}>
            Start translating
          </Button>
        </div>
      ) : null}

      {editing ? <TranslationEditor surveyId={data.surveyId} code={editing} editable={editable} onClose={() => setEditing(null)} /> : null}

      <Dialog open={Boolean(confirmDelete)} onOpenChange={o => (o ? null : setConfirmDelete(null))}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete the {confirmDelete?.name} translation?</DialogTitle>
            <DialogDescription>It is no longer offered, and everything translated is removed. Answers already given are not affected.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(null)}>
              Keep it
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const t = confirmDelete!
                setConfirmDelete(null)
                void run(t.language, 'delete', `${t.name} translation deleted`, 'Could not delete it')
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

type Filter = 'ALL' | 'TODO' | 'OUT_OF_DATE'

/** Every text, English beside its translation; out-of-date ones (the English changed) are marked. */
function TranslationEditor({ surveyId, code, editable, onClose }: { surveyId: string; code: string; editable: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: detailKey(surveyId, code),
    queryFn: async () =>
      (await apiJson<ApiEnvelope<TranslationDetail>>(`/surveys/${surveyId}/translations/${encodeURIComponent(code)}`, { method: 'GET' })).data,
  })
  const [edits, setEdits] = React.useState<Record<string, string>>({})
  const [filter, setFilter] = React.useState<Filter>('ALL')
  const [publishError, setPublishError] = React.useState<string | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['surveys', 'translations', surveyId] })
  }
  const save = useMutation({
    mutationFn: (list: Array<{ key: string; text: string }>) =>
      apiJson<ApiEnvelope<TranslationDetail>>(`/surveys/${surveyId}/translations/${encodeURIComponent(code)}`, {
        method: 'PUT',
        body: JSON.stringify({ edits: list }),
      }),
    onSuccess: refresh,
  })
  const importPack = useMutation({
    mutationFn: (csv: string) =>
      apiJson<ApiEnvelope<TranslationDetail>>(`/surveys/${surveyId}/translations/${encodeURIComponent(code)}/pack`, {
        method: 'POST',
        body: JSON.stringify({ csv }),
      }),
    onSuccess: refresh,
  })
  const publish = useMutation({
    mutationFn: () => apiJson(`/surveys/${surveyId}/translations/${encodeURIComponent(code)}/publish`, { method: 'POST' }),
    onSuccess: refresh,
  })

  const changed = Object.entries(edits)
    .filter(([key, text]) => text !== (data?.strings.find(s => s.key === key)?.translation ?? ''))
    .map(([key, text]) => ({ key, text }))
  const strings = (data?.strings ?? []).filter(s =>
    filter === 'ALL' ? true : filter === 'OUT_OF_DATE' ? s.outOfDate : !s.translation.trim() || s.outOfDate,
  )
  const lang = data?.language

  const onSave = async () => {
    try {
      await save.mutateAsync(changed)
      setEdits({})
      toastSuccess('Translation saved')
    } catch (e) {
      toastApiError(e, 'Could not save the translation')
    }
  }
  const onDownload = async () => {
    try {
      const res = await apiJson<ApiEnvelope<{ filename: string; csv: string }>>(
        `/surveys/${surveyId}/translations/${encodeURIComponent(code)}/pack`,
        { method: 'GET' },
      )
      downloadText(res.data.filename, res.data.csv)
    } catch (e) {
      toastApiError(e, 'Could not make the pack')
    }
  }
  const onUpload = async (file: File) => {
    try {
      const res = await importPack.mutateAsync(await file.text())
      const imp = res.data.imported
      toastSuccess(
        `${imp?.taken ?? 0} text${imp?.taken === 1 ? '' : 's'} taken from the file` +
          (imp?.englishChanged.length ? `; ${imp.englishChanged.length} skipped because the English has changed since` : ''),
      )
      setEdits({})
    } catch (e) {
      toastApiError(e, 'Could not read the file')
    }
  }
  const onPublish = async () => {
    setPublishError(null)
    try {
      if (changed.length) await save.mutateAsync(changed)
      setEdits({})
      await publish.mutateAsync()
      toastSuccess(`${lang?.name ?? 'This language'} is now offered to people`)
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : 'Could not publish it')
    }
  }

  return (
    <Dialog open onOpenChange={o => (o ? null : onClose())}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{lang ? `${lang.name} translation` : 'Translation'}</DialogTitle>
          <DialogDescription>
            {data ? progressText(data.progress) : 'Loading…'}
            {data?.status === 'PUBLISHED' ? ' · offered to people' : data?.status === 'DRAFT' ? ' · draft' : ''}. Answer choices are
            shown in this language but kept in English. A text whose English changes shows in English until it is translated again.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-2 px-6">
          <div role="group" aria-label="Show" className="inline-flex rounded-md border border-border p-0.5">
            {(
              [
                ['ALL', 'All texts'],
                ['TODO', 'Still to do'],
                ['OUT_OF_DATE', 'Out of date'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={cn(
                  'min-h-8 rounded px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  filter === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => void onDownload()}>
              <Download className="h-4 w-4" aria-hidden /> Translator’s pack
            </Button>
            {editable ? (
              <>
                <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={importPack.isPending}>
                  <Upload className="h-4 w-4" aria-hidden /> Load the filled-in pack
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={e => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) void onUpload(f)
                  }}
                />
              </>
            ) : null}
          </div>
        </div>
        <DialogBody className="max-h-[60vh] space-y-2 overflow-y-auto" data-testid="translation-editor">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {isError ? <p className="text-sm text-destructive">This translation could not be loaded.</p> : null}
          {data && !strings.length ? <p className="text-sm text-muted-foreground">Nothing here.</p> : null}
          {strings.map(s => {
            const id = `tr-${s.key}`
            const value = edits[s.key] ?? s.translation
            return (
              <div key={s.key} className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    {s.where}
                    {isPageWording(s.key) ? ' (falls back to English if left blank)' : ''}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground" lang="en">
                    {s.english}
                  </p>
                  {s.outOfDate ? (
                    <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                      Out of date: translated from “{s.translatedFrom}”. People see the English until this is redone.
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor={id} className="sr-only">
                    {`${lang?.name ?? 'Translation'} for: ${s.english.slice(0, 80)}`}
                  </label>
                  <textarea
                    id={id}
                    rows={Math.min(6, Math.max(2, Math.ceil(s.english.length / 70)))}
                    value={value}
                    readOnly={!editable}
                    lang={lang?.code.replace('en-x-easyread', 'en')}
                    dir={lang?.dir ?? 'ltr'}
                    onChange={e => setEdits(prev => ({ ...prev, [s.key]: e.target.value }))}
                    className={cn(
                      'w-full rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      s.outOfDate ? 'border-amber-600' : 'border-input',
                    )}
                  />
                </div>
              </div>
            )
          })}
        </DialogBody>
        <DialogFooter className="flex-wrap">
          {publishError ? (
            <p role="alert" className="mr-auto text-sm text-destructive">
              {publishError}
            </p>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {editable ? (
            <>
              <Button type="button" variant="outline" disabled={!changed.length || save.isPending} onClick={() => void onSave()}>
                Save{changed.length ? ` (${changed.length})` : ''}
              </Button>
              {data?.status !== 'PUBLISHED' ? (
                <Button type="button" disabled={save.isPending || publish.isPending} onClick={() => void onPublish()}>
                  Save and offer to people
                </Button>
              ) : null}
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
