'use client';

import { useEffect, useState } from 'react';
import { 
  ArrowLeftRight, 
  Search, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  Package, 
  User, 
  Warehouse as WarehouseIcon, 
  Calendar,
  Lock,
  ArrowRight
} from 'lucide-react';
import api from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { useAuth } from '@/hooks/useAuth';

interface TransferItem {
  id: string;
  transferNumber: string;
  fromLocation: string;
  toLocation: string;
  transferDate?: string;
  reason?: string;
  status: string;
  pic?: string;
  originPicId?: string;
  destinationPic?: string;
  destinationPicId?: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  materialId?: string;
  materialName?: string;
  materialCode?: string;
  quantity?: number;
  unit?: string;
  receivedAt?: string;
  receivedBy?: string;
  createdAt: string;
}

export default function TransferPage() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [viewData, setViewData] = useState<TransferItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  // References
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [siteManagers, setSiteManagers] = useState<any[]>([]);
  const [availableStocks, setAvailableStocks] = useState<any[]>([]);
  const [stocksLoading, setStocksLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    transferNumber: '',
    fromWarehouseId: '',
    fromLocation: '',
    toWarehouseId: '',
    toLocation: '',
    transferDate: '',
    reason: '',
    pic: '',
    originPicId: '',
    destinationPic: '',
    destinationPicId: '',
    materialId: '',
    materialName: '',
    materialCode: '',
    quantity: 1,
    unit: 'pcs'
  });

  const isSiteManager = user?.role === 'SITE_MANAGER';

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/transfer', { params: { search, limit: 5000 } });
      setTransfers(data.data || []);
    } catch (e) { 
      console.error('Failed to fetch transfers', e); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchWarehouses = async () => {
    try {
      const { data } = await api.get('/api/warehouse', { params: { limit: 200 } });
      setWarehouses(data.data || []);
    } catch (e) {
      console.error('Failed to fetch warehouses', e);
    }
  };

  const fetchSiteManagers = async () => {
    try {
      const { data } = await api.get('/api/users?role=SITE_MANAGER');
      setSiteManagers(data.data || []);
    } catch (e) {
      console.error('Failed to fetch site managers', e);
    }
  };

  useEffect(() => {
    fetchTransfers();
    fetchWarehouses();
    fetchSiteManagers();
    setPage(1);
  }, [search]);

  // When fromWarehouseId changes in form, fetch available stocks in that warehouse
  const fetchStocksForOrigin = async (whId: string) => {
    if (!whId) {
      setAvailableStocks([]);
      return;
    }
    setStocksLoading(true);
    try {
      const { data } = await api.get(`/api/inventory/stocks?warehouseId=${whId}&limit=500`);
      setAvailableStocks(data.data || []);
    } catch (e) {
      console.error('Failed to fetch stocks for origin warehouse', e);
    } finally {
      setStocksLoading(false);
    }
  };

  const handleOpenNewTransfer = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const autoNumber = `TR-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    let defaultFromWhId = '';
    let defaultFromLocation = '';

    // If Site Manager, auto-select their assigned warehouse
    if (isSiteManager && user) {
      const myWh = warehouses.find(
        (w) => w.picId === user.id || (w.picName && w.picName.toLowerCase() === user.name?.toLowerCase())
      );
      if (myWh) {
        defaultFromWhId = myWh.id;
        defaultFromLocation = myWh.name;
        fetchStocksForOrigin(myWh.id);
      }
    }

    setFormData({
      transferNumber: autoNumber,
      fromWarehouseId: defaultFromWhId,
      fromLocation: defaultFromLocation,
      toWarehouseId: '',
      toLocation: '',
      transferDate: dateStr,
      reason: '',
      pic: user?.name || '',
      originPicId: user?.id || (user as any)?.sub || '',
      destinationPic: '',
      destinationPicId: '',
      materialId: '',
      materialName: '',
      materialCode: '',
      quantity: 1,
      unit: 'pcs'
    });

    setIsOpen(true);
  };

  const handleDestinationPicChange = (picId: string | null) => {
    if (!picId) return;
    const selectedSm = siteManagers.find((sm) => sm.id === picId);
    if (!selectedSm) return;

    // Find destination warehouse managed by this Site Manager
    const destWh = warehouses.find(
      (w) => w.picId === selectedSm.id || (w.picName && w.picName.toLowerCase() === selectedSm.name.toLowerCase())
    );

    setFormData((prev) => ({
      ...prev,
      destinationPicId: selectedSm.id,
      destinationPic: selectedSm.name,
      toWarehouseId: destWh ? destWh.id : '',
      toLocation: destWh ? destWh.name : (prev.toLocation || `Gudang ${selectedSm.name}`)
    }));
  };

  const handleMaterialSelect = (matId: string | null) => {
    if (!matId) return;
    const selected = availableStocks.find((s) => s.materialId === matId || s.material?.id === matId);
    if (!selected) return;

    const code = selected.materialCode || selected.material?.materialCode || '';
    const name = selected.materialName || selected.material?.materialName || '';
    const unit = selected.unit || selected.material?.unit || 'pcs';
    const currentQty = selected.quantity || 0;

    setFormData((prev) => ({
      ...prev,
      materialId: matId,
      materialCode: code,
      materialName: name,
      unit: unit,
      quantity: Math.min(1, currentQty)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.toLocation) {
      alert('Silakan pilih PIC Tujuan / Lokasi Tujuan.');
      return;
    }

    if (!formData.materialId || formData.quantity <= 0) {
      alert('Silakan pilih material yang akan ditransfer dan pastikan jumlah lebih dari 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/api/transfer', formData);
      alert(res.data?.message || 'Transfer berhasil dibuat!');
      setIsOpen(false);
      fetchTransfers();
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      alert(error.response?.data?.message || 'Gagal membuat Transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Receive Transfer action
  const handleReceiveTransfer = async (transfer: TransferItem) => {
    const confirmMsg = `Konfirmasi penerimaan transfer ${transfer.transferNumber} (${transfer.quantity} ${transfer.unit || 'pcs'} ${transfer.materialName || 'Material'}) ke ${transfer.toLocation}? Stok akan langsung ditambahkan ke gudang Anda.`;
    if (!window.confirm(confirmMsg)) return;

    setReceivingId(transfer.id);
    try {
      const res = await api.put('/api/transfer', { id: transfer.id, action: 'RECEIVE' });
      alert(res.data?.message || 'Material transfer berhasil diterima!');
      if (viewData?.id === transfer.id) {
        setViewData(null);
      }
      fetchTransfers();
    } catch (error: any) {
      console.error('Error receiving transfer:', error);
      alert(error.response?.data?.message || 'Gagal menerima transfer');
    } finally {
      setReceivingId(null);
    }
  };

  // Determine whether current logged-in user can receive this transfer
  const canUserReceive = (t: TransferItem) => {
    if (t.status === 'RECEIVED' || t.status === 'COMPLETED') return false;
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') return true;
    if (user?.role === 'SITE_MANAGER') {
      const isMyName = user.name && t.destinationPic && user.name.toLowerCase() === t.destinationPic.toLowerCase();
      const isMyId = (user.id || (user as any).sub) === t.destinationPicId;
      return Boolean(isMyName || isMyId);
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Material Transfer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola pengiriman & penerimaan perpindahan material antar gudang Site Manager
          </p>
        </div>
        <Button onClick={handleOpenNewTransfer} className="gap-2">
          <Plus className="w-4 h-4" /> 
          <span>New Transfer</span>
        </Button>
      </div>

      {/* Toolbar Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Cari nomor transfer, material, atau lokasi..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table & Content */}
      <div className="animate-fade-in">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center bg-card border rounded-xl">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground text-sm">Memuat data material transfer...</p>
          </div>
        ) : transfers.length > 0 ? (
          <>
            {/* Mobile View (screen <= 640px / 390px): List Card */}
            <div className="block sm:hidden border rounded-xl bg-card overflow-hidden divide-y divide-border/60">
              {transfers.slice((page - 1) * pageSize, page * pageSize).map((t) => {
                const isReceiver = canUserReceive(t);
                const isProcessing = receivingId === t.id;

                return (
                  <div key={t.id} className="p-3.5 flex flex-col gap-2 hover:bg-muted/20 transition-colors">
                    {/* Header: Transfer Number & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm text-primary">
                          {t.transferNumber}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{t.transferDate ? formatDate(t.transferDate) : '-'}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <StatusBadge status={t.status} />
                      </div>
                    </div>

                    {/* Route: From -> To */}
                    <div className="text-xs bg-muted/40 p-2 rounded-lg flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] text-muted-foreground block">Dari:</span>
                        <span className="font-medium text-foreground truncate block">{t.fromLocation}</span>
                        <span className="text-[10px] text-muted-foreground/80 block">PIC: {t.pic || '-'}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 text-right">
                        <span className="text-[10px] text-muted-foreground block">Tujuan:</span>
                        <span className="font-medium text-foreground truncate block">{t.toLocation}</span>
                        <span className="text-[10px] text-muted-foreground/80 block">PIC: {t.destinationPic || '-'}</span>
                      </div>
                    </div>

                    {/* Material Info */}
                    {t.materialName && (
                      <div className="text-xs flex items-center justify-between pt-1 border-t border-border/40">
                        <div className="truncate">
                          <span className="font-medium text-foreground">{t.materialName}</span>
                          {t.materialCode && <span className="text-[11px] font-mono text-muted-foreground ml-1.5">({t.materialCode})</span>}
                        </div>
                        <div className="shrink-0 font-bold text-sm text-primary">
                          {t.quantity?.toLocaleString('id-ID')} <span className="text-xs font-normal text-muted-foreground">{t.unit || 'pcs'}</span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                      {isReceiver && (
                        <Button 
                          size="sm" 
                          variant="default"
                          className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          onClick={() => handleReceiveTransfer(t)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          <span>Receive Transfer</span>
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs px-2.5" 
                        onClick={() => setViewData(t)}
                      >
                        Detail
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View (screen > 640px): Table */}
            <div className="hidden sm:block">
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">No. Transfer</TableHead>
                    <TableHead>Dari (Gudang & PIC)</TableHead>
                    <TableHead>Tujuan (Gudang & PIC)</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.slice((page - 1) * pageSize, page * pageSize).map((t) => {
                    const isReceiver = canUserReceive(t);
                    const isProcessing = receivingId === t.id;

                    return (
                      <TableRow key={t.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-primary">{t.transferNumber}</TableCell>
                        <TableCell>
                          <div className="font-medium text-xs">{t.fromLocation}</div>
                          <div className="text-[11px] text-muted-foreground">PIC: {t.pic || '-'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-xs">{t.toLocation}</div>
                          <div className="text-[11px] text-muted-foreground">PIC: {t.destinationPic || '-'}</div>
                        </TableCell>
                        <TableCell>
                          {t.materialName ? (
                            <div>
                              <div className="font-medium text-xs truncate max-w-[180px]">{t.materialName}</div>
                              <div className="text-[11px] font-mono text-muted-foreground">{t.materialCode}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-sm">{t.quantity ? t.quantity.toLocaleString('id-ID') : '-'}</span>{' '}
                          <span className="text-[11px] text-muted-foreground">{t.unit || ''}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {t.transferDate ? formatDate(t.transferDate) : '-'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={t.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isReceiver && (
                              <Button 
                                size="sm" 
                                className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                onClick={() => handleReceiveTransfer(t)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                <span>Receive</span>
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs text-primary bg-primary/10 hover:bg-primary/20" 
                              onClick={() => setViewData(t)}
                            >
                              Detail
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <DataTablePagination 
              totalItems={transfers.length} 
              pageSize={pageSize} 
              currentPage={page} 
              onPageChange={setPage} 
              onPageSizeChange={setPageSize} 
            />
          </>
        ) : (
          <div className="text-center py-16 bg-card border rounded-xl">
            <ArrowLeftRight className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm font-medium">Belum ada data transfer material</p>
            <Button variant="link" onClick={handleOpenNewTransfer} className="mt-2 text-sm">
              Buat transfer material pertama Anda
            </Button>
          </div>
        )}
      </div>

      {/* Modal New Transfer */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-primary" />
                <span>New Material Transfer</span>
              </DialogTitle>
              <DialogDescription>
                Transfer material dari gudang Anda ke gudang Site Manager tujuan.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-sm">
              {/* No. Transfer & Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="transferNumber">Nomor Transfer *</Label>
                  <Input 
                    id="transferNumber" 
                    value={formData.transferNumber}
                    onChange={(e) => setFormData({...formData, transferNumber: e.target.value})}
                    required 
                    className="font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="transferDate">Tanggal Transfer *</Label>
                  <DatePicker 
                    value={formData.transferDate}
                    onChange={(val) => setFormData({...formData, transferDate: val})}
                  />
                </div>
              </div>

              {/* PIC Pengirim (Otomatis & Terkunci) & Gudang Asal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-muted/30 rounded-xl border">
                <div className="flex flex-col gap-1.5">
                  <Label className="flex items-center justify-between">
                    <span>PIC Pengirim (Anda)</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-normal">
                      <Lock className="h-3 w-3" /> Terkunci otomatis
                    </span>
                  </Label>
                  <div className="relative">
                    <Input 
                      value={formData.pic} 
                      disabled 
                      readOnly
                      className="bg-muted text-foreground/80 cursor-not-allowed font-medium"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fromLocation">Gudang Asal (Pengirim) *</Label>
                  <Select 
                    value={formData.fromWarehouseId || ''} 
                    onValueChange={(val) => {
                      const wh = warehouses.find(w => w.id === val);
                      setFormData({ 
                        ...formData, 
                        fromWarehouseId: val || '',
                        fromLocation: wh ? wh.name : '',
                        materialId: '',
                        materialName: '',
                        materialCode: ''
                      });
                      if (val) fetchStocksForOrigin(val);
                    }}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Gudang Asal" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id}>
                          {wh.name} {wh.code ? `(${wh.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* PIC Tujuan (Hanya SITE_MANAGER) & Gudang Tujuan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="destinationPic">
                    PIC Tujuan (Site Manager) *
                  </Label>
                  <Select 
                    value={formData.destinationPicId || ''} 
                    onValueChange={handleDestinationPicChange}
                    required
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Pilih Site Manager Tujuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {siteManagers
                        .filter((sm) => sm.id !== user?.id && sm.id !== (user as any)?.sub)
                        .map((sm) => (
                          <SelectItem key={sm.id} value={sm.id}>
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{sm.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="toLocation">Gudang Tujuan (Penerima) *</Label>
                  <Input 
                    id="toLocation" 
                    placeholder="Otomatis terisi saat PIC dipilih" 
                    value={formData.toLocation}
                    onChange={(e) => setFormData({...formData, toLocation: e.target.value})}
                    required 
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Pemilihan Material & Jumlah Transfer */}
              <div className="p-3 bg-card rounded-xl border space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-xs text-foreground">
                    Material yang Ditransfer *
                  </Label>
                  {stocksLoading && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Memuat stok...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Pilih Dari Stok Gudang Asal</Label>
                    <Select 
                      value={formData.materialId || ''} 
                      onValueChange={handleMaterialSelect}
                      disabled={!formData.fromWarehouseId || availableStocks.length === 0}
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder={!formData.fromWarehouseId ? "Pilih Gudang Asal Terlebih Dahulu" : (availableStocks.length === 0 ? "Tidak ada stok material di gudang ini" : "Pilih Material")} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStocks.map((stock) => {
                          const matId = stock.materialId || stock.material?.id || stock.id;
                          const name = stock.materialName || stock.material?.materialName;
                          const code = stock.materialCode || stock.material?.materialCode;
                          const qty = stock.quantity || 0;
                          const unit = stock.unit || stock.material?.unit || 'pcs';

                          return (
                            <SelectItem key={matId} value={matId} disabled={qty <= 0}>
                              <div className="flex items-center justify-between w-full gap-3">
                                <span>{name} ({code})</span>
                                <span className="font-bold text-primary text-[11px]">Tersedia: {qty} {unit}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Kuantitas ({formData.unit}) *
                    </Label>
                    <Input 
                      type="number"
                      min={1}
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Catatan / Alasan */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reason">Catatan / Alasan Transfer</Label>
                <Input 
                  id="reason" 
                  placeholder="Misal: Kebutuhan darurat material untuk site project B" 
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Kirim Transfer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Detail Transfer */}
      <Dialog open={!!viewData} onOpenChange={(open) => !open && setViewData(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Detail Material Transfer</DialogTitle>
            <DialogDescription>
              Informasi lengkap perpindahan material nomor <span className="font-semibold text-primary">{viewData?.transferNumber}</span>
            </DialogDescription>
          </DialogHeader>

          {viewData && (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-3 gap-2 border-b pb-2.5">
                <span className="text-muted-foreground">Status</span>
                <span className="col-span-2"><StatusBadge status={viewData.status} /></span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b pb-2.5">
                <span className="text-muted-foreground">Dari Gudang</span>
                <div className="col-span-2">
                  <div className="font-semibold text-foreground">{viewData.fromLocation}</div>
                  <div className="text-xs text-muted-foreground">PIC: {viewData.pic || '-'}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b pb-2.5">
                <span className="text-muted-foreground">Gudang Tujuan</span>
                <div className="col-span-2">
                  <div className="font-semibold text-foreground">{viewData.toLocation}</div>
                  <div className="text-xs text-muted-foreground">PIC Tujuan: {viewData.destinationPic || '-'}</div>
                </div>
              </div>
              {viewData.materialName && (
                <div className="grid grid-cols-3 gap-2 border-b pb-2.5">
                  <span className="text-muted-foreground">Material</span>
                  <div className="col-span-2">
                    <div className="font-semibold text-foreground">{viewData.materialName}</div>
                    <div className="text-xs text-muted-foreground">Kode: {viewData.materialCode || '-'}</div>
                    <div className="font-bold text-primary mt-1">
                      Jumlah: {viewData.quantity?.toLocaleString('id-ID')} {viewData.unit || 'pcs'}
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 border-b pb-2.5">
                <span className="text-muted-foreground">Tanggal Transfer</span>
                <span className="col-span-2">{viewData.transferDate ? formatDate(viewData.transferDate) : '-'}</span>
              </div>
              {viewData.receivedAt && (
                <div className="grid grid-cols-3 gap-2 border-b pb-2.5 text-emerald-600 dark:text-emerald-400">
                  <span>Diterima Pada</span>
                  <span className="col-span-2 font-medium">
                    {formatDate(viewData.receivedAt)} oleh {viewData.receivedBy || 'Site Manager'}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 pb-1">
                <span className="text-muted-foreground">Alasan / Catatan</span>
                <span className="col-span-2 whitespace-pre-wrap">{viewData.reason || '-'}</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex w-full justify-between items-center sm:justify-between">
            <div>
              {viewData && canUserReceive(viewData) && (
                <Button 
                  type="button" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  onClick={() => handleReceiveTransfer(viewData)}
                  disabled={receivingId === viewData.id}
                >
                  {receivingId === viewData.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>Receive Transfer</span>
                </Button>
              )}
            </div>
            <Button type="button" variant="outline" onClick={() => setViewData(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
