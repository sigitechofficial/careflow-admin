import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { sanitizeRichTextHtml } from '@/shared/lib/sanitize-rich-text'
import { RichTextHtml } from '@/shared/ui/rich-text-html'
import { plainTextFromHtml } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'

describe('sanitizeRichTextHtml', () => {
  it('removes script, event handlers and elements that run or load content', () => {
    expect(sanitizeRichTextHtml('<p>Before</p><script>alert(1)</script><p>After</p>')).toBe('<p>Before</p><p>After</p>')
    expect(sanitizeRichTextHtml('<p onclick="alert(1)" onmouseover="steal()">Hi</p>')).toBe('<p>Hi</p>')
    expect(sanitizeRichTextHtml('<img src=x onerror="alert(1)"><svg onload="alert(1)"></svg><iframe src="https://evil.example"></iframe><p>ok</p>')).toBe('<p>ok</p>')
    expect(sanitizeRichTextHtml('<style>body{display:none}</style><form action="https://evil.example"><input name="pw"></form>ok')).toBe('ok')
  })

  it('removes javascript:, data: and relative link targets', () => {
    for (const href of ['javascript:alert(1)', ' JaVaScRiPt:alert(1)', 'java\tscript:alert(1)', 'javascript&#58;alert(1)', 'data:text/html,<script>alert(1)</script>', '//evil.example', '/relative']) {
      expect(sanitizeRichTextHtml(`<a href="${href}">link</a>`)).toBe('<a>link</a>')
    }
  })

  it('keeps the HTML the editors and the policy library produce', () => {
    const html =
      '<h1>One</h1><h2>Two</h2><h3>Three</h3><h4>Four</h4>' +
      '<p style="text-align:center"><strong>Bold</strong> <em>italic</em> <u>underline</u> <s>struck</s><br>next</p>' +
      '<ul><li>Bullet</li></ul><ol><li>Step</li></ol><blockquote><p>Quote</p></blockquote><hr>' +
      '<table><thead><tr><th colspan="2">Who</th></tr></thead><tbody><tr><td rowspan="2">Manager</td><td>Reviews</td></tr></tbody></table>' +
      '<ul><li><a href="https://www.legislation.gov.uk/uksi/2014/2936" target="_blank" rel="noopener noreferrer">Regulation 12</a></li></ul>' +
      '<p><a href="mailto:office@example.org" rel="noopener noreferrer">Email</a></p>'
    expect(sanitizeRichTextHtml(html)).toBe(html)
  })

  it('forces rel on links and keeps only a new-tab target', () => {
    expect(sanitizeRichTextHtml('<a href="https://nhs.uk" target="_top" rel="opener">NHS</a>')).toBe(
      '<a href="https://nhs.uk" rel="noopener noreferrer">NHS</a>',
    )
  })

  it('drops style other than text alignment, and bad spans', () => {
    expect(sanitizeRichTextHtml('<p style="position:fixed;top:0">x</p>')).toBe('<p>x</p>')
    expect(sanitizeRichTextHtml('<p style="text-align: right; background:url(javascript:alert(1))">x</p>')).toBe('<p style="text-align:right">x</p>')
    expect(sanitizeRichTextHtml('<table><tbody><tr><td colspan="x" style="color:red">1</td></tr></tbody></table>')).toBe(
      '<table><tbody><tr><td>1</td></tr></tbody></table>',
    )
  })

  it('treats empty input as empty', () => {
    expect(sanitizeRichTextHtml(null)).toBe('')
    expect(sanitizeRichTextHtml(undefined)).toBe('')
    expect(sanitizeRichTextHtml('')).toBe('')
  })
})

describe('RichTextHtml', () => {
  it('renders sanitised HTML with the given props', () => {
    render(
      <RichTextHtml
        className="policy-doc"
        data-testid="doc"
        html={'<h2>Key points</h2><img src=x onerror="window.__xss=1"><p><a href="javascript:alert(1)">Read</a></p>'}
      />,
    )
    const doc = screen.getByTestId('doc')
    expect(doc).toHaveClass('policy-doc')
    expect(doc.innerHTML).toBe('<h2>Key points</h2><p><a>Read</a></p>')
    expect(screen.getByRole('heading', { name: 'Key points' })).toBeInTheDocument()
    expect((window as { __xss?: number }).__xss).toBeUndefined()
  })
})

describe('plainTextFromHtml', () => {
  it('reads text without putting the HTML into the page', () => {
    expect(plainTextFromHtml('<p>Hello <img src=x onerror="window.__xssText=1">there</p>')).toBe('Hello there')
    expect((window as { __xssText?: number }).__xssText).toBeUndefined()
  })
})
