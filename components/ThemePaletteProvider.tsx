"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePaletteId = "default" | "kodama" | "starry-night" | "bubblegum";

type ThemePaletteContextValue = {
  palette: ThemePaletteId;
  setPalette: (palette: ThemePaletteId) => void;
};

const STORAGE_KEY = "ui.themePalette";

const ThemePaletteContext = createContext<ThemePaletteContextValue | null>(null);

function applyPaletteClass(palette: ThemePaletteId) {
  const root = document.documentElement;
  // Remove any existing theme- classes
  const classesToRemove: string[] = [];
  root.classList.forEach((cls) => {
    if (cls.startsWith("theme-")) classesToRemove.push(cls);
  });
  classesToRemove.forEach((c) => root.classList.remove(c));
  // Add the desired class (except for default)
  if (palette !== "default") {
    root.classList.add(`theme-${palette}`);
  }
}

export function ThemePaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = useState<ThemePaletteId>("default");

  // Load initial value from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemePaletteId | null;
      if (stored === "kodama" || stored === "default" || stored === "starry-night" || stored === "bubblegum") {
        setPaletteState(stored);
        applyPaletteClass(stored);
      } else {
        applyPaletteClass("default");
      }
    } catch {
      applyPaletteClass("default");
    }
  }, []);

  // Persist and apply on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, palette);
    } catch {}
    try {
      applyPaletteClass(palette);
    } catch {}
  }, [palette]);

  const setPalette = useCallback((value: ThemePaletteId) => {
    setPaletteState(value);
  }, []);

  const value = useMemo<ThemePaletteContextValue>(() => ({ palette, setPalette }), [palette, setPalette]);

  return <ThemePaletteContext.Provider value={value}>{children}</ThemePaletteContext.Provider>;
}

export function useThemePalette(): ThemePaletteContextValue {
  const ctx = useContext(ThemePaletteContext);
  if (!ctx) throw new Error("useThemePalette must be used within ThemePaletteProvider");
  return ctx;
}


