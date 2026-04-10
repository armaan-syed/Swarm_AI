import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "accent-yellow" | "accent-coral" | "accent-lime" | "accent-blue" | "dark";
}

export function Card({ variant = "default", className = "", children, ...props }: CardProps) {
  const variantClasses = {
    default: "bg-[var(--color-neo-surface-card)] text-[var(--color-neo-fg-primary)]",
    "accent-yellow": "bg-[var(--color-neo-accent-yellow)] text-[var(--color-neo-fg-primary)]",
    "accent-coral": "bg-[var(--color-neo-accent-coral)] text-white",
    "accent-lime": "bg-[var(--color-neo-accent-lime)] text-[var(--color-neo-fg-primary)]",
    "accent-blue": "bg-[#0066FF] text-white",
    dark: "bg-[var(--color-neo-bg-inverse)] text-[var(--color-neo-fg-inverse)]",
  };

  return (
    <div
      className={`border-neo p-6 rounded-none shadow-[6px_6px_0px_#0A0A0A] transition-all hover:shadow-[10px_10px_0px_#0A0A0A] hover:-translate-x-[4px] hover:-translate-y-[4px] ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
