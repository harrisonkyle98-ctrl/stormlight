"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { useState, useRef, useEffect } from "react"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

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

interface RunePixelsTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
}

type CaretPosition = 'top' | 'bottom' | 'left' | 'right';

export const RunePixelsTooltip = ({ content, children, disabled = false }: RunePixelsTooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [caretPosition, setCaretPosition] = useState<CaretPosition>('bottom');
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = (event: MouseEvent) => {
    if (tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current;
      const tooltipRect = tooltip.getBoundingClientRect();
      
      let x = event.clientX + 10;
      let y = event.clientY - tooltipRect.height - 10;
      let caret: CaretPosition = 'bottom';
      
      if (x + tooltipRect.width > window.innerWidth) {
        x = event.clientX - tooltipRect.width - 10;
        caret = 'right';
      }
      
      if (y < 0) {
        y = event.clientY + 10;
        caret = 'top';
      }
      
      if (x < 0) {
        x = event.clientX + 10;
        caret = 'left';
      }
      
      setPosition({ x, y });
      setCaretPosition(caret);
    }
  };

  const handleMouseEnter = (event: MouseEvent) => {
    if (disabled) return;
    setIsVisible(true);
    updatePosition(event);
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (disabled || !isVisible) return;
    updatePosition(event);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    trigger.addEventListener('mouseenter', handleMouseEnter);
    trigger.addEventListener('mousemove', handleMouseMove);
    trigger.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      trigger.removeEventListener('mouseenter', handleMouseEnter);
      trigger.removeEventListener('mousemove', handleMouseMove);
      trigger.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [disabled, isVisible]);

  const getCaretStyles = (): React.CSSProperties => {
    const caretSize = 6;
    const borderColor = 'rgb(54, 57, 73)';
    
    switch (caretPosition) {
      case 'top':
        return {
          position: 'absolute',
          top: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: `${caretSize}px solid transparent`,
          borderRight: `${caretSize}px solid transparent`,
          borderBottom: `${caretSize}px solid ${borderColor}`,
        };
      case 'bottom':
        return {
          position: 'absolute',
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: `${caretSize}px solid transparent`,
          borderRight: `${caretSize}px solid transparent`,
          borderTop: `${caretSize}px solid ${borderColor}`,
        };
      case 'left':
        return {
          position: 'absolute',
          left: '-6px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 0,
          height: 0,
          borderTop: `${caretSize}px solid transparent`,
          borderBottom: `${caretSize}px solid transparent`,
          borderRight: `${caretSize}px solid ${borderColor}`,
        };
      case 'right':
        return {
          position: 'absolute',
          right: '-6px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 0,
          height: 0,
          borderTop: `${caretSize}px solid transparent`,
          borderBottom: `${caretSize}px solid transparent`,
          borderLeft: `${caretSize}px solid ${borderColor}`,
        };
      default:
        return {};
    }
  };

  return (
    <>
      <div ref={triggerRef} className="contents">
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed pointer-events-none z-50 transition-opacity duration-200"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            background: 'rgba(0, 0, 0, 0.13)',
            border: '1px solid rgb(54, 57, 73)',
            borderRadius: '14px',
            padding: '15px 10px',
            fontSize: '13px',
            color: 'rgb(153, 153, 153)',
            maxWidth: '300px',
            backdropFilter: 'blur(10px)',
            opacity: isVisible ? 1 : 0,
          }}
        >
          {content}
          <div style={getCaretStyles()} />
        </div>
      )}
    </>
  );
};

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
