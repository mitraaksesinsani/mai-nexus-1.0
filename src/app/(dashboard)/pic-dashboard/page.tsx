'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Warehouse as WarehouseIcon, 
  Package, 
  AlertTriangle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  RefreshCw, 
  Building2, 
  Layers, 
  MapPin, 
  User, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Filter,
  FileSpreadsheet,
  Clock,
  ExternalLink
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';

interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  location?: string;
  type?: string;
  status: string;
  picId?: string;
  picName?: string;
  picUser?: {
    name: string;
    email: string;
    role: string;
  };
  totalMaterials: number;
  totalStock: number;
}

interface StockItem {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  category: string;
  unit: string;
  quantity: number;
  lastUpdated?: string;
}

interface RecentTransaction {
  id: string;
  transactionType: string;
  quantity: number;
  referenceId?: string;
  notes?: string;
  createdAt: string;
  createdByName: string;
  materialName: string;
  materialCode: string;
  unit: string;
  warehouseName: string;
}

interface DashboardData {
  isAdmin: boolean;
  user: {
    id: string;
    name: string;
    role: string;
  };
  assignedWarehouses: WarehouseItem[];
  selectedWarehouse: any;
  metrics: {
    totalWarehouses: number;
    totalStock: number;
    totalSkus: number;
    lowStockCount: number;
    recentMovementsCount: number;
  };
  stocks: StockItem[];
  recentTransactions: RecentTransaction[];
}

