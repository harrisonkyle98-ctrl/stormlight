"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"

interface RunePixelsTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
}

export const RunePixelsTooltip = ({ content, children, disabled = false }: RunePixelsTooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = (event: MouseEvent) => {
    if (tooltipRef.current) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();
      
      let x = event.clientX + 10;
      let y = event.clientY - rect.height - 10;
      
      if (x + rect.width > window.innerWidth) {
        x = event.clientX - rect.width - 10;
      }
      if (y < 0) {
        y = event.clientY + 10;
      }
      
      setPosition({ x, y });
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

  return (
    <>
      <div ref={triggerRef} className="inline-block">
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
        </div>
      )}
    </>
  );
};
