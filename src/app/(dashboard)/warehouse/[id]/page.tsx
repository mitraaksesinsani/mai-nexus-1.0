'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Warehouse as WarehouseIcon, MapPin, Package, AlertTriangle 
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTablePagination } from '@/components/shared/DataTablePagination';

import { MaterialLogModal } from '@/components/warehouse/MaterialLogModal';

export default function WarehouseDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [warehouse, setWarehouse] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [selectedLogMaterial, setSelectedLogMaterial] = useState<any>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const [whRes, stockRes] = await Promise.all([
          api.get(`/api/warehouse/${id}`),
          api.get(`/api/inventory/stocks?warehouseId=${id}`)
        ]);
        
        setWarehouse(whRes.data.data);
        setMaterials(stockRes.data.data || []);
      } catch (error) {
        console.error('Failed to fetch warehouse details', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) fetchDetails();
  }, [id]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-semibold">Warehouse Not Found</h2>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const filteredMaterials = materials.filter(m => 
    m.materialName?.toLowerCase().includes(search.toLowerCase()) || 
    m.materialCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.push('/warehouse')}
            title="Back to Warehouses"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {warehouse.name}
            </h1>
            <Badge variant="outline" className={`font-semibold text-xs ${warehouse.status === 'ACTIVE' ? 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800' : 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800'}`}>
              {warehouse.status || 'ACTIVE'}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {warehouse.type || 'MAIN'}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1 flex-wrap">
            <WarehouseIcon className="w-3.5 h-3.5 shrink-0" /> {warehouse.code} &bull; <MapPin className="w-3.5 h-3.5 shrink-0 ml-1" /> {warehouse.location}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouse.totalMaterials || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Different items stored</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouse.totalStock?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total physical items</p>
          </CardContent>
        </Card>
      </div>

      {/* Associated Projects */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <WarehouseIcon className="w-4 h-4 text-primary" /> Associated Projects
          </CardTitle>
          <CardDescription>Projects that have used or are using materials from this warehouse.</CardDescription>
        </CardHeader>
        <CardContent>
          {warehouse.projects && warehouse.projects.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {warehouse.projects.map((p: any) => (
                <Badge key={p.id} variant="outline" className="px-3 py-1 bg-primary/5 text-primary">
                  {p.code} - {p.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground pt-2">No projects have used this warehouse yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Materials List */}
      <Card className="border-none shadow-none bg-transparent sm:bg-card ring-0">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 px-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> Stored Materials
            </CardTitle>
            <CardDescription>All materials currently in stock at this warehouse.</CardDescription>
          </div>
          <Input 
            type="search" 
            placeholder="Search material..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-[250px]"
          />
        </CardHeader>
        <CardContent className="px-0">
          {filteredMaterials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No materials found in this warehouse.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View (>= sm) */}
              <div className="hidden sm:block border rounded-xl bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Code</TableHead>
                      <TableHead>Material Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right w-[160px]">Available Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.slice((page - 1) * pageSize, page * pageSize).map((mat: any, i: number) => (
                      <TableRow 
                        key={i} 
                        className="cursor-pointer hover:bg-muted/60 transition-colors"
                        onClick={() => {
                          setSelectedLogMaterial(mat);
                          setIsLogModalOpen(true);
                        }}
                      >
                        <TableCell className="font-medium text-primary font-mono">{mat.materialCode}</TableCell>
                        <TableCell className="font-medium">{mat.materialName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal text-xs">{mat.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-base text-primary">
                          {Number(mat.quantity).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List View (width <= 390px / < sm) */}
              <div className="block sm:hidden divide-y divide-border/60 border rounded-xl overflow-hidden bg-card">
                {filteredMaterials.slice((page - 1) * pageSize, page * pageSize).map((mat: any, i: number) => (
                  <div 
                    key={`mobile-mat-${i}`} 
                    className="p-3.5 space-y-2 bg-card hover:bg-muted/30 transition-colors cursor-pointer active:bg-muted/50"
                    onClick={() => {
                      setSelectedLogMaterial(mat);
                      setIsLogModalOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm text-foreground break-words leading-snug">
                          {mat.materialName}
                        </h4>
                        <p className="text-xs text-primary font-mono mt-0.5 font-medium">
                          {mat.materialCode}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-base font-bold text-primary block">
                          {Number(mat.quantity).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">
                          Available
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs border-t border-border/40">
                      <div>
                        {mat.category ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                            {mat.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">-</span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Tap to view log &rarr;
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <DataTablePagination 
                totalItems={filteredMaterials.length} 
                pageSize={pageSize} 
                currentPage={page} 
                onPageChange={setPage} 
                onPageSizeChange={setPageSize} 
              />
            </div>
          )}
        </CardContent>
      </Card>

      {selectedLogMaterial && (
        <MaterialLogModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          warehouseId={id as string}
          materialId={selectedLogMaterial.materialId}
          materialCode={selectedLogMaterial.materialCode}
          materialName={selectedLogMaterial.materialName}
        />
      )}
    </div>
  );
}
