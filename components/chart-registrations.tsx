"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ───────────────────────────────────────────────────────────────────

type RawEntry = {
  date: string;
  role: string;
  count: number | string;
};

type GroupedEntry = Record<string, number | string>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupByDate(raw: RawEntry[] = []): GroupedEntry[] {
  const map: Record<string, GroupedEntry> = {};
  raw.forEach(({ date, role, count }) => {
    if (!map[date]) map[date] = { date };
    map[date][role] = ((map[date][role] as number) || 0) + Number(count);
  });
  return Object.values(map).sort(
    (a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  farmer: "var(--primary)",
  vendor: "#f59e0b",
  delivery_personnel: "#22c55e",
};

const ROLE_LABELS: Record<string, string> = {
  farmer: "Farmers",
  vendor: "Vendors",
  delivery_personnel: "Delivery",
};

// ─── Component ───────────────────────────────────────────────────────────────

interface ChartRegistrationsProps {
  data?: RawEntry[];
  loading?: boolean;
}

export function ChartRegistrations({ data = [], loading = false }: ChartRegistrationsProps) {
  const grouped = React.useMemo(() => groupByDate(data), [data]);

  const roles = React.useMemo(() => {
    const s = new Set<string>();
    data.forEach((d) => s.add(d.role));
    return Array.from(s);
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[220px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Registrations</CardTitle>
        <CardDescription>Daily sign-ups by role</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        {grouped.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-muted-foreground text-sm">
            No registration data for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={grouped} barCategoryGap="30%">
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(v: string) =>
                  new Date(v).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                  })
                }
                minTickGap={28}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                allowDecimals={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(v: string) =>
                  new Date(v).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                }
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v: string) => ROLE_LABELS[v] ?? v}
                wrapperStyle={{ fontSize: 12 }}
              />
              {roles.map((role) => (
                <Bar
                  key={role}
                  dataKey={role}
                  name={role}
                  fill={ROLE_COLORS[role] ?? "#94a3b8"}
                  radius={[3, 3, 0, 0]}
                  stackId="a"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}