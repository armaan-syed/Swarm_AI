import React from "react";

interface UploadBoxProps {
  label: string;
  icon?: string;
}

export function UploadBox({ label, icon = "📄" }: UploadBoxProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-heading font-black uppercase text-sm tracking-tight">{label}</span>
      <div className="h-32 bg-[var(--color-neo-bg-alt)] border-4 border-dashed border-[#0A0A0A] flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--color-neo-surface-elevated)] hover:shadow-[inset_4px_4px_0px_#0A0A0A] transition-all group">
        <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{icon}</span>
        <span className="font-mono text-xs font-bold text-[#3D3D3D]">Drag files here or <span className="text-[var(--color-neo-accent-blue)] underline">Browse</span></span>
      </div>
    </div>
  );
}
