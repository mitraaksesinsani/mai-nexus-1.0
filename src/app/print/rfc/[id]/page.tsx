'use client';

import 'paper-css/paper.min.css';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Loader2, Printer, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrintRfcPage() {
  const params = useParams();
  const id = params?.id as string;
  const [rfc, setRfc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchRfc = async () => {
      try {
        const { data } = await api.get(`/api/rfc/${id}`);
        setRfc(data.data);
      } catch (error) {
        console.error('Failed to fetch RFC for printing', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRfc();
  }, [id]);

  useEffect(() => {
    document.body.classList.add('A4');
    return () => document.body.classList.remove('A4');
  }, []);

  useEffect(() => {
    if (rfc) {
      document.title = `RFC_${rfc.rfcNumber || id}`;
      // Auto trigger print dialog after small delay
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [rfc, id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Preparing RFC Document...</p>
        </div>
      </div>
    );
  }

  if (!rfc) {
    return <div className="p-8 text-center text-red-500">RFC not found.</div>;
  }

  const level1Approval = rfc.approvals?.find((a: any) => a.stepOrder === 1);
  const level2Approval = rfc.approvals?.find((a: any) => a.stepOrder === 2);

  return (
    <>
      {/* Non-printable action header */}
      <div className="mb-4 flex justify-between items-center print:hidden max-w-4xl mx-auto pt-4 px-4">
        <span className="text-sm font-medium text-muted-foreground">
          Document Preview: <strong className="text-foreground">{rfc.rfcNumber}</strong>
        </span>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </Button>
      </div>

      <section className="sheet padding-10mm font-sans text-[11px] leading-tight tracking-tight bg-white text-black">
        {/* Kop Surat Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-5">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="MAI Logo" className="w-16 h-16 object-contain" />
            <div>
              <h2 className="text-base font-bold tracking-tight uppercase">PT Mitra Akses Insani</h2>
              <p className="text-[10px] text-gray-600">Telecommunication & Fiber Optic Network Infrastructure</p>
              <p className="text-[10px] text-gray-600">Nexus Inventory Management System (NIMS)</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold uppercase tracking-wide text-primary">REQUEST FOR CONSUMPTION</h1>
            <p className="text-sm font-bold mt-1 text-gray-900">{rfc.rfcNumber}</p>
            <div className="mt-1">
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                rfc.status === 'COMPLETED' 
                  ? 'bg-green-100 text-green-800 border-green-300' 
                  : rfc.status === 'APPROVED' 
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : rfc.status === 'REJECTED'
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {rfc.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* General Metadata Table */}
        <table className="w-full border-collapse mb-5 text-xs">
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="py-1 px-2 font-bold w-[20%] bg-gray-50">Nama Proyek</td>
              <td className="py-1 px-2 w-[30%]">{rfc.project?.projectName || '-'}</td>
              <td className="py-1 px-2 font-bold w-[20%] bg-gray-50">Tanggal Pengajuan</td>
              <td className="py-1 px-2 w-[30%]">{formatDate(rfc.createdAt)}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="py-1 px-2 font-bold bg-gray-50">Gudang Sumber</td>
              <td className="py-1 px-2">{rfc.warehouse?.name || '-'}</td>
              <td className="py-1 px-2 font-bold bg-gray-50">Pemohon (Requestor)</td>
              <td className="py-1 px-2">{rfc.requestor?.name} ({rfc.requestor?.role || 'User'})</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="py-1 px-2 font-bold bg-gray-50">Keperluan / Catatan</td>
              <td className="py-1 px-2" colSpan={3}>{rfc.notes || '-'}</td>
            </tr>
          </tbody>
        </table>

        {/* Requested Materials Table */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5 text-gray-800">
            Daftar Material Yang Diminta (Requested Materials)
          </h3>
          <table className="w-full border-collapse text-xs border border-gray-400">
            <thead className="bg-gray-100 font-bold border-b border-gray-400">
              <tr>
                <th className="p-1.5 border-r border-gray-400 w-[5%] text-center">No</th>
                <th className="p-1.5 border-r border-gray-400 w-[20%] text-left">Kode Material</th>
                <th className="p-1.5 border-r border-gray-400 w-[45%] text-left">Deskripsi / Nama Material</th>
                <th className="p-1.5 border-r border-gray-400 w-[12%] text-right">Kuantitas</th>
                <th className="p-1.5 border-r border-gray-400 w-[8%] text-center">Satuan</th>
                <th className="p-1.5 w-[10%] text-left">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {rfc.items && rfc.items.length > 0 ? (
                rfc.items.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-gray-300">
                    <td className="p-1.5 border-r border-gray-300 text-center">{i + 1}</td>
                    <td className="p-1.5 border-r border-gray-300 font-mono text-[10px]">{item.materialCode || '-'}</td>
                    <td className="p-1.5 border-r border-gray-300 font-medium whitespace-normal break-words leading-tight">{item.materialName}</td>
                    <td className="p-1.5 border-r border-gray-300 text-right font-bold">{item.requestQty}</td>
                    <td className="p-1.5 border-r border-gray-300 text-center">{item.unit || '-'}</td>
                    <td className="p-1.5 text-[10px] text-gray-600 whitespace-normal break-words leading-tight">{item.notes || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">Tidak ada material yang diminta</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Multi-tier Approval & Handover Signature Boxes */}
        <div className="mt-8 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-800">
            Persetujuan Berjenjang & Serah Terima (Signatures & Verification)
          </h3>
          <div className="grid grid-cols-4 gap-3 text-xs border border-gray-400 p-3 rounded bg-gray-50/50">
            {/* 1. Requestor */}
            <div className="flex flex-col justify-between border-r border-gray-300 pr-2">
              <div>
                <p className="font-bold text-[11px] text-gray-700">1. Diajukan Oleh:</p>
                <p className="text-[10px] text-gray-500 mb-8">Pemohon / Field Team</p>
              </div>
              <div className="text-center">
                <div className="h-6 flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-green-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Submitted
                  </span>
                </div>
                <div className="border-b border-black w-full my-1"></div>
                <p className="font-bold leading-tight">{rfc.requestor?.name || '-'}</p>
                <p className="text-[9px] text-gray-600 leading-tight">{rfc.requestor?.role?.replace('_', ' ') || 'User'}</p>
                <p className="text-[9px] text-gray-500">{formatDate(rfc.createdAt)}</p>
              </div>
            </div>

            {/* 2. Level 1: Site Verification */}
            <div className="flex flex-col justify-between border-r border-gray-300 pr-2">
              <div>
                <p className="font-bold text-[11px] text-gray-700">2. Verifikasi Lapangan:</p>
                <p className="text-[10px] text-gray-500 mb-8">Site Manager / Project Lead</p>
              </div>
              <div className="text-center">
                <div className="h-6 flex items-center justify-center">
                  {level1Approval?.status === 'APPROVED' ? (
                    <span className="text-[10px] font-semibold text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Approved
                    </span>
                  ) : level1Approval?.status === 'REJECTED' ? (
                    <span className="text-[10px] font-semibold text-red-700">Rejected</span>
                  ) : (
                    <span className="text-[10px] text-gray-400 italic">Waiting Approval</span>
                  )}
                </div>
                <div className="border-b border-black w-full my-1"></div>
                <p className="font-bold leading-tight">{level1Approval?.approverName || 'Site Manager'}</p>
                <p className="text-[9px] text-gray-600 leading-tight">{level1Approval?.approverRole || 'SITE_MANAGER'}</p>
                <p className="text-[9px] text-gray-500">{level1Approval?.actionAt ? formatDate(level1Approval.actionAt) : '-'}</p>
              </div>
            </div>

            {/* 3. Level 2: Final Authorization */}
            <div className="flex flex-col justify-between border-r border-gray-300 pr-2">
              <div>
                <p className="font-bold text-[11px] text-gray-700">3. Otorisasi Final:</p>
                <p className="text-[10px] text-gray-500 mb-8">Direktur / Manajemen</p>
              </div>
              <div className="text-center">
                <div className="h-6 flex items-center justify-center">
                  {level2Approval?.status === 'APPROVED' || (!level2Approval && rfc.status === 'APPROVED') ? (
                    <span className="text-[10px] font-semibold text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Approved
                    </span>
                  ) : level2Approval?.status === 'REJECTED' ? (
                    <span className="text-[10px] font-semibold text-red-700">Rejected</span>
                  ) : (
                    <span className="text-[10px] text-gray-400 italic">Waiting Approval</span>
                  )}
                </div>
                <div className="border-b border-black w-full my-1"></div>
                <p className="font-bold leading-tight">{level2Approval?.approverName || rfc.approver?.name || 'Direktur / Manajemen'}</p>
                <p className="text-[9px] text-gray-600 leading-tight">{level2Approval?.approverRole || rfc.approver?.role || 'DIREKTUR'}</p>
                <p className="text-[9px] text-gray-500">{level2Approval?.actionAt ? formatDate(level2Approval.actionAt) : rfc.approvedAt ? formatDate(rfc.approvedAt) : '-'}</p>
              </div>
            </div>

            {/* 4. Warehouse Dispatch / Receiver */}
            <div className="flex flex-col justify-between">
              <div>
                <p className="font-bold text-[11px] text-gray-700">4. Diterima Oleh:</p>
                <p className="text-[10px] text-gray-500 mb-8">Pengambil / Teknisi Lapangan</p>
              </div>
              <div className="text-center">
                <div className="h-6 flex items-center justify-center">
                  {rfc.status === 'COMPLETED' ? (
                    <span className="text-[10px] font-semibold text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Dispatched
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 italic">Pending Handover</span>
                  )}
                </div>
                <div className="border-b border-black w-full my-1"></div>
                <p className="font-bold leading-tight">{rfc.takerName || 'Nama Penerima'}</p>
                <p className="text-[9px] text-gray-600 leading-tight">{rfc.completedByName ? `Petugas: ${rfc.completedByName}` : 'Serah Terima Gudang'}</p>
                <p className="text-[9px] text-gray-500">{rfc.takerDate ? formatDate(rfc.takerDate) : '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 border-t border-gray-300 pt-2 flex justify-between text-[9px] text-gray-500">
          <span>Dicetak secara elektronik melalui MAI Nexus NIMS. Dokumen ini sah dan mengikat.</span>
          <span>Halaman 1 dari 1</span>
        </div>
      </section>
    </>
  );
}
