'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Plus, AlertCircle, Loader2, UserCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CreateRfcPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [projects, setProjects] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    projectId: '',
    warehouseId: '',
    notes: '',
  });

  const [approverLevel1, setApproverLevel1] = useState('');
  const [approverLevel2, setApproverLevel2] = useState('');
  
  const [items, setItems] = useState<any[]>([{ materialId: '', requestQty: '', notes: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [projectsRes, warehousesRes, materialsRes, usersRes] = await Promise.all([
        api.get('/api/projects?limit=100'),
        api.get('/api/warehouse'),
        api.get('/api/materials'),
        api.get('/api/users')
      ]);
      setProjects(projectsRes.data?.data || []);
      setWarehouses(warehousesRes.data?.data || []);
      setMaterials(materialsRes.data?.data || []);
      
      const userList = (usersRes.data?.data || []).filter((u: any) => u.isActive !== false);
      setUsers(userList);

      // Auto-suggest default approver roles
      const defaultSm = userList.find((u: any) => u.role === 'SITE_MANAGER');
      if (defaultSm) setApproverLevel1(defaultSm.id);

      const defaultMgmt = userList.find((u: any) => ['DIREKTUR', 'OWNER', 'PROCUREMENT', 'ADMIN'].includes(u.role) && u.id !== defaultSm?.id);
      if (defaultMgmt) setApproverLevel2(defaultMgmt.id);
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
      toast.error('Failed to load form data');
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  // Fetch inventory when warehouse changes
  useEffect(() => {
    if (formData.warehouseId) {
      fetchInventory(formData.warehouseId);
      // Reset items when warehouse changes to prevent invalid stock
      setItems([{ materialId: '', requestQty: '', notes: '' }]);
    } else {
      setInventory([]);
      setItems([{ materialId: '', requestQty: '', notes: '' }]);
    }
  }, [formData.warehouseId]);

  const fetchInventory = async (warehouseId: string) => {
    setIsLoadingInventory(true);
    try {
      const { data } = await api.get(`/api/inventory/stocks?warehouseId=${warehouseId}&limit=500`);
      // Filter out items with 0 stock and normalize material structure
      const availableInventory = (data.data || [])
        .filter((inv: any) => inv.quantity > 0)
        .map((inv: any) => ({
          ...inv,
          material: inv.material || {
            materialCode: inv.materialCode,
            materialName: inv.materialName,
            unit: inv.unit,
          }
        }));
      setInventory(availableInventory);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      toast.error('Failed to load warehouse inventory');
      setInventory([]);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // If material changes, validate if they already selected it
    if (field === 'materialId') {
      const isDuplicate = newItems.some((item, i) => i !== index && item.materialId === value);
      if (isDuplicate) {
        toast.error('This material is already in the list');
        newItems[index][field] = '';
      }
    }
    
    // Validate quantity against stock
    if (field === 'requestQty' && newItems[index].materialId && value !== '') {
      const qty = parseFloat(value);
      const stockItem = inventory.find(i => i.materialId === newItems[index].materialId);
      const availableStock = stockItem ? stockItem.quantity : 0;
      
      if (qty > availableStock) {
        toast.error(`Quantity cannot exceed available stock (\${availableStock})`);
        newItems[index][field] = availableStock.toString();
      } else if (qty < 0) {
        newItems[index][field] = '0';
      }
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { materialId: '', requestQty: '', notes: '' }]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems.length > 0 ? newItems : [{ materialId: '', requestQty: '', notes: '' }]);
  };

  const getAvailableStock = (materialId: string) => {
    if (!materialId) return 0;
    const stockItem = inventory.find(i => i.materialId === materialId);
    return stockItem ? stockItem.quantity : 0;
  };

  const getMaterialUnit = (materialId: string) => {
    if (!materialId) return '';
    const mat = materials.find(m => m.id === materialId);
    return mat ? mat.unit : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.projectId) return toast.error('Please select a project');
    if (!formData.warehouseId) return toast.error('Please select a warehouse');
    
    const validItems = items.filter(item => item.materialId && parseFloat(item.requestQty) > 0);
    if (validItems.length === 0) return toast.error('Please add at least one valid material with quantity > 0');

    if (!approverLevel1) return toast.error('Please select Level 1 Approver (Site Verification)');
    if (!approverLevel2) return toast.error('Please select Level 2 Approver (Final Authorization)');

    const approvers = [
      { stepOrder: 1, stepName: 'Level 1: Site Verification', approverId: approverLevel1 },
      { stepOrder: 2, stepName: 'Level 2: Final Authorization', approverId: approverLevel2 }
    ];

    setIsSubmitting(true);
    try {
      await api.post('/api/rfc', {
        projectId: formData.projectId,
        warehouseId: formData.warehouseId,
        requestorId: user?.id,
        notes: formData.notes,
        items: validItems.map(item => ({
          materialId: item.materialId,
          requestQty: parseFloat(item.requestQty),
          notes: item.notes
        })),
        approvers
      });
      
      toast.success('Request for Consumption created successfully');
      router.push('/rfc');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create RFC');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingMetadata) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Request for Consumption</h1>
          <p className="text-sm text-muted-foreground">Request materials from warehouse inventory</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="project">Project <span className="text-destructive">*</span></Label>
                <Select 
                  value={formData.projectId} 
                  onValueChange={(val) => setFormData({...formData, projectId: val || ''})}
                  items={projects.map((p) => ({
                    value: p.id,
                    label: `${p.projectCode} - ${p.projectName}`
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Project">
                      {(() => {
                        const selected = projects.find((p) => p.id === formData.projectId);
                        return selected ? `${selected.projectCode} - ${selected.projectName}` : undefined;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.projectCode} - {project.projectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="warehouse">Source Warehouse <span className="text-destructive">*</span></Label>
                <Select 
                  value={formData.warehouseId} 
                  onValueChange={(val) => setFormData({...formData, warehouseId: val || ''})}
                  items={warehouses.map((wh) => ({
                    value: wh.id,
                    label: wh.name
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Warehouse">
                      {(() => {
                        const selected = warehouses.find((w) => w.id === formData.warehouseId);
                        return selected ? selected.name : undefined;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>
                        {wh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Purpose</Label>
              <Textarea 
                id="notes" 
                placeholder="Briefly explain the purpose of this request..." 
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Approver Berjenjang Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Approval Workflow (Approver Berjenjang)
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Pilih approver bertingkat yang berwenang memverifikasi dan menyetujui dokumen pengeluaran material ini
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Level 1: Site Verification */}
              <div className="space-y-2.5 p-4 rounded-xl border bg-muted/20 border-border/70">
                <div className="flex items-center justify-between">
                  <Label htmlFor="approver-l1" className="font-semibold flex items-center gap-2 text-sm">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                    Level 1: Site Verification <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground bg-background px-2 py-0.5 rounded border border-border/60">
                    Review Lapangan
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Verifikasi fisik & kebutuhan teknis material proyek di lapangan
                </p>
                <Select 
                  value={approverLevel1} 
                  onValueChange={(val) => setApproverLevel1(val || '')}
                  items={users.map((u) => ({
                    value: u.id,
                    label: `${u.name} (${u.role})`
                  }))}
                >
                  <SelectTrigger id="approver-l1" className="h-11 bg-background">
                    <SelectValue placeholder="Pilih Site Manager / Reviewer">
                      {(() => {
                        const selected = users.find((u) => u.id === approverLevel1);
                        return selected ? `${selected.name} (${selected.role})` : undefined;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="font-medium">{u.name}</span>
                          <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/40">{u.role}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Level 2: Final Authorization */}
              <div className="space-y-2.5 p-4 rounded-xl border bg-muted/20 border-border/70">
                <div className="flex items-center justify-between">
                  <Label htmlFor="approver-l2" className="font-semibold flex items-center gap-2 text-sm">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                    Level 2: Final Authorization <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground bg-background px-2 py-0.5 rounded border border-border/60">
                    Persetujuan Akhir
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Otorisasi pengeluaran barang sebelum material dapat diambil di gudang
                </p>
                <Select 
                  value={approverLevel2} 
                  onValueChange={(val) => setApproverLevel2(val || '')}
                  items={users.map((u) => ({
                    value: u.id,
                    label: `${u.name} (${u.role})`
                  }))}
                >
                  <SelectTrigger id="approver-l2" className="h-11 bg-background">
                    <SelectValue placeholder="Pilih Direktur / Management Approver">
                      {(() => {
                        const selected = users.find((u) => u.id === approverLevel2);
                        return selected ? `${selected.name} (${selected.role})` : undefined;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="font-medium">{u.name}</span>
                          <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/40">{u.role}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Visual Mini Stepper Preview */}
            <div className="pt-3 border-t">
              <span className="text-xs font-semibold text-muted-foreground block mb-2.5">
                Preview Alur Persetujuan Dokumen:
              </span>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-lg border">
                  <span className="w-4 h-4 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[10px]">0</span>
                  <span className="font-medium">{user?.name || 'Requestor'} (Submit)</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/30 font-medium">
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 font-bold flex items-center justify-center text-[10px]">1</span>
                  <span>{users.find(u => u.id === approverLevel1)?.name || 'Pilih Level 1 Approver'}</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/30 font-medium">
                  <span className="w-4 h-4 rounded-full bg-blue-500/20 font-bold flex items-center justify-center text-[10px]">2</span>
                  <span>{users.find(u => u.id === approverLevel2)?.name || 'Pilih Level 2 Approver'}</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-lg border text-muted-foreground">
                  <span className="font-medium">Warehouse Dispatch</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {formData.warehouseId && isLoadingInventory && (
          <div className="bg-muted/50 border border-border p-4 rounded-md flex items-center gap-3 animate-pulse">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Memeriksa stok material di gudang ini...</p>
          </div>
        )}

        {formData.warehouseId && !isLoadingInventory && inventory.length === 0 && (
          <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-md flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">No Inventory Found</h4>
              <p className="text-sm">
                The selected warehouse has no materials in stock. Please select a different warehouse.
              </p>
            </div>
          </div>
        )}

        <Card className={!formData.warehouseId || isLoadingInventory || inventory.length === 0 ? 'opacity-50 pointer-events-none' : ''}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Requested Materials</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[560px] min-w-[540px]">Material <span className="text-destructive">*</span></TableHead>
                    <TableHead className="w-[130px] text-center">Available Stock</TableHead>
                    <TableHead className="w-[140px]">Req. Qty <span className="text-destructive">*</span></TableHead>
                    <TableHead className="w-[100px]">Unit</TableHead>
                    <TableHead className="min-w-[220px]">Notes</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index} className="hover:bg-muted/30">
                      <TableCell className="py-2.5 px-3 align-middle">
                        <Select 
                          value={item.materialId} 
                          onValueChange={(val) => handleItemChange(index, 'materialId', val || '')}
                          items={inventory.map((inv) => ({
                            value: inv.materialId,
                            label: `${inv.material?.materialCode || ''} - ${inv.material?.materialName || ''}`
                          }))}
                        >
                          <SelectTrigger 
                            className={cn(
                              "h-[52px] min-h-[52px] py-1.5 px-3 text-left whitespace-normal leading-snug",
                              "[&_[data-slot=select-value]]:line-clamp-2 [&_[data-slot=select-value]]:whitespace-normal [&_[data-slot=select-value]]:block [&_[data-slot=select-value]]:break-words",
                              !item.materialId ? "text-muted-foreground" : ""
                            )}
                          >
                            <SelectValue 
                              placeholder="Select Material"
                              className="!line-clamp-2 !whitespace-normal !block leading-snug text-left"
                            >
                              {(() => {
                                const selected = inventory.find((i) => i.materialId === item.materialId);
                                return selected?.material
                                  ? `${selected.material.materialCode} - ${selected.material.materialName}`
                                  : undefined;
                              })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-w-[600px]">
                            {inventory.map((inv) => (
                              <SelectItem 
                                key={inv.materialId} 
                                value={inv.materialId}
                                className="py-2 whitespace-normal [&_[data-slot=select-item-text]]:whitespace-normal [&>span]:whitespace-normal"
                              >
                                {inv.material?.materialCode} - {inv.material?.materialName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="py-2.5 px-3 align-middle">
                        {item.materialId ? (
                          <div className="font-mono text-sm bg-muted/80 border border-border/60 px-3 h-[52px] rounded-lg flex items-center justify-center w-full font-semibold">
                            {getAvailableStock(item.materialId)}
                          </div>
                        ) : (
                          <div className="font-mono text-sm text-muted-foreground/60 h-[52px] rounded-lg border border-dashed border-border/40 flex items-center justify-center w-full">
                            -
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 align-middle">
                        <Input 
                          type="number" 
                          min="0"
                          step="0.01"
                          max={getAvailableStock(item.materialId)}
                          placeholder="Qty" 
                          value={item.requestQty}
                          onChange={(e) => handleItemChange(index, 'requestQty', e.target.value)}
                          disabled={!item.materialId}
                          className="h-[52px] text-base md:text-sm font-medium"
                        />
                      </TableCell>
                      <TableCell className="py-2.5 px-3 align-middle">
                        <div className="h-[52px] flex items-center">
                          <span className="text-sm font-medium text-muted-foreground">{getMaterialUnit(item.materialId) || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 px-3 align-middle">
                        <Textarea 
                          rows={2}
                          placeholder="Optional notes" 
                          value={item.notes}
                          onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                          className="h-[52px] min-h-[52px] resize-none py-2 px-3 text-sm leading-snug"
                        />
                      </TableCell>
                      <TableCell className="py-2.5 px-3 align-middle">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:bg-destructive/10 h-[52px] w-[52px] rounded-lg flex items-center justify-center"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !formData.warehouseId || inventory.length === 0}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Submit Request
          </Button>
        </div>
      </form>
    </div>
  );
}
