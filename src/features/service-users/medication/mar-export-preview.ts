/** Adjust server MAR HTML for optional print-only sections (export file is unchanged). */
export function patchMarExportPreviewHtml(
  html: string,
  options: { includeHeader?: boolean; includeLegend?: boolean },
): string {
  let out = html
  if (options.includeLegend === false) {
    out = out.replace(/<div class="legend-block">[\s\S]*?<\/div>\s*/i, '')
  }
  if (options.includeHeader === false) {
    out = out.replace(/<p class="org">[\s\S]*?<\/p>\s*/i, '')
    out = out.replace(/<h1>[\s\S]*?<\/h1>\s*/i, '')
    out = out.replace(/<p class="sub">[\s\S]*?<\/p>\s*/i, '')
    out = out.replace(/<div class="meta">[\s\S]*?<\/div>\s*/i, '')
  }
  return out
}
