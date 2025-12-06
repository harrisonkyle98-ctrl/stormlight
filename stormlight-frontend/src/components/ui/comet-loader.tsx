import * as React from "react"
import { cn } from "@/lib/utils"
import "./comet-loader.css"

interface CometLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number
}

const CometLoader = React.forwardRef<HTMLDivElement, CometLoaderProps>(
  ({ className, size = 48, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("comet-loader", className)}
        style={{ width: size, height: size, ...style }}
        role="status"
        aria-label="Loading"
        {...props}
      >
        <div className="comet-loader__glow" />
        <div className="comet-loader__track">
          <div className="comet-loader__trail" />
          <div className="comet-loader__head" />
        </div>
      </div>
    )
  }
)
CometLoader.displayName = "CometLoader"

export { CometLoader }
