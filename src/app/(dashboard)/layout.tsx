
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  Building,
  Bell,
  History,
} from 'lucide-react';
import Link from 'next/link';
import AuthGuard from '@/components/auth/auth-guard';
import { UserNav } from '@/components/auth/user-nav';

function BuildingIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
      <path d="M9.5 2v20" />
      <path d="M14.5 2v20" />
      <path d="M2 9.5h20" />
      <path d="M2 14.5h20" />
    </svg>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen">
          <Sidebar collapsible="icon" className="border-r border-sidebar-border">
            <SidebarContent>
              <SidebarHeader>
                <Link
                  href="/"
                  className="flex items-center gap-2 text-primary-foreground hover:text-primary-foreground/80"
                >
                  <BuildingIcon className="h-7 w-7 text-primary" />
                  <span className="text-lg font-semibold tracking-tight">Kabwata</span>
                </Link>
              </SidebarHeader>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={{ children: 'Dashboard', side: 'right' }}
                  >
                    <Link href="/dashboard">
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={{ children: 'Tenants', side: 'right' }}
                  >
                    <Link href="/tenants">
                      <Users />
                      <span>Tenants</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={{ children: 'Properties', side: 'right' }}
                  >
                    <Link href="/properties">
                      <Building />
                      <span>Properties</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={{ children: 'Reminders', side: 'right' }}
                  >
                    <Link href="/reminders">
                      <Bell />
                      <span>Reminders</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={{ children: 'Payment History', side: 'right' }}
                  >
                    <Link href="/history">
                      <History />
                      <span>Payment History</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
          <SidebarInset className="flex-1">
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
              <div className="relative flex-1">
                 {/* Search bar can be added here if needed globally */}
              </div>
              <UserNav />
            </header>
            <main className="flex-1 p-4 sm:p-6">{children}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
