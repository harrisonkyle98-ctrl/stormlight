import * as React from "react"
import { cn } from "@/lib/utils"

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "w-6 h-6 border-2",
      md: "w-10 h-10 border-3",
      lg: "w-16 h-16 border-4"
    }

    return (
      <div
        ref={ref}
        className={cn(
          "inline-block rounded-full border-solid border-theme-accent border-t-transparent animate-spin",
          sizeClasses[size],
          className
        )}
        role="status"
        aria-label="Loading"
        {...props}
      />
    )
  }
)
Spinner.displayName = "Spinner"

export { Spinner }
