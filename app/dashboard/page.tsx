"use client";

import React, { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { ChartRegistrations } from "@/components/chart-registrations";
import { ChartProcurement } from "@/components/chart-procurement";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { DateRangeToolbar } from "@/components/date-range-toolbar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import ProtectedRoute from "../routes/ProtectedRoute";
import { useDashboard } from "@/hooks/useDashboard";
import { IconAlertCircle } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const {
    data,
    loading,
    error,
    dateRange,
    setDateRange,
    activePreset,
    setActivePreset,
    refresh,
  } = useDashboard();

  useEffect(() => {
    setMounted(true);
  }, []);

  // if (!mounted) {
  //   return (
  //     <div className="flex min-h-screen items-center justify-center">
  //       <p className="text-muted-foreground">Loading...</p>
  //     </div>
  //   );
  // }
//  const totalQuantity = data?.procurementChart.reduce(
//   (sum: number, item: any) => sum + Number(item.total_quantity_kg),
//   0
// );

// const totalCompletedPickups = data?.procurementChart.reduce(
//   (sum: number, item: any) => sum + Number(item.completed_pickups),
//   0
// );
  return (
    <ProtectedRoute>
      <SidebarProvider
        style={{
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties}
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

                {/* ── Date range toolbar ── */}
                <DateRangeToolbar
                  dateRange={dateRange}
                  setDateRange={setDateRange}
                  activePreset={activePreset}
                  setActivePreset={setActivePreset}
                  loading={loading}
                  refresh={refresh}
                />

                {/* ── Error banner ── */}
                {error && (
                  <div className="mx-4 lg:mx-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                    <IconAlertCircle className="size-4 shrink-0" />
                    <span className="flex-1">{error}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={refresh}
                      className="text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                    >
                      Retry
                    </Button>
                  </div>
                )}

                {/* ── KPI cards ── */}
                <SectionCards summary={data?.summary} />

                {/* ── Main chart: orders / revenue ── */}
                <div className="px-4 lg:px-6">
                  <ChartAreaInteractive
                    ordersChart={data?.ordersChart ?? []}
                    revenueChart={data?.revenueChart ?? []}
                  />
                </div>

                {/* ── Secondary charts: registrations + procurement side by side ── */}
                <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 xl:grid-cols-2">
                  <ChartRegistrations
                    data={data?.registrationsChart ?? []}
                  />
                  <ChartProcurement
                    data={data?.procurementChart ?? []}
                  />
                </div>

                {/* ── Daily reports table ── */}
                {/* <DataTable
                  reports={data?.dailyReports?.reports ?? []}
                /> */}

              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}