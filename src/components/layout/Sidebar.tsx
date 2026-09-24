'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  ShoppingCart,
  Truck,
  Warehouse,
  ArrowLeftRight,
  Package,
  BarChart3,
  Database,
  Zap,
  UserCheck,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from '@/components/ui/sidebar';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

const groupedNavigation = [
  {
    group: 'Main',
    items: [
      {
        label: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
      },
      {
        label: 'PIC Dashboard',
        href: '/pic-dashboard',
        icon: UserCheck,
      },
      {
        label: 'Owner Dashboard',
        href: '/owner-dashboard',
        icon: BarChart3,
      },
    ]
  },
  {
    group: 'Transactional',
    items: [
      {
        label: 'Project Management',
        href: '/projects',
        icon: FolderKanban,
        children: [
          { label: 'Project List', href: '/projects' },
          { label: 'Material Requirement', href: '/projects/requirements' },
        ],
      },
      {
        label: 'PR Management',
        href: '/pr',
        icon: FileText,
        children: [
          { label: 'PR List', href: '/pr' },
          { label: 'Approval Queue', href: '/pr/approval' },
          { label: 'Purchase Log', href: '/pr/history' },
        ],
      },

      {
        label: 'Procurement',
        href: '/procurement',
        icon: ShoppingCart,
        children: [
          { label: 'Active POs', href: '/procurement' },
          { label: 'Approval Queue', href: '/procurement/approval' },
          { label: 'PO History', href: '/procurement/history' },
        ],
      },
      {
        label: 'Logistics',
        href: '/logistics',
        icon: Truck,
        children: [
          { label: 'Delivery Tracking', href: '/logistics' },
          { label: 'Shipment History', href: '/logistics/history' },
        ],
      },
      {
        label: 'RFC',
        href: '/rfc',
        icon: FileText,
        children: [
          { label: 'RFC List', href: '/rfc' },
          { label: 'Approval Queue', href: '/rfc/approval' },
          { label: 'RFC History Log', href: '/rfclog' },
        ],
      },
    ]
  },
  {
    group: 'Non-Transactional',
    items: [
      {
        label: 'Warehouse',
        href: '/warehouse',
        icon: Warehouse,
        children: [
          { label: 'Warehouse List', href: '/warehouse' },
          { label: 'Material Receive', href: '/warehouse/receive' },
          { label: 'Stock Monitoring', href: '/warehouse/stock' },
        ],
      },
      {
        label: 'Inventory',
        href: '/inventory',
        icon: Package,
        children: [
          { label: 'Material Catalog', href: '/inventory/catalog' },
          { label: 'Stock Balance', href: '/inventory' },
          { label: 'Movement History', href: '/inventory/movements' },
        ],
      },
      {
        label: 'Material Transfer',
        href: '/transfer',
        icon: ArrowLeftRight,
      },
      {
        label: 'Reports',
        href: '/reports',
        icon: BarChart3,
      },
      {
        label: 'Master Data',
        href: '/master-data',
        icon: Database,
        children: [
          { label: 'Materials', href: '/master-data/materials' },
          { label: 'Warehouses', href: '/master-data/warehouses' },
          { label: 'Vendors', href: '/master-data/vendors' },
          { label: 'Users', href: '/master-data/users' },
          { label: 'Terms Configuration', href: '/master-data/terms' },
        ],
      },
    ]
  }
];

// Replaced NavCollapsible with AppSidebar internal drill-down logic

