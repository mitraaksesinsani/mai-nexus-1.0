'use client';

import { useEffect, useState, useMemo } from 'react';
import { Package, Plus, Search, Loader2, Pencil, Trash2, DollarSign, SlidersHorizontal } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExcelImportExport } from '@/components/ExcelImportExport';
import { toast } from 'sonner';
import { DataTablePagination } from '@/components/shared/DataTablePagination';

const BASE_CATEGORIES = ['Pipa', 'Tiang', 'Kabel', 'Alat', 'Aksesoris'];
const MATERIAL_UOMS = ['Meter', 'Roll', 'Pcs', 'Unit', 'Set', 'Box', 'Kg', 'Liter', 'Lot'];

const PACKAGING_TYPES = [
  { value: 'NON_PACKAGING', label: 'Bukan Kemasan / Satuan Biasa' },
  { value: 'KABEL_UDARA', label: '1 Haspel Kabel Udara (4.000 m)' },
  { value: 'KABEL_TANAH', label: '1 Haspel Kabel Tanah / Duct (3.000 m)' },
  { value: 'HDPE_SUBDUCT', label: '1 Roll Subduct / HDPE (200 m)' },
];

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'code-asc', label: 'Code (A-Z)' },
  { value: 'code-desc', label: 'Code (Z-A)' },
  { value: 'group-asc', label: 'Kategori (A-Z)' },
  { value: 'group-desc', label: 'Kategori (Z-A)' },
  { value: 'uom-asc', label: 'UOM (A-Z)' },
  { value: 'uom-desc', label: 'UOM (Z-A)' },
];

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('ALL');
  const [filterUom, setFilterUom] = useState('ALL');
  const [sortBy, setSortBy] = useState('name-asc');
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Selection State for Bulk Operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Delete Dialog State (Single & Bulk)
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    group: '',
    uom: '',
    packagingType: 'NON_PACKAGING',
    unitPrice: '',
    description: '',
  });

  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const allCategories = useMemo(() => {
    const LEGACY_MAP: Record<string, string> = {
      cable: 'Kabel',
      cables: 'Kabel',
      accessory: 'Aksesoris',
      accessories: 'Aksesoris',
      pole: 'Tiang',
      poles: 'Tiang',
      pipe: 'Pipa',
      pipes: 'Pipa',
      standard: 'Pipa',
      tool: 'Alat',
      tools: 'Alat',
      equipment: 'Alat',
    };

    const list = [...BASE_CATEGORIES];
    materials.forEach(m => {
      let cat = (m.category || '').trim();
      if (!cat) return;
      if (LEGACY_MAP[cat.toLowerCase()]) {
        cat = LEGACY_MAP[cat.toLowerCase()];
      }
      if (!list.some(c => c.toLowerCase() === cat.toLowerCase())) {
        list.push(cat);
      }
    });
    customCategories.forEach(c => {
      let cat = c.trim();
      if (!cat) return;
      if (LEGACY_MAP[cat.toLowerCase()]) {
        cat = LEGACY_MAP[cat.toLowerCase()];
      }
      if (!list.some(existing => existing.toLowerCase() === cat.toLowerCase())) {
        list.push(cat);
      }
    });
    return list;
  }, [materials, customCategories]);

  useEffect(() => {
    fetchMaterials();
    setPage(1); // Reset page on filter change
    setSelectedIds([]); // Reset selections on filter change
  }, [search, filterGroup, filterUom, sortBy]);

  const fetchMaterials = async () => {
    try {
      const { data } = await api.get('/api/materials', { params: { search, group: filterGroup, uom: filterUom, sort: sortBy, limit: 5000 } });
      setMaterials(data.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  // Paginated materials helper
  const currentPageMaterials = materials.slice((page - 1) * pageSize, page * pageSize);
  const currentPageIds = currentPageMaterials.map(m => m.id);

  const isAllCurrentPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.includes(id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = Array.from(new Set([...selectedIds, ...currentPageIds]));
      setSelectedIds(newSelected);
    } else {
      const newSelected = selectedIds.filter(id => !currentPageIds.includes(id));
      setSelectedIds(newSelected);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const openCreateDialog = () => {
    setEditId(null);
    setIsAddingNewCategory(false);
    setNewCategoryInput('');
    setFormData({ code: '', name: '', group: allCategories[0] || 'Pipa', uom: '', packagingType: 'NON_PACKAGING', unitPrice: '', description: '' });
    setIsOpen(true);
  };

  const openEditDialog = (material: any) => {
    setEditId(material.id);
    setIsAddingNewCategory(false);
    setNewCategoryInput('');
    setFormData({
      code: material.materialCode,
      name: material.materialName,
      group: material.category || allCategories[0] || 'Pipa',
      uom: material.unit,
      packagingType: material.packagingType || 'NON_PACKAGING',
      unitPrice: material.unitPrice ? material.unitPrice.toString() : '',
      description: material.specification || '',
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const resolvedCategory = (isAddingNewCategory ? newCategoryInput : formData.group).trim();
      if (resolvedCategory && !allCategories.some(c => c.toLowerCase() === resolvedCategory.toLowerCase())) {
        setCustomCategories(prev => [...prev, resolvedCategory]);
      }

      if (editId) {
        await api.put('/api/materials', {
          id: editId,
          materialCode: formData.code,
          materialName: formData.name,
          category: resolvedCategory,
          specification: formData.description,
          unit: formData.uom,
          packagingType: formData.packagingType,
          unitPrice: parseFloat(formData.unitPrice) || 0,
          minimumStock: 0,
          isActive: true
        });
        toast.success('Material updated successfully');
      } else {
        await api.post('/api/materials', {
          code: formData.code,
          name: formData.name,
          group: resolvedCategory,
          uom: formData.uom,
          packagingType: formData.packagingType,
          description: formData.description,
          unitPrice: parseFloat(formData.unitPrice) || 0,
        });
        toast.success('Material created successfully');
      }
      setIsOpen(false);
      fetchMaterials();
    } catch (error) {
      console.error('Error saving material:', error);
      toast.error('Failed to save material');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/api/materials?id=${deleteId}`);
      toast.success('Material deleted');
      setDeleteOpen(false);
      setSelectedIds(prev => prev.filter(id => id !== deleteId));
      fetchMaterials();
    } catch (error) {
      console.error('Failed to delete material', error);
      toast.error('Failed to delete material');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await api.delete('/api/materials', { data: { ids: selectedIds } });
      toast.success(`Successfully deleted ${selectedIds.length} materials`);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      fetchMaterials();
    } catch (error: any) {
      console.error('Failed to bulk delete materials', error);
      const errMsg = error.response?.data?.message || 'Failed to delete selected materials';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/api/materials/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { count, createdCount, updatedCount, errors } = res.data;
      
      let msg = `Import succeeded. ${count} item(s) processed.`;
      if (createdCount !== undefined && updatedCount !== undefined) {
        msg = `Import berhasil: ${createdCount} baru dibuat, ${updatedCount} diperbarui.`;
      }
      toast.success(msg);

      if (errors && errors.length > 0) {
        toast.warning(`${errors.length} item ada catatan/peringatan`, {
          description: errors.slice(0, 3).join(', ')
        });
      }

      fetchMaterials();
    } catch (e: any) {
      console.error(e);
      const errMsg = e.response?.data?.message || 'Failed to import Excel';
      toast.error(errMsg);
    }
  };

  const handleExport = async () => {
    window.location.href = '/api/materials/excel?action=export';
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/materials/excel?action=template';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
        <div>
          <h1 className="text-[24px] font-medium tracking-tight">Material Master Data</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Manage network materials, prices, and inventory catalog</p>
        </div>
        <div className="self-stretch bg-white dark:bg-card rounded-xl shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] outline outline-1 outline-offset-[-1px] outline-gray-200 dark:outline-gray-800 inline-flex flex-col justify-start items-start overflow-hidden">
          <div className="self-stretch px-6 pt-6 pb-8 flex flex-col justify-start items-start gap-2.5">
            <div className="self-stretch justify-start text-slate-600 dark:text-slate-400 text-[13px] font-normal font-['Inter'] leading-5">Total Material</div>
            <div className="justify-start text-gray-900 dark:text-gray-100 text-[18px] font-semibold font-['Inter'] leading-7">{materials.length}</div>
          </div>
          <div className="self-stretch h-px bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>

      <div className="flex flex-col gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="hidden sm:block">
            <ExcelImportExport 
              onImport={handleImport} 
              onExport={handleExport} 
              onDownloadTemplate={handleDownloadTemplate} 
              isLoading={loading} 
            />
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="gap-2 h-9 text-[13px]"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
                Hapus Terpilih ({selectedIds.length})
              </Button>
            )}
            
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-end w-full">
          <div className="flex w-full sm:flex-1 gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search materials..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background h-auto py-[10px] text-[16px] sm:h-10 sm:py-2 sm:text-[13px]"
              />
            </div>

            {/* Mobile Filters Drawer Trigger */}
            <div className="block sm:hidden shrink-0">
              <Sheet>
                <SheetTrigger render={<Button variant="outline" size="icon" className="h-[46px] w-[46px] sm:h-10 sm:w-10 shrink-0" />}>
                  <SlidersHorizontal className="w-4 h-4" />
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl px-4 pt-6 pb-8">
                  <SheetHeader className="p-0 pb-0 text-left">
                    <SheetTitle>Filter & Sort</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-2">
                    <div className="w-full">
                      <Label className="text-[13px] mb-1.5 block text-muted-foreground">Filter by Kategori</Label>
                      <Select value={filterGroup} onValueChange={(val) => setFilterGroup(val || "")}>
                        <SelectTrigger className="h-10 bg-background text-[13px]">
                          <SelectValue placeholder="Semua Kategori" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL" className="text-[13px]">Semua Kategori</SelectItem>
                          {allCategories.map(c => (
                            <SelectItem key={c} value={c} className="text-[13px]">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full">
                      <Label className="text-[13px] mb-1.5 block text-muted-foreground">Filter by UOM</Label>
                      <Select value={filterUom} onValueChange={(val) => setFilterUom(val || "")}>
                        <SelectTrigger className="h-10 bg-background text-[13px]">
                          <SelectValue placeholder="All UOMs" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL" className="text-[13px]">All UOMs</SelectItem>
                          {MATERIAL_UOMS.map(u => (
                            <SelectItem key={u} value={u} className="text-[13px]">{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full">
                      <Label className="text-[13px] mb-1.5 block text-muted-foreground">Sort By</Label>
                      <Select value={sortBy} onValueChange={(val) => setSortBy(val || "")}>
                        <SelectTrigger className="h-10 bg-background text-[13px]">
                          <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent>
                          {SORT_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-[13px]">{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <Button size="icon" className="shrink-0 h-[46px] w-[46px] sm:h-10 sm:w-10" onClick={openCreateDialog}>
              <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
            </Button>
          </div>

          <div className="hidden sm:flex gap-4">
            <div className="w-[160px]">
              <Label className="text-[13px] mb-1.5 block text-muted-foreground">Filter by Kategori</Label>
              <Select value={filterGroup} onValueChange={(val) => setFilterGroup(val || "")}>
                <SelectTrigger className="h-10 bg-background text-[13px]">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-[13px]">Semua Kategori</SelectItem>
                  {allCategories.map(c => (
                    <SelectItem key={c} value={c} className="text-[13px]">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[120px]">
              <Label className="text-[13px] mb-1.5 block text-muted-foreground">Filter by UOM</Label>
              <Select value={filterUom} onValueChange={(val) => setFilterUom(val || "")}>
                <SelectTrigger className="h-10 bg-background text-[13px]">
                  <SelectValue placeholder="All UOMs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-[13px]">All UOMs</SelectItem>
                  {MATERIAL_UOMS.map(u => (
                    <SelectItem key={u} value={u} className="text-[13px]">{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Label className="text-[13px] mb-1.5 block text-muted-foreground">Sort By</Label>
              <Select value={sortBy} onValueChange={(val) => setSortBy(val || "")}>
                <SelectTrigger className="h-10 bg-background text-[13px]">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-[13px]">{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Selected items notification bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-3 rounded-lg animate-fade-in">
          <span className="text-[13px] font-medium text-primary">
            {selectedIds.length} material dipilih
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-[13px]"
              onClick={() => setSelectedIds([])}
            >
              Batal Pilih
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2 text-[13px]"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              Hapus ({selectedIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-full sm:max-w-xl md:max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden rounded-xl border bg-popover shadow-2xl text-[13px]">
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b shrink-0 pr-12 bg-background/50">
              <DialogTitle className="text-lg font-bold">{editId ? 'Edit Material' : 'Add Material'}</DialogTitle>
              <DialogDescription className="text-[13px] text-muted-foreground mt-0.5">
                {editId ? 'Update the details of this material.' : 'Add a new material to the master data catalog.'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-[13px] font-medium">Material Code</Label>
                  <Input
                    id="code"
                    placeholder="e.g. CBL-FO-48"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="h-10 text-[13px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uom" className="text-[13px] font-medium">Unit of Measure (UOM)</Label>
                  <Select value={formData.uom} onValueChange={(val) => setFormData({ ...formData, uom: val || "" })}>
                    <SelectTrigger id="uom" className="h-10 text-[13px]">
                      <SelectValue placeholder="Select UOM">
                        {formData.uom || undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIAL_UOMS.map(u => (
                        <SelectItem key={u} value={u} className="text-[13px]">{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[13px] font-medium">Material Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Fiber Optic Cable 48 Core"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-10 text-[13px]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="group" className="text-[13px] font-medium">Kategori</Label>
                  {isAddingNewCategory ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Input
                          id="newCategory"
                          placeholder="Nama kategori baru..."
                          value={newCategoryInput}
                          onChange={(e) => {
                            setNewCategoryInput(e.target.value);
                            setFormData({ ...formData, group: e.target.value });
                          }}
                          autoFocus
                          className="h-10 text-[13px]"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsAddingNewCategory(false);
                            setNewCategoryInput('');
                            setFormData({ ...formData, group: allCategories[0] || 'Pipa' });
                          }}
                          className="text-[13px] text-muted-foreground hover:text-foreground shrink-0 h-10 px-2"
                        >
                          Batal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Select 
                      value={formData.group} 
                      onValueChange={(val) => {
                        if (val === '__NEW__') {
                          setIsAddingNewCategory(true);
                          setNewCategoryInput('');
                          setFormData({ ...formData, group: '' });
                        } else {
                          setFormData({ ...formData, group: val || "" });
                        }
                      }}
                    >
                      <SelectTrigger id="group" className="h-10 text-[13px]">
                        <SelectValue placeholder="Pilih Kategori">
                          {formData.group || undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {allCategories.map(c => (
                          <SelectItem key={c} value={c} className="text-[13px]">{c}</SelectItem>
                        ))}
                        <SelectItem value="__NEW__" className="font-semibold text-primary text-[13px]">
                          + Tambah Kategori Baru...
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitPrice" className="text-[13px] font-medium">Unit Price (Rp)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    placeholder="e.g. 15000"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    className="h-10 text-[13px]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-[13px] font-medium">Description</Label>
                <Input
                  id="description"
                  placeholder="Optional details"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="h-10 text-[13px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="packagingType" className="text-[13px] font-medium">Tipe Kemasan Fisik (Packaging UOM)</Label>
                <Select 
                  value={formData.packagingType} 
                  onValueChange={(val) => setFormData({ ...formData, packagingType: val || 'NON_PACKAGING' })}
                >
                  <SelectTrigger id="packagingType" className="h-10 text-[13px]">
                    <SelectValue placeholder="Pilih Tipe Kemasan">
                      {PACKAGING_TYPES.find(p => p.value === formData.packagingType)?.label || formData.packagingType || undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGING_TYPES.map(p => (
                      <SelectItem key={p.value} value={p.value} className="text-[13px]">{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[12px] text-muted-foreground">
                  Kategori kemasan standar untuk konversi material ke wujud haspel/roll di dashboard.
                </p>
              </div>
            </div>
            <DialogFooter className="shrink-0 mx-0 mb-0 mt-0 p-0 px-6 py-3.5 border-t bg-muted/30 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" className="text-[13px] h-9 px-4" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" className="text-[13px] h-9 px-4" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editId ? 'Save Changes' : 'Save Material'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Single Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[425px] text-[13px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription className="text-[13px]">
              Are you sure you want to delete this material? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" className="text-[13px]" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" className="text-[13px]" onClick={confirmDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="sm:max-w-[425px] text-[13px]">
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus Banyak ({selectedIds.length} item)</DialogTitle>
            <DialogDescription className="text-[13px]">
              Apakah Anda yakin ingin menghapus <strong>{selectedIds.length} material</strong> yang dipilih? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" className="text-[13px]" onClick={() => setBulkDeleteOpen(false)}>
              Batal
            </Button>
            <Button type="button" variant="destructive" className="text-[13px]" onClick={confirmBulkDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus Semua ({selectedIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        {loading ? (
          <div className="p-8 text-center flex flex-col items-center bg-card border rounded-xl ">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading materials...</p>
          </div>
        ) : materials.length > 0 ? (
          <>
            {/* MOBILE COMPACT LIST VIEW */}
            <div className="block sm:hidden w-full space-y-[5px]">
              {currentPageMaterials.map((material) => {
                const isSelected = selectedIds.includes(material.id);
                const priceFormatted = material.unitPrice 
                  ? `Rp ${Number(material.unitPrice).toLocaleString('id-ID')}` 
                  : 'Rp 0';
                  
                return (
                  <div 
                    key={`mobile-mat-${material.id}`} 
                    className={`w-full p-3 bg-white dark:bg-card rounded-xl border ${isSelected ? 'border-primary/50 bg-primary/5' : 'border-neutral-200/60 dark:border-border/60'} shadow-xs flex flex-col justify-start items-start relative transition-colors`}
                  >
                    <div className="w-full flex justify-between items-start gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0 pr-6">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(material.id, !!checked)}
                          aria-label={`Select ${material.materialName}`}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-neutral-950 dark:text-foreground text-[16px] font-semibold leading-snug truncate">
                            {material.materialName}
                          </div>
                          <div className="text-neutral-500 dark:text-muted-foreground text-[13px] font-normal leading-4 truncate mt-0.5">
                            {material.materialCode} {material.brand ? `• ${material.brand}` : ''}
                          </div>
                        </div>
                      </div>
                      
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold leading-4 bg-muted text-muted-foreground">
                          {material.category}
                        </span>
                      </div>
                    </div>

                    <div className="w-full pt-2 pl-6 flex items-center justify-between gap-1.5 text-neutral-500 dark:text-muted-foreground text-[13px] leading-4">
                      <div className="flex gap-1 items-center">
                        {material.packagingType === 'KABEL_UDARA' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">4.000m/Haspel</span>
                        )}
                        {material.packagingType === 'KABEL_TANAH' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">3.000m/Haspel</span>
                        )}
                        {material.packagingType === 'HDPE_SUBDUCT' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100">200m/Roll</span>
                        )}
                        {!['KABEL_UDARA', 'KABEL_TANAH', 'HDPE_SUBDUCT'].includes(material.packagingType || '') && (
                           <span className="text-[11px] font-medium text-foreground">{material.unit}</span>
                        )}
                      </div>
                      <span className="font-semibold text-green-600">{priceFormatted}</span>
                    </div>

                    <div className="w-full pt-2.5 flex justify-end items-center">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEditDialog(material)}
                          className="h-7 px-2 bg-white dark:bg-muted/40 hover:bg-neutral-100 dark:hover:bg-muted text-neutral-950 dark:text-foreground text-xs font-medium rounded-lg border border-neutral-200 dark:border-border inline-flex justify-center items-center gap-1 transition-colors shadow-xs"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDeleteId(material.id); setDeleteOpen(true); }}
                          className="h-7 px-2 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/50 inline-flex justify-center items-center gap-1 transition-colors shadow-xs"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden sm:block">
              <Table className="whitespace-nowrap sm:whitespace-normal text-[13px]">
              <TableHeader className="hidden sm:table-header-group">
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={isAllCurrentPageSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all on current page"
                    />
                  </TableHead>
                  <TableHead className="w-[150px] text-[13px] font-semibold">Code</TableHead>
                  <TableHead className="w-[350px] text-[13px] font-semibold">Name</TableHead>
                  <TableHead className="w-[120px] text-[13px] font-semibold">Kategori</TableHead>
                  <TableHead className="w-[130px] text-[13px] font-semibold">Unit Price</TableHead>
                  <TableHead className="w-[250px] text-[13px] font-semibold">Description</TableHead>
                  <TableHead className="w-[80px] text-[13px] font-semibold">UOM</TableHead>
                  <TableHead className="w-[80px] text-right text-[13px] font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPageMaterials.map((material) => {
                  const isSelected = selectedIds.includes(material.id);
                  const priceFormatted = material.unitPrice 
                    ? `Rp ${Number(material.unitPrice).toLocaleString('id-ID')}` 
                    : 'Rp 0';
                  return (
                    <TableRow 
                      key={material.id} 
                      className={`transition-colors ${isSelected ? 'bg-muted/50' : ''}`}
                    >
                      <TableCell className="w-[40px] px-3 py-2 border-b border-border/50">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(material.id, !!checked)}
                          aria-label={`Select ${material.materialCode}`}
                        />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell w-[150px] font-medium text-primary px-3 py-2 border-b border-border/50 break-words text-[13px]">
                        {material.materialCode}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[350px] px-3 py-2 border-b border-border/50 font-medium whitespace-normal text-[13px]">
                        <div>
                          <span 
                            className="line-clamp-2 leading-snug break-words text-[13px]" 
                            title={material.materialName}
                          >
                            {material.materialName}
                          </span>
                          {material.packagingType === 'KABEL_UDARA' && (
                            <span className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              1 Haspel (4.000m)
                            </span>
                          )}
                          {material.packagingType === 'KABEL_TANAH' && (
                            <span className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              1 Haspel (3.000m)
                            </span>
                          )}
                          {material.packagingType === 'HDPE_SUBDUCT' && (
                            <span className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              1 Roll (200m)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-3 py-2 border-b border-border/50 text-[13px]">
                        <Badge variant="secondary" className="text-[13px] font-normal bg-muted text-muted-foreground">
                          {material.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-3 py-2 border-b border-border/50 font-medium text-[13px] text-foreground">
                        {priceFormatted}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[250px] px-3 py-2 border-b border-border/50 whitespace-normal text-[13px] text-muted-foreground">
                        <span 
                          className="line-clamp-2 leading-snug break-words text-[13px]" 
                          title={material.specification || '-'}
                        >
                          {material.specification || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-3 py-2 border-b border-border/50 text-[13px]">
                        {material.unit}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-3 py-2 border-b border-border/50 text-right text-[13px]">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditDialog(material)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { setDeleteId(material.id); setDeleteOpen(true); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
            <DataTablePagination 
              totalItems={materials.length} 
              pageSize={pageSize} 
              currentPage={page} 
              onPageChange={setPage} 
              onPageSizeChange={setPageSize} 
            />
          </>
        ) : (
          <div className="text-center py-16 bg-card border rounded-xl ">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-[13px]">No materials found</p>
            <Button variant="link" onClick={openCreateDialog} className="mt-2 text-[13px]">
              Create your first material
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
