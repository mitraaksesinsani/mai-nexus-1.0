'use client';

import { useEffect, useState } from 'react';
import { PackageOpen, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function MaterialReceivePage() {
  const [dos, setDos] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  
  const [selectedDoId, setSelectedDoId] = useState<string>('');
  const [selectedDo, setSelectedDo] = useState<any>(null);
  
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [receivedItems, setReceivedItems] = useState<Record<string, number>>({});
  
  const [loadingDOs, setLoadingDOs] = useState(true);
  const [isFetchingDo, setIsFetchingDo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch DELIVERED DOs ready for receiving
        const doRes = await api.get('/api/logistics', { params: { type: 'history' } });
        const readyDos = (doRes.data?.data || []).filter((d: any) => 
          d.status === 'DELIVERED' || d.status === 'SELESAI'
        );
        setDos(readyDos);

        // Fetch Warehouses
        const whRes = await api.get('/api/warehouse');
        setWarehouses(whRes.data?.data || []);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setLoadingDOs(false);
      }
    };
    
    fetchData();
  }, []);

  const handleDoChange = async (doId: string) => {
    setSelectedDoId(doId);
    setSuccess(false);
    if (!doId) {
      setSelectedDo(null);
      setReceivedItems({});
      setSelectedWarehouseId('');
      return;
    }
    
    setIsFetchingDo(true);
    try {
      const { data } = await api.get(`/api/logistics/${doId}`);
      if (data?.data) {
        setSelectedDo(data.data);
        
        // Auto-fill warehouse from DO destination
        const dest = data.data.destination;
        if (dest && warehouses.some(w => w.id === dest)) {
          setSelectedWarehouseId(dest);
        } else {
          setSelectedWarehouseId('');
        }
        
        // Auto-fill received quantities with the ordered quantities
        const initialQtys: Record<string, number> = {};
        (data.data.items || []).forEach((item: any) => {
          initialQtys[item.materialId] = item.quantity;
        });
        setReceivedItems(initialQtys);
      }
    } catch (error) {
      console.error('Failed to fetch DO details:', error);
    } finally {
      setIsFetchingDo(false);
    }
  };

  const handleQtyChange = (materialId: string, val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    
    setReceivedItems(prev => ({
      ...prev,
      [materialId]: num
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoId || !selectedWarehouseId || !selectedDo?.items?.length) return;
    
    setIsSubmitting(true);
    
    try {
      const payload = {
        doId: selectedDoId,
        warehouseId: selectedWarehouseId,
        items: selectedDo.items.map((item: any) => ({
          materialId: item.materialId,
          receivedQty: receivedItems[item.materialId] || 0
        }))
      };
      
      await api.post('/api/warehouse/receive', payload);
      
      setSuccess(true);
      setSelectedDoId('');
      setSelectedDo(null);
      setReceivedItems({});
      setSelectedWarehouseId('');
      
      // Refresh DO list to remove completed DOs
      const doRes = await api.get('/api/logistics', { params: { type: 'history' } });
      const readyDos = (doRes.data?.data || []).filter((d: any) => 
        d.status === 'DELIVERED' || d.status === 'SELESAI'
      );
      setDos(readyDos);
      
    } catch (error) {
      console.error('Failed to receive materials:', error);
      alert('Failed to process material receipt. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Material Receive (Goods Receipt)</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Receive incoming materials from delivered shipments into warehouse stock.
        </p>
      </div>
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" />
          <p className="font-medium">Goods received successfully and inventory has been updated!</p>
        </div>
      )}
      
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Receipt Details</CardTitle>
            <CardDescription>Select a Delivery Order (DO) and confirm destination warehouse</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2">
                  <Label htmlFor="do-select">Delivery Order (DO)</Label>
                  {loadingDOs ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading DOs...
                    </div>
                  ) : (
                    <Select 
                      value={selectedDoId} 
                      onValueChange={(val) => handleDoChange(val || "")}
                      items={dos.map(d => ({
                        value: d.id,
                        label: `${d.doNumber} - ${d.project?.projectName}`
                      }))}
                    >
                      <SelectTrigger id="do-select" className="w-full">
                        <SelectValue placeholder="Select a delivered DO...">
                          {(() => {
                            const d = dos.find(item => item.id === selectedDoId);
                            return d ? `${d.doNumber} - ${d.project?.projectName}` : undefined;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {dos.length === 0 ? (
                          <SelectItem value="none" disabled>No pending DOs found</SelectItem>
                        ) : (
                          dos.map(d => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.doNumber} - {d.project?.projectName}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="warehouse-select">Receiving Warehouse</Label>
                  <Select 
                    value={selectedWarehouseId} 
                    onValueChange={(val) => setSelectedWarehouseId(val || "")}
                    disabled={!selectedDoId || isFetchingDo || isSubmitting}
                    items={warehouses.map(w => ({
                      value: w.id,
                      label: `${w.name} (${w.code})`
                    }))}
                  >
                    <SelectTrigger id="warehouse-select" className="w-full">
                      <SelectValue placeholder="Select warehouse...">
                        {(() => {
                          const w = warehouses.find(item => item.id === selectedWarehouseId);
                          return w ? `${w.name} (${w.code})` : undefined;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map(w => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} ({w.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedDo?.destination && warehouses.some(w => w.id === selectedDo.destination) && (
                    <p className="text-xs text-muted-foreground">Automatically selected from DO destination.</p>
                  )}
                </div>
              </div>
              
              {isFetchingDo ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : selectedDo ? (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Items to Receive</h3>
                  </div>
                  
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Material Code</TableHead>
                          <TableHead>Material Name</TableHead>
                          <TableHead className="text-right">Expected Qty</TableHead>
                          <TableHead className="w-[150px]">Received Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDo.items?.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium text-slate-700">{item.materialCode}</TableCell>
                            <TableCell>{item.materialName}</TableCell>
                            <TableCell className="text-right font-medium">
                              {item.quantity} <span className="text-muted-foreground font-normal text-xs">{item.unit}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max={item.quantity}
                                  value={receivedItems[item.materialId] ?? ''}
                                  onChange={(e) => handleQtyChange(item.materialId, e.target.value)}
                                  className="w-20 text-right"
                                />
                                <span className="text-xs text-muted-foreground">{item.unit}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || !selectedWarehouseId}
                      className="w-full sm:w-auto"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <PackageOpen className="w-4 h-4 mr-2" />
                      )}
                      Receive Materials
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-12 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-slate-500">
                  <ArrowRight className="w-8 h-8 mb-2 text-slate-300" />
                  <p>Select a Delivery Order above to view items</p>
                </div>
              )}
              
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
