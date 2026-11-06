import * as React from 'react'
import { Languages, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useSurveyStrings } from '@/features/surveys/survey-ui-strings'
import type { SurveyLanguageOption } from '@/features/surveys/types'

/**
 * Above a survey people answer: the language to read it in (when a translation is published) and how
 * to show the page — bigger text, high contrast, an easier-to-read font, more space between lines
 * (Accessible Information Standard; WCAG 2.2 AA). Built with the page's own colours, so contrast stays
 * tested. Choices are kept on this device only.
 */

export type DisplayOptions = { size: 1 | 1.25 | 1.5 | 2; contrast: boolean; readableFont: boolean; spacing: boolean }

const DEFAULT_DISPLAY: DisplayOptions = { size: 1, contrast: false, readableFont: false, spacing: false }
const DISPLAY_KEY = 'careflow-survey-display'
const SIZES: DisplayOptions['size'][] = [1, 1.25, 1.5, 2]

function readDisplay(): DisplayOptions {
  try {
    const raw = JSON.parse(window.localStorage.getItem(DISPLAY_KEY) ?? 'null') as Partial<DisplayOptions> | null
    if (!raw) return DEFAULT_DISPLAY
    return {
      size: SIZES.includes(raw.size as DisplayOptions['size']) ? (raw.size as DisplayOptions['size']) : 1,
      contrast: raw.contrast === true,
      readableFont: raw.readableFont === true,
      spacing: raw.spacing === true,
    }
  } catch {
    return DEFAULT_DISPLAY
  }
}

/** The display choices, kept on this device (never sent anywhere). */
export function useDisplayOptions(): [DisplayOptions, (next: DisplayOptions) => void] {
  const [value, setValue] = React.useState<DisplayOptions>(readDisplay)
  const set = React.useCallback((next: DisplayOptions) => {
    setValue(next)
    try {
      window.localStorage.setItem(DISPLAY_KEY, JSON.stringify(next))
    } catch {
      /* private browsing: not remembered */
    }
  }, [])
  return [value, set]
}

/** Styles for the page wrapper. Size scales everything (text, controls, spacing) together. */
export function displayStyle(d: DisplayOptions): React.CSSProperties {
  return {
    ...(d.size !== 1 ? { zoom: d.size } : {}),
    ...(d.readableFont ? { fontFamily: '"Atkinson Hyperlegible", Verdana, Tahoma, "Segoe UI", sans-serif' } : {}),
  }
}

/** Classes for the page wrapper (high contrast and line spacing are set in globals.css). */
export function displayClass(d: DisplayOptions): string {
  return cn(d.contrast && 'survey-high-contrast', d.spacing && 'survey-more-spacing')
}

export function SurveyPageOptions({
  languages,
  language,
  onLanguage,
  display,
  onDisplay,
}: {
  languages: SurveyLanguageOption[]
  language: string | null
  onLanguage: (code: string | null) => void
  display: DisplayOptions
  onDisplay: (next: DisplayOptions) => void
}) {
  const t = useSurveyStrings()
  const [open, setOpen] = React.useState(false)
  const panelId = React.useId()
  const selectId = React.useId()
  const toggle = (key: 'contrast' | 'readableFont' | 'spacing') => onDisplay({ ...display, [key]: !display[key] })

  return (
    <div className="mb-3 flex flex-wrap items-start justify-end gap-2" data-testid="survey-page-options">
      {languages.length ? (
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-muted-foreground" aria-hidden />
          <label htmlFor={selectId} className="sr-only">
            {t('language')}
          </label>
          <select
            id={selectId}
            value={language ?? 'en'}
            onChange={e => onLanguage(e.target.value === 'en' ? null : e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="survey-language"
          >
            {/* Each language in its own name, so people find theirs whatever the page is in. */}
            <option value="en" lang="en">
              English
            </option>
            {languages.map(l => (
              <option key={l.code} value={l.code} lang={l.code.replace('en-x-easyread', 'en')}>
                {l.nativeName === l.name ? l.name : `${l.nativeName} (${l.name})`}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="flex flex-col items-end">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(o => !o)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {t('displayOptions')}
        </button>
        {open ? (
          <div id={panelId} className="mt-2 w-72 max-w-full rounded-xl border border-border bg-card p-4 text-sm shadow-sm" data-testid="survey-display-options">
            <fieldset>
              <legend className="mb-2 font-medium text-foreground">{t('textSize')}</legend>
              <div className="grid grid-cols-4 gap-1.5">
                {SIZES.map(size => (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={display.size === size}
                    onClick={() => onDisplay({ ...display, size })}
                    className={cn(
                      'min-h-10 rounded-lg border px-1 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      display.size === size ? 'border-teal-600 bg-teal-600 text-white' : 'border-input bg-background text-foreground hover:bg-muted/60',
                    )}
                  >
                    {`${Math.round(size * 100)}%`}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="mt-3 space-y-2">
              {(
                [
                  ['contrast', t('highContrast')],
                  ['readableFont', t('readableFont')],
                  ['spacing', t('moreSpacing')],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex min-h-8 cursor-pointer items-center gap-2 text-foreground">
                  <input type="checkbox" checked={display[key]} onChange={() => toggle(key)} className="h-4 w-4 accent-teal-600" />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
