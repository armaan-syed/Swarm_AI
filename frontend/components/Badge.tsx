import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "yellow" | "lime" | "coral" | "blue" | "dark" | "success" | "warning" | "error" | "danger";
}

export function Badge({ variant = "default", className = "", children, ...props }: BadgeProps) {
  const baseClasses = "inline-flex border-2 border-[var(--color-neo-border-default)] rounded-none font-label font-bold uppercase tracking-wider px-2 py-0.5 text-[0.7rem]";
  
  const variantMap: Record<string, string> = {
    default: "bg-[var(--color-neo-bg-base)] text-[var(--color-neo-fg-primary)]",
    yellow: "bg-[var(--color-neo-accent-yellow)] text-[var(--color-neo-fg-primary)]",
    lime: "bg-[var(--color-neo-accent-lime)] text-[var(--color-neo-fg-primary)]",
    coral: "bg-[var(--color-neo-accent-coral)] text-white",
    blue: "bg-[var(--color-neo-accent-blue)] text-white",
    dark: "bg-[var(--color-neo-bg-inverse)] text-[var(--color-neo-fg-inverse)]",
    success: "bg-[var(--color-neo-success)] text-white",
    warning: "bg-[var(--color-neo-warning)] text-[var(--color-neo-fg-primary)]",
    error: "bg-[var(--color-neo-error)] text-white",
    danger: "bg-[#FF4D4D] text-white",
  };

  return (
    <span className={`${baseClasses} ${variantMap[variant] || variantMap.default} ${className}`} {...props}>
      {children}
    </span>
  );
}
