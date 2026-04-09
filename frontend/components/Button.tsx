import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "dark" | "accent";
  size?: "sm" | "md" | "lg" | "xl";
}

export function Button({ variant = "primary", size = "md", className = "", children, ...props }: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center font-heading font-black uppercase tracking-wider border-neo transition-all rounded-none";
  
  const sizeClasses = {
    sm: "px-[14px] py-[6px] text-xs",
    md: "px-[20px] py-[10px] text-sm",
    lg: "px-[28px] py-[14px] text-base",
    xl: "px-[36px] py-[18px] text-lg",
  };

  const variantClasses = {
    primary: "bg-[var(--color-neo-accent-yellow)] text-[var(--color-neo-fg-primary)]",
    secondary: "bg-[var(--color-neo-surface-card)] text-[var(--color-neo-fg-primary)]",
    danger: "bg-[var(--color-neo-accent-coral)] text-white",
    ghost: "bg-transparent text-[var(--color-neo-fg-primary)] border-transparent shadow-none hover:shadow-none hover:translate-x-0 hover:translate-y-0",
    dark: "bg-[var(--color-neo-bg-inverse)] text-[var(--color-neo-fg-inverse)]",
    accent: "bg-[var(--color-neo-accent-blue)] text-white",
  };

  const normalShadow = variant === "ghost" ? "" : "shadow-[4px_4px_0px_#0A0A0A] hover:shadow-[6px_6px_0px_#0A0A0A] hover:-translate-x-[2px] hover:-translate-y-[2px] active:shadow-[1px_1px_0px_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px]";

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${normalShadow} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
