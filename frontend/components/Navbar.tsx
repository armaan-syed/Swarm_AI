import React from "react";

export function Navbar() {
  return (
    <nav className="h-[64px] bg-[var(--color-neo-bg-base)] border-b-[3px] border-[var(--color-neo-border-default)] px-8 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 bg-[var(--color-neo-accent-blue)] border-2 border-[#0A0A0A] shadow-[2px_2px_0px_#0A0A0A] flex items-center justify-center">
          <span className="font-heading font-black text-white text-xs">AC</span>
        </div>
        <h1 className="font-heading font-black uppercase text-xl hidden sm:block">
          Autonomous Compliance
        </h1>
      </div>
      <div className="font-mono text-sm tracking-tighter flex gap-4">
        <span className="bg-[#FFE500] border-2 border-[#0A0A0A] px-3 py-1 font-bold">SYSTEM ACTIVE</span>
      </div>
    </nav>
  );
}
