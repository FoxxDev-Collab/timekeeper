"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderCog, LogOut, Settings } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import SidebarScaleControl from "@/components/SidebarScaleControl";
import { useUiPreferences } from "@/components/UiPreferencesProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { scale } = useUiPreferences();

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-border" collapsible="icon">
        <SidebarHeader className="px-3 py-2">
          <div className="text-sm font-semibold">Timekeeper</div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/MainPage"}>
                <Link href="/MainPage">
                  <Home />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/projects"}>
                <Link href="/projects">
                  <FolderCog />
                  <span>Projects</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/settings"}>
                <Link href="/settings">
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarSeparator />
          <SidebarFooter className="mt-auto">
            <div className="space-y-2">
              <ThemeToggle />
              <SidebarScaleControl />
              <Button variant="outline" size="sm" className="w-full" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </Button>
            </div>
          </SidebarFooter>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="overflow-hidden">
        <div className="flex h-10 items-center gap-2 px-2">
          <SidebarTrigger />
        </div>
        <div
          className="flex-1 overflow-auto pr-0 origin-top-left"
          style={{ transform: `scale(${scale})`, width: `${100 / scale}%` }}
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}


