'use client';

import { useEffect, useState } from 'react';
import { Users, Search, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ExcelImportExport } from '@/components/ExcelImportExport';
import { toast } from 'sonner';
import { DataTablePagination } from '@/components/shared/DataTablePagination';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
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
    name: '',
    email: '',
    role: 'USER',
    isActive: true,
    password: ''
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/users', { params: { search } });
      setUsers(data.data || []);
    } catch (e) { 
      console.error(e);
      toast.error('Failed to load users');
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchUsers();
    setPage(1);
    setSelectedIds([]);
  }, [search]);

  const currentPageUsers = users.slice((page - 1) * pageSize, page * pageSize);
  const currentPageIds = currentPageUsers.map(u => u.id);

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
    setFormData({ name: '', email: '', role: 'USER', isActive: true, password: '' });
    setIsOpen(true);
  };

  const openEditDialog = (user: any) => {
    setEditId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      password: user.password || '',
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editId) {
        await api.put('/api/users', { id: editId, ...formData });
      } else {
        await api.post('/api/users', formData);
      }
      setIsOpen(false);
      fetchUsers();
      toast.success(`User ${editId ? 'updated' : 'created'} successfully`);
    } catch (error: any) {
      console.error('Error saving user:', error);
      const errMsg = error.response?.data?.message || 'Failed to save User';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/api/users?id=${deleteId}`);
      setDeleteOpen(false);
      setSelectedIds(prev => prev.filter(id => id !== deleteId));
      fetchUsers();
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Failed to delete user', error);
      toast.error('Failed to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await api.delete('/api/users', { data: { ids: selectedIds } });
      toast.success(`Successfully deleted ${selectedIds.length} users`);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Failed to bulk delete users', error);
      const errMsg = error.response?.data?.message || 'Failed to delete selected users';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/api/users/excel', formData, {
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

      fetchUsers();
    } catch (e: any) {
      console.error(e);
      const errMsg = e.response?.data?.message || 'Failed to import Excel';
      toast.error(errMsg);
    }
  };

  const handleExport = async () => {
    window.location.href = '/api/users/excel?action=export';
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/users/excel?action=template';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
        <div>
          <h1 className="text-[24px] font-medium">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage system access and roles</p>
        </div>
        <div className="self-stretch bg-white dark:bg-card rounded-xl shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] outline outline-1 outline-offset-[-1px] outline-gray-200 dark:outline-gray-800 inline-flex flex-col justify-start items-start overflow-hidden">
          <div className="self-stretch px-6 pt-6 pb-8 flex flex-col justify-start items-start gap-2.5">
            <div className="self-stretch justify-start text-slate-600 dark:text-slate-400 text-[14px] font-normal font-['Inter'] leading-5">Total User</div>
            <div className="justify-start text-gray-900 dark:text-gray-100 text-[18px] font-semibold font-['Inter'] leading-7">{users.length}</div>
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
            <Button
              onClick={openCreateDialog}
              className="gap-2 h-9 text-[13px]"
            >
              <Plus className="w-4 h-4" />
              Add User
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-end w-full">
          <div className="flex w-full sm:flex-1 gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search name or email..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background h-10 text-[13px]"
              />
            </div>
            <Button size="icon" className="shrink-0 h-10 w-10 sm:hidden" onClick={openCreateDialog}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Selected Items Notification Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-3 rounded-lg animate-fade-in">
          <span className="text-sm font-medium text-primary">
            {selectedIds.length} user dipilih
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
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        ) : users.length > 0 ? (
          <>
            {/* MOBILE COMPACT LIST VIEW */}
            <div className="block sm:hidden w-full space-y-[5px]">
              {currentPageUsers.map((u) => {
                const isSelected = selectedIds.includes(u.id);
                return (
                  <div 
                    key={`mobile-u-${u.id}`} 
                    className={`w-full p-3 bg-white dark:bg-card rounded-xl border ${isSelected ? 'border-primary/50 bg-primary/5' : 'border-neutral-200/60 dark:border-border/60'} shadow-xs flex flex-col justify-start items-start relative transition-colors`}
                  >
                    <div className="w-full flex justify-between items-start gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0 pr-6">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(u.id, !!checked)}
                          aria-label={`Select ${u.name}`}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-neutral-950 dark:text-foreground text-[16px] font-semibold leading-snug truncate">
                            {u.name}
                          </div>
                          <div className="text-neutral-500 dark:text-muted-foreground text-[13px] font-normal leading-4 truncate mt-0.5">
                            {u.email}
                          </div>
                        </div>
                      </div>
                      
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold leading-4 ${u.isActive ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-600'}`}>
                          {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </div>
                      </div>
                    </div>

                    <div className="w-full pt-2 pl-6 flex flex-col gap-0.5 text-neutral-500 dark:text-muted-foreground text-[13px] leading-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">Role:</span> {u.role}
                      </div>
                    </div>

                    <div className="w-full pt-2.5 flex justify-end items-center">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEditDialog(u)}
                          className="h-7 px-2 bg-white dark:bg-muted/40 hover:bg-neutral-100 dark:hover:bg-muted text-neutral-950 dark:text-foreground text-xs font-medium rounded-lg border border-neutral-200 dark:border-border inline-flex justify-center items-center gap-1 transition-colors shadow-xs"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDeleteId(u.id); setDeleteOpen(true); }}
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
                  <TableHead className="w-[350px]">Name</TableHead>
                  <TableHead className="w-[280px]">Email</TableHead>
                  <TableHead className="w-[150px]">Role</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPageUsers.map((u) => {
                  const isSelected = selectedIds.includes(u.id);
                  return (
                    <TableRow 
                      key={u.id} 
                      className={`transition-colors ${isSelected ? 'bg-muted/50' : ''}`}
                    >
                      <TableCell className="w-[40px] px-3 py-2 border-b border-border/50">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(u.id, !!checked)}
                          aria-label={`Select ${u.name}`}
                        />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[350px] font-medium px-3 py-2 border-b border-border/50 whitespace-normal">
                        <span 
                          className="line-clamp-2 leading-snug break-words"
                          title={u.name}
                        >
                          {u.name}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[280px] px-3 py-2 border-b border-border/50 whitespace-normal">
                        <span 
                          className="line-clamp-2 leading-snug break-words text-sm text-muted-foreground"
                          title={u.email}
                        >
                          {u.email}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-3 py-2 border-b border-border/50">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-none text-xs font-normal">
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-3 py-2 border-b border-border/50">
                        {u.isActive ? (
                          <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 font-normal">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500 bg-gray-50 border-gray-200 font-normal">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-3 py-2 border-b border-border/50 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditDialog(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { setDeleteId(u.id); setDeleteOpen(true); }}>
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
              totalItems={users.length} 
              pageSize={pageSize} 
              currentPage={page} 
              onPageChange={setPage} 
              onPageSizeChange={setPageSize} 
            />
          </>
        ) : (
          <div className="text-center py-16 bg-card border rounded-xl ">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No users found</p>
            <Button variant="link" onClick={openCreateDialog} className="mt-2 text-[13px]">
              Add a new user
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-full sm:max-w-xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden rounded-xl border bg-popover shadow-2xl text-[13px]">
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b shrink-0 pr-12 bg-background/50">
              <DialogTitle className="text-lg font-bold">{editId ? 'Edit User' : 'Add New User'}</DialogTitle>
              <DialogDescription className="text-[13px] text-muted-foreground mt-0.5">
                {editId ? 'Perbarui informasi akun pengguna.' : 'Daftarkan akun pengguna baru ke sistem.'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" className="text-[13px] font-medium">Full Name *</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. John Doe" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required 
                  className="h-10 text-[13px]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-[13px] font-medium">Email Address *</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="e.g. john@example.com" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required 
                  className="h-10 text-[13px]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-[13px] font-medium">Password {editId ? '(Opsional)' : '*'}</Label>
                <Input 
                  id="password" 
                  type="text" 
                  placeholder={editId ? "Isi untuk mengubah password" : "Password baru"} 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required={!editId}
                  className="h-10 text-[13px]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="role" className="text-[13px] font-medium">System Role</Label>
                  <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val || "" })}>
                    <SelectTrigger className="h-10 text-[13px]">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN" className="text-[13px]">Administrator</SelectItem>
                      <SelectItem value="DIREKTUR" className="text-[13px]">Direktur</SelectItem>
                      <SelectItem value="OWNER" className="text-[13px]">Owner</SelectItem>
                      <SelectItem value="PROJECT_MANAGER" className="text-[13px]">Project Manager</SelectItem>
                      <SelectItem value="SITE_MANAGER" className="text-[13px]">Site Manager</SelectItem>
                      <SelectItem value="PROCUREMENT" className="text-[13px]">Procurement</SelectItem>
                      <SelectItem value="LOGISTICS" className="text-[13px]">Logistics</SelectItem>
                      <SelectItem value="FINANCE" className="text-[13px]">Finance</SelectItem>
                      <SelectItem value="MANAGER" className="text-[13px]">Manager</SelectItem>
                      <SelectItem value="USER" className="text-[13px]">Standard User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editId && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="status" className="text-[13px] font-medium">Status</Label>
                    <Select value={formData.isActive ? "ACTIVE" : "INACTIVE"} onValueChange={(val) => setFormData({...formData, isActive: val === "ACTIVE"})}>
                      <SelectTrigger className="h-10 text-[13px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE" className="text-[13px]">Active</SelectItem>
                        <SelectItem value="INACTIVE" className="text-[13px]">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="shrink-0 mx-0 mb-0 mt-0 p-0 px-6 py-3.5 border-t bg-muted/30 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" className="text-[13px] h-9 px-4" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" className="text-[13px] h-9 px-4" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editId ? 'Save Changes' : 'Save User'}
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
              Are you sure you want to delete this user? This action cannot be undone.
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
              Apakah Anda yakin ingin menghapus <strong>{selectedIds.length} user</strong> yang dipilih? Tindakan ini tidak dapat dibatalkan.
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
