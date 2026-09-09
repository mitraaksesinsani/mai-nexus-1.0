'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Search, ChevronsUpDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManualStockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouseId: string;
  onSuccess: () => void;
}

interface StockEntryItem {
  id: string; // unique string for rendering key
  materialId: string;
  materialCode: string;
  materialName: string;
  quantity: string;
  notes: string;
}

export function ManualStockEntryModal({ isOpen, onClose, warehouseId, onSuccess }: ManualStockEntryModalProps) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [items, setItems] = useState<StockEntryItem[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialPopoverOpen, setMaterialPopoverOpen] = useState(false);
  const [materialSearch, setMaterialSearch] = useState('');

  const fetchMaterials = async () => {
    setLoadingMaterials(true);
    try {
      const { data } = await api.get('/api/materials?limit=1000');
      setMaterials(data.data || []);
    } catch (error) {
      console.error('Failed to fetch materials', error);
      toast.error('Gagal memuat daftar material');
    } finally {
      setLoadingMaterials(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setItems([]);
      setSelectedMaterialId('');
      setMaterialSearch('');
      setMaterialPopoverOpen(false);
      fetchMaterials();
    }
  }, [isOpen]);

  const handleAddMaterial = (materialToSelect?: any) => {
    const targetId = materialToSelect?.id || selectedMaterialId;
    if (!targetId) return;

    const material = materialToSelect || materials.find(m => m.id === targetId);
    if (!material) return;

    // Check if already exists
    if (items.some(item => item.materialId === targetId)) {
      toast.warning('Material ini sudah ada di daftar input');
      return;
    }

    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      materialId: material.id,
      materialCode: material.materialCode,
      materialName: material.materialName,
      quantity: '',
      notes: ''
    }]);

    setSelectedMaterialId(''); // reset selection
    setMaterialSearch('');
    setMaterialPopoverOpen(false);
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
    const hasInvalidQuantity = items.some(item => !item.quantity || Number(item.quantity) <= 0);
    if (hasInvalidQuantity) {
      toast.error('Pastikan semua jumlah/kuantitas telah diisi dengan benar (minimal 1)');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        warehouseId,
        items: items.map(item => ({
          materialId: item.materialId,
          quantity: Number(item.quantity),
          notes: item.notes
        }))
      };

      await api.post('/api/inventory/manual-entry', payload);
      
      toast.success('Stok berhasil ditambahkan ke gudang!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to add manual stock:', error);
      toast.error(error.response?.data?.message || 'Terjadi kesalahan saat menambahkan stok');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Input Manual Stok (Batch)</DialogTitle>
          <DialogDescription>
            Cari & pilih material, tentukan jumlahnya, lalu simpan sekaligus ke dalam gudang.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-end gap-3 mt-4">
          <div className="flex-1 grid gap-2">
            <Label htmlFor="material-select">Cari & Pilih Material</Label>
            <Popover open={materialPopoverOpen} onOpenChange={setMaterialPopoverOpen}>
              <div className="relative flex items-center">
                <PopoverTrigger
                  id="material-select"
                  disabled={loadingMaterials}
                  className={cn(
                    "flex min-h-10 h-auto w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent hover:text-accent-foreground text-left transition-colors",
                    selectedMaterialId ? "pr-14" : "pr-8"
                  )}
                >
                  <span className="flex-1 pr-2 break-words whitespace-normal">
                    {loadingMaterials ? (
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Memuat daftar master material...
                      </span>
                    ) : selectedMaterial ? (
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                          {selectedMaterial.materialCode}
                        </span>
                        <span className="font-medium text-foreground">{selectedMaterial.materialName}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Search className="w-4 h-4 opacity-50" />
                        Ketik atau klik untuk cari & pilih material...
                      </span>
                    )}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                </PopoverTrigger>
                {selectedMaterialId && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMaterialId('');
                    }}
                    className="absolute right-8 p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted z-10"
                    title="Hapus pilihan"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <PopoverContent 
                className="w-(--anchor-width) min-w-[340px] sm:min-w-[460px] max-w-[90vw] p-0 shadow-lg border rounded-lg bg-popover" 
                align="start"
                positionerClassName="z-[60]"
              >
                <div className="flex items-center border-b px-3 py-1 bg-muted/30">
                  <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    placeholder="Cari kode, nama, atau kategori material..."
                    className="flex h-10 w-full rounded-md bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 shadow-none"
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
                <div className="max-h-[300px] overflow-y-auto p-1 divide-y divide-border/40">
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
                        <div className="py-8 text-center text-sm text-muted-foreground">
                          <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          Material tidak ditemukan dengan kata kunci &quot;{materialSearch}&quot;.
                        </div>
                      );
                    }

                    return filtered.map(m => {
                      const isAlreadyInList = items.some(item => item.materialId === m.id);
                      const isSelected = selectedMaterialId === m.id;

                      return (
                        <div
                          key={m.id}
                          className={`relative flex w-full select-none items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors cursor-pointer ${
                            isSelected 
                              ? 'bg-primary/10 text-primary font-medium' 
                              : isAlreadyInList
                              ? 'opacity-70 bg-muted/20 hover:bg-muted/40'
                              : 'hover:bg-accent hover:text-accent-foreground'
                          }`}
                          onClick={() => {
                            if (isAlreadyInList) {
                              toast.warning(`Material [${m.materialCode}] sudah ada di daftar input`);
                              return;
                            }
                            setSelectedMaterialId(m.id);
                            setMaterialPopoverOpen(false);
                          }}
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div className="mt-0.5">
                              {isSelected ? (
                                <Check className="h-4 w-4 text-primary shrink-0" />
                              ) : (
                                <div className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                                  {m.materialCode}
                                </span>
                                {m.category && (
                                  <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {m.category}
                                  </span>
                                )}
                                {m.unit && (
                                  <span className="text-[11px] text-muted-foreground">
                                    ({m.unit})
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-medium mt-1 leading-snug break-words">
                                {m.materialName}
                              </span>
                              {m.specification && (
                                <span className="text-xs text-muted-foreground truncate mt-0.5">
                                  {m.specification}
                                </span>
                              )}
                            </div>
                          </div>

                          {isAlreadyInList && (
                            <span className="shrink-0 ml-2 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900">
                              Sudah di list
                            </span>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Button 
            type="button" 
            onClick={() => handleAddMaterial()} 
            disabled={!selectedMaterialId}
            className="shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah ke List
          </Button>
        </div>

        <div className="border rounded-md mt-6 flex-1 overflow-hidden flex flex-col min-h-[250px]">
          <div className="bg-muted px-4 py-2 text-sm font-medium grid grid-cols-12 gap-4 items-center">
            <div className="col-span-4">Material</div>
            <div className="col-span-2">Jumlah</div>
            <div className="col-span-5">Catatan</div>
            <div className="col-span-1 text-center">Aksi</div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground p-8 text-sm">
                Belum ada material yang ditambahkan ke daftar.
              </div>
            ) : (
              <div className="flex flex-col">
                {items.map((item, index) => (
                  <div key={item.id} className={`px-4 py-3 grid grid-cols-12 gap-4 items-start ${index !== items.length - 1 ? 'border-b' : ''}`}>
                    <div className="col-span-4">
                      <div className="text-sm font-medium leading-none">{item.materialCode}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.materialName}</div>
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number" 
                        min="1" 
                        value={item.quantity} 
                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                        placeholder="0"
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-5">
                      <Textarea 
                        value={item.notes} 
                        onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                        placeholder="Catatan..."
                        className="h-8 min-h-[32px] py-1.5 resize-none text-sm"
                        rows={1}
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting || items.length === 0}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Stok ({items.length} item)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
