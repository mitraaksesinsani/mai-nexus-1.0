'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';
import { 
  Loader2, Plus, Trash2, Search, X, 
  ArrowDownRight, ArrowUpRight, AlertCircle, AlertTriangle, Check, Package 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManualStockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouseId: string;
  warehouseName?: string;
  onSuccess: () => void;
}

interface StockEntryItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  currentStock: number;
  quantity: string;
  notes: string;
}

const IN_REASONS = [
  'Temuan Opname (Selisih Lebih)',
  'Stok Awal (Initial Balance)',
  'Bonus / Kelebihan Pengiriman',
  'Pengembalian Material Proyek / Lapangan',
  'Lainnya'
];

const OUT_REASONS = [
  'Koreksi Stock Opname (Selisih Kurang)',
  'Material Rusak / Scrap (Damaged)',
  'Material Hilang / Selisih Fisik (Lost)',
  'Pemakaian Internal / Pengetesan',
  'Lainnya'
];

export function ManualStockEntryModal({ 
  isOpen, 
  onClose, 
  warehouseId, 
  warehouseName,
  onSuccess 
}: ManualStockEntryModalProps) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [warehouseStockMap, setWarehouseStockMap] = useState<Record<string, number>>({});
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Adjustment Mode
  const [adjustmentType, setAdjustmentType] = useState<'IN' | 'OUT'>('IN');
  const [selectedReason, setSelectedReason] = useState<string>('Temuan Opname (Selisih Lebih)');
  const [customReason, setCustomReason] = useState<string>('');

  const [items, setItems] = useState<StockEntryItem[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialDrawerOpen, setMaterialDrawerOpen] = useState(false);
  const [materialSearch, setMaterialSearch] = useState('');

  const fetchMaterialsAndStocks = async () => {
    if (!warehouseId) return;
    setLoadingMaterials(true);
    try {
      const [materialsRes, stocksRes] = await Promise.all([
        api.get('/api/materials?limit=2000'),
        api.get(`/api/inventory/stocks?warehouseId=${warehouseId}&limit=5000`)
      ]);

      const stockMap: Record<string, number> = {};
      (stocksRes.data?.data || []).forEach((st: any) => {
        const matId = st.materialId || st.material_id;
        if (matId) {
          stockMap[matId] = parseFloat(st.quantity || 0);
        }
      });
      setWarehouseStockMap(stockMap);
      setMaterials(materialsRes.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch materials/stocks', error);
      toast.error('Gagal memuat daftar material & stok gudang');
    } finally {
      setLoadingMaterials(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setItems([]);
      setSelectedMaterialId('');
      setMaterialSearch('');
      setMaterialDrawerOpen(false);
      setAdjustmentType('IN');
      setSelectedReason('Temuan Opname (Selisih Lebih)');
      setCustomReason('');
      fetchMaterialsAndStocks();
    }
  }, [isOpen, warehouseId]);

  // Handle toggle mode
  const handleTypeChange = (newType: 'IN' | 'OUT') => {
    setAdjustmentType(newType);
    setSelectedReason(newType === 'IN' ? IN_REASONS[0] : OUT_REASONS[0]);
    setCustomReason('');
  };

  const handleAddMaterial = (materialToSelect?: any) => {
    const targetId = materialToSelect?.id || selectedMaterialId;
    if (!targetId) return;

    const material = materialToSelect || materials.find(m => m.id === targetId);
    if (!material) return;

    if (items.some(item => item.materialId === targetId)) {
      toast.warning('Material ini sudah ada di daftar input');
      return;
    }

    const availableStock = warehouseStockMap[material.id] || 0;

    if (adjustmentType === 'OUT' && availableStock <= 0) {
      toast.error(`Material "${material.materialName}" tidak memiliki stok di gudang ini (Stok: 0 ${material.unit || 'Unit'}). Tidak dapat dikurangi.`);
      return;
    }

    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      materialId: material.id,
      materialCode: material.materialCode,
      materialName: material.materialName,
      unit: material.unit || 'Unit',
      currentStock: availableStock,
      quantity: '',
      notes: ''
    }]);

    setSelectedMaterialId('');
    setMaterialSearch('');
    setMaterialDrawerOpen(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof StockEntryItem, value: string) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId) {
      toast.error('Warehouse ID tidak valid');
      return;
    }

    if (items.length === 0) {
      toast.error('Daftar material masih kosong');
      return;
    }

    // Validate quantities
    for (const item of items) {
      const qty = parseFloat(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        toast.error(`Kuantitas untuk "${item.materialCode}" belum diisi dengan benar`);
        return;
      }

      if (adjustmentType === 'OUT' && qty > item.currentStock) {
        toast.error(`Jumlah pengurangan untuk "${item.materialCode}" (${qty} ${item.unit}) melebihi stok yang tersedia (${item.currentStock} ${item.unit})`);
        return;
      }
    }

    const effectiveReason = selectedReason === 'Lainnya' 
      ? (customReason.trim() || 'Penyesuaian Stok Manual') 
      : selectedReason;

    setIsSubmitting(true);
    try {
      const payload = {
        warehouseId,
        adjustmentType,
        reason: effectiveReason,
        items: items.map(item => ({
          materialId: item.materialId,
          quantity: parseFloat(item.quantity),
          notes: item.notes
        }))
      };

      await api.post('/api/inventory/manual-entry', payload);
      
      const successMsg = adjustmentType === 'OUT'
        ? 'Pengurangan stok manual berhasil disimpan!'
        : 'Penambahan stok manual berhasil disimpan!';
      toast.success(successMsg);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to submit manual stock adjustment:', error);
      toast.error(error.response?.data?.message || 'Terjadi kesalahan saat memproses penyesuaian stok');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeReasons = adjustmentType === 'IN' ? IN_REASONS : OUT_REASONS;

  if (!isOpen) return null;

  return (
    <>
      {/* Main Stock Adjustment Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="w-full sm:max-w-4xl md:max-w-5xl max-h-[82vh] flex flex-col gap-0 p-0 overflow-hidden rounded-xl border bg-popover shadow-2xl">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b shrink-0 pr-12 bg-background/50">
            <DialogTitle className="text-lg font-bold">
              Penyesuaian Stok Manual
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground mt-0.5">
              Sesuaikan stok fisik gudang {warehouseName ? <strong className="text-foreground">({warehouseName})</strong> : ''} secara langsung.
            </DialogDescription>
          </DialogHeader>
          
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
            {/* Toggle Mode & Alasan */}
            <div className="space-y-3 bg-muted/40 rounded-xl p-3.5 border border-border/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <Label className="text-[13px] text-muted-foreground mb-1.5 block font-medium">Tipe Penyesuaian</Label>
                  <div className="grid grid-cols-2 p-1 bg-background border rounded-lg gap-1">
                    <button
                      type="button"
                      onClick={() => handleTypeChange('IN')}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[13px] font-semibold transition-all",
                        adjustmentType === 'IN'
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <ArrowUpRight className="w-4 h-4 shrink-0" />
                      + Stok Masuk (In)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('OUT')}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[13px] font-semibold transition-all",
                        adjustmentType === 'OUT'
                          ? "bg-rose-600 text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <ArrowDownRight className="w-4 h-4 shrink-0" />
                      - Stok Keluar (Out)
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-[13px] text-muted-foreground mb-1.5 block font-medium">Alasan Penyesuaian</Label>
                  <Select value={selectedReason} onValueChange={(val) => setSelectedReason(val || activeReasons[0])}>
                    <SelectTrigger className="bg-background h-10 text-[13px]">
                      <SelectValue placeholder="Pilih Alasan">
                        {selectedReason}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      {activeReasons.map(r => (
                        <SelectItem key={r} value={r} className="text-[13px]">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedReason === 'Lainnya' && (
                <div className="pt-1">
                  <Input
                    placeholder="Ketik keterangan alasan penyesuaian..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="bg-background h-10 text-[13px]"
                  />
                </div>
              )}
            </div>

            {/* Material Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-medium text-foreground">
                  Pilih Material yang Disesuaikan
                </Label>
                {adjustmentType === 'OUT' && (
                  <span className="text-[13px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Hanya stok &gt; 0
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={loadingMaterials}
                  onClick={() => setMaterialDrawerOpen(true)}
                  className={cn(
                    "flex min-h-10 h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-[13px] transition-colors hover:bg-accent hover:text-accent-foreground text-left",
                    loadingMaterials && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className="flex-1 pr-2 truncate">
                    {loadingMaterials ? (
                      <span className="text-muted-foreground flex items-center gap-2 text-[13px]">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Memuat daftar material...
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-2 text-[13px]">
                        <Search className="w-4 h-4 opacity-50 shrink-0" />
                        Ketik atau klik untuk cari & pilih material...
                      </span>
                    )}
                  </span>
                </button>
                {/* "+" button */}
                <Button 
                  type="button" 
                  size="icon"
                  onClick={() => setMaterialDrawerOpen(true)} 
                  disabled={loadingMaterials}
                  className={cn(
                    "shrink-0 h-10 w-10",
                    adjustmentType === 'OUT' ? "bg-rose-600 hover:bg-rose-700 text-white" : ""
                  )}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Selected Items as List */}
            <div className="space-y-2">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-muted-foreground py-10 text-center border border-dashed rounded-xl bg-muted/10">
                  <Package className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-[13px] font-medium text-foreground">Belum ada material yang ditambahkan.</p>
                  <p className="text-[13px] text-muted-foreground mt-0.5">Pilih material di atas untuk memulai penyesuaian stok.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-[13px] text-muted-foreground font-medium">
                    {items.length} material dipilih
                  </div>
                  {items.map((item) => {
                    const numQty = parseFloat(item.quantity);
                    const isExceeded = adjustmentType === 'OUT' && !isNaN(numQty) && numQty > item.currentStock;

                    return (
                      <div key={item.id} className="p-3.5 rounded-xl border border-border/80 bg-card space-y-3">
                        {/* Material info header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[13px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                {item.materialCode}
                              </span>
                              <span className="text-[13px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                Stok: {item.currentStock} {item.unit}
                              </span>
                            </div>
                            <div className="text-[13px] text-muted-foreground line-clamp-1 mt-1 font-medium">{item.materialName}</div>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0" 
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Input row */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[13px] text-muted-foreground font-medium">
                              Jumlah {adjustmentType === 'IN' ? '(+)' : '(-)'}
                            </Label>
                            <Input 
                              type="number" 
                              min="1" 
                              max={adjustmentType === 'OUT' ? item.currentStock : undefined}
                              value={item.quantity} 
                              onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                              placeholder="0"
                              className={cn(
                                "h-9 text-[13px] font-bold",
                                isExceeded 
                                  ? "border-rose-500 focus-visible:ring-rose-500 bg-rose-50 dark:bg-rose-950/20 text-rose-600"
                                  : ""
                              )}
                            />
                            {isExceeded && (
                              <span className="text-[13px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Maks: {item.currentStock}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[13px] text-muted-foreground font-medium">Catatan (opsional)</Label>
                            <Input 
                              value={item.notes} 
                              onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                              placeholder="Keterangan penyesuaian..."
                              className="h-9 text-[13px]"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="shrink-0 mx-0 mb-0 mt-0 p-0 px-6 py-3.5 border-t bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[13px] text-muted-foreground font-medium w-full sm:w-auto text-left">
              Total: <strong className="text-foreground">{items.length}</strong> material
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="flex-1 sm:flex-none text-[13px] h-9 px-4">
                Batal
              </Button>
              <Button 
                type="button" 
                onClick={handleSubmit} 
                disabled={
                  isSubmitting || 
                  items.length === 0 || 
                  (adjustmentType === 'OUT' && items.some(i => parseFloat(i.quantity) > i.currentStock))
                }
                className={cn(
                  "flex-1 sm:flex-none text-[13px] h-9 px-4 font-semibold",
                  adjustmentType === 'OUT' 
                    ? "bg-rose-600 hover:bg-rose-700 text-white" 
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {adjustmentType === 'OUT'
                  ? `Simpan Pengurangan (${items.length})`
                  : `Simpan Penambahan (${items.length})`
                }
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Material Picker Dialog */}
      <Dialog open={materialDrawerOpen} onOpenChange={setMaterialDrawerOpen}>
        <DialogContent className="w-full sm:max-w-4xl md:max-w-5xl max-h-[82vh] flex flex-col gap-0 p-0 overflow-hidden rounded-xl border bg-popover shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b shrink-0 pr-12 bg-background/50">
            <DialogTitle className="text-base font-bold">Pilih Material</DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground mt-0.5">
              Cari dan pilih material untuk penyesuaian stok gudang.
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="px-6 py-3 border-b bg-background shrink-0">
            <div className="flex items-center border rounded-lg px-3 bg-background">
              <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder="Cari kode, nama, atau kategori material..."
                className="flex h-10 w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 shadow-none"
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                autoFocus
              />
              {materialSearch && (
                <button
                  type="button"
                  onClick={() => setMaterialSearch('')}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Material List */}
          <div className="flex-1 overflow-y-auto px-6 py-3 min-h-0 space-y-1">
            {(() => {
              const srch = materialSearch.toLowerCase().trim();
              const filtered = materials.filter(m => 
                (m.materialCode || '').toLowerCase().includes(srch) || 
                (m.materialName || '').toLowerCase().includes(srch) ||
                (m.category || '').toLowerCase().includes(srch) ||
                (m.specification || '').toLowerCase().includes(srch)
              );

              if (filtered.length === 0) {
                return (
                  <div className="py-12 text-center text-[13px] text-muted-foreground">
                    <Search className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    Material tidak ditemukan dengan kata kunci &quot;{materialSearch}&quot;.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pb-2">
                  {filtered.map(m => {
                    const isAlreadyInList = items.some(item => item.materialId === m.id);
                    const stockAvailable = warehouseStockMap[m.id] || 0;
                    const isZeroStock = stockAvailable <= 0;
                    const disabledForOut = adjustmentType === 'OUT' && isZeroStock;

                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[13px] transition-colors cursor-pointer border border-border/40",
                          isAlreadyInList
                            ? "opacity-50 bg-muted/30"
                            : disabledForOut
                            ? "opacity-40 cursor-not-allowed bg-muted/20"
                            : "hover:bg-accent hover:text-accent-foreground bg-card"
                        )}
                        onClick={() => {
                          if (disabledForOut) {
                            toast.warning(`Material [${m.materialCode}] memiliki stok 0. Tidak bisa dikurangi.`);
                            return;
                          }
                          if (isAlreadyInList) {
                            toast.warning(`Material [${m.materialCode}] sudah ada di daftar`);
                            return;
                          }
                          handleAddMaterial(m);
                        }}
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div className="mt-0.5">
                            {isAlreadyInList ? (
                              <Check className="h-4 w-4 text-primary shrink-0" />
                            ) : (
                              <div className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[13px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                                {m.materialCode}
                              </span>
                              {m.category && (
                                <span className="text-[13px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {m.category}
                                </span>
                              )}
                            </div>
                            <span className="text-[13px] font-medium mt-1 leading-snug break-words text-foreground">
                              {m.materialName}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 ml-3 text-right">
                          <span className={cn(
                            "text-[13px] font-semibold px-2 py-1 rounded",
                            stockAvailable > 0
                              ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20"
                              : "text-muted-foreground bg-muted"
                          )}>
                            Stok: {stockAvailable} {m.unit || 'Unit'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <DialogFooter className="shrink-0 mx-0 mb-0 mt-0 p-0 px-6 py-3 border-t flex items-center justify-end bg-muted/30">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMaterialDrawerOpen(false)}
              className="text-[13px] h-9 px-4"
            >
              Selesai Memilih
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
