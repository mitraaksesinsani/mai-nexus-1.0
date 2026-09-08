'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Package, User, Calendar, MapPin, Upload, Loader2, Save, FileText, Printer, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import StatusBadge from '@/components/shared/StatusBadge';
import RfcApprovalStepper from '@/components/rfc/RfcApprovalStepper';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function RfcDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [rfc, setRfc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Warehouse completion state
  const [takerName, setTakerName] = useState('');
  const [takerDate, setTakerDate] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Approval modal states
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  useEffect(() => {
    fetchRfcDetails();
  }, [params.id]);

  const fetchRfcDetails = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/rfc/${params.id}`);
      setRfc(data.data);
      if (data.data?.takerName) setTakerName(data.data.takerName);
      if (data.data?.takerDate) setTakerDate(data.data.takerDate.substring(0, 10));
      if (data.data?.evidenceDocument) setEvidenceUrl(data.data.evidenceDocument);
    } catch (error) {
      console.error('Failed to fetch RFC details', error);
      toast.error('Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingEvidence(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.url) {
        setEvidenceUrl(data.url);
        toast.success('Bukti dokumen/foto berhasil diunggah');
      } else {
        toast.error(data.message || 'Gagal mengunggah file bukti');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Terjadi kesalahan saat mengunggah file');
    } finally {
      setIsUploadingEvidence(false);
      e.target.value = '';
    }
  };

  const handleRemoveEvidence = () => {
    setEvidenceUrl('');
    toast.info('File bukti dihapus');
  };

  const handleComplete = async () => {
    if (!takerName) return toast.error('Silakan isi nama pengambil material');
    if (!takerDate) return toast.error('Silakan tentukan tanggal pengambilan');
    // Evidence is optional depending on business logic, but let's encourage it or just make it optional.

    setIsCompleting(true);
    try {
      await api.patch(`/api/rfc/${rfc.id}`, {
        status: 'COMPLETED',
        takerName,
        takerDate,
        evidenceDocument: evidenceUrl || null,
        completedBy: user?.id
      });
      toast.success('Materials successfully released and stock deducted!');
      fetchRfcDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete RFC');
    } finally {
      setIsCompleting(false);
    }
  };

  const currentStep = rfc?.approvals?.find((a: any) => a.stepOrder === (rfc?.currentStepOrder || 1));
  const canApprove = rfc?.status === 'WAITING_APPROVAL' && (
    user?.role === 'ADMIN' || 
    user?.role === 'SUPER_ADMIN' || 
    user?.id === currentStep?.approverId ||
    (!currentStep && ['SITE_MANAGER', 'DIREKTUR', 'OWNER', 'PROCUREMENT'].includes(user?.role || ''))
  );

  const handleApprove = async () => {
    setIsSubmittingApproval(true);
    try {
      await api.patch(`/api/rfc/${rfc.id}`, { 
        status: 'APPROVED', 
        approverId: user?.id,
        notes: approvalNotes,
        stepOrder: rfc.currentStepOrder || 1
      });
      toast.success(`RFC ${rfc.rfcNumber} approved successfully`);
      setIsApproveOpen(false);
      setApprovalNotes('');
      fetchRfcDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve RFC');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleReject = async () => {
    setIsSubmittingApproval(true);
    try {
      await api.patch(`/api/rfc/${rfc.id}`, { 
        status: 'REJECTED', 
        approverId: user?.id,
        notes: rejectNotes 
      });
      toast.success('RFC rejected successfully');
      setIsRejectOpen(false);
      setRejectNotes('');
      fetchRfcDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject RFC');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  if (loading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!rfc) {
    return <div className="p-6 text-center text-muted-foreground">RFC not found.</div>;
  }

  const isApproved = rfc.status === 'APPROVED';
  const isCompleted = rfc.status === 'COMPLETED';

  return (
    <div className="space-y-6 w-full max-w-[1700px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{rfc.rfcNumber}</h1>
              <StatusBadge status={rfc.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Created on {new Date(rfc.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canApprove && (
            <>
              <Button
                variant="destructive"
                className="gap-2 shadow-sm"
                onClick={() => setIsRejectOpen(true)}
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
              <Button
                className="gap-2 shadow-sm bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setIsApproveOpen(true)}
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </Button>
            </>
          )}
          <Button
            variant="outline"
            className="gap-2 shadow-sm"
            onClick={() => window.open(`/print/rfc/${rfc.id}`, '_blank')}
          >
            <Printer className="h-4 w-4" />
            Print / PDF Document
          </Button>
        </div>
      </div>

      {/* Stepper Log Approver Berjenjang */}
      <RfcApprovalStepper 
        rfcStatus={rfc.status}
        currentStepOrder={rfc.currentStepOrder || 1}
        requestor={rfc.requestor}
        createdAt={rfc.createdAt}
        approvals={rfc.approvals || []}
        takerName={rfc.takerName}
        takerDate={rfc.takerDate}
        evidenceDocument={rfc.evidenceDocument}
        currentUserId={user?.id}
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6">
          {isApproved && (
            <Card className="border-primary/50 shadow-sm p-0 gap-0 overflow-hidden">
              <CardHeader className="bg-primary/5 border-b px-6 py-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Warehouse Release Confirmation
                </CardTitle>
                <CardDescription>
                  This request is approved. Please fill out the details below before releasing the materials. This will deduct the stock from the warehouse.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="takerName">Taker Name (Nama Pengambil) <span className="text-destructive">*</span></Label>
                    <Input 
                      id="takerName" 
                      placeholder="e.g. Budi (Teknisi)" 
                      value={takerName}
                      onChange={(e) => setTakerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="takerDate">Pickup Date (Tanggal Ambil) <span className="text-destructive">*</span></Label>
                    <Input 
                      id="takerDate" 
                      type="date"
                      value={takerDate}
                      onChange={(e) => setTakerDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="evidenceFile" className="font-medium">
                        Evidence Document / Bukti Pengambilan
                      </Label>
                      <span className="text-xs text-muted-foreground font-normal">
                        (Sunnah / Opsional)
                      </span>
                    </div>

                    {!evidenceUrl ? (
                      <div>
                        <Button 
                          variant="outline" 
                          type="button" 
                          disabled={isUploadingEvidence}
                          className="relative overflow-hidden cursor-pointer gap-2 h-10 w-full sm:w-auto"
                        >
                          {isUploadingEvidence ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              <span>Mengunggah file...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 text-primary" />
                              <span>Pilih File Bukti (Foto / PDF)</span>
                            </>
                          )}
                          <input 
                            id="evidenceFile"
                            type="file" 
                            accept="image/*,.pdf" 
                            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                            onChange={handleFileUpload} 
                            disabled={isUploadingEvidence}
                          />
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Tidak wajib. Anda dapat mengunggah foto penerima bersama barang atau surat jalan / formulir serah terima bertanda tangan (JPG, PNG, atau PDF).
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 border rounded-xl bg-card w-full shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border bg-muted flex items-center justify-center">
                            {evidenceUrl.match(/\.(jpeg|jpg|png|webp|gif)($|\?)/i) || evidenceUrl.startsWith('data:image') ? (
                              <img src={evidenceUrl} alt="Evidence Preview" className="w-full h-full object-cover" />
                            ) : (
                              <FileText className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-sm font-medium truncate max-w-[280px] sm:max-w-md">
                              {evidenceUrl.split('/').pop()?.split('?')[0] || 'evidence_document'}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span className="uppercase font-semibold text-[10px] px-1.5 py-0.5 rounded bg-muted">
                                {evidenceUrl.split('.').pop()?.split('?')[0] || 'FILE'}
                              </span>
                              <a
                                href={evidenceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                              >
                                <Eye className="w-3 h-3" /> Lihat File
                              </a>
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleRemoveEvidence}
                          className="text-muted-foreground hover:text-destructive shrink-0 h-8 w-8"
                          title="Hapus file"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="pt-2 flex justify-end">
                  <Button 
                    onClick={handleComplete} 
                    disabled={isCompleting || isUploadingEvidence || !takerName || !takerDate} 
                    className="gap-2"
                  >
                    {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Confirm Release & Deduct Stock
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isCompleted && (
            <Card className="border-green-500/40 shadow-sm p-0 gap-0 overflow-hidden">
              <CardHeader className="bg-green-50/50 dark:bg-green-950/20 border-b px-6 py-4">
                <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Release Information
                </CardTitle>
                <CardDescription>
                  Material has been verified and released from the warehouse.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 py-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">Taken By</span>
                    <span className="font-medium">{rfc.takerName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Pickup Date</span>
                    <span className="font-medium">{rfc.takerDate ? new Date(rfc.takerDate).toLocaleDateString() : '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Processed By</span>
                    <span className="font-medium">{rfc.completedByName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Completed At</span>
                    <span className="font-medium">{rfc.completedAt ? new Date(rfc.completedAt).toLocaleString() : '-'}</span>
                  </div>
                  {rfc.evidenceDocument && (
                    <div className="col-span-2 md:col-span-4 mt-2 pt-2 border-t">
                      <span className="text-muted-foreground block mb-1">Evidence Document</span>
                      <a href={rfc.evidenceDocument} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 font-medium">
                        <FileText className="h-4 w-4" /> View Document
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Requested Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60%] min-w-[340px]">Material</TableHead>
                    <TableHead className="text-right w-[12%] min-w-[90px]">Quantity</TableHead>
                    <TableHead className="w-[10%] min-w-[80px]">Unit</TableHead>
                    <TableHead className="w-[18%] min-w-[130px]">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rfc.items && rfc.items.length > 0 ? (
                    rfc.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-normal py-3 align-top">
                          <div className="font-medium whitespace-normal break-words leading-relaxed text-sm">{item.materialName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{item.materialCode}</div>
                        </TableCell>
                        <TableCell className="text-right font-medium align-top py-3">{item.requestQty}</TableCell>
                        <TableCell className="align-top py-3">{item.unit}</TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-normal break-words align-top py-3">{item.notes || '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">No items found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="text-muted-foreground flex items-center gap-2 mb-1"><MapPin className="h-4 w-4" /> Source Warehouse</span>
                <span className="font-medium">{rfc.warehouse?.name || '-'}</span>
              </div>
              <Separator />
              <div>
                <span className="text-muted-foreground flex items-center gap-2 mb-1"><FileText className="h-4 w-4" /> Project</span>
                <span className="font-medium">{rfc.project?.projectName || '-'}</span>
              </div>
              {rfc.notes && (
                <>
                  <Separator />
                  <div>
                    <span className="text-muted-foreground flex items-center gap-2 mb-1">Notes / Purpose</span>
                    <span>{rfc.notes}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Activity Log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative pl-6 border-l-2 border-muted space-y-6">
                <div className="relative">
                  <div className="absolute -left-[29px] bg-background p-1 rounded-full">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Requested</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{new Date(rfc.createdAt).toLocaleString()}</p>
                    <p className="text-xs mt-1">By {rfc.requestor?.name || 'Unknown'}</p>
                  </div>
                </div>

                {rfc.approvals && rfc.approvals.length > 0 ? (
                  rfc.approvals
                    .filter((app: any) => app.status === 'APPROVED' || app.status === 'REJECTED')
                    .map((app: any) => (
                      <div key={app.id || app.stepOrder} className="relative">
                        <div className="absolute -left-[29px] bg-background p-1 rounded-full">
                          <div className={cn("w-3 h-3 rounded-full", app.status === 'APPROVED' ? "bg-green-500" : "bg-red-500")} />
                        </div>
                        <div className="text-sm">
                          <p className="font-medium">
                            {app.stepName} ({app.status === 'APPROVED' ? 'Approved' : 'Rejected'})
                          </p>
                          <p className="text-muted-foreground text-xs mt-0.5">
                            {app.actionAt ? new Date(app.actionAt).toLocaleString() : '-'}
                          </p>
                          <p className="text-xs mt-1">
                            By {app.approverName || 'Assigned Approver'} {app.approverRole ? `(${app.approverRole})` : ''}
                          </p>
                          {app.notes && (
                            <p className="text-xs text-muted-foreground italic mt-1 bg-muted/40 p-1.5 rounded border">
                              "{app.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                ) : rfc.approvedAt ? (
                  <div className="relative">
                    <div className="absolute -left-[29px] bg-background p-1 rounded-full">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Approved</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{new Date(rfc.approvedAt).toLocaleString()}</p>
                      <p className="text-xs mt-1">By {rfc.approver?.name || 'Unknown'}</p>
                    </div>
                  </div>
                ) : null}
                
                {rfc.completedAt && (
                  <div className="relative">
                    <div className="absolute -left-[29px] bg-background p-1 rounded-full">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Completed (Materials Released)</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{new Date(rfc.completedAt).toLocaleString()}</p>
                      <p className="text-xs mt-1">By {rfc.completedByName || 'Unknown'}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog Approve */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve RFC Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve request {rfc?.rfcNumber}?
              {currentStep && (
                <span className="block mt-1 text-primary font-medium">
                  Stage: {currentStep.stepName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="approve-notes" className="text-xs font-semibold">
              Approval Notes (Optional)
            </Label>
            <Textarea
              id="approve-notes"
              placeholder="e.g. Sesuai kebutuhan lapangan, material disetujui."
              className="mt-1.5"
              rows={3}
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveOpen(false)}>Cancel</Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white" 
              onClick={handleApprove}
              disabled={isSubmittingApproval}
            >
              {isSubmittingApproval ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Reject */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject RFC Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject request {rfc?.rfcNumber}? Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="reject-notes" className="text-xs font-semibold">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-notes"
              placeholder="e.g. Kuantitas tidak sesuai rencana kerja..."
              className="mt-1.5"
              rows={3}
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleReject} 
              disabled={!rejectNotes.trim() || isSubmittingApproval}
            >
              {isSubmittingApproval ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
