'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { BarChart3, FileText, ShoppingCart, Warehouse, Package, FolderKanban, Download, Loader2 } from 'lucide-react';

const reports = [
  { id: 'inventory', title: 'Inventory Report', description: 'Current stock, stock movement, warehouse balance', icon: Package },
  { id: 'rfc', title: 'RFC Report', description: 'RFC history, approval status, material requested', icon: FileText },
  { id: 'procurement', title: 'Procurement Report', description: 'PO progress, delivery status, vendor performance', icon: ShoppingCart },
  { id: 'warehouse', title: 'Warehouse Report', description: 'Material masuk, keluar, stok aktual per warehouse', icon: Warehouse },
  { id: 'project_consumption', title: 'Project Consumption', description: 'Material usage per project, remaining material', icon: FolderKanban },
];

export default function ReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user?.role?.toUpperCase() === 'SITE_MANAGER') {
      router.replace('/pic-dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading || user?.role?.toUpperCase() === 'SITE_MANAGER') {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const handleGenerateReport = async (reportId: string) => {
    setGenerating(reportId);
    
    try {
      const response = await fetch(`/api/reports/generate?type=${reportId}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Get the filename from the Content-Disposition header if available
      const disposition = response.headers.get('content-disposition');
      let filename = `${reportId}_report.csv`;
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename="([^"]+)"/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Download error:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Generate and download operational reports in CSV format</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report, i) => {
          const Icon = report.icon;
          const isGenerating = generating === report.id;
          
          return (
            <div key={report.id} className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all duration-300 group flex flex-col animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{report.title}</h3>
              <p className="text-sm text-muted-foreground flex-1 mb-6">{report.description}</p>
              
              <button 
                onClick={() => handleGenerateReport(report.id)}
                disabled={isGenerating}
                className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-primary/5 hover:bg-primary/10 text-primary text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
