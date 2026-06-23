import * as React from 'react'
import { clearUiTrace, downloadUiTrace, getUiTraceBuffer, startDevUiTrace, traceUi } from '@/dev/ui-trace'

/**
 * Floating dev chip: automatic UI trace is always on in DEV.
 * Export JSONL and attach when reporting bugs to engineering / AI.
 */
export function DevUiTraceChip() {
  const [count, setCount] = React.useState(0)
  const [minimized, setMinimized] = React.useState(true)

  React.useEffect(() => {
    startDevUiTrace()
    const id = window.setInterval(() => setCount(getUiTraceBuffer().length), 800)
    return () => window.clearInterval(id)
  }, [])

  if (!import.meta.env.DEV) return null

  return (
    <div
      className="fixed bottom-3 left-3 z-[9999] flex flex-col items-start gap-1 rounded-lg border border-border bg-card/95 p-2 text-xs shadow-lg backdrop-blur-sm"
      data-testid="dev-ui-trace-chip"
    >
      <button
        type="button"
        className="font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setMinimized((m) => !m)}
      >
        UI trace ({count}) {minimized ? '▸' : '▾'}
      </button>
      {!minimized ? (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className="rounded border border-border px-2 py-0.5 hover:bg-muted"
            onClick={() => downloadUiTrace()}
          >
            Export log
          </button>
          <button
            type="button"
            className="rounded border border-border px-2 py-0.5 hover:bg-muted"
            onClick={() => {
              clearUiTrace()
              setCount(0)
            }}
          >
            Clear
          </button>
          <button
            type="button"
            className="rounded border border-border px-2 py-0.5 hover:bg-muted"
            onClick={() => traceUi('SYSTEM', 'marker', { note: 'user_marked_moment' })}
          >
            Mark
          </button>
        </div>
      ) : null}
    </div>
  )
}
