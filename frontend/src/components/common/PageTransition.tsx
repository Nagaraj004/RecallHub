import React, { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export default function PageTransition({ children, className = "" }: PageTransitionProps) {
  return (
    <div
      className={`animate-[pageEnter_200ms_cubic-bezier(0.16,1,0.3,1)_forwards] ${className}`}
      style={{
        animationDuration: "200ms",
        animationFillMode: "both",
      }}
    >
      {children}
    </div>
  );
}

export function StaggerContainer({
  children,
  className = "",
  staggerMs = 40,
}: {
  children: ReactNode;
  className?: string;
  staggerMs?: number;
}) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        return (
          <div
            style={{
              animation: "cardFadeUp 300ms cubic-bezier(0.16, 1, 0.3, 1) both",
              animationDelay: `${index * staggerMs}ms`,
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}
