'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Cable, MapPin } from 'lucide-react';
import api from '@/lib/api';

interface CableDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CableDistributionModal({ isOpen, onClose }: CableDistributionModalProps) {
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCableStocks();
    }
  }, [isOpen]);

  const fetchCableStocks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/inventory/stocks?type=cable');
      setStocks(res.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch cable stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCableTypeLabel = (stock: any) => {
    const pkg = (stock.packagingType || stock.material?.packagingType || '').toUpperCase();
    if (pkg === 'KABEL_UDARA') return 'Kabel Udara';
    if (pkg === 'KABEL_TANAH') return 'Kabel Tanah';
    if (pkg === 'HDPE_SUBDUCT') return 'HDPE / Subduct';
    const cat = stock.category || stock.material?.category;
    if (cat) return cat;
    return 'Kabel Optik';
  };

  const filteredStocks = stocks.filter((s) => {
    const term = search.toLowerCase();
    const matName = (s.materialName || '').toLowerCase();
    const matCode = (s.materialCode || '').toLowerCase();
    const whName = (s.warehouseName || '').toLowerCase();
    const cableType = getCableTypeLabel(s).toLowerCase();
    return matName.includes(term) || matCode.includes(term) || whName.includes(term) || cableType.includes(term);
  });

  const totalLength = filteredStocks.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cable className="w-5 h-5 text-primary" />
              Daftar Panjang Material (Kabel)
            </DialogTitle>
            <DialogDescription>
              Rincian tipe kabel, nama material, total panjang, dan lokasi gudang penyimpanannya.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 mb-2">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari tipe kabel, nama material, atau gudang..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap bg-muted px-3 py-2 rounded-lg font-medium self-end sm:self-auto">
              Total Panjang: <span className="font-bold text-foreground">{totalLength.toLocaleString('id-ID')} Meter</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative min-h-[300px]">
          {loading ? (
            <div className="p-8 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Memuat rincian stok kabel...</p>
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Tidak ada data material kabel yang ditemukan.
            </div>
          ) : (
            <div className="px-4 sm:px-6 pb-6">
              {/* Desktop / Tablet Table View */}
              <div className="hidden sm:block">
                <Table className="[&_tr]:border-none" containerClassName="border rounded-xl bg-transparent shadow-none overflow-hidden">
                  <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-sm z-10 border-b">
                    <TableRow className="border-none hover:bg-transparent">
                      <TableHead className="w-[140px] pl-4">Tipe Kabel</TableHead>
                      <TableHead>Nama Material</TableHead>
                      <TableHead className="text-right w-[150px]">Panjang</TableHead>
                      <TableHead className="w-[220px] pr-4">Gudang</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStocks.map((stock, idx) => {
                      const cableType = getCableTypeLabel(stock);
                      return (
                        <TableRow key={stock.id || idx} className="border-none hover:bg-muted/30">
                          <TableCell className="pl-4">
                            <Badge 
                              variant="outline" 
                              className="text-xs font-semibold rounded-full px-2.5 py-0.5 bg-primary/5 text-primary border-primary/20"
                            >
                              {cableType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-foreground text-sm">{stock.materialName}</div>
                            <div className="text-xs text-muted-foreground font-mono">{stock.materialCode}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-base text-foreground">
                              {Number(stock.quantity).toLocaleString('id-ID')}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">
                              {stock.unit || 'm'}
                            </span>
                          </TableCell>
                          <TableCell className="pr-4">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/20 p-2 rounded-md border border-border/60">
                              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="font-medium text-foreground truncate">{stock.warehouseName}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Responsive List View (e.g. 390px screen width) */}
              <div className="block sm:hidden space-y-3">
                {filteredStocks.map((stock, idx) => {
                  const cableType = getCableTypeLabel(stock);
                  return (
                    <div key={stock.id || idx} className="bg-card border border-border/70 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-xs">
                      <div className="flex items-center justify-between gap-2">
                        <Badge 
                          variant="outline" 
                          className="text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-primary/5 text-primary border-primary/20"
                        >
                          {cableType}
                        </Badge>
                        <div className="text-right">
                          <span className="font-bold text-sm text-foreground">
                            {Number(stock.quantity).toLocaleString('id-ID')}
                          </span>
                          <span className="text-[11px] text-muted-foreground ml-1">
                            {stock.unit || 'm'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <div className="font-semibold text-sm text-foreground leading-snug">
                          {stock.materialName}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {stock.materialCode}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs bg-muted/30 px-2.5 py-1.5 rounded-md border border-border/50 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-medium text-foreground truncate">{stock.warehouseName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
