/** Paper styles: A4, black on white whatever the app theme, page breaks that keep headings with their text. */
export const PRINT_CSS = `
@page { size: A4; margin: 18mm 17mm 20mm 17mm; }
@page {
  @bottom-left { font: 8pt/1.3 system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #6b7280; }
  @bottom-right { font: 8pt/1.3 system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #6b7280; }
}
.policy-print-screen { min-height: 100vh; background: #e9ebee; padding: 72px 16px 48px; color: #111827; }
.policy-print-toolbar {
  position: fixed; inset: 0 0 auto 0; z-index: 20; display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; background: #ffffff; border-bottom: 1px solid #d9dde3; box-shadow: 0 1px 3px rgba(0,0,0,.06);
}
.policy-print-tip { flex: 1; text-align: center; font-size: 12px; color: #6b7280; }
.policy-print-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 600;
  background: #0f766e; color: #ffffff; border: 1px solid #0f766e; cursor: pointer; text-decoration: none;
}
.policy-print-btn:hover { background: #115e59; }
.policy-print-btn-ghost { background: transparent; color: #374151; border-color: #d1d5db; }
.policy-print-btn-ghost:hover { background: #f3f4f6; }
.policy-print {
  position: relative; box-sizing: border-box; width: 210mm; max-width: 100%; min-height: 297mm; margin: 0 auto; padding: 18mm 17mm 16mm;
  background: #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,.08), 0 12px 32px rgba(0,0,0,.08); border-radius: 2px;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 10.5pt; line-height: 1.55; color: #111827;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.policy-print-masthead { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding-bottom: 10px; border-bottom: 2px solid #0f766e; }
.policy-print-org { display: flex; align-items: center; gap: 10px; min-width: 0; }
.policy-print-logo { max-height: 14mm; max-width: 45mm; object-fit: contain; }
.policy-print-orgname { font-size: 11pt; font-weight: 600; color: #111827; }
.policy-print-kind { display: flex; flex-direction: column; align-items: flex-end; text-align: right; font-size: 8.5pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #0f766e; }
.policy-print-ref { margin-top: 2px; font-weight: 500; letter-spacing: .02em; text-transform: none; color: #4b5563; }
.policy-print-title { margin: 9mm 0 3mm; font-size: 20pt; line-height: 1.2; font-weight: 700; letter-spacing: -.01em; color: #0b1220; }
.policy-print-summary { margin: 0 0 5mm; font-size: 11pt; line-height: 1.5; color: #374151; }
.policy-print-draft-note { margin: 0 0 5mm; padding: 3mm 4mm; border: 1px solid #f59e0b; border-left-width: 4px; background: #fffbeb; color: #78350f; font-size: 9.5pt; }
.policy-print-details { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 0 0 6mm; break-inside: avoid; }
.policy-print-details th, .policy-print-details td { padding: 2.2mm 3mm; border: 1px solid #e3e6ea; text-align: left; vertical-align: top; }
.policy-print-details th { width: 22%; background: #f6f7f9; font-weight: 600; color: #4b5563; }
.policy-print-details td { width: 28%; color: #111827; }
.policy-print-rule { height: 0; margin: 0 0 6mm; }
.policy-print-content { font-size: 10.5pt; line-height: 1.6; color: #111827; orphans: 3; widows: 3; }
.policy-print-content > :first-child { margin-top: 0; }
.policy-print-content h1 { font-size: 15pt; margin: 8mm 0 3mm; font-weight: 700; }
.policy-print-content h2 { margin: 7mm 0 2.5mm; padding-bottom: 1.5mm; border-bottom: 1px solid #d9dde3; font-size: 13pt; line-height: 1.3; font-weight: 700; color: #0b1220; break-after: avoid; page-break-after: avoid; }
.policy-print-content h3 { margin: 5mm 0 2mm; font-size: 11pt; line-height: 1.35; font-weight: 700; color: #0b1220; break-after: avoid; page-break-after: avoid; }
.policy-print-content h4 { margin: 4mm 0 1.5mm; font-size: 10.5pt; font-weight: 700; break-after: avoid; }
.policy-print-content p { margin: 0 0 3mm; }
.policy-print-content ul, .policy-print-content ol { margin: 0 0 3.5mm; padding-left: 6.5mm; }
.policy-print-content ul { list-style: disc; }
.policy-print-content ol { list-style: decimal; }
.policy-print-content li { margin: 1.2mm 0; padding-left: .8mm; break-inside: avoid; }
.policy-print-content li > p { margin: 0; }
.policy-print-content strong { font-weight: 700; }
.policy-print-content a { color: #0f766e; text-decoration: underline; text-underline-offset: 2px; }
.policy-print-content blockquote { margin: 0 0 4mm; padding: 2mm 4mm; border-left: 3px solid #cbd2d9; color: #374151; break-inside: avoid; }
.policy-print-content table { width: 100%; margin: 1mm 0 4mm; border-collapse: collapse; font-size: 9pt; }
.policy-print-content thead { display: table-header-group; }
.policy-print-content tr { break-inside: avoid; page-break-inside: avoid; }
.policy-print-content th, .policy-print-content td { padding: 1.8mm 2.5mm; border: 1px solid #d9dde3; text-align: left; vertical-align: top; }
.policy-print-content th { background: #f3f5f7; font-weight: 700; }
.policy-print-content img { max-width: 100%; }
.policy-print-empty, .policy-print-uploaded p { color: #374151; }
.policy-print-end { margin-top: 10mm; padding-top: 3mm; border-top: 1px solid #d9dde3; font-size: 8.5pt; color: #6b7280; break-inside: avoid; }
.policy-print-end p { margin: 0 0 1mm; }
.policy-print-endmark { font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #4b5563; }
.policy-print-watermark {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 0;
  font-size: 96pt; font-weight: 800; letter-spacing: .1em; color: rgba(217, 119, 6, .09); transform: rotate(-30deg);
}
.policy-print > *:not(.policy-print-watermark) { position: relative; z-index: 1; }
.policy-print-info-note { margin: 0 0 5mm; padding: 3mm 4mm; border: 1px solid #99d5cf; border-left-width: 4px; background: #f0fdfa; color: #134e4a; font-size: 9.5pt; }
.policy-print-appendix { margin-top: 8mm; break-inside: avoid; }
.policy-print-appendix h2 { margin: 0 0 2.5mm; padding-bottom: 1.5mm; border-bottom: 1px solid #d9dde3; font-size: 12pt; font-weight: 700; color: #0b1220; }
.policy-print-appendix ul { margin: 0; padding-left: 6.5mm; list-style: disc; font-size: 9.5pt; }
.policy-print-appendix li { margin: 1mm 0; }
.policy-print-url { color: #4b5563; word-break: break-all; }
.policy-print-actions { display: inline-flex; gap: 8px; }
@media print {
  html, body { background: #ffffff !important; color: #111827 !important; }
  .policy-print-screen { padding: 0; background: #ffffff; min-height: 0; }
  .policy-print-toolbar, .policy-print-hide { display: none !important; }
  .policy-print { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; border-radius: 0; }
  .policy-print-watermark { position: fixed; }
  .policy-print-content a { color: #111827; }
}
@media (max-width: 820px) {
  .policy-print { padding: 10mm 8mm; min-height: 0; }
  .policy-print-tip { display: none; }
}
`
