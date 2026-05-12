import * as React from "react"
import { Group as PanelGroup, Panel, Separator } from "react-resizable-panels"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

const ResizablePanelGroup = ({ className, ...props }: React.ComponentProps<typeof PanelGroup>) => (
  <PanelGroup className={cn("flex h-full w-full data-[panel-group-orientation=vertical]:flex-col", className)} {...props} />
)

const ResizablePanel = Panel

interface ResizableHandleProps extends React.ComponentProps<typeof Separator> {
  withHandle?: boolean
  className?: string
}

const ResizableHandle = ({ withHandle, className, ...props }: ResizableHandleProps) => (
  <Separator
    className={cn(
      "relative flex w-px items-center justify-center bg-border",
      "after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
      "data-[panel-group-orientation=vertical]:h-px data-[panel-group-orientation=vertical]:w-full",
      "hover:bg-primary/20 transition-colors cursor-col-resize",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-6 w-3.5 items-center justify-center rounded-sm border border-border bg-background">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </Separator>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
