'use client';

import { useEffect, useState } from 'react';
import { Building2, Search, Plus, Loader2, Pencil, Trash2, SlidersHorizontal } from 'lucide-react';
import api from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExcelImportExport } from '@/components/ExcelImportExport';
import { toast } from 'sonner';
import { DataTablePagination } from '@/components/shared/DataTablePagination';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('name-asc');
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [formData, setFormData] = useState({
    vendorCode: '',
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    isActive: true
  });

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/vendors', { params: { search, status: filterStatus, sort: sortBy } });
      setVendors(data.data || []);
    } catch (e) { 
      console.error(e);
      toast.error('Failed to load vendors');
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchVendors();
    setPage(1);
    setSelectedIds([]);
  }, [search, filterStatus, sortBy]);

  const currentPageVendors = vendors.slice((page - 1) * pageSize, page * pageSize);
  const currentPageIds = currentPageVendors.map(v => v.id);

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
    setFormData({ vendorCode: '', name: '', contactPerson: '', email: '', phone: '', address: '', isActive: true });
    setIsOpen(true);
  };

  const openEditDialog = (vendor: any) => {
    setEditId(vendor.id);
    setFormData({
      vendorCode: vendor.vendorCode,
      name: vendor.name,
      contactPerson: vendor.contactPerson || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      isActive: vendor.isActive,
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editId) {
        await api.put('/api/vendors', { id: editId, ...formData });
      } else {
        await api.post('/api/vendors', formData);
      }
      setIsOpen(false);
      fetchVendors();
      toast.success(`Vendor ${editId ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving vendor:', error);
      toast.error('Failed to save Vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/api/vendors?id=${deleteId}`);
      setDeleteOpen(false);
      setSelectedIds(prev => prev.filter(id => id !== deleteId));
      fetchVendors();
      toast.success('Vendor deleted successfully');
    } catch (error) {
      console.error('Failed to delete vendor', error);
      toast.error('Failed to delete vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await api.delete('/api/vendors', { data: { ids: selectedIds } });
      toast.success(`Successfully deleted ${selectedIds.length} vendors`);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      fetchVendors();
    } catch (error: any) {
      console.error('Failed to bulk delete vendors', error);
      const errMsg = error.response?.data?.message || 'Failed to delete selected vendors';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/api/vendors/excel', formData, {
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

      fetchVendors();
    } catch (e: any) {
      console.error(e);
      const errMsg = e.response?.data?.message || 'Failed to import Excel';
      toast.error(errMsg);
    }
  };

  const handleExport = async () => {
    window.location.href = '/api/vendors/excel?action=export';
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/vendors/excel?action=template';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
        <div>
          <h1 className="text-[24px] font-medium">Vendor Master Data</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your network of suppliers and partners</p>
        </div>
        <div className="self-stretch bg-white dark:bg-card rounded-xl shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] outline outline-1 outline-offset-[-1px] outline-gray-200 dark:outline-gray-800 inline-flex flex-col justify-start items-start overflow-hidden">
          <div className="self-stretch px-6 pt-6 pb-8 flex flex-col justify-start items-start gap-2.5">
            <div className="self-stretch justify-start text-slate-600 dark:text-slate-400 text-[14px] font-normal font-['Inter'] leading-5">Total Vendor</div>
            <div className="justify-start text-gray-900 dark:text-gray-100 text-[18px] font-semibold font-['Inter'] leading-7">{vendors.length}</div>
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
                className="gap-2 h-9"
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
                placeholder="Search vendor code or name..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background h-auto py-[10px] text-[16px]"
              />
            </div>
            
            {/* Mobile Filters Drawer Trigger */}
            <div className="block sm:hidden shrink-0">
              <Sheet>
                <SheetTrigger render={<Button variant="outline" size="icon" className="h-[46px] w-[46px] shrink-0" />}>
                  <SlidersHorizontal className="w-4 h-4" />
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl px-4 pt-6 pb-8">
                  <SheetHeader className="p-0 pb-0 text-left">
                    <SheetTitle>Filter & Sort</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-2">
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
            <Button size="icon" className="shrink-0 h-[46px] w-[46px]" onClick={openCreateDialog}>
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          <div className="hidden sm:flex gap-4">
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
            {selectedIds.length} vendor dipilih
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
            <p className="text-muted-foreground">Loading vendors...</p>
          </div>
        ) : vendors.length > 0 ? (
          <>
            {/* MOBILE COMPACT LIST VIEW */}
            <div className="block sm:hidden w-full space-y-[5px]">
              {currentPageVendors.map((v) => {
                const isSelected = selectedIds.includes(v.id);
                return (
                  <div 
                    key={`mobile-v-${v.id}`} 
                    className={`w-full p-3 bg-white dark:bg-card rounded-xl border ${isSelected ? 'border-primary/50 bg-primary/5' : 'border-neutral-200/60 dark:border-border/60'} shadow-xs flex flex-col justify-start items-start relative transition-colors`}
                  >
                    <div className="w-full flex justify-between items-start gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0 pr-6">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(v.id, !!checked)}
                          aria-label={`Select ${v.name}`}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-neutral-950 dark:text-foreground text-[16px] font-semibold leading-snug truncate">
                            {v.name}
                          </div>
                          <div className="text-neutral-500 dark:text-muted-foreground text-[13px] font-normal leading-4 truncate mt-0.5">
                            {v.vendorCode} {v.contactPerson ? `• ${v.contactPerson}` : ''}
                          </div>
                        </div>
                      </div>
                      
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold leading-4 ${v.isActive ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-600'}`}>
                          {v.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </div>
                      </div>
                    </div>

                    <div className="w-full pt-2 pl-6 flex flex-col gap-0.5 text-neutral-500 dark:text-muted-foreground text-[13px] leading-4">
                      {v.email && <div className="truncate">{v.email}</div>}
                      {v.phone && <div className="truncate">{v.phone}</div>}
                    </div>

                    <div className="w-full pt-2.5 flex justify-end items-center">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEditDialog(v)}
                          className="h-7 px-2 bg-white dark:bg-muted/40 hover:bg-neutral-100 dark:hover:bg-muted text-neutral-950 dark:text-foreground text-xs font-medium rounded-lg border border-neutral-200 dark:border-border inline-flex justify-center items-center gap-1 transition-colors shadow-xs"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDeleteId(v.id); setDeleteOpen(true); }}
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
                  <TableHead className="w-[150px]">Vendor Code</TableHead>
                  <TableHead className="w-[350px]">Vendor Name</TableHead>
                  <TableHead className="w-[200px]">Contact Person</TableHead>
                  <TableHead className="w-[200px]">Contact Info</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPageVendors.map((v) => {
                  const isSelected = selectedIds.includes(v.id);
                  return (
                    <TableRow 
                      key={v.id} 
                      className={`transition-colors ${isSelected ? 'bg-muted/50' : ''}`}
                    >
                      <TableCell className="w-[40px] px-3 py-2 border-b border-border/50">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(v.id, !!checked)}
                          aria-label={`Select ${v.vendorCode}`}
                        />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell w-[150px] font-medium text-primary px-3 py-2 border-b border-border/50 break-words">
                        {v.vendorCode}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[350px] px-3 py-2 border-b border-border/50 font-medium whitespace-normal">
                        <span 
                          className="line-clamp-2 leading-snug break-words"
                          title={v.name}
                        >
                          {v.name}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[200px] px-3 py-2 border-b border-border/50 whitespace-normal">
                        <span 
                          className="line-clamp-2 leading-snug break-words"
                          title={v.contactPerson || '-'}
                        >
                          {v.contactPerson || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-3 py-2 border-b border-border/50">
                        <div className="text-sm">
                          {v.email && <div className="truncate max-w-[200px]" title={v.email}>{v.email}</div>}
                          {v.phone && <div className="text-muted-foreground truncate max-w-[200px]" title={v.phone}>{v.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-3 py-2 border-b border-border/50">
                        {v.isActive ? (
                          <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 font-normal">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500 bg-gray-50 border-gray-200 font-normal">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-3 py-2 border-b border-border/50 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditDialog(v)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { setDeleteId(v.id); setDeleteOpen(true); }}>
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
              totalItems={vendors.length} 
              pageSize={pageSize} 
              currentPage={page} 
              onPageChange={setPage} 
              onPageSizeChange={setPageSize} 
            />
          </>
        ) : (
          <div className="text-center py-16 bg-card border rounded-xl ">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No vendors found</p>
            <Button variant="link" onClick={openCreateDialog} className="mt-2 text-[13px]">
              Register your first vendor
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl w-full max-w-full !bottom-0 !top-auto !left-0 !translate-x-0 !translate-y-0 sm:!top-1/2 sm:!left-1/2 sm:!-translate-x-1/2 sm:!-translate-y-1/2 !rounded-t-2xl !rounded-b-none sm:!rounded-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 mb-0">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
              <DialogDescription>{editId ? 'Update vendor information.' : 'Register a new supplier or partner.'}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="vendorCode">Vendor Code *</Label>
                  <Input 
                    id="vendorCode" 
                    placeholder="e.g. VND-001" 
                    value={formData.vendorCode}
                    onChange={(e) => setFormData({...formData, vendorCode: e.target.value})}
                    required 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Vendor Name *</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. PT Maju Jaya" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required 
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input 
                  id="contactPerson" 
                  placeholder="e.g. Budi Santoso" 
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email"
                    placeholder="e.g. contact@majujaya.com" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    placeholder="e.g. 021-1234567" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="address">Address</Label>
                <Textarea 
                  id="address" 
                  placeholder="Vendor's full address..." 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              {editId && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.isActive ? "ACTIVE" : "INACTIVE"} onValueChange={(val) => setFormData({...formData, isActive: val === "ACTIVE"})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editId ? 'Save Changes' : 'Save Vendor'}
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
              Are you sure you want to delete this vendor? This action cannot be undone.
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
              Apakah Anda yakin ingin menghapus <strong>{selectedIds.length} vendor</strong> yang dipilih? Tindakan ini tidak dapat dibatalkan.
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
    </div>
  );
}
