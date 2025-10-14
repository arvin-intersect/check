// src/components/layout/AppLayout.tsx
import React from "react"; // Import React to use React.ReactNode
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { UserMenu } from "./UserMenu";
import { BackgroundPattern } from "@/components/dashboard/BackgroundPattern";

/**
 * The main layout for the internal application.
 * It now accepts `children` as a prop to render the active page component.
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The page component to render.
 */
export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between px-6">
            <SidebarTrigger />
            <UserMenu />
          </header>

          <main className="flex-1 relative">
            <BackgroundPattern />
            {/* The Outlet is replaced with the children prop */}
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};