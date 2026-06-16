import {
  IconTrendingUp,
  IconUsers,
  IconBuildingStore,
  IconTruckDelivery,
  IconCurrencyRupee,
  IconPackage,
  IconAlertCircle,
  IconCircleCheck,
  IconCircleX,
  IconClockHour4,
  IconCoins,
  IconReceiptRefund,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function fmt(num) {
  if (num === null || num === undefined) return "—";
  return Number(num).toLocaleString("en-IN");
}

function fmtRupees(amount) {
  if (!amount) return "₹0";

  if (amount >= 10000000) {
    const cr = Math.floor((amount / 10000000) * 10) / 10;
    return `₹${cr}Cr`;
  }

  if (amount >= 100000) {
    const lakh = Math.floor((amount / 100000) * 10) / 10;
    return `₹${lakh}L`;
  }

  return `₹${amount.toLocaleString("en-IN")}`;
};

function formatWeight(kg) {
  if (!kg) return "0 kg";

  if (kg >= 1000) {
    return `${Math.floor((kg / 1000) * 10) / 10}T`;
  }

  return `${kg} kg`;}

const pillVariants = {
  green:  "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  yellow: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
  red:    "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  blue:   "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  muted:  "bg-muted text-muted-foreground",
};

function StatPill({ icon: Icon, value, label, color = "muted" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[14.5px] font-medium cursor-default select-none transition-opacity hover:opacity-80 ${pillVariants[color]}`}
        >
          <Icon className="size-5 shrink-0" aria-hidden="true" />
          {value}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

// Old-style plain text footer card (unchanged)
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

// New pill-based footer card (Deliveries, Revenue, Orders only)
function StatCardPills({ icon: Icon, label, value, badgeText, footerMain, footerStats, loading, warn }) {
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
          <div className="flex gap-2 mt-1">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
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
        {footerStats && footerStats.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {footerStats.map((stat) => (
              <StatPill key={stat.label} {...stat} />
            ))}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

export function SectionCards({ summary,  loading }) {
  const users = summary?.users;
  const orders = summary?.orders;
  const revenue = summary?.revenue;
  const inventory = summary?.inventory;
  const deliveries = summary?.deliveries;
  

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">

      {/* Total Farmers — old design */}
      <StatCard
        icon={IconUsers}
        label="Total Farmers"
        value={fmt(users?.total_farmers)}
        badgeText={`+${fmt(users?.new_farmers)} new`}
        footerMain="Farmer network"
        footerSub={`${fmt(users?.new_farmers)} new registrations this period`}
        loading={loading}
      />

      {/* Total Vendors — old design */}
      <StatCard
        icon={IconBuildingStore}
        label="Total Vendors"
        value={fmt(users?.total_vendors)}
        badgeText={`+${fmt(users?.new_vendors)} new`}
        footerMain="Active vendor network"
        footerSub={`${fmt(users?.new_vendors)} new vendors this period`}
        loading={loading}
      />

      {/* Total Deliveries — pill design */}
      <StatCardPills
        icon={IconTruckDelivery}
        label="Total Deliveries"
        value={fmt(deliveries?.total_deliveries)}
        badgeText={
          deliveries?.active_deliveries != null
            ? `${fmt(deliveries.active_deliveries)} active`
            : "In Progress"
        }
        footerMain="Delivery operations"
        footerStats={[
          {
            icon: IconCircleCheck,
            value: fmt(deliveries?.completed_deliveries ?? 0),
            label: "Completed deliveries",
            color: "green",
          },
          {
            icon: IconClockHour4,
            value: fmt(deliveries?.active_deliveries ?? 0),
            label: "Pending deliveries",
            color: "yellow",
          },
          {
            icon: IconCircleX,
            value: fmt(deliveries?.failed_deliveries ?? 0),
            label: "Failed deliveries",
            color: "red",
          },
        ]}
        loading={loading}
        warn
      />

      {/* Total Revenue — pill design */}
      <StatCardPills
        icon={IconCurrencyRupee}
        label="Total Revenue"
        value={fmtRupees(revenue?.total_revenue)}
        badgeText="This period"
        footerMain="Revenue breakdown"
        footerStats={[
          {
            icon: IconCoins,
            value: fmtRupees(revenue?.collected_revenue),
            label: "Collected revenue",
            color: "green",
          },
          {
            icon: IconReceiptRefund,
            value: fmtRupees(revenue?.total_refunds),
            label: "Total refunds",
            color: "red",
          },
        ]}
        loading={loading}
      />

      {/* Total Orders — pill design */}
      <StatCardPills
        icon={IconPackage}
        label="Total Orders"
        value={fmt(orders?.total_orders)}
        badgeText={`₹${fmt(orders?.total_order_value)} value`}
        footerMain="Order activity"
        footerStats={[
          {
            icon: IconCircleCheck,
            value: fmt(orders?.completed_orders ?? 0),
            label: "Completed orders",
            color: "green",
          },
          {
            icon: IconClockHour4,
            value: fmt(orders?.pending_orders ?? 0),
            label: "Pending orders",
            color: "yellow",
          },
          {
            icon: IconCircleX,
            value: fmt(orders?.cancelled_orders ?? 0),
            label: "Cancelled orders",
            color: "red",
          },
        ]}
        loading={loading}
      />

      {/* Stock — old design */}
      <StatCard
        icon={IconAlertCircle}
        label="Stock"
        value={`${formatWeight(inventory?.total_stock_kg)}`}
        badgeText={`${fmt(inventory?.low_stock_products)} low stock`}
        footerMain="Inventory status"
        footerSub={`${fmt(inventory?.low_stock_products)} products need restocking`}
        loading={loading}
        warn={inventory?.low_stock_products > 0}
      />

      {/* Delivery Personnel — old design */}
      <StatCard
        icon={IconTruckDelivery}
        label="Delivery Personnel"
        value={fmt(users?.total_delivery_personnel)}
        badgeText={`+${fmt(users?.new_delivery_personnel)} new`}
        footerMain="Active fleet"
        footerSub={`${fmt(users?.new_delivery_personnel)} new additions this period`}
        loading={loading}
      />

      {/* Delivery Personnel — old design
      <StatCard
        icon={IconTruckDelivery}
        label="Procurement(Kg) "
        value={fmt(totalQuantity)}
        badgeText={`+${fmt(totalCompletedPickups)}`}
        footerMain="Procurement activity"
        footerSub={`${fmt(totalCompletedPickups)} pickups completed this period`}
        loading={loading}
      /> */}

    </div>
  );
}