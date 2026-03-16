import { useEffect, useRef, useState } from 'react';
import { COLORS } from '@/utils/constants';
import { NearbyUser } from '@/types';

interface WebMapProps {
  latitude: number;
  longitude: number;
  nearbyUsers: NearbyUser[];
  onPinPress: (user: NearbyUser) => void;
}

export default function WebMap({ latitude, longitude, nearbyUsers, onPinPress }: WebMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const onPinPressRef = useRef(onPinPress);
  onPinPressRef.current = onPinPress;

  useEffect(() => {
    let cancelled = false;

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const loadLeaflet = (): Promise<any> => {
      return new Promise((resolve) => {
        if ((window as any).L) {
          resolve((window as any).L);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve((window as any).L);
        document.head.appendChild(script);
      });
    };

    const init = async () => {
      const L = await loadLeaflet();
      if (cancelled || !mapRef.current) return;

      // Wait for CSS to be applied
      await new Promise((r) => setTimeout(r, 200));

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      console.log('[MAP] Initializing Leaflet at', latitude, longitude);

      const map = L.map(mapRef.current, {
        center: [latitude, longitude],
        zoom: 17,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Your location marker (blue pulse dot)
      const youIcon = L.divIcon({
        html: `<div style="
          width: 18px; height: 18px;
          background: ${COLORS.secondary};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(78,205,196,0.6);
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        className: '',
      });
      L.marker([latitude, longitude], { icon: youIcon })
        .addTo(map)
        .bindPopup('You are here');

      // 200m radius circle
      L.circle([latitude, longitude], {
        radius: 1000,
        color: COLORS.primary,
        fillColor: COLORS.primary,
        fillOpacity: 0.06,
        weight: 1.5,
        dashArray: '6, 4',
      }).addTo(map);

      mapInstanceRef.current = map;

      // Ensure map renders correctly
      setTimeout(() => {
        map.invalidateSize();
        setMapReady(true);
      }, 300);
    };

    init();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude]);

  // Add/update markers whenever nearbyUsers changes OR map becomes ready
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current || !mapReady) {
      console.log('[MAP] Markers waiting... L:', !!L, 'map:', !!mapInstanceRef.current, 'ready:', mapReady);
      return;
    }

    console.log('[MAP] Adding', nearbyUsers.length, 'markers to map');

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    nearbyUsers.forEach((user) => {
      const photoUrl = user.photo?.url || 'https://placehold.co/60x60/FF6B6B/ffffff?text=S';

      const icon = L.divIcon({
        html: `<div style="
          width: 50px; height: 50px;
          border-radius: 50%;
          border: 3px solid ${COLORS.primary};
          overflow: hidden;
          background: white;
          box-shadow: 0 2px 10px rgba(255,107,107,0.5);
          cursor: pointer;
          transition: transform 0.2s ease;
        " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
          <img src="${photoUrl}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.src='https://placehold.co/60x60/FF6B6B/ffffff?text=${user.firstName[0]}'" />
        </div>`,
        iconSize: [50, 50],
        iconAnchor: [25, 25],
        className: '',
      });

      const marker = L.marker([user.location.lat, user.location.lng], { icon })
        .addTo(mapInstanceRef.current);

      marker.on('click', () => {
        onPinPressRef.current(user);
      });

      markersRef.current.push(marker);
    });
  }, [nearbyUsers, mapReady]);

  return (
    <div
      ref={mapRef as any}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    />
  );
}
