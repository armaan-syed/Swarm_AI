import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="font-label font-bold uppercase tracking-wider text-sm">{label}</label>}
      <input
        className={`bg-white border-neo border-[3px] rounded-none px-[14px] py-[10px] font-mono text-sm text-[#0A0A0A] outline-none shadow-[4px_4px_0px_#0A0A0A] focus:shadow-[6px_6px_0px_#0066FF] focus:border-[var(--color-neo-accent-blue)] transition-all placeholder:text-[#888] placeholder:italic ${error ? 'border-[var(--color-neo-accent-coral)] shadow-[4px_4px_0px_#FF4D4D] focus:shadow-[6px_6px_0px_#FF4D4D] focus:border-[var(--color-neo-accent-coral)]' : ''} ${className}`}
        {...props}
      />
      {error && <span className="font-mono text-xs text-[var(--color-neo-accent-coral)] font-bold">{error}</span>}
    </div>
  );
}
