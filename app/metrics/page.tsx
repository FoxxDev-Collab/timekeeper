"use client";

import React, { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { invoke } from "@tauri-apps/api/core";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

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

type MonthlyTotalsByProject = Record<string, number[]>; // projectCode -> [m1..m12]

function getMonthLabel(indexZeroBased: number) {
  return new Date(Date.UTC(2000, indexZeroBased, 1)).toLocaleString(undefined, { month: "short", timeZone: "UTC" });
}

function daysInMonth(year: number, monthIndexZeroBased: number) {
  return new Date(Date.UTC(year, monthIndexZeroBased + 1, 0)).getUTCDate();
}

function MetricsContent() {
  const [year, setYear] = useState<number>(new Date().getUTCFullYear());
  const [loading, setLoading] = useState<boolean>(true);
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotalsByProject>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const months = Array.from({ length: 12 }, (_, i) => i); // 0..11
      const monthKeys = months.map((i) => `${year}-${String(i + 1).padStart(2, "0")}`);
      const results = await Promise.all(
        monthKeys.map((m) => invoke<WeekSlice[]>("get_weeks", { month: m }))
      );

      const totals: MonthlyTotalsByProject = {};
      results.forEach((weeksForMonth, monthIdx) => {
        weeksForMonth.forEach((week) => {
          week.rows.forEach((row) => {
            const code = row.projectCode;
            if (!totals[code]) totals[code] = Array.from({ length: 12 }, () => 0);
            totals[code][monthIdx] += row.total;
          });
        });
      });

      setMonthlyTotals(totals);
      setLoading(false);
    };
    void load();
  }, [year]);

  const projectCodes = useMemo(() => Object.keys(monthlyTotals).sort(), [monthlyTotals]);

  const monthlyChartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const point: Record<string, number | string> = { month: getMonthLabel(i) };
      projectCodes.forEach((code) => {
        point[code] = monthlyTotals[code]?.[i] ?? 0;
      });
      return point;
    });
  }, [monthlyTotals, projectCodes]);

  const yearlyTotalsByProject: Record<string, number> = useMemo(() => {
    const out: Record<string, number> = {};
    projectCodes.forEach((code) => {
      out[code] = (monthlyTotals[code] || []).reduce((a, b) => a + b, 0);
    });
    return out;
  }, [monthlyTotals, projectCodes]);

  const avgMonthlyData = useMemo(() => {
    return projectCodes.map((code) => ({
      project: code,
      hours: (yearlyTotalsByProject[code] || 0) / 12,
    }));
  }, [projectCodes, yearlyTotalsByProject]);

  const avgDailyData = useMemo(() => {
    const daysInYear = Array.from({ length: 12 }, (_, i) => daysInMonth(year, i)).reduce((a, b) => a + b, 0);
    return projectCodes.map((code) => ({
      project: code,
      hours: daysInYear ? (yearlyTotalsByProject[code] || 0) / daysInYear : 0,
    }));
  }, [projectCodes, yearlyTotalsByProject, year]);

  // Map project codes to theme colors cycling through --chart-N tokens
  const chartConfig = useMemo(() => {
    const cfg: Record<string, { label: string; color: string }> = {};
    projectCodes.forEach((code, idx) => {
      const colorIndex = (idx % 12) + 1; // cycle 1..12
      cfg[code] = { label: code, color: `var(--chart-${colorIndex})` };
    });
    return cfg;
  }, [projectCodes]);

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-muted">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">Loading metrics…</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setYear((y) => y - 1)}>
          ← Year
        </Button>
        <div className="text-sm text-muted-foreground">{year}</div>
        <Button variant="secondary" size="sm" onClick={() => setYear((y) => y + 1)}>
          Year →
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card/50 backdrop-blur-sm border-muted">
          <CardContent className="pt-6">
            <div className="text-base font-semibold mb-2">Total time per month by project</div>
            <ChartContainer config={chartConfig} className="aspect-auto h-72">
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => String(v)} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                {projectCodes.map((code) => (
                  <Bar key={code} dataKey={code} stackId="a" fill={`var(--color-${code})`} />
                ))}
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-muted">
          <CardContent className="pt-6">
            <div className="text-base font-semibold mb-2">Average monthly usage per project</div>
            <ChartContainer config={chartConfig} className="aspect-auto h-72">
              <BarChart data={avgMonthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="project" interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="hours" fill="var(--chart-1)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-muted">
          <CardContent className="pt-6">
            <div className="text-base font-semibold mb-2">Average daily usage per project</div>
            <ChartContainer config={chartConfig} className="aspect-auto h-72">
              <BarChart data={avgDailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="project" interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="hours" fill="var(--chart-2)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur sm border-muted">
          <CardContent className="pt-6">
            <div className="text-base font-semibold mb-2">Total time per project (year)</div>
            <ChartContainer config={chartConfig} className="aspect-auto h-72">
              <BarChart data={projectCodes.map((code) => ({ project: code, hours: yearlyTotalsByProject[code] || 0 }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="project" interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="hours" fill="var(--chart-3)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function MetricsPage() {
  useAuth();
  return (
    <AppShell>
      <MetricsContent />
    </AppShell>
  );
}


