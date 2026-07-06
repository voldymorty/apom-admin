"use client";

import * as React from "react";
import {
  IconChevronDown, IconChevronLeft, IconChevronRight,
  IconChevronsLeft, IconChevronsRight, IconLayoutColumns,
} from "@tabler/icons-react";
import {
  flexRender, getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel, getSortedRowModel, useReactTable,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuCheckboxItem,
  DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const fmt = (val: number | string | null | undefined) =>
  val == null
    ? <span className="text-muted-foreground">—</span>
    : Number(val).toLocaleString("en-IN");

const fmtRs = (val: number | string | null | undefined) =>
  val == null
    ? <span className="text-muted-foreground">—</span>
    : `₹${Number(val).toLocaleString("en-IN")}`;

const fmtDate = (val: string | Date | null | undefined) =>
  !val
    ? "—"
    : new Date(val).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

function PctBadge({
  done,
  total,
}: {
  done: number;
  total: number;
}) {
  if (!total) return <span className="text-muted-foreground text-xs">—</span>;
  const pct = Math.round((done / total) * 100);
  const cls = pct >= 90
    ? "text-green-700 bg-green-50 border-green-200 dark:bg-green-950/30"
    : pct >= 70
    ? "text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30"
    : "text-red-700 bg-red-50 border-red-200 dark:bg-red-950/30";
  return <Badge variant="outline" className={`text-xs ${cls}`}>{pct}%</Badge>;
}

const columns = [
  {
    accessorKey: "report_date",
    header: "Date",
    cell: ({ row }: any) => <span className="whitespace-nowrap font-medium text-sm">{fmtDate(row.original.report_date)}</span>,
  },
  {
    accessorKey: "total_orders",
    header: () => <div className="text-right">Orders</div>,
    cell: ({ row }: any) => <div className="text-right">{fmt(row.original.total_orders)}</div>,
  },
  {
    accessorKey: "completed_orders",
    header: () => <div className="text-right">Completion</div>,
    cell: ({ row }: any) => (
      <div className="flex justify-end">
        <PctBadge done={row.original.completed_orders} total={row.original.total_orders} />
      </div>
    ),
  },
  {
    accessorKey: "cancelled_orders",
    header: () => <div className="text-right">Cancelled</div>,
    cell: ({ row }: any) => <div className="text-right text-sm">{fmt(row.original.cancelled_orders)}</div>,
  },
  {
    accessorKey: "total_revenue",
    header: () => <div className="text-right">Revenue</div>,
    cell: ({ row }: any) => <div className="text-right font-medium">{fmtRs(row.original.total_revenue)}</div>,
  },
  {
    accessorKey: "total_commission_earned",
    header: () => <div className="text-right">Commission</div>,
    cell: ({ row }: any) => <div className="text-right text-sm">{fmtRs(row.original.total_commission_earned)}</div>,
  },
  {
    accessorKey: "total_farmer_earnings",
    header: () => <div className="text-right">Farmer Earnings</div>,
    cell: ({ row }: any) => <div className="text-right text-sm">{fmtRs(row.original.total_farmer_earnings)}</div>,
  },
  {
    accessorKey: "total_deliveries",
    header: () => <div className="text-right">Deliveries</div>,
    cell: ({ row }: any) => (
      <div className="flex justify-end">
        <PctBadge done={row.original.completed_deliveries} total={row.original.total_deliveries} />
      </div>
    ),
  },
  {
    accessorKey: "total_quantity_procured_kg",
    header: () => <div className="text-right">Procured (kg)</div>,
    cell: ({ row }: any) => <div className="text-right text-sm">{fmt(row.original.total_quantity_procured_kg)}</div>,
  },
  {
    accessorKey: "active_farmers",
    header: () => <div className="text-right">Active Farmers</div>,
    cell: ({ row }: any) => <div className="text-right text-sm">{fmt(row.original.active_farmers)}</div>,
  },
];

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted sticky top-0 z-10">
          <TableRow>{columns.map((c) => <TableHead key={c.accessorKey}><Skeleton className="h-4 w-20" /></TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>{columns.map((c) => <TableCell key={c.accessorKey}><Skeleton className="h-4 w-16" /></TableCell>)}</TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function DataTable({ reports = [], loading = false }) {
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [sorting, setSorting] = React.useState([{ id: "report_date", desc: true }]);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  const table = useReactTable({
    data: reports,
    columns,
    state: { sorting, columnVisibility, pagination },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Daily Reports</h2>
          <p className="text-muted-foreground text-sm">Per-day breakdown for the selected period</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <IconLayoutColumns />
              <span className="hidden lg:inline">Columns</span>
              <IconChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {table.getAllColumns().filter((c) => c.getCanHide()).map((c) => (
              <DropdownMenuCheckboxItem key={c.id} className="capitalize" checked={c.getIsVisible()} onCheckedChange={(v) => c.toggleVisibility(!!v)}>
                {c.id.replace(/_/g, " ")}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? <TableSkeleton /> : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id} className="cursor-pointer select-none" onClick={h.column.getToggleSortingHandler()}>
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/40 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    No daily reports found for this period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between px-2">
        <div className="text-muted-foreground text-sm">{table.getFilteredRowModel().rows.length} report(s)</div>
        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">Rows per page</Label>
            <Select value={`${table.getState().pagination.pageSize}`} onValueChange={(v) => table.setPageSize(Number(v))}>
              <SelectTrigger size="sm" className="w-20" id="rows-per-page"><SelectValue /></SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50].map((s) => <SelectItem key={s} value={`${s}`}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm font-medium">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</div>
          <div className="flex items-center gap-1">
            <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}><IconChevronsLeft /></Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><IconChevronLeft /></Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><IconChevronRight /></Button>
            <Button variant="outline" className="hidden size-8 lg:flex" size="icon" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}><IconChevronsRight /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}