import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, User } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import api from '@/lib/api';

interface MaterialLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouseId: string;
  materialId: string;
  materialCode: string;
  materialName: string;
}

export function MaterialLogModal({ isOpen, onClose, warehouseId, materialId, materialCode, materialName }: MaterialLogModalProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && warehouseId && materialId) {
      fetchLogs();
    }
  }, [isOpen, warehouseId, materialId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // the movements API returns transactions for a specific warehouse and material
      const res = await api.get(`/api/inventory/movements?warehouseId=${warehouseId}&materialId=${materialId}&limit=50`);
      setLogs(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch material logs', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTransactionType = (type: string) => {
    if (!type) return '-';
    const formatted = type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
      
    if (type === 'IN_MANUAL_ENTRY') return 'Manual Entry (IN)';
    if (type === 'OUT_MANUAL_ENTRY') return 'Manual Entry (OUT)';
    if (type === 'IN_RECEIPT') return 'Goods Receipt';
    if (type === 'OUT_ISSUE') return 'Goods Issue';
    
    return formatted;
  };

  const getTransactionTypeColor = (type: string) => {
    if (type.startsWith('IN')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    if (type.startsWith('OUT')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    if (type === 'ADJUSTMENT') return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    if (type === 'RETURN') return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[850px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Riwayat Transaksi Material</DialogTitle>
          <DialogDescription>
            Menampilkan riwayat pergerakan (log) untuk material <strong className="text-foreground">{materialCode} - {materialName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4 pr-1">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-xl">
              Belum ada riwayat transaksi untuk material ini.
            </div>
          ) : (
            <div className="divide-y divide-border/60 border rounded-xl bg-card overflow-hidden">
              {logs.map((log) => {
                const isPositive = log.quantity > 0;
                return (
                  <div key={log.id} className="p-3.5 sm:p-4 hover:bg-muted/30 transition-colors space-y-2">
                    {/* Header item: Type badge, Date, and Quantity */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`font-medium ${getTransactionTypeColor(log.transactionType)}`}>
                          {formatTransactionType(log.transactionType)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm', { locale: id })}
                        </span>
                      </div>
                      <span className={`text-base font-bold shrink-0 ${isPositive ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                        {isPositive ? `+${log.quantity}` : log.quantity}
                      </span>
                    </div>

                    {/* Meta info: Diinput oleh, Referensi, dan Catatan */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1.5 border-t border-border/30">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-foreground font-medium">{log.createdByName || 'Admin'}</span>
                      </div>
                      
                      <div className="truncate">
                        <span className="text-muted-foreground">Ref: </span>
                        <span className="text-foreground font-medium" title={log.referenceId || '-'}>
                          {log.referenceId || '-'}
                        </span>
                      </div>

                      <div className="truncate sm:text-right">
                        <span className="text-muted-foreground">Catatan: </span>
                        <span className="text-foreground font-medium" title={log.notes || '-'}>
                          {log.notes || '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
