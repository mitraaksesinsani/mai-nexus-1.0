'use client';

import { useEffect, useState } from 'react';
import { 
  FileText, Search, Calendar, Filter, Eye, Printer, 
  User, Warehouse, Clock, FileCheck,
  ExternalLink, Download, ShieldCheck, UserCheck
} from 'lucide-react';
import api from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function RfcHistoryLogPage() {
  const { user } = useAuth();
  const [rfcs, setRfcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canViewAll, setCanViewAll] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Evidence preview dialog
  const [previewEvidenceUrl, setPreviewEvidenceUrl] = useState<string | null>(null);
  const [previewRfcNumber, setPreviewRfcNumber] = useState<string>('');

  useEffect(() => {
    fetchHistoryLog();
    setPage(1);
  }, [search, status, startDate, endDate]);

  const fetchHistoryLog = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/rfc/log', {
        params: { search, status, startDate, endDate, limit: 300 }
      });
      setRfcs(data.data || []);
      setCanViewAll(!!data.canViewAll);
    } catch (error) {
      console.error('Failed to fetch RFC history log:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatus('ALL');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">RFC History Log</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Arsip dan riwayat pemrosesan dokumen Request for Consumption (RFC) yang telah selesai atau ditolak.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canViewAll ? (
            <Badge variant="outline" className="px-3 py-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Management Full Audit Access
            </Badge>
          ) : (
            <Badge variant="outline" className="px-3 py-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 gap-1.5 font-medium">
              <UserCheck className="w-3.5 h-3.5" />
              My Processed RFCs Only
            </Badge>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-card/60 rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search RFC No, Project, Warehouse, Receiver..."
              className="pl-9 bg-card w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="md:col-span-3">
            <Select 
              value={status} 
              onValueChange={(val) => setStatus(val || 'ALL')}
              items={[
                { value: 'ALL', label: 'All Concluded Status' },
                { value: 'COMPLETED', label: 'Completed (Handed Over)' },
                { value: 'REJECTED', label: 'Rejected' },
              ]}
            >
              <SelectTrigger className="w-full bg-card">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Concluded Status</SelectItem>
                <SelectItem value="COMPLETED">Completed (Handed Over)</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-4 flex gap-2">
            <div className="flex-1 min-w-[120px]">
              <DatePicker
                value={startDate || undefined}
                onChange={(val) => setStartDate(val || '')}
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <DatePicker
                value={endDate || undefined}
                onChange={(val) => setEndDate(val || '')}
              />
            </div>
          </div>

          <div className="md:col-span-1">
            <Button variant="ghost" size="sm" onClick={resetFilters} className="w-full text-muted-foreground">
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="border border-border/40 rounded-xl bg-card shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground text-sm">Loading RFC history logs...</p>
          </div>
        ) : rfcs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-base text-foreground">No History Logs Found</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
              Belum ada riwayat proses RFC yang selesai atau sesuai filter pencarian Anda.
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <Table className="min-w-[1100px] w-full">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[180px]">RFC Number</TableHead>
                    <TableHead className="w-[130px]">Status</TableHead>
                    <TableHead className="w-[220px]">Project & Warehouse</TableHead>
                    <TableHead className="w-[160px]">Requestor</TableHead>
                    <TableHead className="w-[160px]">Timeline</TableHead>
                    <TableHead className="w-[180px]">Material Handover</TableHead>
                    <TableHead className="w-[110px] text-center">Evidence</TableHead>
                    <TableHead className="w-[130px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rfcs.slice((page - 1) * pageSize, page * pageSize).map((rfc) => (
                    <TableRow key={rfc.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="font-semibold text-primary text-sm flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>{rfc.rfcNumber}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {rfc.itemsCount || 0} item(s) requested
                        </span>
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={rfc.status} />
                      </TableCell>

                      <TableCell>
                        <div className="font-medium text-sm text-foreground truncate max-w-[200px]" title={rfc.projectName}>
                          {rfc.projectName || '-'}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate max-w-[200px]" title={rfc.warehouseName}>
                          <Warehouse className="w-3 h-3 shrink-0" />
                          <span>{rfc.warehouseName || '-'}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-medium text-sm flex items-center gap-1">
                          <User className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[140px]">{rfc.requestorName || '-'}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground capitalize">
                          {rfc.requestorRole?.toLowerCase().replace(/_/g, ' ') || 'User'}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs text-foreground font-medium">
                          Created: {formatDate(rfc.createdAt)}
                        </div>
                        {rfc.completedAt && (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                            Concluded: {formatDate(rfc.completedAt)}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        {rfc.takerName ? (
                          <div>
                            <div className="text-sm font-medium text-foreground truncate max-w-[160px]" title={rfc.takerName}>
                              {rfc.takerName}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {rfc.takerDate ? formatDate(rfc.takerDate) : '-'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        {rfc.evidenceDocument ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 hover:bg-primary/10 hover:text-primary"
                            onClick={() => {
                              setPreviewEvidenceUrl(rfc.evidenceDocument);
                              setPreviewRfcNumber(rfc.rfcNumber);
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Bukti
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">None</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/rfc/${rfc.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View RFC Details">
                              <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </Link>
                          <Link href={`/print/rfc/${rfc.id}`} target="_blank">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Print Document">
                              <Printer className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card List View (width <= 390px / < sm) */}
            <div className="block sm:hidden divide-y divide-border/60">
              {rfcs.slice((page - 1) * pageSize, page * pageSize).map((rfc) => (
                <div key={`mobile-${rfc.id}`} className="p-4 space-y-3 bg-card hover:bg-muted/30 transition-colors">
                  {/* Top: RFC Number & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/rfc/${rfc.id}`} className="font-semibold text-sm text-primary hover:underline flex items-center gap-1.5 leading-snug">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span>{rfc.rfcNumber}</span>
                      </Link>
                      <span className="text-[11px] text-muted-foreground">
                        {rfc.itemsCount || 0} item(s) requested
                      </span>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={rfc.status} />
                    </div>
                  </div>

                  {/* Middle: Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-lg border border-border/40">
                    <div className="col-span-2">
                      <span className="text-[10px] block text-muted-foreground/80 uppercase font-semibold">Project</span>
                      <span className="font-medium text-foreground truncate block" title={rfc.projectName}>
                        {rfc.projectName || '-'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] block text-muted-foreground/80 uppercase font-semibold">Warehouse</span>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate" title={rfc.warehouseName}>
                        <Warehouse className="w-3 h-3 shrink-0" />
                        <span className="truncate">{rfc.warehouseName || '-'}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] block text-muted-foreground/80 uppercase font-semibold">Requestor</span>
                      <div className="text-xs flex items-center gap-1 mt-0.5 truncate">
                        <User className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{rfc.requestorName || '-'}</span>
                      </div>
                    </div>

                    <div className="col-span-2 pt-1.5 border-t border-border/30 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Created:</span>
                        <span className="font-medium text-foreground">{formatDate(rfc.createdAt)}</span>
                      </div>
                      {rfc.completedAt && (
                        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                          <span>Concluded:</span>
                          <span className="font-medium">{formatDate(rfc.completedAt)}</span>
                        </div>
                      )}
                      {rfc.takerName && (
                        <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/20">
                          <span>Handover To:</span>
                          <span className="font-medium text-foreground truncate max-w-[170px]" title={rfc.takerName}>
                            {rfc.takerName} {rfc.takerDate ? `(${formatDate(rfc.takerDate)})` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Evidence & Actions */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <div>
                      {rfc.evidenceDocument ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary"
                          onClick={() => {
                            setPreviewEvidenceUrl(rfc.evidenceDocument);
                            setPreviewRfcNumber(rfc.rfcNumber);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Bukti
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground/60 italic pl-1">No Evidence</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link href={`/print/rfc/${rfc.id}`} target="_blank">
                        <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1" title="Print Document">
                          <Printer className="h-3.5 w-3.5" />
                          Print
                        </Button>
                      </Link>
                      <Link href={`/rfc/${rfc.id}`}>
                        <Button variant="default" size="sm" className="h-8 px-2.5 text-xs gap-1" title="View RFC Details">
                          <Eye className="h-3.5 w-3.5" />
                          Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t">
              <DataTablePagination
                currentPage={page}
                pageSize={pageSize}
                totalItems={rfcs.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        )}
      </div>

      {/* Evidence Document Preview Dialog */}
      <Dialog open={!!previewEvidenceUrl} onOpenChange={(open) => !open && setPreviewEvidenceUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" />
              Bukti Serah Terima Material ({previewRfcNumber})
            </DialogTitle>
            <DialogDescription>
              Dokumen atau foto fisik yang diunggah saat serah terima material di gudang.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 flex items-center justify-center bg-muted/20 rounded-lg p-2 overflow-hidden border">
            {previewEvidenceUrl && (
              previewEvidenceUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                <img
                  src={previewEvidenceUrl}
                  alt={`Evidence ${previewRfcNumber}`}
                  className="max-h-[500px] w-auto object-contain rounded"
                />
              ) : (
                <div className="p-8 text-center space-y-3">
                  <FileText className="w-12 h-12 text-primary mx-auto" />
                  <p className="text-sm font-medium">Dokumen Bukti Serah Terima</p>
                  <a
                    href={previewEvidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary underline"
                  >
                    Buka / Unduh Dokumen <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