export default function PicDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'AVAILABLE'>('ALL');

  const fetchData = async (warehouseId?: string) => {
    try {
      setLoading(true);
      const url = warehouseId ? `/api/dashboard/pic?warehouseId=${warehouseId}` : '/api/dashboard/pic';
      const res = await api.get(url);
      if (res.data?.data) {
        setData(res.data.data);
        if (!selectedWarehouseId && res.data.data.selectedWarehouse?.id) {
          setSelectedWarehouseId(res.data.data.selectedWarehouse.id);
        }
      }
    } catch (error) {
      console.error('Failed to load PIC dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedWarehouseId || undefined);
  }, [selectedWarehouseId]);

  const handleWarehouseChange = (val: string) => {
    setSelectedWarehouseId(val);
  };

  // Filter stocks by search and stock filter
  const filteredStocks = useMemo(() => {
    if (!data?.stocks) return [];
    return data.stocks.filter((item) => {
      const matchSearch =
        item.materialName.toLowerCase().includes(search.toLowerCase()) ||
        item.materialCode.toLowerCase().includes(search.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(search.toLowerCase()));

      if (!matchSearch) return false;

      if (stockFilter === 'LOW') return item.quantity <= 10;
      if (stockFilter === 'AVAILABLE') return item.quantity > 10;
      return true;
    });
  }, [data?.stocks, search, stockFilter]);

  const activeWh = useMemo(() => {
    if (!data) return null;
    if (selectedWarehouseId === 'ALL') return null;
    return data.assignedWarehouses.find((w) => w.id === selectedWarehouseId) || data.selectedWarehouse;
  }, [data, selectedWarehouseId]);

  if (loading && !data) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-4">
        <div className="flex h-12 w-12 animate-spin items-center justify-center rounded-xl bg-primary/10 text-primary">
          <RefreshCw className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Memuat data PIC Dashboard...
        </p>
      </div>
    );
  }

  // State when not an admin and not assigned to any warehouse
  if (data && !data.isAdmin && data.assignedWarehouses.length === 0) {
    return (
      <div className="container max-w-4xl py-12 space-y-6">
        <Card className="border-dashed shadow-none">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40">
              <Building2 className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold">Belum Ada Penugasan Gudang</CardTitle>
            <CardDescription className="text-base max-w-md mx-auto pt-2">
              Halo <span className="font-semibold text-foreground">{user?.name || 'User'}</span>, Anda saat ini belum tercatat sebagai PIC (Penanggung Jawab) di gudang manapun.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4 pt-4">
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Silakan hubungi Procurement atau Administrator sistem jika Anda adalah penanggung jawab gudang tertentu untuk di-assign pada menu Master Data Gudang.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button variant="outline" render={<Link href="/" />} nativeButton={false}>
                Kembali ke Beranda
              </Button>
              <Button render={<Link href="/warehouse" />} nativeButton={false}>
                Lihat Gudang Umum
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              PIC Warehouse Dashboard
            </h1>
            {data?.isAdmin && (
              <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                <ShieldCheck className="h-3 w-3" />
                Mode Administrator (God Eye)
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoring ketersediaan barang dan tata kelola material di gudang operasional Anda.
          </p>
        </div>

        {/* Warehouse Selector & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {data && data.assignedWarehouses.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Gudang:</span>
              <Select value={selectedWarehouseId} onValueChange={(val) => { if (val) handleWarehouseChange(val); }}>
                <SelectTrigger className="w-[240px] bg-background">
                  <SelectValue placeholder="Pilih Gudang">
                    {selectedWarehouseId === 'ALL'
                      ? `Semua Gudang Terkait (${data.assignedWarehouses.length})`
                      : (data.assignedWarehouses.find((wh) => wh.id === selectedWarehouseId)?.name ||
                         (data.selectedWarehouse?.id === selectedWarehouseId ? data.selectedWarehouse.name : null))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {data.assignedWarehouses.length > 1 && (
                    <SelectItem value="ALL">
                      Semua Gudang Terkait ({data.assignedWarehouses.length})
                    </SelectItem>
                  )}
                  {data.assignedWarehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name} {wh.code ? `(${wh.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => fetchData(selectedWarehouseId)} 
            disabled={loading}
            title="Muat ulang data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button render={<Link href="/rfc" />} nativeButton={false} className="gap-2">
            <Package className="h-4 w-4" />
            <span>Kelola RFC</span>
          </Button>
        </div>
      </div>

      {/* Selected Warehouse Banner (if single warehouse selected) */}
      {activeWh && activeWh.id !== 'ALL' && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-foreground">{activeWh.name}</span>
                <Badge variant="outline" className="font-normal text-xs uppercase">
                  {activeWh.code}
                </Badge>
                <Badge 
                  variant={activeWh.status === 'ACTIVE' ? 'default' : 'secondary'}
                  className="text-[10px] px-1.5 py-0 h-4"
                >
                  {activeWh.status || 'ACTIVE'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                {activeWh.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground/70" />
                    {activeWh.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-muted-foreground/70" />
                  PIC: <span className="font-medium text-foreground">{activeWh.picName || 'Unassigned'}</span>
                </span>
                {activeWh.type && (
                  <span>Tipe: <span className="font-medium text-foreground">{activeWh.type}</span></span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <Button variant="outline" size="sm" render={<Link href="/warehouse" />} nativeButton={false} className="h-8 text-xs gap-1.5">
                <span>Detail Master Gudang</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Section */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Stock */}
        <Card className="relative overflow-hidden shadow-none border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Stok Barang
            </CardTitle>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {data?.metrics.totalStock?.toLocaleString('id-ID') || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unit fisik material tersedia
            </p>
          </CardContent>
        </Card>

        {/* Total SKUs */}
        <Card className="relative overflow-hidden shadow-none border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Varian Material (SKU)
            </CardTitle>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {data?.metrics.totalSkus?.toLocaleString('id-ID') || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Item barang terdaftar di gudang
            </p>
          </CardContent>
        </Card>

        {/* Low Stock Warning */}
        <Card className="relative overflow-hidden shadow-none border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stok Menipis (≤ 10)
            </CardTitle>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-500">
              {data?.metrics.lowStockCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Memerlukan pengadaan / restock
            </p>
          </CardContent>
        </Card>

        {/* Managed Warehouses */}
        <Card className="relative overflow-hidden shadow-none border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gudang Dikelola
            </CardTitle>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
              <WarehouseIcon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {data?.metrics.totalWarehouses || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Gudang di bawah penugasan Anda
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="inventory" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-9">
            <TabsTrigger value="inventory" className="text-xs gap-1.5">
              <Package className="h-3.5 w-3.5" />
              <span>Daftar Stok Material ({filteredStocks.length})</span>
            </TabsTrigger>
            <TabsTrigger value="movements" className="text-xs gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Riwayat Transaksi Terkini ({data?.recentTransactions?.length || 0})</span>
            </TabsTrigger>
          </TabsList>

          {/* Quick Filter for stock */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-[260px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari kode, nama material..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
          </div>
        </div>

        {/* Tab 1: Inventory Table */}
        <TabsContent value="inventory" className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground pb-1">
            <div className="flex items-center gap-1.5">
              <span>Filter Status:</span>
              <Button
                variant={stockFilter === 'ALL' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setStockFilter('ALL')}
              >
                Semua
              </Button>
              <Button
                variant={stockFilter === 'LOW' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-2.5 text-amber-600 dark:text-amber-400"
                onClick={() => setStockFilter('LOW')}
              >
                Stok Menipis (≤ 10)
              </Button>
              <Button
                variant={stockFilter === 'AVAILABLE' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-2.5 text-emerald-600 dark:text-emerald-400"
                onClick={() => setStockFilter('AVAILABLE')}
              >
                Stok Aman (&gt; 10)
              </Button>
            </div>

            <div className="text-xs">
              Menampilkan <span className="font-semibold text-foreground">{filteredStocks.length}</span> SKU
            </div>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Kode Material</th>
                    <th className="px-4 py-3">Nama Material & Kategori</th>
                    {selectedWarehouseId === 'ALL' && <th className="px-4 py-3">Gudang</th>}
                    <th className="px-4 py-3 text-right">Stok Fisik</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredStocks.length === 0 ? (
                    <tr>
                      <td 
                        colSpan={selectedWarehouseId === 'ALL' ? 6 : 5} 
                        className="py-12 text-center text-muted-foreground"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Package className="h-8 w-8 text-muted-foreground/50" />
                          <p className="text-sm font-medium">Tidak ada data stok material yang sesuai</p>
                          <p className="text-xs text-muted-foreground">Coba ubah kata kunci pencarian atau filter status stok.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStocks.map((stock) => {
                      const isLow = stock.quantity <= 10;
                      const isZero = stock.quantity === 0;

                      return (
                        <tr key={stock.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">
                            {stock.materialCode}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{stock.materialName}</div>
                            {stock.category && (
                              <span className="inline-block text-[11px] text-muted-foreground">
                                {stock.category}
                              </span>
                            )}
                          </td>
                          {selectedWarehouseId === 'ALL' && (
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {stock.warehouseName}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-foreground text-base">
                              {stock.quantity.toLocaleString('id-ID')}
                            </span>{' '}
                            <span className="text-xs text-muted-foreground">{stock.unit || 'pcs'}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isZero ? (
                              <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                                Habis
                              </Badge>
                            ) : isLow ? (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                                Menipis
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                                Aman
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                render={<Link href={`/inventory/movements?materialId=${stock.materialId}&warehouseId=${stock.warehouseId}`} />} 
                                nativeButton={false}
                                className="h-7 text-xs px-2"
                              >
                                Riwayat
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                render={<Link href="/rfc" />} 
                                nativeButton={false}
                                className="h-7 text-xs px-2"
                              >
                                RFC
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Movements / Activity Log */}
        <TabsContent value="movements" className="space-y-3">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Aktivitas Transaksi Gudang Terkini</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Catatan mutasi material (Penerimaan, Pengeluaran, RFC, dsb)</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                render={<Link href="/inventory/movements" />} 
                nativeButton={false}
                className="text-xs h-7 gap-1"
              >
                <span>Lihat Seluruh Mutasi</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Tipe Mutasi</th>
                    <th className="px-4 py-3">Material</th>
                    <th className="px-4 py-3">Gudang</th>
                    <th className="px-4 py-3 text-right">Kuantitas</th>
                    <th className="px-4 py-3">PIC / Operator</th>
                    <th className="px-4 py-3">Catatan / Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(!data?.recentTransactions || data.recentTransactions.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Clock className="h-8 w-8 text-muted-foreground/50" />
                          <p className="text-sm font-medium">Belum ada aktivitas transaksi di gudang ini</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data.recentTransactions.map((tx) => {
                      const isReceive = ['RECEIPT', 'IN', 'PURCHASE'].some((t) => tx.transactionType?.toUpperCase().includes(t));
                      const isIssue = ['ISSUE', 'OUT', 'RFC'].some((t) => tx.transactionType?.toUpperCase().includes(t));

                      return (
                        <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(tx.createdAt).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <Badge 
                              variant={isReceive ? 'default' : isIssue ? 'destructive' : 'secondary'}
                              className="text-[10px] uppercase font-semibold"
                            >
                              {tx.transactionType}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{tx.materialName}</div>
                            <div className="text-[11px] text-muted-foreground">{tx.materialCode}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {tx.warehouseName}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground">
                            <span className={isReceive ? 'text-emerald-600' : isIssue ? 'text-red-600' : ''}>
                              {isReceive ? '+' : isIssue ? '-' : ''}{tx.quantity.toLocaleString('id-ID')}
                            </span>{' '}
                            <span className="text-xs font-normal text-muted-foreground">{tx.unit || 'pcs'}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground">
                            {tx.createdByName || 'System'}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                            {tx.notes || tx.referenceId || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
