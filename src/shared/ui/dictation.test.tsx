import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import { DictationProvider, dictationChunk, splitLayoutClasses } from '@/shared/ui/dictation'

class FakeRecognition {
  static last: FakeRecognition | null = null
  lang = ''
  continuous = false
  interimResults = true
  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  started = false
  constructor() {
    FakeRecognition.last = this
  }
  start() {
    this.started = true
  }
  stop() {
    this.started = false
    this.onend?.()
  }
  abort() {
    this.stop()
  }
  say(transcript: string) {
    const result = Object.assign([{ transcript }], { isFinal: true })
    this.onresult?.({ resultIndex: 0, results: [result] })
  }
}

function ControlledInput({ initial }: { initial: string }) {
  const [value, setValue] = React.useState(initial)
  return <Input aria-label="Notes" value={value} onChange={(e) => setValue(e.target.value)} />
}

describe('dictation helpers', () => {
  it('spaces dictated text from its neighbours', () => {
    expect(dictationChunk('Lives', ' alone ', 'with')).toBe(' alone ')
    expect(dictationChunk('', 'Lives alone', '')).toBe('Lives alone')
    expect(dictationChunk('Lives ', 'alone', '')).toBe('alone')
    expect(dictationChunk('x', '   ', 'y')).toBe('')
  })

  it('moves placement classes to the wrapper', () => {
    expect(splitLayoutClasses('mt-1 h-10 max-w-xs sm:w-40 text-sm flex-1')).toEqual([
      'mt-1 max-w-xs sm:w-40 flex-1',
      'h-10 text-sm',
    ])
  })
})

describe('dictation mic', () => {
  beforeEach(() => {
    ;(window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = FakeRecognition
  })
  afterEach(() => {
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    FakeRecognition.last = null
  })

  it('is not shown outside a DictationProvider', () => {
    render(<ControlledInput initial="" />)
    expect(screen.queryByRole('button', { name: /dictat/i })).toBeNull()
  })

  it('is not shown on non-text inputs', () => {
    render(
      <DictationProvider>
        <Input type="date" aria-label="Date" />
      </DictationProvider>,
    )
    expect(screen.queryByRole('button', { name: /dictat/i })).toBeNull()
  })

  it('appends spoken text to an input without losing what was typed', () => {
    render(
      <DictationProvider>
        <ControlledInput initial="Lives alone" />
      </DictationProvider>,
    )
    const mic = screen.getByRole('button', { name: 'Dictate (speech to text)' })
    fireEvent.click(mic)
    const rec = FakeRecognition.last
    expect(rec?.started).toBe(true)
    expect(rec?.lang).toBe('en-GB')
    expect(mic).toHaveAttribute('aria-pressed', 'true')

    act(() => rec?.say('with a cat'))
    expect(screen.getByLabelText('Notes')).toHaveValue('Lives alone with a cat')

    fireEvent.click(screen.getByRole('button', { name: 'Stop dictation' }))
    expect(rec?.started).toBe(false)
    expect(screen.getByRole('button', { name: 'Dictate (speech to text)' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('inserts at the caret in a textarea', () => {
    function ControlledTextarea() {
      const [value, setValue] = React.useState('Morning call. Evening call.')
      return <Textarea aria-label="Visits" value={value} onChange={(e) => setValue(e.target.value)} />
    }
    render(
      <DictationProvider>
        <ControlledTextarea />
      </DictationProvider>,
    )
    const textarea = screen.getByLabelText<HTMLTextAreaElement>('Visits')
    textarea.focus()
    textarea.setSelectionRange(13, 13)
    fireEvent.click(screen.getByRole('button', { name: 'Dictate (speech to text)' }))
    act(() => FakeRecognition.last?.say('Lunch call.'))
    expect(textarea).toHaveValue('Morning call. Lunch call. Evening call.')
  })
})
