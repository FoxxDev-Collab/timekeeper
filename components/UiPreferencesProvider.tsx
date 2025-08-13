"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type UiPreferences = {
  scale: number;
  setScale: (value: number) => void;
  adjustScale: (delta: number) => void;
  minScale: number;
  maxScale: number;
};

const MIN_SCALE = 0.8;
const MAX_SCALE = 1.6;

const UiPreferencesContext = createContext<UiPreferences | null>(null);

export function UiPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScaleState] = useState<number>(1);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ui.scale");
      if (stored) {
        const parsed = Number(stored);
        if (Number.isFinite(parsed)) {
          setScaleState(Math.min(MAX_SCALE, Math.max(MIN_SCALE, parsed)));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ui.scale", String(scale));
    } catch {}
  }, [scale]);

  const setScale = (value: number) => {
    setScaleState(() => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value)));
  };

  const adjustScale = (delta: number) => {
    setScaleState((s) => {
      const next = Math.round((s + delta) * 10) / 10;
      return Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    });
  };

  const value = useMemo<UiPreferences>(
    () => ({ scale, setScale, adjustScale, minScale: MIN_SCALE, maxScale: MAX_SCALE }),
    [scale],
  );

  return <UiPreferencesContext.Provider value={value}>{children}</UiPreferencesContext.Provider>;
}

export function useUiPreferences(): UiPreferences {
  const ctx = useContext(UiPreferencesContext);
  if (!ctx) {
    throw new Error("useUiPreferences must be used within UiPreferencesProvider");
  }
  return ctx;
}


