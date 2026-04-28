'use client';

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
import { usePathname } from 'next/navigation';
import AuthGuard from '@/components/auth/auth-guard';
import { UserNav } from '@/components/auth/user-nav';
import { cn } from '@/lib/utils';
import { PageHeaderProvider, usePageHeader } from '@/context/page-header-context';

function BuildingIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24"
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

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/tenants', icon: Users, label: 'Tenants' },
  { href: '/properties', icon: Building, label: 'Properties' },
  { href: '/reminders', icon: Bell, label: 'Reminders' },
];

function LayoutInternal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { actions } = usePageHeader();
  const showActions = ['/tenants', '/properties'].includes(pathname);
  
  return (
      <div className="flex min-h-screen flex-col">
        {/* Top Header for all screen sizes */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <BuildingIcon className="h-7 w-7 text-primary" />
            <span className="hidden text-lg tracking-tight sm:inline">Kabwata</span>
          </Link>
          
          {/* Desktop Navigation (hidden on mobile) */}
          <nav className="hidden h-full flex-1 items-center md:flex">
            <ul className="flex h-full items-center gap-6 pl-6 text-sm font-medium">
              {navItems.map((item) => (
                <li key={item.href} className="h-full">
                  <Link
                    href={item.href}
                    className={cn(
                      "flex h-full items-center border-b-2 px-1 pt-1",
                      pathname === item.href
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="ml-auto flex items-center gap-2">
            {showActions && actions}
            <UserNav />
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 p-4 pb-20 sm:p-6 md:pb-6">{children}</main>

        {/* Bottom Navigation for mobile/tablet */}
        <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur-sm md:hidden">
          <div className="grid h-16 grid-cols-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 p-2 text-xs transition-colors',
                  pathname === item.href
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-primary'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <PageHeaderProvider>
        <LayoutInternal>{children}</LayoutInternal>
      </PageHeaderProvider>
    </AuthGuard>
  );
}
