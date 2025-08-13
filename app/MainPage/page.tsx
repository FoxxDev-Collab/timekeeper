"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAuth } from "@/components/AuthProvider";
import AppShell from "@/components/AppShell";

type WeekRow = {
  projectCodeId: number;
  projectCode: string;
  allotted: number;
  days: Record<string, number>;
  total: number;
  remaining: number;
};

type WeekSlice = {
  weekIndex: number;
  startDate: string;
  endDate: string;
  rows: WeekRow[];
};

function WeekTable() {
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [weeks, setWeeks] = useState<WeekSlice[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const currentDate = useMemo(() => new Date(month + "-01T00:00:00Z"), [month]);

  const monthLabel = useMemo(() =>
    currentDate.toLocaleString(undefined, { month: "long", year: "numeric", timeZone: "UTC" }),
    [currentDate],
  );

  const changeMonth = (delta: number) => {
    const d = new Date(currentDate);
    d.setUTCMonth(d.getUTCMonth() + delta);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    setMonth(`${y}-${m}`);
  };

  const setMonthFromParts = (year: number, monthIndexZeroBased: number) => {
    const y = year;
    const m = String(monthIndexZeroBased + 1).padStart(2, "0");
    setMonth(`${y}-${m}`);
  };

  useEffect(() => {
    const load = async () => {
      const data = await invoke<WeekSlice[]>("get_weeks", { month });
      setWeeks(data);
    };
    void load();
  }, [month]);

  const keyFor = (projectCodeId: number, date: string) => `${projectCodeId}|${date}`;

  const commitHours = async (projectCodeId: number, date: string) => {
    const key = keyFor(projectCodeId, date);
    const raw = editingValues[key];
    const hours = Number(raw === undefined || raw === "" ? 0 : raw);
    await invoke<void>("set_day_hours", { projectCodeId: projectCodeId, date, hours });
    const data = await invoke<WeekSlice[]>("get_weeks", { month });
    setWeeks(data);
    setEditingValues((prev) => {
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  };

  if (!weeks.length) return null;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-muted">
      <CardContent className="pt-6">
        <div className="mb-4">
          <div className="relative">
            <div className="flex items-center justify-between">
              <Button size="icon" variant="secondary" onClick={() => changeMonth(-1)} aria-label="Previous month">
                ←
              </Button>
              <button
                type="button"
                className="text-lg font-semibold px-3 py-1 rounded-md hover:bg-muted"
                onClick={() => setPickerOpen((v) => !v)}
                aria-haspopup="dialog"
                aria-expanded={pickerOpen}
              >
                {monthLabel}
              </button>
              <Button size="icon" variant="secondary" onClick={() => changeMonth(1)} aria-label="Next month">
                →
              </Button>
            </div>

            {pickerOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 z-20 bg-popover border border-border rounded-md shadow-lg p-3 w-[500px]">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Label className="text-sm">Select month</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const now = new Date();
                        const y = now.getUTCFullYear();
                        const m0 = now.getUTCMonth();
                        setMonthFromParts(y, m0);
                        setPickerOpen(false);
                      }}
                    >
                      Current
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPickerOpen(false)}>
                      Close
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const d = new Date(Date.UTC(currentDate.getUTCFullYear(), i, 1));
                    const label = d.toLocaleString(undefined, { month: "short", timeZone: "UTC" });
                    const active = i === currentDate.getUTCMonth();
                    return (
                      <button
                        key={`month-${i}`}
                        type="button"
                        onClick={() => setMonthFromParts(currentDate.getUTCFullYear(), i)}
                        className={cn(
                          "px-2 py-1 rounded-md text-sm border",
                          active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted border-border",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Button size="sm" variant="secondary" onClick={() => changeMonth(-12)}>
                    − Year
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    {currentDate.getUTCFullYear()}
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => changeMonth(12)}>
                    + Year
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {weeks.map((week) => {
            const weekStart = new Date(week.startDate + "T00:00:00Z");
            const dates: string[] = Array.from({ length: 7 }).map((_, i) => {
              const d = new Date(weekStart);
              d.setUTCDate(d.getUTCDate() + i);
              return d.toISOString().slice(0, 10);
            });

            const dayName = (dateStr: string) => {
              const d = new Date(dateStr + "T00:00:00Z");
              return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
            };

            return (
              <div key={`week-${week.startDate}-${week.endDate}`} className="overflow-auto">
                <div className="text-sm text-muted-foreground mb-2">
                  Week {week.weekIndex}: {week.startDate} - {week.endDate}
                </div>
                <table className="w-full text-left border-collapse border-spacing-0">
                  <thead>
                    <tr className="text-muted-foreground text-sm">
                      <th className="px-0.5 py-1 w-20">Project</th>
                      <th className="px-0.5 py-1 w-20">Allotted Hrs</th>
                      {dates.map((d) => (
                        <th key={`head-${d}`} className="px-0.5 py-1 w-16">
                          <div className="font-medium">{dayName(d)}</div>
                          <div className="text-xs text-muted-foreground">{d}</div>
                        </th>
                      ))}
                      <th className="px-0.5 py-1 w-16">Total</th>
                      <th className="px-0.5 py-1 w-20">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {week.rows.map((row) => (
                      <tr key={`row-${row.projectCodeId}`} className="border-t border-border">
                        <td className="px-0.5 py-1 font-mono text-sm">{row.projectCode}</td>
                        <td className="px-0.5 py-1">{row.allotted.toFixed(2)}</td>
                        {dates.map((d) => {
                          const inMonth = d.slice(0, 7) === month;
                          const val = row.days[d] ?? 0;
                          const k = keyFor(row.projectCodeId, d);
                          return (
                            <td key={`cell-${row.projectCodeId}-${d}`} className="px-0.5 py-1">
                              {inMonth ? (
                                <Input
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  value={editingValues[k] ?? String(val)}
                                  onChange={(e) =>
                                    setEditingValues((prev) => ({ ...prev, [k]: e.target.value }))
                                  }
                                  onBlur={() => void commitHours(row.projectCodeId, d)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      (e.target as HTMLInputElement).blur();
                                    } else if (e.key === "Escape") {
                                      setEditingValues((prev) => {
                                        const { [k]: _removed, ...rest } = prev;
                                        return rest;
                                      });
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  className="w-[60px] h-7"
                                />
                              ) : (
                                <div className="w-[60px] h-7 rounded-md bg-muted/40 border border-border/50 flex items-center justify-center text-muted-foreground text-xs select-none">
                                  —
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-0.5 py-1">{row.total.toFixed(2)}</td>
                        <td className={cn("px-0.5 py-1", row.remaining < 0 ? "text-red-600" : "")}>{row.remaining.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MainPage() {
  // simple guard to ensure UI waits for auth effect
  useAuth();
  return (
    <AppShell>
      <WeekTable />
    </AppShell>
  );
}


