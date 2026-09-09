'use client';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import L from 'leaflet';
import { Truck, MapPin, User, QrCode, RefreshCw } from 'lucide-react';
import axios from 'axios';

let truckIcon: any = null;
let destIcon: any = null;

if (typeof window !== 'undefined') {
  // Fix leaflet icon issue in Next.js
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });

  truckIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="bg-white p-2 rounded-full shadow-xl border-2 border-slate-900 flex items-center justify-center w-9 h-9 transform transition-transform"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-slate-900"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v5c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

  destIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="bg-slate-900 text-white p-2 rounded-full shadow-lg flex items-center justify-center w-8 h-8"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function MapComponent({ selectedDO }: { selectedDO: any }) {
  // Use actual origin coordinates if available, fallback to Jakarta
  const origin: [number, number] = (selectedDO?.originLat && selectedDO?.originLng) 
    ? [selectedDO.originLat, selectedDO.originLng] 
    : [-6.200000, 106.816666];
  const dest: [number, number] = (selectedDO?.destinationLat && selectedDO?.destinationLng)
    ? [selectedDO.destinationLat, selectedDO.destinationLng]
    : [-6.250000, 106.850000];
  
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLocation = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await axios.get(`/api/logistics/${selectedDO.id}/tracking`);
      if (res.data && res.data.latitude && res.data.longitude) {
        setCurrentPos([parseFloat(res.data.latitude), parseFloat(res.data.longitude)]);
      }
    } catch (err) {
      console.error("Failed to fetch GPS tracking data", err);
    } finally {
      if (manual) setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    if (!selectedDO?.id) return;
    fetchLocation();
    const interval = setInterval(() => fetchLocation(false), 3000);
    return () => clearInterval(interval);
  }, [selectedDO?.id]);

  const routePath = currentPos ? [origin, currentPos, dest] : [origin, dest];

  return (
    <div className="relative w-full h-[600px] overflow-hidden rounded-xl font-sans bg-slate-100">
      <MapContainer 
        center={currentPos || origin} 
        zoom={13} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false}
      >
        {currentPos && <MapUpdater center={currentPos} />}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {/* Draw the route line */}
        {currentPos && <Polyline positions={routePath} color="#1e293b" weight={4} opacity={0.8} dashArray="10, 10" />}
        
        {/* Origin Marker */}
        <Marker position={origin} icon={destIcon}>
          <Popup>
            <div className="font-semibold text-slate-900">Origin</div>
            <div className="text-slate-600">{selectedDO?.origin || 'Unknown Origin'}</div>
          </Popup>
        </Marker>

        {/* Destination Marker */}
        <Marker position={dest} icon={destIcon}>
          <Popup>
            <div className="font-semibold text-slate-900">Destination</div>
            <div className="text-slate-600">{selectedDO?.destination || 'Warehouse'}</div>
          </Popup>
        </Marker>
        
        {/* Current Truck Marker */}
        {currentPos && (
          <Marker position={currentPos} icon={truckIcon}>
            <Popup>
              <div className="font-semibold">DO: {selectedDO?.doNumber}</div>
              <div className="text-xs text-slate-500">Live Location</div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Floating Card Overlay (Uber Eats Style) */}
      <div className="absolute top-4 left-4 z-10 w-80 bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col overflow-hidden animate-in slide-in-from-left-8 duration-700">
        
        {/* Real Minimalist Data */}
        <div className="p-5 flex flex-col gap-4">
          
          <div>
            <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">Delivery ID</p>
            <h2 className="text-[18px] font-bold text-slate-900">{selectedDO?.doNumber || 'DO-XXXX'}</h2>
          </div>

          {selectedDO?.project?.projectName && (
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Project</p>
              <p className="text-[14px] font-medium text-slate-700">{selectedDO.project.projectName}</p>
            </div>
          )}

          <div className="flex flex-col gap-3 relative">
            {/* Connecting line */}
            <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-slate-200" />
            
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-5 h-5 rounded-full bg-red-100 border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase">Origin</p>
                <p className="text-[14px] font-semibold text-slate-900">{selectedDO?.origin || 'Unknown Origin'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 relative z-10">
              <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-3 h-3 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase">Destination</p>
                <p className="text-[14px] font-semibold text-slate-900">{selectedDO?.destination || 'Warehouse'}</p>
              </div>
            </div>
          </div>

          <div className="mt-2 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Live GPS Coordinates</p>
              <button 
                onClick={() => fetchLocation(true)}
                className="p-1 rounded-md hover:bg-slate-100 transition-colors"
                title="Refresh Location"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
              </button>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
              <span className={`w-2 h-2 rounded-full shrink-0 ${currentPos ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <p className="text-[13px] text-slate-700">
                {currentPos ? `${currentPos[0].toFixed(6)}, ${currentPos[1].toFixed(6)}` : 'Waiting for GPS...'}
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
