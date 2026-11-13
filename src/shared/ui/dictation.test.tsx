import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import { DictationButton, DictationProvider, dictationChunk, splitLayoutClasses } from '@/shared/ui/dictation'

class FakeRecognition {
  static last: FakeRecognition | null = null
  lang = ''
  continuous = false
  interimResults = true
  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  started = false
  starts = 0
  /** Like a real browser: stop() only asks to end; the test fires onend itself. */
  endLater = false
  constructor() {
    FakeRecognition.last = this
  }
  start() {
    this.started = true
    this.starts += 1
  }
  stop() {
    this.started = false
    if (!this.endLater) this.onend?.()
  }
  abort() {
    this.stop()
  }
  say(transcript: string, isFinal = true) {
    const result = Object.assign([{ transcript }], { isFinal })
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

  it('fills the field while the user is still speaking; the final words replace those', () => {
    render(
      <DictationProvider>
        <ControlledInput initial="Lives alone" />
      </DictationProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Dictate (speech to text)' }))
    const rec = FakeRecognition.last!
    const input = screen.getByLabelText('Notes')

    act(() => rec.say('with a', false))
    expect(input).toHaveValue('Lives alone with a')
    act(() => rec.say('with a cat and', false))
    expect(input).toHaveValue('Lives alone with a cat and')
    act(() => rec.say('with a cat and dog'))
    expect(input).toHaveValue('Lives alone with a cat and dog')

    // The next phrase follows the finished one.
    act(() => rec.say('uses', false))
    expect(input).toHaveValue('Lives alone with a cat and dog uses')
  })

  it('keeps the words shown when stopped, and lets the late final words replace them', () => {
    render(
      <DictationProvider>
        <ControlledInput initial="" />
      </DictationProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Dictate (speech to text)' }))
    const rec = FakeRecognition.last!
    rec.endLater = true
    const input = screen.getByLabelText('Notes')

    act(() => rec.say('needs help with', false))
    fireEvent.click(screen.getByRole('button', { name: 'Stop dictation' }))
    expect(input).toHaveValue('needs help with')

    // After Stop the browser still sends the phrase's final words, then ends.
    act(() => rec.say('needs help with meals'))
    act(() => rec.onend?.())
    expect(input).toHaveValue('needs help with meals')
  })

  it('does not replace words the user has edited meanwhile', () => {
    render(
      <DictationProvider>
        <ControlledInput initial="" />
      </DictationProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Dictate (speech to text)' }))
    const rec = FakeRecognition.last!
    const input = screen.getByLabelText<HTMLInputElement>('Notes')

    act(() => rec.say('walks with', false))
    fireEvent.change(input, { target: { value: 'Walks unaided' } })
    input.setSelectionRange(13, 13)
    act(() => rec.say('a stick'))
    expect(input).toHaveValue('Walks unaided a stick')
  })

  it('does not replace an edit that only starts like the spoken words', () => {
    render(
      <DictationProvider>
        <ControlledInput initial="" />
      </DictationProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Dictate (speech to text)' }))
    const rec = FakeRecognition.last!
    const input = screen.getByLabelText<HTMLInputElement>('Notes')

    act(() => rec.say('walks with', false))
    fireEvent.change(input, { target: { value: 'walks unaided' } })
    input.setSelectionRange(13, 13)
    act(() => rec.say('a stick'))
    expect(input).toHaveValue('walks unaided a stick')
  })

  it('replaces the spoken words even after the page reset the field to an earlier part of them', () => {
    let reset: (v: string) => void = () => {}
    function ResettableInput() {
      const [value, setValue] = React.useState('')
      reset = setValue
      return <Input aria-label="Notes" value={value} onChange={(e) => setValue(e.target.value)} />
    }
    render(
      <DictationProvider>
        <ResettableInput />
      </DictationProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Dictate (speech to text)' }))
    const rec = FakeRecognition.last!
    const input = screen.getByLabelText('Notes')

    act(() => rec.say('I am adding my', false))
    act(() => rec.say('I am adding my address', false))
    // e.g. a refetch after autosave puts back what was saved a moment ago
    act(() => reset('I am adding my'))
    act(() => rec.say('I am adding my address details in this field'))
    expect(input).toHaveValue('I am adding my address details in this field')
  })

  it('counts unfinished words before the changed result as part of the phrase', () => {
    const onInterim = vi.fn()
    render(<DictationButton onText={vi.fn()} onInterim={onInterim} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dictate (speech to text)' }))
    const rec = FakeRecognition.last!
    const results = [
      Object.assign([{ transcript: 'I am adding' }], { isFinal: false }),
      Object.assign([{ transcript: ' my contact' }], { isFinal: false }),
    ]
    // Only the second result changed.
    act(() => rec.onresult?.({ resultIndex: 1, results }))
    expect(onInterim).toHaveBeenLastCalledWith('I am adding my contact')
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

  it('reports words as they are spoken and keeps listening after a pause until Stop', () => {
    const onText = vi.fn()
    const onInterim = vi.fn()
    render(<DictationButton onText={onText} onInterim={onInterim} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dictate (speech to text)' }))
    const rec = FakeRecognition.last!
    expect(rec.interimResults).toBe(true)

    act(() => rec.say('needs help', false))
    expect(onInterim).toHaveBeenLastCalledWith('needs help')
    expect(onText).not.toHaveBeenCalled()
    act(() => rec.say('needs help with meals'))
    expect(onText).toHaveBeenCalledWith('needs help with meals')
    expect(onInterim).toHaveBeenLastCalledWith('')

    // The browser ends recognition after silence: it listens again, still recording.
    act(() => rec.onend?.())
    expect(rec.starts).toBe(2)
    expect(screen.getByRole('button', { name: 'Stop dictation' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Stop dictation' }))
    expect(rec.starts).toBe(2)
    expect(rec.started).toBe(false)
    expect(screen.getByRole('button', { name: 'Dictate (speech to text)' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('does not listen again after the microphone is blocked', () => {
    render(<DictationButton onText={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dictate (speech to text)' }))
    const rec = FakeRecognition.last!
    act(() => {
      rec.onerror?.({ error: 'not-allowed' })
      rec.onend?.()
    })
    expect(rec.starts).toBe(1)
    expect(screen.getByRole('button', { name: 'Dictate (speech to text)' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('does not listen again after something else takes the microphone', () => {
    render(<DictationButton onText={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dictate (speech to text)' }))
    const rec = FakeRecognition.last!
    act(() => {
      rec.onerror?.({ error: 'aborted' })
      rec.onend?.()
    })
    expect(rec.starts).toBe(1)
    expect(screen.getByRole('button', { name: 'Dictate (speech to text)' })).toHaveAttribute('aria-pressed', 'false')
  })

  it("starts another field's mic only once the previous one has ended", () => {
    const onTextA = vi.fn()
    render(
      <>
        <DictationButton onText={onTextA} />
        <DictationButton onText={vi.fn()} />
      </>,
    )
    const [micA, micB] = screen.getAllByRole('button', { name: 'Dictate (speech to text)' })
    fireEvent.click(micA!)
    const recA = FakeRecognition.last!
    recA.endLater = true

    fireEvent.click(micB!)
    const recB = FakeRecognition.last!
    expect(recA.started).toBe(false)
    expect(recB.started).toBe(false)

    // The first field's last words still reach it while it ends.
    act(() => recA.say('last words'))
    expect(onTextA).toHaveBeenCalledWith('last words')

    act(() => recA.onend?.())
    expect(recA.starts).toBe(1)
    expect(recB.started).toBe(true)
    expect(micA).toHaveAttribute('aria-pressed', 'false')
    expect(micB).toHaveAttribute('aria-pressed', 'true')
  })

  it('starts the next mic anyway if the previous one never reports its end', () => {
    vi.useFakeTimers()
    try {
      render(
        <>
          <DictationButton onText={vi.fn()} />
          <DictationButton onText={vi.fn()} />
        </>,
      )
      const [micA, micB] = screen.getAllByRole('button', { name: 'Dictate (speech to text)' })
      fireEvent.click(micA!)
      FakeRecognition.last!.endLater = true
      fireEvent.click(micB!)
      const recB = FakeRecognition.last!
      expect(recB.started).toBe(false)
      act(() => vi.advanceTimersByTime(1000))
      expect(recB.started).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not start a mic that was stopped while waiting', () => {
    render(
      <>
        <DictationButton onText={vi.fn()} />
        <DictationButton onText={vi.fn()} />
      </>,
    )
    const [micA, micB] = screen.getAllByRole('button', { name: 'Dictate (speech to text)' })
    fireEvent.click(micA!)
    const recA = FakeRecognition.last!
    recA.endLater = true
    fireEvent.click(micB!)
    const recB = FakeRecognition.last!
    fireEvent.click(micB!)
    act(() => recA.onend?.())
    expect(recB.starts).toBe(0)
    expect(micB).toHaveAttribute('aria-pressed', 'false')
  })
})
