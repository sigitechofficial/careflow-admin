type McaSnapshotRow = {
  questionText?: string
  answer?: {
    booleanValue?: boolean | null
    textValue?: string | null
    checked?: boolean | null
  } | null
}

export function AssessmentMcaSnapshotView({ snapshot }: { snapshot: unknown }) {
  const rows = Array.isArray(snapshot) ? (snapshot as McaSnapshotRow[]) : []
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No MCA screening answers recorded.</p>
  }

  return (
    <div className="space-y-3 p-3">
      {rows.map((row, index) => {
        const text = row.questionText?.trim() || `Question ${index + 1}`
        const answer = formatMcaAnswer(row.answer)
        return (
          <div key={`${text}-${index}`} className="rounded-md border border-border/60 bg-white/80 p-3">
            <p className="text-sm font-medium text-foreground">{text}</p>
            <p className="mt-1 text-sm text-muted-foreground">{answer}</p>
          </div>
        )
      })}
    </div>
  )
}

function formatMcaAnswer(answer: McaSnapshotRow['answer']): string {
  if (!answer) return '—'
  if (answer.booleanValue === true) return 'Yes'
  if (answer.booleanValue === false) return 'No'
  if (answer.checked === true) return 'Yes'
  if (answer.checked === false) return 'No'
  if (answer.textValue?.trim()) return answer.textValue.trim()
  return '—'
}
