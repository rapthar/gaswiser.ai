'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map, LayerGroup } from 'leaflet';
import type { Station } from '@gaswiser/api-client';
import { priceBand } from '@/lib/utils';
import { getLogoPath } from './StationLogo';

interface NearbyMapProps {
  stations: Station[];
  avgPrice: number;
  center: [number, number];
}

export function NearbyMap({ stations, avgPrice, center }: NearbyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Map | null>(null);
  const markersRef = useRef<LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map once — sets mapReady=true when done so the markers effect fires
  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return;

    import('leaflet').then(L => {
      if (!mapRef.current || instanceRef.current) return;

      const map = L.map(mapRef.current, { zoomControl: true }).setView(center, 10);
      instanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      markersRef.current = L.layerGroup().addTo(map);
      setMapReady(true);
    });

    return () => {
      instanceRef.current?.remove();
      instanceRef.current = null;
      markersRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Re-draw markers whenever stations or avgPrice changes (or when map first becomes ready)
  useEffect(() => {
    if (!mapReady || !markersRef.current) return;

    import('leaflet').then(L => {
      if (!markersRef.current) return;
      markersRef.current.clearLayers();

      stations.forEach(s => {
        const lat = Number(s.latitude);
        const lng = Number(s.longitude);
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

        const price = s.regular_price != null ? Number(s.regular_price) : null;
        const band = price != null ? priceBand(price, avgPrice) : 'mid';
        const label = price != null ? `$${price.toFixed(3)}` : '?';

        const colors: Record<string, string> = { cheap: '#16a34a', mid: '#d97706', high: '#dc2626' };
        const bg = colors[band];
        const icon = L.divIcon({
          className: '',
          html: `<div style="position:relative;display:inline-block">
            <div style="background:${bg};color:white;font-size:13px;font-weight:800;padding:5px 10px;border-radius:8px;white-space:nowrap;box-shadow:0 3px 8px rgba(0,0,0,.35);letter-spacing:0.01em;border:2px solid rgba(255,255,255,0.35)">${label}</div>
            <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid ${bg};margin:0 auto"></div>
          </div>`,
          iconAnchor: [30, 36],
          iconSize: [60, 36],
        });

        const logoPath = getLogoPath(s.store_name);
        const logoHtml = logoPath
          ? `<img src="${logoPath}" alt="${s.store_name}" style="width:24px;height:24px;object-fit:contain;display:inline-block;vertical-align:middle;margin-right:6px;border-radius:4px;border:1px solid #e2e8f0;background:#fff;padding:2px" />`
          : '';

        L.marker([lat, lng], { icon })
          .bindPopup(`<div style="min-width:140px"><div style="display:flex;align-items:center;margin-bottom:4px">${logoHtml}<strong style="font-size:13px">${s.store_name}</strong></div><div style="font-size:11px;color:#64748b">${s.street_address ?? ''}</div><div style="font-size:13px;font-weight:700;margin-top:4px">${label}</div></div>`)
          .addTo(markersRef.current!);
      });
    });
  }, [stations, avgPrice, mapReady]);

  // Pan to new center when geolocation resolves
  useEffect(() => {
    if (instanceRef.current) {
      instanceRef.current.setView(center, 10);
    }
  }, [center]);

  return <div ref={mapRef} className="w-full h-full" />;
}
