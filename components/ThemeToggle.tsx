"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="w-full justify-start" aria-label="Toggle theme" disabled>
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = (theme === "system" ? systemTheme : theme) === "dark";

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
      <span>{isDark ? "Light mode" : "Dark mode"}</span>
    </Button>
  );
}

export default ThemeToggle;


