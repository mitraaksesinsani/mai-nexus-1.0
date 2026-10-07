'use client';

import { useEffect, useState } from 'react';
import { 
  Warehouse, Search, Plus, Loader2, Pencil, Trash2, MapPin, Upload, 
  Image as ImageIcon, X, ExternalLink, Map, Globe, Check, ChevronsUpDown, 
  MoreHorizontal, Eye, Package, PackagePlus, User, SlidersHorizontal 
} from 'lucide-react';
import api from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ExcelImportExport } from '@/components/ExcelImportExport';
import { toast } from 'sonner';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { Badge } from '@/components/ui/badge';
import { ManualStockEntryModal } from '@/components/warehouse/ManualStockEntryModal';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function WarehousePage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('none');
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Detail Modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedWarehouseDetail, setSelectedWarehouseDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Assign/Ubah PIC Modal state
  const [picModalOpen, setPicModalOpen] = useState(false);
  const [selectedWarehousePic, setSelectedWarehousePic] = useState<any | null>(null);
  const [selectedPicId, setSelectedPicId] = useState<string>('UNASSIGNED');
  const [isSubmittingPic, setIsSubmittingPic] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Preview state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Project Search State
  const [projectSearch, setProjectSearch] = useState('');

  // Manual Stock Entry State
  const [stockEntryOpen, setStockEntryOpen] = useState(false);
  const [stockEntryWarehouseId, setStockEntryWarehouseId] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: '',
    coordinates: '',
    evidence: '',
    type: 'MAIN',
    capacity: '',
    status: 'ACTIVE',
    picId: '',
    picName: '',
    projectIds: [] as string[]
  });

  const [isUploading, setIsUploading] = useState(false);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/warehouse', { params: { search, type: filterType, status: filterStatus, sort: sortBy } });
      setWarehouses(data.data || []);
    } catch (e) { 
      console.error(e);
      toast.error('Failed to load warehouses');
    } finally { 
      setLoading(false); 
    }
  };

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/api/projects?limit=100');
      setProjectsList(data.data || []);
    } catch (e) {
      console.error('Failed to fetch projects', e);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/api/users');
      setUsersList((data.data || []).filter((u: any) => u.isActive !== false));
    } catch (e) {
      console.error('Failed to fetch users', e);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchWarehouses();
    setPage(1);
    setSelectedIds([]);
  }, [search, filterType, filterStatus, sortBy]);

  const currentPageWarehouses = warehouses.slice((page - 1) * pageSize, page * pageSize);
  const currentPageIds = currentPageWarehouses.map(w => w.id);

  const isAllCurrentPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.includes(id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(Array.from(new Set([...selectedIds, ...currentPageIds])));
    } else {
      setSelectedIds(selectedIds.filter(id => !currentPageIds.includes(id)));
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
    setFormData({ code: '', name: '', location: '', coordinates: '', evidence: '', type: 'MAIN', capacity: '', status: 'ACTIVE', picId: '', picName: '', projectIds: [] });
    setProjectSearch('');
    setIsOpen(true);
  };

  const openEditDialog = (w: any) => {
    setEditId(w.id);
    setFormData({
      code: w.code,
      name: w.name,
      location: w.location || '',
      coordinates: w.coordinates || '',
      evidence: w.evidence || '',
      type: w.type || 'MAIN',
      capacity: w.capacity ? w.capacity.toString() : '',
      status: w.status || 'ACTIVE',
      picId: w.picId || '',
      picName: w.picName || '',
      projectIds: w.projects ? w.projects.map((p: any) => p.id) : []
    });
    setProjectSearch('');
    setIsOpen(true);
  };

  const openStockEntryDialog = (w: any) => {
    setStockEntryWarehouseId(w.id);
    setStockEntryOpen(true);
  };

  const openDetailDialog = async (w: any) => {
    setSelectedWarehouseDetail(w);
    setDetailModalOpen(true);
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/api/warehouse/${w.id}`);
      if (data?.data) {
        setSelectedWarehouseDetail((prev: any) => ({
          ...(prev || {}),
          ...data.data,
          totalMaterials: data.data.totalMaterials !== undefined ? data.data.totalMaterials : (prev?.totalMaterials || 0),
          totalStock: data.data.totalStock !== undefined ? data.data.totalStock : (prev?.totalStock || 0),
        }));
      }
    } catch (err) {
      console.error('Failed to fetch detailed warehouse data', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const openPicDialog = (w: any) => {
    setSelectedWarehousePic(w);
    setSelectedPicId(w.picId ? w.picId : (w.picName ? `LEGACY_${w.picName}` : 'UNASSIGNED'));
    setPicModalOpen(true);
  };

  const handleSavePic = async () => {
    if (!selectedWarehousePic) return;
    setIsSubmittingPic(true);
    try {
      const isUnassigned = selectedPicId === 'UNASSIGNED';
      const isLegacy = selectedPicId.startsWith('LEGACY_');
      let newPicId: string | null = null;
      let newPicName: string | null = null;

      if (!isUnassigned) {
        if (isLegacy) {
          newPicName = selectedWarehousePic.picName || null;
        } else {
          newPicId = selectedPicId;
          const u = usersList.find(user => user.id === selectedPicId);
          newPicName = u?.name || null;
        }
      }

      await api.put('/api/warehouse', {
        id: selectedWarehousePic.id,
        code: selectedWarehousePic.code,
        name: selectedWarehousePic.name,
        location: selectedWarehousePic.location || '',
        coordinates: selectedWarehousePic.coordinates || '',
        evidence: selectedWarehousePic.evidence || null,
        type: selectedWarehousePic.type || 'MAIN',
        capacity: parseInt(selectedWarehousePic.capacity) || 0,
        status: selectedWarehousePic.status || 'ACTIVE',
        picId: newPicId,
        picName: newPicName,
        projectIds: selectedWarehousePic.projects ? selectedWarehousePic.projects.map((p: any) => p.id) : []
      });

      toast.success(`PIC untuk gudang "${selectedWarehousePic.name}" berhasil diperbarui`);
      setPicModalOpen(false);

      // Sinkronkan ke modal detail jika sedang terbuka
      if (selectedWarehouseDetail && selectedWarehouseDetail.id === selectedWarehousePic.id) {
        setSelectedWarehouseDetail((prev: any) => ({
          ...prev,
          picId: newPicId,
          picName: newPicName,
          picUser: newPicId ? usersList.find(u => u.id === newPicId) : null
        }));
      }

      fetchWarehouses();
    } catch (err: any) {
      console.error('Failed to update warehouse PIC:', err);
      toast.error(err.response?.data?.message || 'Gagal memperbarui PIC gudang');
    } finally {
      setIsSubmittingPic(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formDataObj = new FormData();
    formDataObj.append('file', file);
    
    setIsUploading(true);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataObj,
      });
      const data = await response.json();
      if (response.ok && data.url) {
        setFormData({ ...formData, evidence: data.url });
      } else {
        toast.error(data.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An error occurred while uploading.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editId) {
        await api.put('/api/warehouse', { id: editId, ...formData, capacity: parseInt(formData.capacity) || 0 });
      } else {
        await api.post('/api/warehouse', { ...formData, capacity: parseInt(formData.capacity) || 0 });
      }
      setIsOpen(false);
      fetchWarehouses();
      toast.success(`Warehouse ${editId ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving warehouse:', error);
      toast.error('Failed to save Warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/api/warehouse?id=${deleteId}`);
      setDeleteOpen(false);
      setSelectedIds(prev => prev.filter(id => id !== deleteId));
      fetchWarehouses();
      toast.success('Warehouse deleted successfully');
    } catch (error) {
      console.error('Failed to delete warehouse', error);
      toast.error('Failed to delete warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await api.delete('/api/warehouse', { data: { ids: selectedIds } });
      toast.success(`Successfully deleted ${selectedIds.length} warehouses`);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      fetchWarehouses();
    } catch (error: any) {
      console.error('Failed to bulk delete warehouses', error);
      const errMsg = error.response?.data?.message || 'Failed to delete selected warehouses';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/api/warehouse/excel', formData, {
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

      fetchWarehouses();
    } catch (e: any) {
      console.error(e);
      const errMsg = e.response?.data?.message || 'Failed to import Excel';
      toast.error(errMsg);
    }
  };

  const handleExport = async () => {
    window.location.href = '/api/warehouse/excel?action=export';
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/warehouse/excel?action=template';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
        <div>
          <h1 className="text-[24px] font-medium">Warehouse Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage storage locations and capacity</p>
        </div>
        <div className="self-stretch bg-white dark:bg-card rounded-xl shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] outline outline-1 outline-offset-[-1px] outline-gray-200 dark:outline-gray-800 inline-flex flex-col justify-start items-start overflow-hidden">
          <div className="self-stretch px-6 pt-6 pb-8 flex flex-col justify-start items-start gap-2.5">
            <div className="self-stretch justify-start text-slate-600 dark:text-slate-400 text-[14px] font-normal font-['Inter'] leading-5">Total Warehouse</div>
            <div className="justify-start text-gray-900 dark:text-gray-100 text-[18px] font-semibold font-['Inter'] leading-7">{warehouses.length}</div>
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
          <div className="flex items-center gap-2 w-full sm:w-auto">
            
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-end w-full">
          <div className="flex w-full sm:flex-1 gap-2 items-center">
            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search warehouse code or name..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background h-10 text-sm"
              />
            </div>

            {/* Mobile Filters Drawer Trigger */}
            <div className="block sm:hidden shrink-0">
              <Sheet>
                <SheetTrigger render={<Button variant="outline" size="icon" className="h-10 w-10 shrink-0" />}>
                  <SlidersHorizontal className="w-4 h-4" />
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl px-4 pt-6 pb-8">
                  <SheetHeader className="p-0 pb-0 text-left">
                    <SheetTitle>Filter & Sort</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-2">
                    <div className="w-full">
                      <Label className="text-xs mb-1.5 block text-muted-foreground">Filter by Type</Label>
                      <Select value={filterType} onValueChange={(val) => setFilterType(val || "")}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Types</SelectItem>
                          <SelectItem value="MAIN">Main Hub</SelectItem>
                          <SelectItem value="SITE">Site Storage</SelectItem>
                          <SelectItem value="TRANSIT">Transit Point</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full">
                      <Label className="text-xs mb-1.5 block text-muted-foreground">Filter by Status</Label>
                      <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || "")}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Statuses</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                          <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full">
                      <Label className="text-xs mb-1.5 block text-muted-foreground">Sort By</Label>
                      <Select value={sortBy} onValueChange={(val) => setSortBy(val || "")}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                          <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                          <SelectItem value="code-asc">Code (A-Z)</SelectItem>
                          <SelectItem value="code-desc">Code (Z-A)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <Button size="icon" className="shrink-0 h-10 w-10" onClick={openCreateDialog}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Desktop Filters */}
          <div className="hidden sm:flex gap-4">
            <div className="w-[150px]">
              <Label className="text-xs mb-1.5 block text-muted-foreground">Filter by Type</Label>
              <Select value={filterType} onValueChange={(val) => setFilterType(val || "")}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="MAIN">Main Hub</SelectItem>
                  <SelectItem value="SITE">Site Storage</SelectItem>
                  <SelectItem value="TRANSIT">Transit Point</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[150px]">
              <Label className="text-xs mb-1.5 block text-muted-foreground">Filter by Status</Label>
              <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || "")}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Label className="text-xs mb-1.5 block text-muted-foreground">Sort By</Label>
              <Select value={sortBy} onValueChange={(val) => setSortBy(val || "")}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="code-asc">Code (A-Z)</SelectItem>
                  <SelectItem value="code-desc">Code (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Items Notification Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-3 rounded-lg animate-fade-in">
          <span className="text-sm font-medium text-primary">
            {selectedIds.length} warehouse dipilih
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Batal Pilih
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              Hapus ({selectedIds.length})
            </Button>
          </div>
        </div>
      )}

      <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        {loading ? (
          <div className="p-8 text-center flex flex-col items-center bg-card border rounded-xl ">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading warehouses...</p>
          </div>
        ) : warehouses.length > 0 ? (
          <>
            {/* MOBILE COMPACT LIST VIEW */}
            <div className="block sm:hidden w-full space-y-[5px]">
              {currentPageWarehouses.map((w) => {
                const isSelected = selectedIds.includes(w.id);
                return (
                  <div 
                    key={`mobile-wh-${w.id}`} 
                    className={`w-full p-3 bg-white dark:bg-card rounded-xl border ${isSelected ? 'border-primary/50 bg-primary/5' : 'border-neutral-200/60 dark:border-border/60'} shadow-xs flex flex-col justify-start items-start relative transition-colors`}
                  >
                    <div className="w-full flex justify-between items-start gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0 pr-6">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(w.id, !!checked)}
                          aria-label={`Select ${w.name}`}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-neutral-950 dark:text-foreground text-[16px] font-semibold leading-snug truncate">
                            {w.name}
                          </div>
                          <div className="text-neutral-500 dark:text-muted-foreground text-[13px] font-normal leading-4 truncate mt-0.5">
                            {w.code}
                          </div>
                        </div>
                      </div>
                      
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold leading-4 ${w.status === 'ACTIVE' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                          {w.status || 'ACTIVE'}
                        </div>
                      </div>
                    </div>

                    <div className="w-full pt-2 pl-6 flex items-center gap-1.5 text-neutral-500 dark:text-muted-foreground text-[13px] leading-4">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">{w.location || 'No location'}</span>
                    </div>

                    <div className="w-full pt-2.5 flex justify-between items-center">
                      <div className="flex items-center gap-1.5 pl-6">
                        <User className="size-3 shrink-0 text-muted-foreground" />
                        <span className="text-[13px] text-muted-foreground truncate max-w-[120px]">
                          {w.picName || <span className="italic text-[10px]">No PIC</span>}
                        </span>
                      </div>
                      <div className="flex gap-1">
                         <DropdownMenu>
                           <DropdownMenuTrigger render={
                             <button type="button" className="h-7 px-2 bg-white dark:bg-muted/40 hover:bg-neutral-100 dark:hover:bg-muted text-neutral-950 dark:text-foreground text-xs font-medium rounded-lg border border-neutral-200 dark:border-border inline-flex justify-center items-center gap-1 transition-colors shadow-xs">
                               <MoreHorizontal className="w-3 h-3" />
                             </button>
                           } />
                           <DropdownMenuContent align="end" className="w-auto min-w-[200px]">
                             <DropdownMenuItem onClick={() => openDetailDialog(w)}>
                               <Eye className="mr-2 h-4 w-4" />
                               <span>Lihat Detil</span>
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => openPicDialog(w)}>
                               <User className="mr-2 h-4 w-4 text-primary" />
                               <span>Assign / Ubah PIC</span>
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => openEditDialog(w)}>
                               <Pencil className="mr-2 h-4 w-4" />
                               <span>Edit Gudang</span>
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => openStockEntryDialog(w)}>
                               <SlidersHorizontal className="mr-2 h-4 w-4 text-primary" />
                               <span>Penyesuaian Stok (In / Out)</span>
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => { setDeleteId(w.id); setDeleteOpen(true); }} className="text-destructive">
                               <Trash2 className="mr-2 h-4 w-4" />
                               <span>Hapus</span>
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden sm:block">
            <Table className="whitespace-nowrap sm:whitespace-normal">
              <TableHeader className="hidden sm:table-header-group">
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={isAllCurrentPageSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all on current page"
                    />
                  </TableHead>
                  <TableHead className="w-[150px]">Code</TableHead>
                  <TableHead className="w-[250px]">Name</TableHead>
                  <TableHead className="w-[150px]">PIC</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="block sm:table-row-group">
                {currentPageWarehouses.map((w) => {
                  const isSelected = selectedIds.includes(w.id);
                  return (
                    <TableRow 
                      key={w.id} 
                      className={`transition-colors ${isSelected ? 'bg-muted/50' : ''}`}
                    >
                      <TableCell className="w-[40px] px-3 py-2 border-b border-border/50">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(w.id, !!checked)}
                          aria-label={`Select ${w.code}`}
                        />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell w-[150px] font-medium text-primary px-3 py-2 border-b border-border/50 break-words">
                        {w.code}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[250px] px-3 py-2 border-b border-border/50">
                        <div className="font-medium whitespace-normal">
                          <span 
                            className="line-clamp-2 leading-snug break-words"
                            title={w.name}
                          >
                            {w.name}
                          </span>
                        </div>
                        <div className="text-[13px] text-muted-foreground truncate max-w-[250px] mt-1" title={w.location}>
                          {w.location}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-3 py-2 border-b border-border/50">
                        {w.picId ? (
                          <div 
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openPicDialog(w)}
                            title="Klik untuk ubah penugasan PIC"
                          >
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-foreground">{w.picName}</span>
                              {w.picUser?.role ? (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 h-3.5 w-fit text-primary border-primary/30">
                                  {w.picUser.role.replace(/_/g, ' ')}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Akun Terhubung</span>
                              )}
                            </div>
                          </div>
                        ) : w.picName ? (
                          <div 
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openPicDialog(w)}
                            title="Klik untuk menghubungkan ke Akun Pengguna"
                          >
                            <div className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">{w.picName}</span>
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                Belum Terhubung Akun
                              </span>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openPicDialog(w)}
                            className="text-xs text-muted-foreground italic hover:text-primary hover:underline transition-colors flex items-center gap-1"
                          >
                            <span>+ Assign PIC</span>
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-3 py-2 border-b border-border/50">
                        <StatusBadge status={w.status} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-3 py-2 border-b border-border/50 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-auto min-w-[240px] px-1.5 py-1.5 whitespace-nowrap">
                            <DropdownMenuItem onClick={() => openDetailDialog(w)} className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Lihat Detil</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPicDialog(w)} className="cursor-pointer">
                              <User className="mr-2 h-4 w-4 text-primary" />
                              <span>Assign / Ubah PIC</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(w)} className="cursor-pointer">
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Edit Gudang</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openStockEntryDialog(w)} className="cursor-pointer">
                              <SlidersHorizontal className="mr-2 h-4 w-4 text-primary" />
                              <span>Penyesuaian Stok (In / Out)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setDeleteId(w.id); setDeleteOpen(true); }} className="cursor-pointer text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Hapus</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
            <DataTablePagination 
              totalItems={warehouses.length} 
              pageSize={pageSize} 
              currentPage={page} 
              onPageChange={setPage} 
              onPageSizeChange={setPageSize} 
            />
          </>
        ) : (
          <div className="text-center py-16 bg-card border rounded-xl ">
            <Warehouse className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No warehouses found</p>
            <Button variant="link" onClick={openCreateDialog} className="mt-2 text-[13px]">
              Create your first Warehouse
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-full sm:max-w-4xl md:max-w-5xl max-h-[82vh] flex flex-col gap-0 p-0 overflow-hidden rounded-xl border bg-popover shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b shrink-0 pr-12 bg-background/50">
              <DialogTitle className="text-lg font-bold">{editId ? 'Edit Warehouse' : 'New Warehouse'}</DialogTitle>
              <DialogDescription className="text-[13px] text-muted-foreground mt-0.5">
                {editId ? 'Perbarui informasi dan spesifikasi lokasi gudang.' : 'Tambahkan data lokasi gudang baru.'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="code" className="text-[13px] font-medium">Warehouse Code *</Label>
                  <Input 
                    id="code" 
                    placeholder="e.g. WH-JKT-01" 
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    required 
                    className="h-10 text-[13px]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name" className="text-[13px] font-medium">Warehouse Name *</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. Jakarta Central Hub" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required 
                    className="h-10 text-[13px]"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="location" className="text-[13px] font-medium">Location / Address</Label>
                  <Input 
                    id="location" 
                    placeholder="e.g. Jl. Sudirman No. 123" 
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="h-10 text-[13px]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="coordinates" className="text-[13px] font-medium">Coordinates (Lat, Long)</Label>
                  <Input 
                    id="coordinates" 
                    placeholder="e.g. -6.2234, 106.8463" 
                    value={formData.coordinates}
                    onChange={(e) => setFormData({...formData, coordinates: e.target.value})}
                    className="h-10 text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="type" className="text-[13px] font-medium">Type</Label>
                  <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val || "" })}>
                    <SelectTrigger className="h-10 text-[13px]">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MAIN" className="text-[13px]">Main Hub</SelectItem>
                      <SelectItem value="SITE" className="text-[13px]">Site Storage</SelectItem>
                      <SelectItem value="TRANSIT" className="text-[13px]">Transit Point</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="capacity" className="text-[13px] font-medium">Capacity (CBM)</Label>
                  <Input 
                    id="capacity" 
                    type="number"
                    placeholder="e.g. 5000" 
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                    className="h-10 text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="picSelect" className="text-[13px] font-medium">
                      PIC (Person In Charge) / Assign Akun User
                    </Label>
                    {formData.picId && (
                      <span className="text-[13px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Akun Terhubung
                      </span>
                    )}
                    {!formData.picId && formData.picName && (
                      <span className="text-[13px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                        Teks Lama (Belum Terhubung)
                      </span>
                    )}
                  </div>

                  <Select
                    value={formData.picId ? formData.picId : (formData.picName ? `LEGACY_${formData.picName}` : 'UNASSIGNED')}
                    onValueChange={(val) => {
                      if (!val || val === 'UNASSIGNED') {
                        setFormData({ ...formData, picId: '', picName: '' });
                      } else if (val.startsWith('LEGACY_')) {
                        // Tetap teks lama
                      } else {
                        const selected = usersList.find(u => u.id === val);
                        setFormData({
                          ...formData,
                          picId: val,
                          picName: selected?.name || ''
                        });
                      }
                    }}
                  >
                    <SelectTrigger id="picSelect" className="w-full h-10 text-[13px] bg-background">
                      <SelectValue placeholder="Pilih User sebagai PIC Gudang">
                        {formData.picId
                          ? (usersList.find(user => user.id === formData.picId)?.name || formData.picName)
                          : (formData.picName || null)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="UNASSIGNED" className="text-[13px]">
                        <span className="text-muted-foreground italic">-- Tanpa PIC (Kosongkan Penugasan) --</span>
                      </SelectItem>

                      {formData.picName && !formData.picId && (
                        <SelectItem value={`LEGACY_${formData.picName}`} className="text-[13px]">
                          <span>{formData.picName} (Teks Lama)</span>
                        </SelectItem>
                      )}

                      {usersList.map((u) => (
                        <SelectItem key={u.id} value={u.id} className="text-[13px]">
                          <div className="flex items-center justify-between w-full gap-4">
                            <span className="font-medium text-foreground">{u.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {u.role && (
                                <Badge variant="outline" className="text-[13px] px-1.5 py-0 font-normal">
                                  {u.role.replace(/_/g, ' ')}
                                </Badge>
                              )}
                              <span className="text-[13px] text-muted-foreground">({u.email})</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[13px] text-muted-foreground">
                    Pilih akun pengguna terdaftar untuk ditugaskan sebagai PIC gudang ini.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editId ? (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="status" className="text-[13px] font-medium">Status</Label>
                    <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val || "" })}>
                      <SelectTrigger className="h-10 text-[13px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE" className="text-[13px]">Active</SelectItem>
                        <SelectItem value="INACTIVE" className="text-[13px]">Inactive</SelectItem>
                        <SelectItem value="MAINTENANCE" className="text-[13px]">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : <div className="hidden md:block" />}
                
                <div className="flex flex-col gap-1.5 min-w-0">
                  <Label className="text-[13px] font-medium">Warehouse Evidence (Photo)</Label>
                  <div className="flex flex-col gap-2.5 min-w-0">
                    {!formData.evidence && (
                      <Button variant="outline" type="button" className="relative overflow-hidden cursor-pointer w-full sm:w-fit text-[13px] h-10">
                        {isUploading ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                        ) : (
                          <><Upload className="w-4 h-4 mr-2" /> Select File</>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={handleFileUpload} 
                          disabled={isUploading}
                        />
                      </Button>
                    )}
                    {formData.evidence && (
                      <div className="flex items-center justify-between p-2.5 border rounded-xl bg-card w-full shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border">
                            <img src={formData.evidence} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-[13px] font-medium truncate">{formData.evidence.split('/').pop()?.split('?')[0] || 'evidence_file'}</span>
                            <span className="text-[13px] text-muted-foreground uppercase">{formData.evidence.split('.').pop()?.split('?')[0] || 'IMG'} • File</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" type="button" onClick={() => setFormData({ ...formData, evidence: '' })} className="h-8 w-8 text-muted-foreground shrink-0">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2 pt-4 border-t">
                <Label className="text-[13px] font-medium">Assigned Projects</Label>
                <div className="text-[13px] text-muted-foreground mb-1">Pilih project yang menggunakan gudang ini.</div>
                
                <Popover>
                  <PopoverTrigger render={<Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10 text-[13px]" />}>
                    {formData.projectIds.length > 0 
                      ? `${formData.projectIds.length} project dipilih` 
                      : "Pilih project..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input 
                        placeholder="Cari project..." 
                        className="flex h-10 w-full rounded-md bg-transparent py-2 text-[13px] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-[220px] overflow-y-auto p-2">
                      {projectsList
                        .filter(p => 
                          (p.projectName || p.name || '').toLowerCase().includes(projectSearch.toLowerCase()) || 
                          (p.projectCode || p.code || '').toLowerCase().includes(projectSearch.toLowerCase())
                        )
                        .map(p => (
                          <label key={p.id} className="flex items-start gap-2 cursor-pointer rounded-md p-2 hover:bg-muted/50">
                            <Checkbox 
                              checked={formData.projectIds.includes(p.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({...formData, projectIds: [...formData.projectIds, p.id]});
                                } else {
                                  setFormData({...formData, projectIds: formData.projectIds.filter(id => id !== p.id)});
                                }
                              }}
                            />
                            <div className="grid gap-0.5 min-w-0">
                              <span className="text-[13px] font-medium leading-none truncate">{p.projectCode || p.code}</span>
                              <span className="text-[13px] text-muted-foreground truncate">{p.projectName || p.name}</span>
                            </div>
                          </label>
                      ))}
                      {projectsList.filter(p => (p.projectName || p.name || '').toLowerCase().includes(projectSearch.toLowerCase()) || (p.projectCode || p.code || '').toLowerCase().includes(projectSearch.toLowerCase())).length === 0 && (
                        <div className="p-4 text-center text-[13px] text-muted-foreground">Tidak ada project ditemukan.</div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {formData.projectIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {projectsList.filter(p => formData.projectIds.includes(p.id)).map(p => (
                      <Badge key={p.id} variant="secondary" className="px-2.5 py-1 text-[13px] font-medium">
                        {p.projectCode || p.code}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="shrink-0 mx-0 mb-0 mt-0 p-0 px-6 py-3.5 border-t bg-muted/30 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting} className="text-[13px] h-9 px-4">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="text-[13px] h-9 px-4">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editId ? 'Save Changes' : 'Save Warehouse'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Single Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this warehouse? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus Banyak ({selectedIds.length} item)</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{selectedIds.length} warehouse</strong> yang dipilih? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Batal
            </Button>
            <Button type="button" variant="destructive" onClick={confirmBulkDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus Semua ({selectedIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Evidence Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              Evidence / Foto Gudang
            </div>
            {previewImage && (
              <Button 
                variant="outline" 
                size="sm" 
                render={<a href={previewImage} target="_blank" rel="noreferrer" />} 
                nativeButton={false}
                className="flex items-center gap-1.5 text-xs h-8"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Buka Tab Baru
              </Button>
            )}
          </div>
          <div className="bg-muted/50 p-4 flex items-center justify-center min-h-[300px] max-h-[75vh] overflow-auto">
            {previewImage && (
              <img src={previewImage} alt="Preview" className="max-w-full max-h-[70vh] rounded-lg shadow-sm border object-contain bg-background" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 1. Modal Lihat Detil Gudang */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="w-full sm:max-w-4xl md:max-w-5xl max-h-[82vh] flex flex-col gap-0 p-0 overflow-hidden rounded-xl border bg-popover shadow-2xl">
          {selectedWarehouseDetail && (
            <>
              <DialogHeader className="px-6 py-4 border-b shrink-0 pr-12 bg-background/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-xl font-bold tracking-tight">
                      {selectedWarehouseDetail.name}
                    </DialogTitle>
                    <StatusBadge status={selectedWarehouseDetail.status} />
                    <Badge variant="secondary" className="text-[13px] py-0.5">
                      {selectedWarehouseDetail.type === 'MAIN' ? 'Main Hub' : (selectedWarehouseDetail.type === 'SITE' ? 'Site Storage' : 'Transit Point')}
                    </Badge>
                  </div>
                  <DialogDescription className="text-[13px] text-muted-foreground flex items-center gap-2 flex-wrap pt-0.5">
                    <span className="font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                      {selectedWarehouseDetail.code}
                    </span>
                    <span>•</span>
                    <span>
                      Dibuat: {selectedWarehouseDetail.createdAt ? new Date(selectedWarehouseDetail.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </span>
                    {loadingDetail && (
                      <span className="flex items-center gap-1 text-[13px] text-muted-foreground ml-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Menyinkronkan...
                      </span>
                    )}
                  </DialogDescription>
                </div>
              </DialogHeader>

              {/* Scrollable area */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
                {/* Ringkasan Metrik Cepat */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-muted/30 rounded-xl border border-border/50">
                    <div className="text-[13px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <Package className="w-4 h-4 text-primary" /> Total Material
                    </div>
                    <div className="text-xl font-bold text-foreground">
                      {selectedWarehouseDetail.totalMaterials || 0}
                    </div>
                    <div className="text-[13px] text-muted-foreground mt-0.5">Varian item material</div>
                  </div>

                  <div className="p-3.5 bg-muted/30 rounded-xl border border-border/50">
                    <div className="text-[13px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <PackagePlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Total Stok Fisik
                    </div>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {(selectedWarehouseDetail.totalStock || 0).toLocaleString()}
                    </div>
                    <div className="text-[13px] text-muted-foreground mt-0.5">Kuantitas agregat stok</div>
                  </div>

                  <div className="p-3.5 bg-muted/30 rounded-xl border border-border/50">
                    <div className="text-[13px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <Warehouse className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Daya Tampung
                    </div>
                    <div className="text-xl font-bold text-foreground">
                      {selectedWarehouseDetail.capacity ? `${Number(selectedWarehouseDetail.capacity).toLocaleString()} CBM` : '-'}
                    </div>
                    <div className="text-[13px] text-muted-foreground mt-0.5">Kapasitas volume gudang</div>
                  </div>
                </div>

                {/* Lokasi & PIC Berdampingan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Lokasi & Koordinat */}
                  <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Lokasi & Geotag
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-start gap-2.5">
                          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] text-muted-foreground">Alamat / Lokasi Fisik:</div>
                            <div className="text-[13px] font-medium text-foreground mt-0.5 break-words">
                              {selectedWarehouseDetail.location || <span className="italic text-muted-foreground">Tidak ada alamat spesifik</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedWarehouseDetail.coordinates && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-border/40 mt-3">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-[13px] font-mono text-muted-foreground">
                            {selectedWarehouseDetail.coordinates}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-[13px] gap-1.5 px-3"
                          render={
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedWarehouseDetail.coordinates)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          }
                          nativeButton={false}
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Buka Google Maps
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Person In Charge (PIC) */}
                  <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Penanggung Jawab (PIC)
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[13px] text-primary hover:text-primary hover:bg-primary/10 gap-1.5 px-2.5"
                          onClick={() => {
                            openPicDialog(selectedWarehouseDetail);
                          }}
                        >
                          <User className="w-3.5 h-3.5" /> Ubah PIC
                        </Button>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {selectedWarehouseDetail.picId ? (
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[13px] font-semibold text-foreground">
                                  {selectedWarehouseDetail.picName || selectedWarehouseDetail.picUser?.name}
                                </span>
                                {selectedWarehouseDetail.picUser?.role && (
                                  <Badge variant="outline" className="text-[13px] py-0.5 px-2 text-primary border-primary/30">
                                    {selectedWarehouseDetail.picUser.role.replace(/_/g, ' ')}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[13px] text-muted-foreground mt-0.5">
                                {selectedWarehouseDetail.picUser?.email || 'Akun pengguna terhubung'}
                              </div>
                            </div>
                          ) : selectedWarehouseDetail.picName ? (
                            <div>
                              <span className="text-[13px] font-semibold text-foreground">
                                {selectedWarehouseDetail.picName}
                              </span>
                              <div className="text-[13px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                                Nama tercatat manual (Belum terhubung akun pengguna)
                              </div>
                            </div>
                          ) : (
                            <div className="text-[13px] text-muted-foreground italic">
                              Belum ada PIC yang ditugaskan untuk gudang ini.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proyek Terkait & Foto Dokumentasi Berdampingan */}
                <div className={cn(
                  "grid gap-4",
                  selectedWarehouseDetail.evidence ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                )}>
                  {/* Proyek Terkait */}
                  <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3">
                    <div className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Proyek Terkait ({selectedWarehouseDetail.projects?.length || 0})
                    </div>
                    {selectedWarehouseDetail.projects && selectedWarehouseDetail.projects.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedWarehouseDetail.projects.map((p: any) => (
                          <Badge key={p.id} variant="secondary" className="px-2.5 py-1 text-[13px]">
                            <span className="font-semibold text-primary mr-1">{p.code}</span>
                            {p.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[13px] text-muted-foreground italic">
                        Belum ada proyek yang dikaitkan dengan gudang ini.
                      </div>
                    )}
                  </div>

                  {/* Evidence Foto Gudang (Jika ada) */}
                  {selectedWarehouseDetail.evidence && (
                    <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3">
                      <div className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Foto Dokumentasi Gudang
                      </div>
                      <div 
                        className="relative w-full h-44 rounded-lg overflow-hidden border border-border cursor-pointer group bg-muted/20"
                        onClick={() => setPreviewImage(selectedWarehouseDetail.evidence)}
                      >
                        <img
                          src={selectedWarehouseDetail.evidence}
                          alt={selectedWarehouseDetail.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[13px] gap-1.5 font-medium">
                          <Eye className="w-4 h-4" /> Klik untuk memperbesar foto
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <DialogFooter className="shrink-0 mx-0 mb-0 mt-0 p-0 px-6 py-3.5 border-t bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/warehouse/${selectedWarehouseDetail.id}`)}
                  className="w-full sm:w-auto text-[13px] h-9 gap-1.5 px-3"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  Buka Halaman Inventaris Lengkap
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDetailModalOpen(false);
                      openStockEntryDialog(selectedWarehouseDetail);
                    }}
                    className="text-[13px] h-9 gap-1.5 px-3"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                    Penyesuaian Stok
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setDetailModalOpen(false);
                      openEditDialog(selectedWarehouseDetail);
                    }}
                    className="text-[13px] h-9 gap-1.5 px-3"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Gudang
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. Modal Assign / Ubah PIC Gudang */}
      <Dialog open={picModalOpen} onOpenChange={setPicModalOpen}>
        <DialogContent className="w-full sm:max-w-4xl max-h-[82vh] flex flex-col gap-0 p-0 overflow-hidden rounded-xl border bg-popover shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b shrink-0 pr-12 bg-background/50">
            <DialogTitle className="text-lg font-bold">
              Assign / Ubah PIC Gudang
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground mt-0.5">
              Tugaskan akun pengguna sebagai Person In Charge (PIC) untuk gudang ini.
            </DialogDescription>
          </DialogHeader>

          {selectedWarehousePic && (
            <div className="px-6 py-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
              <div className="p-4 bg-muted/40 rounded-xl border border-border/50 text-[13px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-semibold text-foreground text-[13px]">
                    {selectedWarehousePic.name}
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 flex-wrap text-[13px]">
                    <span className="font-mono text-primary font-medium">{selectedWarehousePic.code}</span>
                    {selectedWarehousePic.location && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-md">{selectedWarehousePic.location}</span>
                      </>
                    )}
                  </div>
                </div>
                {selectedWarehousePic.picName && (
                  <div className="text-[13px] sm:text-right shrink-0">
                    <span className="text-muted-foreground block text-[13px]">PIC Saat Ini:</span>
                    <span className="font-medium text-foreground text-[13px]">{selectedWarehousePic.picName}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="picModalSelect" className="text-[13px] font-medium text-foreground">
                  Pilih Akun Pengguna (PIC)
                </Label>
                <Select
                  value={selectedPicId}
                  onValueChange={(val) => setSelectedPicId(val || 'UNASSIGNED')}
                >
                  <SelectTrigger id="picModalSelect" className="w-full h-10 text-[13px] bg-background">
                    <SelectValue placeholder="Pilih user sebagai PIC...">
                      {selectedPicId === 'UNASSIGNED'
                        ? <span className="text-muted-foreground italic">-- Tanpa PIC (Kosongkan Penugasan) --</span>
                        : selectedPicId.startsWith('LEGACY_')
                        ? <span>{selectedWarehousePic.picName} (Teks Manual Lama)</span>
                        : (usersList.find(u => u.id === selectedPicId)?.name || 'Pilih user...')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    <SelectItem value="UNASSIGNED" className="text-[13px]">
                      <span className="text-muted-foreground italic">-- Tanpa PIC (Kosongkan Penugasan) --</span>
                    </SelectItem>

                    {selectedWarehousePic.picName && !selectedWarehousePic.picId && (
                      <SelectItem value={`LEGACY_${selectedWarehousePic.picName}`} className="text-[13px]">
                        <span>{selectedWarehousePic.picName} (Teks Manual Lama)</span>
                      </SelectItem>
                    )}

                    {usersList.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-[13px]">
                        <div className="flex items-center justify-between w-full gap-3">
                          <span className="font-medium text-foreground">{u.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {u.role && (
                              <Badge variant="outline" className="text-[13px] px-1.5 py-0 font-normal">
                                {u.role.replace(/_/g, ' ')}
                              </Badge>
                            )}
                            <span className="text-[13px] text-muted-foreground">({u.email})</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[13px] text-muted-foreground mt-1">
                  PIC bertanggung jawab atas operasional dan logistik material di gudang ini.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="shrink-0 mx-0 mb-0 mt-0 p-0 px-6 py-3.5 border-t bg-muted/30 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPicModalOpen(false)}
              disabled={isSubmittingPic}
              className="text-[13px] h-9 px-4"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSavePic}
              disabled={isSubmittingPic}
              className="text-[13px] h-9 px-4"
            >
              {isSubmittingPic && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Simpan PIC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <ManualStockEntryModal 
        isOpen={stockEntryOpen}
        onClose={() => setStockEntryOpen(false)}
        warehouseId={stockEntryWarehouseId}
        warehouseName={warehouses.find(w => w.id === stockEntryWarehouseId)?.name}
        onSuccess={() => {
          fetchWarehouses();
        }}
      />
    </div>
  );
}
