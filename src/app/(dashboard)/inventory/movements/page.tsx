'use client';

import { useEffect, useState } from 'react';
import { Search, Loader2, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTablePagination } from '@/components/shared/DataTablePagination';

export default function MovementsPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/api/inventory/movements', { params: { search, limit: 5000 } });
        setMovements(data.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
    setPage(1);
  }, [search]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'IN': return <ArrowDownToLine className="w-4 h-4 text-emerald-500" />;
      case 'OUT': return <ArrowUpFromLine className="w-4 h-4 text-red-500" />;
      default: return <ArrowRightLeft className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'IN': return <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">Goods In</Badge>;
      case 'OUT': return <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">Goods Out</Badge>;
      case 'TRANSFER': return <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">Transfer</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight">Inventory Movements</h1>
        <p className="text-muted-foreground text-sm mt-1">Track material in, out, and transfer transactions.</p>
      </div>

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
            <p className="text-muted-foreground">Loading movements...</p>
          </div>
        ) : movements.length > 0 ? (
          <div className="space-y-4">
            <Table className="table-fixed min-w-[1240px] w-full">
              <TableHeader>
                <TableRow className="bg-secondary/30">
                  <TableHead className="w-[170px]">Date</TableHead>
                  <TableHead className="w-[130px]">Type</TableHead>
                  <TableHead className="w-[460px]">Material</TableHead>
                  <TableHead className="w-[180px]">Warehouse</TableHead>
                  <TableHead className="w-[120px] text-right">Quantity</TableHead>
                  <TableHead className="w-[180px]">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.slice((page - 1) * pageSize, page * pageSize).map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-muted/30">
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(tx.transactionType)}
                        {getTransactionBadge(tx.transactionType)}
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
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{tx.material?.materialCode}</p>
                    </TableCell>
                    <TableCell className="truncate text-sm" title={tx.warehouse?.warehouseName || tx.warehouse?.name || '—'}>
                      {tx.warehouse?.warehouseName || tx.warehouse?.name || '—'}
                    </TableCell>
                    <TableCell className={`text-right font-semibold whitespace-nowrap ${tx.transactionType === 'IN' ? 'text-emerald-500' : tx.transactionType === 'OUT' ? 'text-red-500' : ''}`}>
                      {tx.transactionType === 'IN' ? '+' : tx.transactionType === 'OUT' ? '-' : ''}
                      {Number(tx.quantity || 0).toLocaleString()} {tx.material?.unit}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm truncate" title={tx.notes || '-'}>
                      {tx.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
            <p className="text-muted-foreground">No inventory transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
