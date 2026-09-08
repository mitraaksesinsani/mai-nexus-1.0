'use client';

import { useAuth, AuthProvider } from '@/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AppSidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isOwner = user?.role?.toUpperCase() === 'OWNER';
  const isSiteManager = user?.role?.toUpperCase() === 'SITE_MANAGER';
  const isOwnerRoute = pathname === '/owner-dashboard' || pathname.startsWith('/owner-dashboard/');

  const isForbiddenForSiteManager =
    pathname === '/' ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/pr') ||
    pathname.startsWith('/procurement') ||
    pathname.startsWith('/logistics') ||
    pathname.startsWith('/rfc') ||
    pathname.startsWith('/master-data');

  useEffect(() => {
    if (!isLoading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (isOwner && !isOwnerRoute) {
        router.replace('/owner-dashboard');
      } else if (isSiteManager && isForbiddenForSiteManager) {
        router.replace('/owner-dashboard');
      }
    }
  }, [user, isLoading, router, pathname, isOwner, isOwnerRoute, isSiteManager, isForbiddenForSiteManager]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center animate-float">
            <span className="text-white text-xl font-bold">N</span>
          </div>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (isOwner && !isOwnerRoute) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center animate-float">
            <span className="text-white text-xl font-bold">N</span>
          </div>
          <p className="text-sm text-muted-foreground">Mengalihkan ke Owner Dashboard...</p>
        </div>
      </div>
    );
  }

  if (isSiteManager && isForbiddenForSiteManager) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center animate-float">
            <span className="text-white text-xl font-bold">N</span>
          </div>
          <p className="text-sm text-muted-foreground">Mengalihkan ke Owner Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider className="h-screen overflow-hidden">
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-hidden flex flex-col">
        <TopBar />
        <main className="p-6 max-w-full flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </AuthProvider>
  );
}
