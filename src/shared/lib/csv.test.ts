import { describe, expect, it } from 'vitest'
import { csvEscape, toCsv } from '@/shared/lib/csv'

describe('csvEscape', () => {
  it('quotes commas, quotes and line breaks', () => {
    expect(csvEscape('a,b')).toBe('"a,b"')
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""')
    expect(csvEscape('line\nbreak')).toBe('"line\nbreak"')
    expect(csvEscape(null)).toBe('')
  })

  it('never lets a spreadsheet run typed text as a formula', () => {
    expect(csvEscape('=HYPERLINK("http://x","y")')).toBe(`"'=HYPERLINK(""http://x"",""y"")"`)
    expect(csvEscape('+44 7700 900000')).toBe(`"'+44 7700 900000"`)
    expect(csvEscape('@SUM(A1)')).toBe(`"'@SUM(A1)"`)
    expect(csvEscape('-cmd|calc')).toBe(`"'-cmd|calc"`)
    expect(csvEscape('\tx')).toBe(`"'\tx"`)
  })

  it('keeps numbers as numbers, negative ones too', () => {
    expect(csvEscape(-3)).toBe('-3')
    expect(csvEscape('-3.5')).toBe('-3.5')
    expect(csvEscape(42)).toBe('42')
    expect(toCsv([['Name', 'Score'], ['=1+1', 5]])).toBe(`﻿Name,Score\r\n"'=1+1",5\r\n`)
  })
})
