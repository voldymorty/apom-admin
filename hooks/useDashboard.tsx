"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchDashboardAll, getCurrentMonthRange } from "@/app/services/dashboardApi";

export function useDashboard() {
  const { from, to } = getCurrentMonthRange();
  const [dateRange, setDateRange] = useState({ from, to });
  const [activePreset, setActivePreset] = useState("this_month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (range) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardAll(range.from, range.to);
      setData(result);
    } catch (err) {
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