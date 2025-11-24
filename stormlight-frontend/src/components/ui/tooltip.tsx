"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"
import { AdvancedTooltip, TooltipRow } from './tooltip-advanced'

const TooltipProvider = TooltipPrimitive.Provider

const RadixTooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-zinc-50 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-tooltip-content-transform-origin] dark:bg-zinc-50 dark:text-zinc-900",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

interface TooltipProps {
  content?: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  description?: string | React.ReactNode;
  rows?: TooltipRow[];
  footerText?: string;
  imageSrc?: string;
  placement?: 'top' | 'bottom';
  className?: string;
  headerTag?: React.ReactNode;
}

export const Tooltip = ({ 
  content, 
  children, 
  title,
  description,
  rows,
  footerText,
  imageSrc,
  placement = 'top',
  className,
  headerTag
}: TooltipProps) => {
  if (title || rows || footerText) {
    return (
      <AdvancedTooltip
        title={title || ''}
        description={description}
        rows={rows}
        footerText={footerText}
        imageSrc={imageSrc}
        placement={placement}
        className={className}
        headerTag={headerTag}
      >
        {children}
      </AdvancedTooltip>
    )
  }

  return (
    <AdvancedTooltip
      title=""
      description={content}
      placement={placement}
      className={className}
    >
      {children}
    </AdvancedTooltip>
  );
};

export { RadixTooltip, TooltipTrigger, TooltipContent, TooltipProvider }
export type { TooltipRow }
