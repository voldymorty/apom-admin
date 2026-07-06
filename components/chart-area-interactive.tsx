"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartAreaInteractiveProps {
  ordersChart?: any[];
  revenueChart?: any[];
  loading?: boolean;
}

export function ChartAreaInteractive({
  ordersChart = [],
  revenueChart = [],
  loading = false,
}: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("30d");
  const [metric, setMetric] = React.useState("orders");

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d");
  }, [isMobile]);

  const mergedData = React.useMemo(() => {
    const map: Record<string, any> = {};
    (ordersChart || []).forEach((d) => { map[d.date] = { ...map[d.date], ...d }; });
    (revenueChart || []).forEach((d) => { map[d.date] = { ...map[d.date], ...d }; });
    return Object.values(map).sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [ordersChart, revenueChart]);

  const filteredData = React.useMemo(() => {
    if (!mergedData.length) return [];
    const last = new Date(mergedData[mergedData.length - 1].date);
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const cutoff = new Date(last);
    cutoff.setDate(cutoff.getDate() - days);
    return mergedData.filter((d) => new Date(d.date) >= cutoff);
  }, [mergedData, timeRange]);

  const isOrders = metric === "orders";
  const primaryKey = isOrders ? "total_orders" : "gross_revenue";
  const secondaryKey = isOrders ? "completed_orders" : "collected_revenue";

  const config = {
    [primaryKey]: { label: isOrders ? "Total Orders" : "Gross Revenue", color: "var(--primary)" },
    [secondaryKey]: { label: isOrders ? "Completed" : "Collected", color: "#22c55e" },
  };

  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <Skeleton className="h-[250px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Logistics Overview</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">Orders & Revenue trends</span>
          <span className="@[540px]/card:hidden">Logistics Trends</span>
        </CardDescription>
        <CardAction className="flex items-center gap-2 flex-wrap">
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="w-32" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="orders">Orders</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
            </SelectContent>
          </Select>
          <ToggleGroup type="single" value={timeRange} onValueChange={(v) => v && setTimeRange(v)} variant="outline" className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex">
            <ToggleGroupItem value="90d">3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="flex w-32 @[767px]/card:hidden" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {filteredData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">
            No data available for the selected period.
          </div>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-[250px] w-full">
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillPrimary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillSecondary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} />
              <ChartTooltip cursor={false} content={
                <ChartTooltipContent
                  labelFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  indicator="dot"
                />
              } />
              <Area dataKey={secondaryKey} type="natural" fill="url(#fillSecondary)" stroke="#22c55e" stackId="a" />
              <Area dataKey={primaryKey} type="natural" fill="url(#fillPrimary)" stroke="var(--primary)" stackId="a" />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}