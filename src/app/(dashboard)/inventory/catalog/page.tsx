'use client';

import { useEffect, useState, useMemo } from 'react';
import { Package, Search, Loader2, Tag } from 'lucide-react';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { useAuth } from '@/hooks/useAuth';

const MATERIAL_GROUPS = [
  { value: 'ALL', label: 'All Material Types' },
  { value: 'CABLE', label: 'Cable' },
  { value: 'OSP', label: 'OSP' },
  { value: 'ACTIVE_DEVICE', label: 'Active Device' },
  { value: 'PASSIVE_DEVICE', label: 'Passive Device' },
  { value: 'ACCESSORY', label: 'Accessory' },
  { value: 'TOOLS', label: 'Tools' },
  { value: 'CONSUMABLE', label: 'Consumable' },
  { value: 'OTHER', label: 'Other' },
];

export default function CatalogPage() {
  const { user } = useAuth();
  const isSiteManager = user?.role?.toUpperCase() === 'SITE_MANAGER';
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/api/materials', { 
          params: { 
            search, 
            group: filterGroup, 
            limit: 5000 
          } 
        });
        setMaterials(data.data || []);
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetch();
    setPage(1);
  }, [search, filterGroup]);

  const paginatedMaterials = useMemo(() => {
    const start = (page - 1) * pageSize;
    return materials.slice(start, start + pageSize);
  }, [materials, page, pageSize]);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inventory Catalog</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isSiteManager 
              ? "Daftar master material dan spesifikasi yang terdaftar di gudang." 
              : "Browse all registered master materials, types, and unit prices."}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3 shadow-sm w-full sm:w-auto shrink-0">
          <div className="bg-primary/10 p-2.5 rounded-lg">
            <Tag className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5">Catalog Materials</p>
            <p className="text-2xl font-bold leading-none">{materials.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by code, material name, or specification..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background h-10 rounded-lg text-sm"
            />
          </div>
          <div>
            <Select value={filterGroup} onValueChange={(val) => setFilterGroup(val || 'ALL')}>
              <SelectTrigger className="w-full bg-background h-10 rounded-lg text-sm">
                <SelectValue placeholder="All Material Types" />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_GROUPS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : materials.length > 0 ? (
          <div className="space-y-4">
            {/* Mobile List View (screen <= 640px / 390px) */}
            <div className="block sm:hidden divide-y divide-border/60 border rounded-xl bg-card overflow-hidden">
              {paginatedMaterials.map((m) => {
                const priceFormatted = m.unitPrice 
                  ? `Rp ${Number(m.unitPrice).toLocaleString('id-ID')}` 
                  : 'Rp 0';
                return (
                  <div key={m.id} className="p-3.5 flex flex-col gap-2 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <Badge variant="secondary" className="font-normal text-[10px] px-1.5 py-0 h-4 bg-muted text-muted-foreground">
                            {m.category || 'General'}
                          </Badge>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {m.materialCode}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm text-foreground leading-snug break-words" title={m.materialName}>
                          {m.materialName}
                        </h3>
                      </div>
                      <div className="shrink-0 text-right">
                        {!isSiteManager && Number(m.unitPrice) > 0 && (
                          <span className="text-xs font-semibold text-primary block">{priceFormatted}</span>
                        )}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground mt-0.5">
                          {m.unit}
                        </Badge>
                      </div>
                    </div>

                    {m.specification && (
                      <p className="text-xs text-muted-foreground/90 line-clamp-2 bg-muted/30 p-2 rounded text-[11px]" title={m.specification}>
                        {m.specification}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1.5 text-[11px] text-muted-foreground border-t border-border/40 mt-0.5">
                      <span>Satuan: <strong className="text-foreground font-medium">{m.unit}</strong></span>
                      {!isSiteManager && Number(m.unitPrice) > 0 && (
                        <span>Harga Satuan: <strong className="text-foreground font-medium">{priceFormatted}</strong></span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Grid View (screen > 640px) */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedMaterials.map((m) => {
                const priceFormatted = m.unitPrice 
                  ? `Rp ${Number(m.unitPrice).toLocaleString('id-ID')}` 
                  : 'Rp 0';
                return (
                  <div key={m.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow group flex flex-col h-full">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <Badge variant="secondary" className="font-normal text-xs bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          {m.category}
                        </Badge>
                        {!isSiteManager && Number(m.unitPrice) > 0 ? (
                          <span className="text-xs font-semibold text-primary">{priceFormatted} / {m.unit}</span>
                        ) : (
                          <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-border/80">
                            {m.unit}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg line-clamp-2 leading-tight mb-1" title={m.materialName}>{m.materialName}</h3>
                      <p className="text-sm text-muted-foreground">{m.materialCode}</p>
                      
                      {m.specification && (
                        <p className="text-sm text-muted-foreground mt-4 line-clamp-3" title={m.specification}>
                          {m.specification}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t flex justify-between items-center opacity-70 group-hover:opacity-100 transition-opacity">
                      {!isSiteManager && Number(m.unitPrice) > 0 ? (
                        <span className="text-xs text-muted-foreground">Harga Satuan: {priceFormatted}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Satuan: {m.unit}</span>
                      )}
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="px-1">
              <DataTablePagination 
                totalItems={materials.length} 
                pageSize={pageSize} 
                currentPage={page} 
                onPageChange={setPage} 
                onPageSizeChange={setPageSize} 
                pageSizeOptions={[8, 12, 24, 48, 96]}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-card border rounded-xl">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No materials found matching your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
