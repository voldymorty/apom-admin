"use client";

import * as React from "react";
import {
  IconBuilding,
  IconCalendar,
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconTiltShift,
  IconUser,
  IconUsers,
  IconShoppingCart,
  IconShield,
  IconTruckDelivery,
  IconBell,
  IconLogout,
  IconUserFilled,
} from "@tabler/icons-react";
import logo from "../public/APOM logo.png";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/animate-ui/components/radix/sidebar";

const data = {
  user: {
    name: "Apom Admin",
    email: JSON.parse(localStorage.getItem("user_data") || "{}").mobile_number,
    avatar: IconUserFilled,
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Farmer Management",
      url: "/farmer-management",
      icon: IconUsers,
    },
    {
      title: "Vendor Management",
      url: "/vendor-management",
      icon: IconBuilding,
    },
    {
      title: "Delivery Management",
      url: "/delivery-management",
      icon: IconListDetails,
    },
    {
      title: "Product Management",
      url: "/product-management",
      icon: IconDatabase,
    },
    {
      title: "Order Management",
      url: "/order-management",
      icon: IconShoppingCart,
    },
    {
      title: "Pickups & Deliveries",
      url: "/pickups-deliveries-management",
      icon: IconTruckDelivery,
    },
    {
      title: "Notifications",
      url: "/notifications",
      icon: IconBell,
    },
    {
      title: "Admin Management",
      url: "/admins",
      icon: IconShield,
    },
  ],

  navSecondary: [
    // {
    //   title: "Settings",
    //   url: "#",
    //   icon: IconSettings,
    // },
    {
      title: "Log out",
      url: "#",
      icon: IconLogout,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
              <div className="flex gap-0.5 ps-2 items-center">
                <a href="/">
               <img src={logo.src} className="h-10" alt="" />
                </a>
                 <a href="/">
                <span className="text-base font-semibold ml-1 text-xl">Apom Logistics</span>
              </a>
              </div>
          
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
