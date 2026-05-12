import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "./badge"

interface DiffLine {
  type: "added" | "removed" | "unchanged"
  content: string
  lineNum?: { old?: number; new?: number }
}

interface DiffViewerProps {
  oldContent: string
  newContent: string
  oldLabel?: string
  newLabel?: string
  unified?: boolean
  className?: string
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n")
  const newLines = newText.split("\n")
  const result: DiffLine[] = []

  // Simple LCS-based diff (sufficient for care notes)
  const m = oldLines.length, n = newLines.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = oldLines[i] === newLines[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1])

  let i = 0, j = 0, oldNum = 1, newNum = 1
  while (i < m || j < n) {
    if (i < m && j < n && oldLines[i] === newLines[j]) {
      result.push({ type: "unchanged", content: oldLines[i], lineNum: { old: oldNum++, new: newNum++ } })
      i++; j++
    } else if (j < n && (i >= m || dp[i][j+1] >= dp[i+1][j])) {
      result.push({ type: "added", content: newLines[j], lineNum: { new: newNum++ } })
      j++
    } else {
      result.push({ type: "removed", content: oldLines[i], lineNum: { old: oldNum++ } })
      i++
    }
  }
  return result
}

export function DiffViewer({ oldContent, newContent, oldLabel = "Before", newLabel = "After", unified = true, className }: DiffViewerProps) {
  const diff = React.useMemo(() => computeDiff(oldContent, newContent), [oldContent, newContent])
  const added = diff.filter(l => l.type === "added").length
  const removed = diff.filter(l => l.type === "removed").length

  return (
    <div className={cn("rounded-xl border border-border overflow-hidden font-mono text-xs bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium font-sans">{oldLabel} → {newLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {added > 0 && <Badge variant="success" size="sm">+{added} added</Badge>}
          {removed > 0 && <Badge variant="destructive" size="sm">−{removed} removed</Badge>}
        </div>
      </div>

      {/* Diff lines */}
      <div className="overflow-auto max-h-96">
        <table className="w-full border-collapse">
          <tbody>
            {diff.map((line, i) => (
              <tr key={i} className={cn(
                "border-b border-border/30 last:border-b-0",
                line.type === "added" && "bg-success/8",
                line.type === "removed" && "bg-destructive/8",
              )}>
                {/* Old line number */}
                <td className={cn("select-none w-10 border-r border-border/30 px-2 py-0.5 text-right text-muted-foreground/60", line.type === "added" && "bg-success/5")}>
                  {line.lineNum?.old ?? ""}
                </td>
                {/* New line number */}
                <td className={cn("select-none w-10 border-r border-border px-2 py-0.5 text-right text-muted-foreground/60", line.type === "removed" && "bg-destructive/5")}>
                  {line.lineNum?.new ?? ""}
                </td>
                {/* Symbol */}
                <td className={cn("select-none w-6 px-2 py-0.5 font-bold",
                  line.type === "added" && "text-success",
                  line.type === "removed" && "text-destructive",
                  line.type === "unchanged" && "text-muted-foreground/40"
                )}>
                  {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
                </td>
                {/* Content */}
                <td className={cn("px-3 py-0.5 whitespace-pre-wrap break-all",
                  line.type === "added" && "text-success",
                  line.type === "removed" && "text-destructive",
                  line.type === "unchanged" && "text-foreground/80"
                )}>
                  {line.content || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
