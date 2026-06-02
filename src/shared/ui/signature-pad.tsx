import * as React from "react"
import { Trash2, Download } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "./button"

interface SignaturePadProps {
  onChange?: (dataUrl: string | null) => void
  width?: number
  height?: number
  penColor?: string
  disabled?: boolean
  className?: string
}

export function SignaturePad({
  onChange, width = 400, height = 160, penColor = "#1e293b", disabled, className,
}: SignaturePadProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const drawing = React.useRef(false)
  const [isEmpty, setIsEmpty] = React.useState(true)

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ("touches" in e) {
      const touch = e.touches[0]
      if (!touch) return { x: 0, y: 0 }
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return
    e.preventDefault()
    drawing.current = true
    const ctx = canvasRef.current!.getContext("2d")!
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current || disabled) return
    e.preventDefault()
    const ctx = canvasRef.current!.getContext("2d")!
    ctx.strokeStyle = penColor
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setIsEmpty(false)
  }

  const stop = () => {
    if (!drawing.current) return
    drawing.current = false
    onChange?.(isEmpty ? null : canvasRef.current!.toDataURL())
  }

  const clear = () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
    onChange?.(null)
  }

  const download = () => {
    const link = document.createElement("a")
    link.download = "signature.png"
    link.href = canvasRef.current!.toDataURL()
    link.click()
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn(
        "relative rounded-lg border-2 border-dashed border-border bg-background overflow-hidden",
        !disabled && "cursor-crosshair",
        disabled && "opacity-50"
      )}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full touch-none"
          onMouseDown={start}
          onMouseMove={draw}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchStart={start}
          onTouchMove={draw}
          onTouchEnd={stop}
        />
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Sign here</p>
          </div>
        )}
        {/* Baseline */}
        <div className="absolute bottom-8 left-6 right-6 border-t border-muted-foreground/20" />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={clear} disabled={isEmpty || disabled}>
          <Trash2 className="h-4 w-4 mr-1" />Clear
        </Button>
        <Button size="sm" variant="outline" onClick={download} disabled={isEmpty || disabled}>
          <Download className="h-4 w-4 mr-1" />Save
        </Button>
      </div>
    </div>
  )
}
