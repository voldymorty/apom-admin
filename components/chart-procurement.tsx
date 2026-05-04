"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type ProcurementEntry = {
  date: string;
  total_quantity_kg: number | string;
  completed_pickups: number | string;
};

export function ChartProcurement({ data = [], loading = false }: { data?: ProcurementEntry[]; loading?: boolean }) {
  const sorted = React.useMemo(
    () => [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [data]
  );

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
        <CardTitle>Procurement</CardTitle>
        <CardDescription>Daily quantity procured (kg) & pickups</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        {sorted.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-muted-foreground text-sm">
            No procurement data for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={sorted}>
              <defs>
                <linearGradient id="fillKg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillPickups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(v) =>
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
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(v) =>
                  new Date(v).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                }
                formatter={(val, name) => [
                  name === "total_quantity_kg"
                    ? `${Number(val).toLocaleString("en-IN")} kg`
                    : Number(val).toLocaleString("en-IN"),
                  name === "total_quantity_kg" ? "Quantity (kg)" : name === "total_pickups" ? "Total Pickups" : "Completed",
                ]}
              />
              <Area
                dataKey="total_quantity_kg"
                type="monotone"
                stroke="var(--primary)"
                fill="url(#fillKg)"
                strokeWidth={2}
                dot={false}
                name="total_quantity_kg"
              />
              <Area
                dataKey="completed_pickups"
                type="monotone"
                stroke="#f59e0b"
                fill="url(#fillPickups)"
                strokeWidth={2}
                dot={false}
                name="completed_pickups"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}