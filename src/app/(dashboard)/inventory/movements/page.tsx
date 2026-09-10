'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Loader2, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine, X } from 'lucide-react';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTablePagination } from '@/components/shared/DataTablePagination';

function MovementsContent() {
  const searchParams = useSearchParams();
  const materialId = searchParams.get('materialId') || '';
  const warehouseId = searchParams.get('warehouseId') || '';

  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/api/inventory/movements', { 
          params: { 
            search, 
            materialId: materialId || undefined,
            warehouseId: warehouseId || undefined,
            limit: 5000 
          } 
        });
        setMovements(data.data || []);
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetch();
    setPage(1);
  }, [search, materialId, warehouseId]);

  const isOutflow = (type: string, qty: number) => {
    return type === 'OUT' || type === 'RFC_ISSUE' || Number(qty) < 0;
  };

  const isInflow = (type: string, qty: number) => {
    return type === 'IN' || type === 'DO_RECEIPT' || (type !== 'TRANSFER' && Number(qty) > 0);
  };

  const getTransactionIcon = (type: string, qty: number = 0) => {
    if (isOutflow(type, qty)) {
      return <ArrowUpFromLine className="w-4 h-4 text-red-500 shrink-0" />;
    }
    if (isInflow(type, qty)) {
      return <ArrowDownToLine className="w-4 h-4 text-emerald-500 shrink-0" />;
    }
    return <ArrowRightLeft className="w-4 h-4 text-blue-500 shrink-0" />;
  };

  const getTransactionBadge = (type: string, qty: number = 0) => {
    switch (type) {
      case 'IN':
        return <Badge variant="outline" className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-xs">Goods In</Badge>;
      case 'DO_RECEIPT':
        return <Badge variant="outline" className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-xs">DO Receipt (In)</Badge>;
      case 'OUT':
        return <Badge variant="outline" className="text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-xs">Goods Out</Badge>;
      case 'RFC_ISSUE':
        return <Badge variant="outline" className="text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-xs">RFC Issue (Out)</Badge>;
      case 'TRANSFER':
        return <Badge variant="outline" className="text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-xs">Transfer</Badge>;
      case 'MANUAL_ENTRY':
        return <Badge variant="outline" className="text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-xs">Manual Entry</Badge>;
      default:
        return isOutflow(type, qty) ? (
          <Badge variant="outline" className="text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-xs">{type}</Badge>
        ) : (
          <Badge variant="outline" className="text-xs">{type}</Badge>
        );
    }
  };

  const paginatedMovements = useMemo(() => {
    const start = (page - 1) * pageSize;
    return movements.slice(start, start + pageSize);
  }, [movements, page, pageSize]);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inventory Movements</h1>
        <p className="text-muted-foreground text-sm mt-1">Track material in, out, and transfer transactions.</p>
      </div>

      {/* Active URL Filter Indicator */}
      {(materialId || warehouseId) && (
        <div className="flex items-center gap-2 flex-wrap text-xs bg-muted/40 p-2.5 rounded-lg border border-border/60">
          <span className="text-muted-foreground font-medium">Filter Aktif:</span>
          {materialId && (
            <Badge variant="secondary" className="gap-1 text-[11px]">
              Material ID: {materialId.slice(0, 8)}...
            </Badge>
          )}
          {warehouseId && (
            <Badge variant="secondary" className="gap-1 text-[11px]">
              Gudang ID: {warehouseId.slice(0, 8)}...
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground gap-1 ml-auto"
            render={<Link href="/inventory/movements" />}
            nativeButton={false}
          >
            <X className="h-3 w-3" />
            <span>Hapus Filter</span>
          </Button>
        </div>
      )}

      <div className="relative w-full max-w-md animate-fade-in" style={{ animationDelay: '100ms' }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          type="search" 
          placeholder="Search by material code, name, or type..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card"
        />
      </div>

      <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        {loading ? (
          <div className="p-8 text-center flex flex-col items-center bg-card border rounded-xl">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground text-sm">Loading movements...</p>
          </div>
        ) : movements.length > 0 ? (
          <div className="space-y-4">
            {/* Mobile List View (screen <= 640px / 390px) */}
            <div className="block sm:hidden divide-y divide-border/60 border rounded-xl bg-card overflow-hidden">
              {paginatedMovements.map((tx) => {
                const outflow = isOutflow(tx.transactionType, tx.quantity);
                const inflow = isInflow(tx.transactionType, tx.quantity);

                return (
                  <div key={tx.id} className="p-3.5 flex flex-col gap-2.5 hover:bg-muted/20 transition-colors">
                    {/* Header: Badge & Date */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getTransactionIcon(tx.transactionType, tx.quantity)}
                        {getTransactionBadge(tx.transactionType, tx.quantity)}
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>

                    {/* Material Info */}
                    <div>
                      <div 
                        className="text-sm font-medium text-primary leading-snug break-words"
                        title={tx.material?.materialName}
                      >
                        {tx.material?.materialName || '—'}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {tx.material?.materialCode}
                      </p>
                    </div>

                    {/* Warehouse & Quantity */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                      <div className="text-muted-foreground truncate max-w-[55%]">
                        <span className="text-[10px] block text-muted-foreground/70 uppercase tracking-wider">Gudang</span>
                        <span className="font-medium text-foreground truncate block" title={tx.warehouse?.warehouseName || tx.warehouse?.name || '—'}>
                          {tx.warehouse?.warehouseName || tx.warehouse?.name || '—'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] block text-muted-foreground/70 uppercase tracking-wider">Kuantitas</span>
                        <span className={`font-bold text-sm ${outflow ? 'text-red-600 dark:text-red-400' : inflow ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                          {outflow ? '-' : '+'}{Math.abs(Number(tx.quantity || 0)).toLocaleString('id-ID')} {tx.material?.unit || 'pcs'}
                        </span>
                      </div>
                    </div>

                    {/* Notes & Ref if present */}
                    {(tx.notes || tx.referenceId) && (
                      <div className="text-[11px] text-muted-foreground bg-muted/40 rounded p-2 flex flex-col gap-0.5">
                        {tx.notes && (
                          <div className="truncate">
                            <span className="font-medium text-foreground/80">Catatan: </span>
                            {tx.notes}
                          </div>
                        )}
                        {tx.referenceId && (
                          <div className="font-mono text-[10px] text-muted-foreground/70">
                            Ref: {tx.referenceId}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (screen > 640px) */}
            <div className="hidden sm:block border rounded-xl overflow-x-auto bg-card">
              <Table className="table-fixed min-w-[1240px] w-full">
                <TableHeader>
                  <TableRow className="bg-secondary/30">
                    <TableHead className="w-[140px]">Date</TableHead>
                    <TableHead className="w-[180px]">Type</TableHead>
                    <TableHead className="w-[460px]">Material</TableHead>
                    <TableHead className="w-[180px]">Warehouse</TableHead>
                    <TableHead className="w-[120px] text-right">Quantity</TableHead>
                    <TableHead className="w-[180px]">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMovements.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-muted/30">
                      <TableCell className="text-[12px] whitespace-nowrap">
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium text-foreground">
                            {new Date(tx.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-muted-foreground text-[12px] mt-0.5">
                            {new Date(tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(tx.transactionType, tx.quantity)}
                          {getTransactionBadge(tx.transactionType, tx.quantity)}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <div 
                          className="max-w-[67ch] break-words text-sm font-medium text-primary leading-snug" 
                          style={{ maxWidth: '67ch' }}
                          title={tx.material?.materialName}
                        >
                          {tx.material?.materialName || '—'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{tx.material?.materialCode}</p>
                      </TableCell>
                      <TableCell className="truncate text-sm" title={tx.warehouse?.warehouseName || tx.warehouse?.name || '—'}>
                        {tx.warehouse?.warehouseName || tx.warehouse?.name || '—'}
                      </TableCell>
                      <TableCell className={`text-right font-semibold whitespace-nowrap ${isOutflow(tx.transactionType, tx.quantity) ? 'text-red-500' : isInflow(tx.transactionType, tx.quantity) ? 'text-emerald-500' : ''}`}>
                        {isOutflow(tx.transactionType, tx.quantity) ? '-' : '+'}{Math.abs(Number(tx.quantity || 0)).toLocaleString()} {tx.material?.unit}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm truncate" title={tx.notes || '-'}>
                        {tx.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="px-1">
              <DataTablePagination 
                totalItems={movements.length} 
                pageSize={pageSize} 
                currentPage={page} 
                onPageChange={setPage} 
                onPageSizeChange={setPageSize} 
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-card border rounded-xl">
            <ArrowRightLeft className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm">No inventory transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MovementsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center flex flex-col items-center bg-card border rounded-xl">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground text-sm">Loading movements...</p>
      </div>
    }>
      <MovementsContent />
    </Suspense>
  );
}
