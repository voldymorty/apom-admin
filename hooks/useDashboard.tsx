"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchDashboardAll, getCurrentMonthRange } from "@/app/services/dashboardApi";

interface DashboardData {
  summary: any;
  ordersChart: any[];
  revenueChart: any[];
  registrationsChart: any[];
  procurementChart: any[];
}

export function useDashboard() {
  const { from, to } = getCurrentMonthRange();
  const [dateRange, setDateRange] = useState({ from, to });
  const [activePreset, setActivePreset] = useState("this_month");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback( async (range: { from: string; to: string }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardAll(range.from, range.to);
      setData(result);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(dateRange);
  }, [dateRange, load]);

  const refresh = () => load(dateRange);

  return {
    data,
    loading,
    error,
    dateRange,
    setDateRange,
    activePreset,
    setActivePreset,
    refresh,
  };
}