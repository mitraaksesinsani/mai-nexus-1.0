'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import {
  Bell,
  LogOut,
  User,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const PATH_MAP: Record<string, { label: string; parent?: { label: string; href: string } }> = {
  '/': { label: 'Dashboard' },
  '/pic-dashboard': { label: 'PIC Dashboard' },
  '/owner-dashboard': { label: 'Owner Dashboard' },
  '/projects': { label: 'Project List', parent: { label: 'Project Management', href: '/projects' } },
  '/projects/requirements': { label: 'Material Requirement', parent: { label: 'Project Management', href: '/projects' } },
  '/pr': { label: 'PR List', parent: { label: 'PR Management', href: '/pr' } },
  '/pr/approval': { label: 'Approval Queue', parent: { label: 'PR Management', href: '/pr' } },
  '/pr/history': { label: 'Purchase Log', parent: { label: 'PR Management', href: '/pr' } },
  '/procurement': { label: 'Active POs', parent: { label: 'Procurement', href: '/procurement' } },
  '/procurement/approval': { label: 'Approval Queue', parent: { label: 'Procurement', href: '/procurement' } },
  '/procurement/history': { label: 'PO History', parent: { label: 'Procurement', href: '/procurement' } },
  '/logistics': { label: 'Delivery Tracking', parent: { label: 'Logistics', href: '/logistics' } },
  '/logistics/history': { label: 'Shipment History', parent: { label: 'Logistics', href: '/logistics' } },
  '/rfc': { label: 'RFC List', parent: { label: 'RFC', href: '/rfc' } },
  '/rfc/approval': { label: 'Approval Queue', parent: { label: 'RFC', href: '/rfc' } },
  '/rfclog': { label: 'RFC History Log', parent: { label: 'RFC', href: '/rfc' } },
  '/warehouse': { label: 'Warehouse List', parent: { label: 'Warehouse', href: '/warehouse' } },
  '/warehouse/receive': { label: 'Material Receive', parent: { label: 'Warehouse', href: '/warehouse' } },
  '/warehouse/stock': { label: 'Stock Monitoring', parent: { label: 'Warehouse', href: '/warehouse' } },
  '/inventory': { label: 'Stock Balance', parent: { label: 'Inventory', href: '/inventory' } },
  '/inventory/catalog': { label: 'Material Catalog', parent: { label: 'Inventory', href: '/inventory' } },
  '/inventory/movements': { label: 'Movement History', parent: { label: 'Inventory', href: '/inventory' } },
  '/transfer': { label: 'Material Transfer' },
  '/reports': { label: 'Reports' },
  '/master-data': { label: 'Master Data' },
  '/master-data/materials': { label: 'Materials', parent: { label: 'Master Data', href: '/master-data/materials' } },
  '/master-data/warehouses': { label: 'Warehouses', parent: { label: 'Master Data', href: '/master-data/materials' } },
  '/master-data/vendors': { label: 'Vendors', parent: { label: 'Master Data', href: '/master-data/materials' } },
  '/master-data/users': { label: 'Users', parent: { label: 'Master Data', href: '/master-data/materials' } },
  '/master-data/terms': { label: 'Terms Configuration', parent: { label: 'Master Data', href: '/master-data/materials' } },
};

function getBreadcrumbs(pathname: string) {
  if (PATH_MAP[pathname]) {
    const item = PATH_MAP[pathname];
    if (item.parent) {
      return [
        { label: item.parent.label, href: item.parent.href },
        { label: item.label, href: pathname, isCurrent: true },
      ];
    }
    return [{ label: item.label, href: pathname, isCurrent: true }];
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return [{ label: 'Dashboard', href: '/', isCurrent: true }];
  }

  return segments.map((seg, idx) => {
    const href = '/' + segments.slice(0, idx + 1).join('/');
    const isCurrent = idx === segments.length - 1;
    const label = seg
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return { label, href, isCurrent };
  });
}

export default function TopBar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const breadcrumbs = getBreadcrumbs(pathname);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/api/dashboard/notifications');
        const data = res.data || [];
        setNotifications(data);
        if (data.length > 0) setHasUnread(true);
      } catch (e) {
        console.error('Error fetching notifications:', e);
      }
    };

    if (user) {
      fetchNotifications();
      
      const handleRefresh = () => fetchNotifications();
      window.addEventListener('refreshNotifications', handleRefresh);
      return () => window.removeEventListener('refreshNotifications', handleRefresh);
    }
  }, [user]);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setHasUnread(false);
    }
  };

  const getRoleLabel = (role: string) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    const split = name.split(' ');
    if (split.length > 1) return (split[0][0] + split[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const isOwner = user?.role?.toUpperCase() === 'OWNER';

  return (
    <header className="h-16 shrink-0 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
        <SidebarTrigger className="-ml-2" />
        <div className="h-4 w-px bg-border/70 hidden sm:block shrink-0" />
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap sm:flex-wrap">
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <React.Fragment key={item.href + index}>
                  <BreadcrumbItem className="shrink-0 sm:shrink">
                    {isLast ? (
                      <BreadcrumbPage className="truncate max-w-[180px] sm:max-w-none text-[13px] font-medium text-foreground">
                        {item.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink 
                        href={item.href}
                        className="truncate max-w-[120px] sm:max-w-none text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {item.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-4">
        {!isOwner && (
          <DropdownMenu onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger render={
              <Button variant="ghost" size="icon" className="relative cursor-pointer hover:bg-muted/50">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {hasUnread && (
                  <div className="absolute right-2 top-2 w-2 h-2 bg-destructive rounded-full" />
                )}
              </Button>
            } />
            <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
              <div className="px-4 py-3 border-b flex items-center justify-between sticky top-0 bg-background z-10">
                <p className="text-sm font-semibold">Notifications</p>
                {notifications.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{notifications.length} New</Badge>
                )}
              </div>
              
              {notifications.length > 0 ? (
                <div className="flex flex-col">
                  {notifications.map((notif) => (
                    <DropdownMenuItem key={notif.id} className="p-0 border-b last:border-0 cursor-pointer">
                      <Link href={notif.link} className="flex flex-col gap-1 p-4 w-full hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm leading-tight text-foreground">{notif.title}</p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {notif.message}
                        </p>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground flex flex-col items-center justify-center">
                  <Bell className="w-8 h-8 mb-2 opacity-20" />
                  <p>You're all caught up!</p>
                  <p className="text-xs mt-1">No new notifications</p>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="h-10 px-2 gap-2 hover:bg-muted/50">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                    {getUserInitials(user?.name || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:flex flex-col">
                  <span className="text-sm font-medium leading-none">{user?.name || 'User'}</span>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {getRoleLabel(user?.role || 'User')}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-64 shadow-xl">
            <div className="px-2 py-2.5">
              <p className="text-sm font-medium leading-none mb-1">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <div className="mt-2">
                <Badge variant="secondary" className="text-[10px] uppercase">
                  {getRoleLabel(user?.role || 'User')}
                </Badge>
              </div>
            </div>
            {!isOwner && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <Link href="/profile" className="flex items-center w-full gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Link href="/settings" className="flex items-center w-full gap-2">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={logout} 
              className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
