'use client';

import { useEffect, useState } from 'react';
import { Database, Search, Plus, Edit, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

const tabs = [
 { label: 'Materials', value: 'materials' },
 { label: 'Vendors', value: 'vendors' },
 { label: 'Users', value: 'users' },
];

export default function MasterDataPage() {
 const [activeTab, setActiveTab] = useState('materials');
 const [data, setData] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');

 useEffect(() => {
 fetchData();
 }, [activeTab, search]);

 const fetchData = async () => {
 setLoading(true);
 try {
 const { data: res } = await api.get(`/api/master/${activeTab}`, { params: { search, limit: 50 } });
 setData(res.data || []);
 } catch (e) { console.error(e); }
 finally { setLoading(false); }
 };

 return (
 <div className="space-y-6">
 <div className="animate-fade-in">
 <h1 className="text-2xl font-bold">Master Data</h1>
 <p className="text-sm text-muted-foreground mt-0.5">Manage core reference data</p>
 </div>

 {/* Tabs */}
 <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl p-1 w-fit animate-fade-in" style={{ animationDelay: '100ms' }}>
 {tabs.map((tab) => (
 <button key={tab.value} onClick={() => { setActiveTab(tab.value); setSearch(''); }}
 className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === tab.value ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50")}>
 {tab.label}
 </button>
 ))}
 </div>

 <div className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
 <div className="relative flex-1 max-w-md">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
 <input type="text" placeholder={`Search ${activeTab}...`} value={search} onChange={(e) => setSearch(e.target.value)}
 className="w-full h-10 pl-10 pr-4 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
 </div>
 <button className="h-10 px-4 gradient-primary rounded-lg text-sm font-medium text-white hover:opacity-90 transition-all flex items-center gap-2 ">
 <Plus className="w-4 h-4" /> Add
 </button>
 </div>

 <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in" style={{ animationDelay: '300ms' }}>
 <table className="w-full">
 <thead><tr className="border-b border-border bg-secondary/30">
 {activeTab === 'materials' && (<>
 <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Code</th>
 <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
 <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Category</th>
 <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Unit</th>
 <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Min Stock</th>
 <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
 </>)}
 {activeTab === 'vendors' && (<>
 <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
 <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Contact</th>
 <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Email</th>
 <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Phone</th>
 <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">POs</th>
 <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
 </>)}
 {activeTab === 'users' && (<>
 <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
 <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Email</th>
 <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Role</th>
 <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Phone</th>
 <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
 <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
 </>)}
 </tr></thead>
 <tbody>
 {loading ? [...Array(5)].map((_, i) => (
 <tr key={i} className="border-b border-border">{[...Array(6)].map((_, j) => (
 <td key={j} className="px-4 py-4"><div className="h-4 bg-secondary rounded shimmer" /></td>
 ))}</tr>
 )) : data.map((item) => (
 <tr key={item.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
 {activeTab === 'materials' && (<>
 <td className="px-4 py-3 text-sm text-primary">{item.materialCode}</td>
 <td className="px-4 py-3 text-sm font-medium">{item.materialName}</td>
 <td className="px-4 py-3 text-sm text-muted-foreground">{item.category}</td>
 <td className="px-4 py-3 text-sm text-muted-foreground">{item.unit}</td>
 <td className="px-4 py-3 text-sm text-right text-muted-foreground">{item.minimumStock}</td>
 </>)}
 {activeTab === 'vendors' && (<>
 <td className="px-4 py-3 text-sm font-medium">{item.vendorName}</td>
 <td className="px-4 py-3 text-sm text-muted-foreground">{item.contact || '-'}</td>
 <td className="px-4 py-3 text-sm text-muted-foreground">{item.email || '-'}</td>
 <td className="px-4 py-3 text-sm text-muted-foreground">{item.phone || '-'}</td>
 <td className="px-4 py-3 text-sm text-muted-foreground">{item._count?.purchaseOrders || 0}</td>
 </>)}
 {activeTab === 'users' && (<>
 <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
 <td className="px-4 py-3 text-sm text-muted-foreground">{item.email}</td>
 <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary">{item.role?.replace(/_/g, ' ')}</span></td>
 <td className="px-4 py-3 text-sm text-muted-foreground">{item.phone || '-'}</td>
 <td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded-full text-xs", item.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
 </>)}
 <td className="px-4 py-3">
 <div className="flex items-center gap-1">
 <button className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Edit className="w-3.5 h-3.5" /></button>
 <button className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 {!loading && data.length === 0 && (
 <div className="text-center py-16"><Database className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" /><p className="text-muted-foreground">No {activeTab} found</p></div>
 )}
 </div>
 </div>
 );
}
