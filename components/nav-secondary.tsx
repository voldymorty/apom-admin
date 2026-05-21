"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { type Icon } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/animate-ui/components/radix/sidebar";
import { useContext } from "react";

import { useAuth } from "@/components/providers/auth-provider";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: Icon;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  // ── NEW: logout dialog state ──
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false);

  function handleItemClick(title: string) {
    if (title === "Log out") {
      setShowLogoutDialog(true);
    }
  }

  function handleConfirmLogout() {
    setShowLogoutDialog(false);
  logout();
   }

  return (
    <>
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  onClick={() => handleItemClick(item.title)}
                  className={
                    item.title === "Log out"
                      ? "duration-150 hover:text-red-500"
                      : ""
                  }
                  asChild
                  isActive={pathname === item.url}
                >
               
                    <Link href={item.title === "Log out" ? "" : item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>

      {/* ── Logout Confirmation Dialog ── */}
      <Dialog
        open={showLogoutDialog}
        onOpenChange={(open) => {
          if (!open) setShowLogoutDialog(false);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Confirm log out</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out? You'll need to sign in again to
              access your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmLogout}>
              Log out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}