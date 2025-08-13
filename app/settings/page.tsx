"use client";

import { useTheme } from "next-themes";
import { useThemePalette } from "@/components/ThemePaletteProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";

type PaletteItem = {
  id: "default" | "kodama" | "starry-night" | "bubblegum";
  name: string;
  className?: string; // e.g., "theme-kodama"
  description?: string;
};

const PALETTES: PaletteItem[] = [
  { id: "default", name: "Default", className: "theme-default", description: "Project default colors" },
  { id: "kodama", name: "Kodama", className: "theme-kodama", description: "Serif-forward, green accents" },
  { id: "starry-night", name: "Starry Night", className: "theme-starry-night", description: "Deep blues with gold accents" },
  { id: "bubblegum", name: "Bubblegum", className: "theme-bubblegum", description: "Playful pinks with teal/blue accents" },
];

function PalettePreview({ className }: { className?: string }) {
  return (
    <div className={`rounded-md border p-3 ${className ?? ""}`}>
      <div className="grid grid-cols-5 gap-2">
        <div className="h-8 w-full rounded" style={{ background: "var(--primary)" }} />
        <div className="h-8 w-full rounded" style={{ background: "var(--secondary)" }} />
        <div className="h-8 w-full rounded" style={{ background: "var(--accent)" }} />
        <div className="h-8 w-full rounded" style={{ background: "var(--muted)" }} />
        <div className="h-8 w-full rounded" style={{ background: "var(--ring)" }} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded border bg-card p-2 text-card-foreground">Card</div>
        <div className="rounded border bg-popover p-2 text-popover-foreground">Popover</div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  useAuth();
  const { theme, setTheme, systemTheme } = useTheme();
  const { palette, setPalette } = useThemePalette();
  const isDark = (theme === "system" ? systemTheme : theme) === "dark";

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl p-6">
      <h1 className="mb-2 text-xl font-semibold">Settings</h1>
      <p className="mb-6 text-sm text-muted-foreground">Choose your color theme and appearance.</p>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        <TabsContent value="appearance" className="space-y-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium">Mode</h2>
                <p className="text-xs text-muted-foreground">Switch between light and dark.</p>
              </div>
              <div className="flex gap-2">
                <Button variant={isDark ? "ghost" : "default"} size="sm" onClick={() => setTheme("light")}>Light</Button>
                <Button variant={isDark ? "default" : "ghost"} size="sm" onClick={() => setTheme("dark")}>Dark</Button>
                <Button variant={theme === "system" ? "default" : "ghost"} size="sm" onClick={() => setTheme("system")}>
                  System
                </Button>
              </div>
            </div>
          </Card>

          <Separator />

          <div className="space-y-3">
            <h2 className="text-sm font-medium">Color themes</h2>
            <p className="text-xs text-muted-foreground">Select a palette. More themes coming soon.</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {PALETTES.map((p) => (
                <Card key={p.id} className={`p-4 ${palette === p.id ? "ring-2 ring-ring" : ""}`}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{p.name}</div>
                      {p.description ? (
                        <div className="text-xs text-muted-foreground">{p.description}</div>
                      ) : null}
                    </div>
                    <Button size="sm" onClick={() => setPalette(p.id)} disabled={palette === p.id}>
                      {palette === p.id ? "Selected" : "Use theme"}
                    </Button>
                  </div>
                  <PalettePreview className={p.className} />
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </AppShell>
  );
}


