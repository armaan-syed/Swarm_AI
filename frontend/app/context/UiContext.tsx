"use client";

import React, { createContext, useContext, useState } from "react";

interface UiContextType {
  settingsOpen: boolean;
  toggleSettings: () => void;
  closeSettings: () => void;
}

const UiContext = createContext<UiContextType | undefined>(undefined);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const toggleSettings = () => setSettingsOpen((prev) => !prev);
  const closeSettings = () => setSettingsOpen(false);

  return (
    <UiContext.Provider value={{ settingsOpen, toggleSettings, closeSettings }}>
      {children}
    </UiContext.Provider>
  );
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi must be used within UiProvider");
  return ctx;
}
