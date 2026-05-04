import {
  IconTrendingUp,
  IconUsers,
  IconBuildingStore,
  IconTruckDelivery,
  IconCurrencyRupee,
  IconPackage,
  IconAlertCircle,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function fmt(num) {
  if (num === null || num === undefined) return "—";
  return Number(num).toLocaleString("en-IN");
}

function fmtRupees(num) {
  if (num === null || num === undefined) return "—";
  return `₹${Number(num).toLocaleString("en-IN")}`;
}

function StatCard({ icon: Icon, label, value, badgeText, footerMain, footerSub, loading, warn }) {
  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-5 rounded" />
          </div>
          <Skeleton className="h-8 w-32 mt-2" />
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        <CardAction>
          <Badge
            variant="outline"
            className={
              warn
                ? "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200"
                : ""
            }
          >
            <IconTrendingUp />
            {badgeText}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">{footerMain}</div>
        <div className="text-muted-foreground">{footerSub}</div>
      </CardFooter>
    </Card>
  );
}

export function SectionCards({ summary, loading }) {
  const users = summary?.users;
  const orders = summary?.orders;
  const revenue = summary?.revenue;
  const inventory = summary?.inventory;
  const deliveries = summary?.deliveries;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <StatCard
        icon={IconUsers}
        label="Total Farmers"
        value={fmt(users?.total_farmers)}
        badgeText={`+${fmt(users?.new_farmers)} new`}
        footerMain="Farmer network"
        footerSub={`${fmt(users?.new_farmers)} new registrations this period`}
        loading={loading}
      />
      <StatCard
        icon={IconBuildingStore}
        label="Total Vendors"
        value={fmt(users?.total_vendors)}
        badgeText={`+${fmt(users?.new_vendors)} new`}
        footerMain="Active vendor network"
        footerSub={`${fmt(users?.new_vendors)} new vendors this period`}
        loading={loading}
      />
      <StatCard
        icon={IconTruckDelivery}
        label="Total Deliveries"
        value={fmt(deliveries?.total_deliveries)}
        badgeText={
          deliveries?.active_deliveries != null
            ? `${fmt(deliveries.active_deliveries)} active`
            : "In Progress"
        }
        footerMain="Delivery operations"
        footerSub={`${fmt(deliveries?.completed_deliveries ?? 0)} completed · ${fmt(deliveries?.failed_deliveries ?? 0)} failed`}
        loading={loading}
        warn
      />
      <StatCard
        icon={IconCurrencyRupee}
        label="Total Revenue"
        value={fmtRupees(revenue?.total_revenue)}
        badgeText="This period"
        footerMain="Revenue breakdown"
        footerSub={`Collected: ${fmtRupees(revenue?.collected_revenue)} · Refunds: ${fmtRupees(revenue?.total_refunds)}`}
        loading={loading}
      />
      <StatCard
        icon={IconPackage}
        label="Total Orders"
        value={fmt(orders?.total_orders)}
        badgeText={`₹${fmt(orders?.total_order_value)} value`}
        footerMain="Order activity"
        footerSub={`Completed: ${fmt(orders?.completed_orders ?? 0)} · Cancelled: ${fmt(orders?.cancelled_orders ?? 0)}`}
        loading={loading}
      />
      <StatCard
        icon={IconAlertCircle}
        label="Stock (kg)"
        value={fmt(inventory?.total_stock_kg)}
        badgeText={`${fmt(inventory?.low_stock_products)} low stock`}
        footerMain="Inventory status"
        footerSub={`${fmt(inventory?.low_stock_products)} products need restocking`}
        loading={loading}
        warn={inventory?.low_stock_products > 0}
      />
      <StatCard
        icon={IconTruckDelivery}
        label="Delivery Personnel"
        value={fmt(users?.total_delivery_personnel)}
        badgeText={`+${fmt(users?.new_delivery_personnel)} new`}
        footerMain="Active fleet"
        footerSub={`${fmt(users?.new_delivery_personnel)} new additions this period`}
        loading={loading}
      />
    </div>
  );
}