export default function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { setOpenMobile, openMobile } = useSidebar();
  const [counts, setCounts] = React.useState({ prApprovals: 0, rfcApprovals: 0, poApprovals: 0, materialReceives: 0, pendingLogistics: 0 });
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [activeGroup, setActiveGroup] = React.useState<any | null>(null);
  const [renderedGroup, setRenderedGroup] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (!openMobile) {
      setActiveGroup(null);
      setRenderedGroup(null);
    } else if (openMobile && contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [openMobile]);

  const handleSelectGroup = (group: any) => {
    setRenderedGroup(group);
    setTimeout(() => setActiveGroup(group), 10);
  };

  const handleBack = () => {
    setActiveGroup(null);
    setTimeout(() => setRenderedGroup(null), 300);
  };

  const getBadgeForLabel = (childLabel: string, parentLabel: string) => {
    if (childLabel === 'Approval Queue' && parentLabel === 'PR Management' && counts.prApprovals > 0) {
      return <Badge variant="destructive" className="ml-auto h-5 px-1.5 flex items-center justify-center text-[10px]">{counts.prApprovals}</Badge>;
    }
    if (childLabel === 'Approval Queue' && parentLabel === 'RFC' && counts.rfcApprovals > 0) {
      return <Badge variant="destructive" className="ml-auto h-5 px-1.5 flex items-center justify-center text-[10px]">{counts.rfcApprovals}</Badge>;
    }
    if (childLabel === 'Approval Queue' && parentLabel === 'Procurement' && counts.poApprovals > 0) {
      return <Badge variant="destructive" className="ml-auto h-5 px-1.5 flex items-center justify-center text-[10px]">{counts.poApprovals}</Badge>;
    }
    if (childLabel === 'Delivery Tracking' && counts.pendingLogistics > 0) {
      return <Badge variant="destructive" className="ml-auto h-5 px-1.5 flex items-center justify-center text-[10px]">{counts.pendingLogistics}</Badge>;
    }
    if (childLabel === 'Material Receive' && counts.materialReceives > 0) {
      return <Badge variant="destructive" className="ml-auto h-5 px-1.5 flex items-center justify-center text-[10px]">{counts.materialReceives}</Badge>;
    }
    return null;
  };

  const groupHasNotification = (item: any) => {
    if (item.label === 'PR Management' && counts.prApprovals > 0) return true;
    if (item.label === 'RFC' && counts.rfcApprovals > 0) return true;
    if (item.label === 'Procurement' && counts.poApprovals > 0) return true;
    if (item.label === 'Logistics' && counts.pendingLogistics > 0) return true;
    if (item.label === 'Warehouse' && counts.materialReceives > 0) return true;
    return false;
  };

  const filteredNavigation = groupedNavigation.map(group => {
    let filteredItems = group.items;
    
    // Role-based filtering
    const userRole = user?.role?.toUpperCase() || '';
    
    filteredItems = filteredItems.filter(item => {
      // Admin has access to everything
      if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') return true;

      // OWNER only has access to Owner Dashboard
      if (userRole === 'OWNER') {
        return item.label === 'Owner Dashboard';
      }

      // SITE_MANAGER has access to PIC Dashboard, RFC, and Non-Transactional except Master Data & Reports (no Main Dashboard)
      if (userRole === 'SITE_MANAGER') {
        if (['PIC Dashboard', 'Warehouse', 'Inventory', 'Material Transfer', 'RFC'].includes(item.label)) {
          return true;
        }
        return false;
      }

      switch (item.label) {
        case 'Owner Dashboard':
          return ['DIREKTUR', 'OWNER'].includes(userRole);
        case 'PIC Dashboard':
          return true; // All roles can view PIC Dashboard
        case 'Project Management':
          return ['PROJECT_MANAGER'].includes(userRole);
        case 'PR Management':
          return ['PROJECT_MANAGER', 'PROCUREMENT', 'DIREKTUR'].includes(userRole);
        case 'RFC':
          return true;
        case 'Procurement':
          return ['PROCUREMENT', 'DIREKTUR'].includes(userRole);
        case 'Logistics':
          return true; // All roles can view Logistics
        case 'Warehouse':
        case 'Inventory':
        case 'Material Transfer':
          return ['PROCUREMENT', 'DIREKTUR', 'PROJECT_MANAGER'].includes(userRole);
        case 'Master Data':
          return ['PROCUREMENT'].includes(userRole);
        default:
          return true; // Dashboard, Reports etc
      }
    });

    return {
      ...group,
      items: filteredItems.map(item => {
        if (item.children) {
          return {
            ...item,
            children: item.children.filter((child: any) => {
              if (child.href === '/rfclog') {
                const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'PROCUREMENT', 'DIREKTUR', 'OWNER', 'PROJECT_MANAGER', 'SITE_MANAGER'];
                return allowedRoles.includes(userRole);
              }
              return true;
            })
          };
        }
        return item;
      })
    };
  }).filter(group => group.items.length > 0);

  React.useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await api.get('/api/notifications/counts');
        if (res.data?.data) setCounts(res.data.data);
      } catch(e) {
        console.error("Failed to fetch notification counts", e);
      }
    };
    fetchCounts();
    
    const handleRefresh = () => fetchCounts();
    window.addEventListener('refreshNotifications', handleRefresh);
    return () => window.removeEventListener('refreshNotifications', handleRefresh);
  }, [pathname]); // Refetch on route change and events

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <Sidebar variant="sidebar" {...props}>
      <SidebarHeader className="border-b h-16 flex justify-center px-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="MAI Logo" className="w-10 h-10 object-contain" />
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight text-primary">Gudang Online</h1>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 font-medium max-w-[140px]">MAI Network Inventory App</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent ref={contentRef} className="px-2 pt-4 pb-[35px]">
        {!activeGroup ? (
          filteredNavigation.map((group) => (
              <SidebarGroup key={group.group} className="mb-2 last:mb-0">
                {group.group !== 'Main' && (
                  <SidebarGroupLabel className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {group.group}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1.5">
                    {group.items.map((item) => {
                      const hasChildren = item.children && item.children.length > 0;
                      const isItemActive = isActive(item.href);
                      
                      if (hasChildren) {
                        return (
                          <SidebarMenuItem key={item.label}>
                            <SidebarMenuButton 
                              tooltip={item.label}
                              className="text-[14px] border border-sidebar-border/50 px-[9px] py-[11px] h-auto"
                              onClick={() => handleSelectGroup(item)}
                            >
                              <item.icon />
                              <span>{item.label}</span>
                              {groupHasNotification(item) && (
                                <div className="w-2 h-2 rounded-full bg-destructive absolute right-10 top-1/2 -translate-y-1/2" />
                              )}
                              <ChevronRight className="ml-auto opacity-50" />
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      }

                      return (
                        <SidebarMenuItem key={item.label}>
                          <SidebarMenuButton 
                            isActive={isItemActive} 
                            tooltip={item.label}
                            className="text-[14px] border border-sidebar-border/50 px-[9px] py-[11px] h-auto"
                            render={<Link href={item.href} onClick={() => setOpenMobile(false)} />}
                          >
                            <item.icon />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
          ))
        ) : (
          renderedGroup && (
            <div className="flex flex-col gap-2">
              <button 
                onClick={handleBack}
                className="flex items-center gap-2 px-2 py-1.5 mb-2 text-muted-foreground hover:text-foreground transition-colors group w-max"
              >
                <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span className="text-[13px] font-medium">Back to Menu</span>
              </button>
              <div className="px-2 pb-2 mb-2 border-b">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <renderedGroup.icon className="w-4 h-4" />
                  <span className="text-[13px]">{renderedGroup.label}</span>
                </div>
              </div>
              <SidebarMenu className="gap-1.5">
                {renderedGroup.children.map((child: any) => (
                  <SidebarMenuItem key={child.label}>
                    <SidebarMenuButton 
                      isActive={pathname === child.href}
                      className="text-[14px] border border-sidebar-border/50 px-[9px] py-[11px] h-auto"
                      render={<Link href={child.href} onClick={() => setOpenMobile(false)} />}
                    >
                      <span>{child.label}</span>
                      {getBadgeForLabel(child.label, renderedGroup.label)}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          )
        )}
      </SidebarContent>

      {!activeGroup && (
        <SidebarFooter className="border-t p-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border flex items-center justify-center">
                  <span className="text-xs font-semibold">
                    {user?.name?.substring(0, 2).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate">{user?.name || 'User'}</span>
                  <span className="text-xs text-muted-foreground truncate">{user?.email || ''}</span>
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
