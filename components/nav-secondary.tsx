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
  const { logout } = useAuth();;

   function LogOut(value:any){
   if(value === "Log out"){
  logout();
   }
  };

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem  key={item.title}>
              <SidebarMenuButton className={item.title == "Log out"? "duration-150 hover:text-red-500":""} asChild isActive={pathname === item.url}>
                {item.url === "#" ? (
                  <a href={item.title == "Log out"?"":item.url}>
                    <item.icon />
                    <span onClick={()=>{LogOut(item.title)}} >{item.title}</span>
                  </a>
                ) : (
                  <Link href={item.title == "Log out"?"":item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
