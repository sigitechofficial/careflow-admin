/**
 * Print set-up for a full-page print view (paper copy, poster): A4 in the given orientation, and
 * the app's fixed-height, scroll-locked page let go so every page prints. Only while it is shown.
 */
export function PrintPageStyles({ orientation }: { orientation: 'portrait' | 'landscape' }) {
  return (
    <style>{`@media print {
  @page { size: A4 ${orientation}; margin: ${orientation === 'portrait' ? '14mm 12mm' : '10mm'}; }
  html, body, #root { height: auto !important; max-height: none !important; overflow: visible !important; background: #fff !important; }
}`}</style>
  )
}
