import api from "./api";

export function getCurrentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  return { from, to };
}

export function getPresetRange(preset) {
  const now = new Date();
  const toStr = now.toISOString().slice(0, 10);
  switch (preset) {
    case "7d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: d.toISOString().slice(0, 10), to: toStr };
    }
    case "30d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: d.toISOString().slice(0, 10), to: toStr };
    }
    case "this_month":
      return getCurrentMonthRange();
    case "3m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return { from: d.toISOString().slice(0, 10), to: toStr };
    }
    case "all":
      return { from: "2020-01-01", to: toStr };
    default:
      return getCurrentMonthRange();
  }
}

export async function fetchSummary(from, to) {
  const { data } = await api.get("/admin/dashboard/summary", { params: { from, to } });
  return data.data;
}

export async function fetchDailyReports(from, to, page = 1, limit = 30) {
  const { data } = await api.get("/admin/dashboard/daily-reports", {
    params: { from, to, page, limit },
  });
  return data.data;
}

export async function fetchDailyReportByDate(date) {
  const { data } = await api.get(`/admin/dashboard/daily-reports/${date}`);
  return data.data;
}

export async function fetchOrdersChart(from, to) {
  const { data } = await api.get("/admin/dashboard/charts/orders", { params: { from, to } });
  return data.data;
}

export async function fetchRevenueChart(from, to) {
  const { data } = await api.get("/admin/dashboard/charts/revenue", { params: { from, to } });
  return data.data;
}

export async function fetchDeliveriesChart(from, to) {
  const { data } = await api.get("/admin/dashboard/charts/deliveries", { params: { from, to } });
  return data.data;
}

export async function fetchRegistrationsChart(from, to) {
  const { data } = await api.get("/admin/dashboard/charts/registrations", { params: { from, to } });
  return data.data;
}

export async function fetchProcurementChart(from, to) {
  const { data } = await api.get("/admin/dashboard/charts/procurement", { params: { from, to } });
  return data.data;
}

export async function fetchTopFarmers(from, to, limit = 10) {
  const { data } = await api.get("/admin/dashboard/top/farmers", { params: { from, to, limit } });
  return data.data;
}

export async function fetchTopVendors(from, to, limit = 10) {
  const { data } = await api.get("/admin/dashboard/top/vendors", { params: { from, to, limit } });
  return data.data;
}

export async function fetchTopProducts(from, to, limit = 10) {
  const { data } = await api.get("/admin/dashboard/top/products", { params: { from, to, limit } });
  return data.data;
}

export async function fetchTopDeliveryPersonnel(from, to, limit = 10) {
  const { data } = await api.get("/admin/dashboard/top/delivery-personnel", {
    params: { from, to, limit },
  });
  return data.data;
}

export async function fetchDashboardAll(from, to) {
  const results = await Promise.allSettled([
    fetchSummary(from, to),
    fetchDailyReports(from, to),
    fetchOrdersChart(from, to),
    fetchRevenueChart(from, to),
    fetchDeliveriesChart(from, to),
    fetchRegistrationsChart(from, to),
    fetchProcurementChart(from, to),
    fetchTopFarmers(from, to),
    fetchTopVendors(from, to),
    fetchTopProducts(from, to),
    fetchTopDeliveryPersonnel(from, to),
  ]);

  const resolve = (r) => (r.status === "fulfilled" ? r.value : null);
  const [
    summary, dailyReports, ordersChart, revenueChart,
    deliveriesChart, registrationsChart, procurementChart,
    topFarmers, topVendors, topProducts, topDelivery,
  ] = results.map(resolve);

  return {
    summary, dailyReports, ordersChart, revenueChart,
    deliveriesChart, registrationsChart, procurementChart,
    topFarmers, topVendors, topProducts, topDelivery,
  };
}