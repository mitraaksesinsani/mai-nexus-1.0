'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2, Percent, Scale, Cable, Layers, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function TermsMasterDataPage() {
  const [activeTab, setActiveTab] = useState('financial');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    ppn: '11',
    dp: '30',
    uom_hdpe_roll: '200',
    uom_kabel_tanah_haspel: '3000',
    uom_kabel_udara_haspel: '4000',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/api/settings');
      if (data.data) {
        setFormData({
          ppn: data.data.ppn || '11',
          dp: data.data.dp || '30',
          uom_hdpe_roll: data.data.uom_hdpe_roll || '200',
          uom_kabel_tanah_haspel: data.data.uom_kabel_tanah_haspel || '3000',
          uom_kabel_udara_haspel: data.data.uom_kabel_udara_haspel || '4000',
        });
      }
    } catch (error) {
      console.error('Failed to load settings', error);
      toast.error('Gagal memuat data terms.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/api/settings', formData);
      toast.success('Terms & Konfigurasi berhasil disimpan!');
    } catch (error) {
      console.error('Failed to save settings', error);
      toast.error('Gagal menyimpan data.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Terms & Settings Master Data</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Atur parameter default sistem untuk dokumen pengadaan (PO) dan rasio konversi satuan material (UOM).
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val || 'financial')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md h-10 p-1 bg-muted rounded-xl">
          <TabsTrigger value="financial" className="flex items-center gap-2 rounded-lg text-sm font-medium">
            <Percent className="w-4 h-4" />
            Ketentuan PO & Finansial
          </TabsTrigger>
          <TabsTrigger value="uom" className="flex items-center gap-2 rounded-lg text-sm font-medium">
            <Scale className="w-4 h-4" />
            Konversi Satuan (UOM)
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Ketentuan PO & Finansial */}
        <TabsContent value="financial" className="mt-4 focus-visible:outline-none">
          <Card className="min-h-[480px] flex flex-col justify-between">
            <div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="w-5 h-5 text-primary" />
                  Ketentuan Finansial Dokumen PO
                </CardTitle>
                <CardDescription>
                  Konfigurasi persentase yang akan digunakan sebagai nilai default dalam pembuatan dokumen Purchase Order (PO).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 p-4 rounded-xl border border-border/70 bg-card">
                    <Label htmlFor="ppn" className="font-semibold text-sm">Persentase PPN (%)</Label>
                    <div className="relative pt-1">
                      <Input
                        id="ppn"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.ppn}
                        onChange={(e) => setFormData({ ...formData, ppn: e.target.value })}
                        className="pr-8 text-base font-medium"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground font-medium">
                        %
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">Nilai PPN standar yang ditambahkan ke total belanja (contoh: 11%).</p>
                  </div>

                  <div className="space-y-2 p-4 rounded-xl border border-border/70 bg-card">
                    <Label htmlFor="dp" className="font-semibold text-sm">Persentase Down Payment / DP (%)</Label>
                    <div className="relative pt-1">
                      <Input
                        id="dp"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.dp}
                        onChange={(e) => setFormData({ ...formData, dp: e.target.value })}
                        className="pr-8 text-base font-medium"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground font-medium">
                        %
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">Persentase DP awal untuk termin pembayaran vendor (contoh: 30%).</p>
                  </div>
                </div>

                <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <CheckCircle2 className="w-4 h-4" />
                    Pemberlakuan Otomatis pada Purchase Order
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Nilai persentase ini akan otomatis terisi saat pembuatan dokumen Purchase Order (PO) baru dan dapat disesuaikan manual pada masing-masing dokumen jika terdapat kesepakatan khusus dengan vendor.
                  </p>
                </div>
              </CardContent>
            </div>

            <div className="p-6 pt-0">
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSave} disabled={saving} className="bg-primary text-white">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Simpan Perubahan
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: Konversi Satuan Material (UOM) */}
        <TabsContent value="uom" className="mt-4 focus-visible:outline-none">
          <Card className="min-h-[480px] flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                Konfigurasi Konversi Satuan & Kemasan Material
              </CardTitle>
              <CardDescription>
                Atur standar konversi panjang (meter) ke wujud kemasan fisik (Roll / Haspel). Konfigurasi ini digunakan oleh dashboard untuk menghitung estimasi jumlah fisik material kabel dan subduct di gudang agar tidak meleset.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {/* HDPE / Subduct */}
                <div className="p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/20 transition-colors space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">1 Roll Pipa Subduct / HDPE</div>
                        <div className="text-xs text-muted-foreground">Subduct / Pipa HDPE pelindung kabel optik</div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1">
                    <div className="space-y-1.5">
                      <Label htmlFor="uom_hdpe_roll" className="text-xs font-medium">Panjang per 1 Roll (Meter)</Label>
                      <div className="relative">
                        <Input
                          id="uom_hdpe_roll"
                          type="number"
                          min="1"
                          value={formData.uom_hdpe_roll}
                          onChange={(e) => setFormData({ ...formData, uom_hdpe_roll: e.target.value })}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs text-muted-foreground">
                          meter / roll
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border">
                      <span className="font-semibold text-foreground">Keterangan:</span> 1 Roll HDPE dihitung setara dengan{' '}
                      <span className="font-semibold text-primary">{formData.uom_hdpe_roll || 200} meter</span>.
                    </div>
                  </div>
                </div>

                {/* Kabel Tanah / Duct */}
                <div className="p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/20 transition-colors space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Cable className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">1 Haspel Kabel Tanah (Duct)</div>
                        <div className="text-xs text-muted-foreground">Kabel Fiber Optic Duct / Tanam (Kode DC-OF)</div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1">
                    <div className="space-y-1.5">
                      <Label htmlFor="uom_kabel_tanah_haspel" className="text-xs font-medium">Panjang per 1 Haspel (Meter)</Label>
                      <div className="relative">
                        <Input
                          id="uom_kabel_tanah_haspel"
                          type="number"
                          min="1"
                          value={formData.uom_kabel_tanah_haspel}
                          onChange={(e) => setFormData({ ...formData, uom_kabel_tanah_haspel: e.target.value })}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs text-muted-foreground">
                          meter / haspel
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border">
                      <span className="font-semibold text-foreground">Keterangan:</span> 1 Haspel / Drum Kabel Tanah dihitung setara dengan{' '}
                      <span className="font-semibold text-primary">{Number(formData.uom_kabel_tanah_haspel || 3000).toLocaleString('id-ID')} meter</span>.
                    </div>
                  </div>
                </div>

                {/* Kabel Udara */}
                <div className="p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/20 transition-colors space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Cable className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">1 Haspel Kabel Udara (Aerial)</div>
                        <div className="text-xs text-muted-foreground">Kabel Fiber Optic Udara / Tiang (Kode AC-OF)</div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1">
                    <div className="space-y-1.5">
                      <Label htmlFor="uom_kabel_udara_haspel" className="text-xs font-medium">Panjang per 1 Haspel (Meter)</Label>
                      <div className="relative">
                        <Input
                          id="uom_kabel_udara_haspel"
                          type="number"
                          min="1"
                          value={formData.uom_kabel_udara_haspel}
                          onChange={(e) => setFormData({ ...formData, uom_kabel_udara_haspel: e.target.value })}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs text-muted-foreground">
                          meter / haspel
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border">
                      <span className="font-semibold text-foreground">Keterangan:</span> 1 Haspel / Drum Kabel Udara dihitung setara dengan{' '}
                      <span className="font-semibold text-primary">{Number(formData.uom_kabel_udara_haspel || 4000).toLocaleString('id-ID')} meter</span>.
                    </div>
                  </div>
                </div>
              </div>

              {/* Ringkasan Konversi */}
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <CheckCircle2 className="w-4 h-4" />
                  Aturan Kalkulasi Fisik di Dashboard
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pada dashboard, perhitungan jumlah fisik material dengan satuan meter akan dikonversi menggunakan pembulatan biasa berdasarkan parameter di atas. Setiap entri stok material yang ada di gudang dihitung minimal 1 wujud fisik (haspel/roll) kemasan.
                </p>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSave} disabled={saving} className="bg-primary text-white">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Simpan Perubahan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
