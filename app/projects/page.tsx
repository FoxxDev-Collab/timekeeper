"use client";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { invoke } from "@tauri-apps/api/core";
import { useAuth } from "@/components/AuthProvider";

type Project = { id: number; code: string; allotted: number };
type Allot = { month: string; allotted: number };

export default function ProjectsPage() {
  useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [code, setCode] = useState("");
  const [hours, setHours] = useState(0);
  const [selected, setSelected] = useState<Project | null>(null);
  const [allots, setAllots] = useState<Allot[]>([]);
  const defaultFy = (() => {
    const now = new Date();
    const m = now.getUTCMonth() + 1; // 1-12
    return m >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  })();
  const [fyStart, setFyStart] = useState<number>(defaultFy);
  const fiscalMonths = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < 12; i++) {
      const monthIndex = (6 + i) % 12; // July is 6 (0-based)
      const year = monthIndex >= 6 ? fyStart : fyStart + 1;
      const month = String(monthIndex + 1).padStart(2, "0");
      arr.push(`${year}-${month}`);
    }
    return arr;
  }, [fyStart]);
  const [draftAllots, setDraftAllots] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const items = await invoke<Project[]>("list_projects");
        setProjects(items);
      } catch {}
    };
    void load();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!selected) return;
      const rows = await invoke<Allot[]>("list_project_allotments", { projectCodeId: selected.id });
      setAllots(rows);
    };
    void load();
  }, [selected]);

  // initialize drafts from DB rows and ensure all fiscal months exist
  useEffect(() => {
    const map = Object.fromEntries(allots.map((a) => [a.month, a.allotted]));
    const initial: Record<string, number> = {};
    for (const m of fiscalMonths) initial[m] = map[m] ?? 0;
    setDraftAllots(initial);
  }, [allots, fiscalMonths]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await invoke<void>("add_project", { code, allotted: hours });
    setCode("");
    setHours(0);
    const items = await invoke<Project[]>("list_projects");
    setProjects(items);
  };

  const onUpdate = async (p: Project) => {
    await invoke<void>("update_project", { id: p.id, code: p.code });
    const items = await invoke<Project[]>("list_projects");
    setProjects(items);
  };

  const onDelete = async (id: number) => {
    await invoke<void>("delete_project", { id });
    if (selected?.id === id) {
      setSelected(null);
      setAllots([]);
    }
    const items = await invoke<Project[]>("list_projects");
    setProjects(items);
  };

  const onSaveAll = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await Promise.all(
        fiscalMonths.map((m) =>
          invoke<void>("set_project_month_allotment", {
            projectCodeId: selected.id,
            month: m,
            allotted: Number(draftAllots[m] || 0),
          })
        )
      );
      const rows = await invoke<Allot[]>("list_project_allotments", { projectCodeId: selected.id });
      setAllots(rows);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="p-4 grid gap-4">
        <Card>
          <CardContent className="pt-6">
            <form className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end" onSubmit={onAdd}>
              <div className="grid gap-2">
                <Label htmlFor="code">Project Code</Label>
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hours">Initial Allotted Hours</Label>
                <Input id="hours" type="number" step="0.25" min="0" value={hours} onChange={(e) => setHours(Number(e.target.value || 0))} />
              </div>
              <Button type="submit">Add Project</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-3">Existing Projects</div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-muted-foreground text-sm">
                  <th className="px-2 py-2">ID</th>
                  <th className="px-2 py-2">Code</th>
                  <th className="px-2 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-2 py-2 font-mono text-sm w-[100px]">{p.id}</td>
                    <td className="px-2 py-2 font-mono text-sm">
                      <Input value={p.code} onChange={(e) => setProjects((prev) => prev.map((q) => (q.id === p.id ? { ...q, code: e.target.value } : q)))} />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => onUpdate(p)}>Save</Button>
                        <Button variant="destructive" size="sm" onClick={() => onDelete(p.id)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="text-sm text-muted-foreground">Select Project to Manage Allotments</div>
              <Select value={selected?.id?.toString() ?? ""} onValueChange={(v) => setSelected(projects.find(p => p.id.toString() === v) ?? null)}>
                <SelectTrigger className="min-w-[220px]"><SelectValue placeholder="Choose project" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selected && <div className="text-xs text-muted-foreground">ID {selected.id}</div>}
              <div className="flex items-center gap-2 ml-auto">
                <Label htmlFor="fy" className="text-xs">Fiscal Year Start</Label>
                <Input id="fy" type="number" value={fyStart} onChange={(e) => setFyStart(Number(e.target.value || fyStart))} className="h-8 w-[120px]" />
                <Button size="sm" onClick={onSaveAll} disabled={!selected || saving}>{saving ? "Saving..." : "Save All"}</Button>
              </div>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-muted-foreground text-sm">
                  <th className="px-2 py-2">Month</th>
                  <th className="px-2 py-2">Allotted Hours</th>
                </tr>
              </thead>
              <tbody>
                {fiscalMonths.map((m) => (
                  <tr key={m} className="border-t border-border">
                    <td className="px-2 py-2 font-mono text-sm">{m}</td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        value={draftAllots[m] ?? 0}
                        onChange={(e) => setDraftAllots((prev) => ({ ...prev, [m]: Number(e.target.value || 0) }))}
                        className="w-[140px]"
                        disabled={!selected}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}


