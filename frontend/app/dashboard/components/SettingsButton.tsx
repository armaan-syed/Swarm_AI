"use client";

import React from "react";
import { useUi } from "@/app/context/UiContext";

export function SettingsButton() {
  const { toggleSettings } = useUi();

  return (
    <button
      onClick={toggleSettings}
      className="fixed bottom-6 left-6 w-12 h-12 bg-[#0A0A0A] text-[#FFFEF2] border-[3px] border-[#0A0A0A] rounded-none shadow-[4px_4px_0px_#0A0A0A] hover:shadow-[6px_6px_0px_#0A0A0A] hover:-translate-x-[2px] hover:-translate-y-[2px] active:shadow-[1px_1px_0px_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] transition-all flex items-center justify-center font-display font-black text-lg z-40"
      title="Settings"
    >
      ⚙️
    </button>
  );
}
