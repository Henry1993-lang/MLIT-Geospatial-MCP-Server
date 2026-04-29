import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import type { PropertyData } from '../types';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const getIcon = (type: string) => {
  const color = type === '地価公示' ? '#10b981' : '#3b82f6';
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

export const MapArea = ({ data }: { data: PropertyData[] }) => {
  const tokyoPosition: [number, number] = [35.6812, 139.7671];

  return (
    <div className="glass-panel map-section animate-fade-in" style={{ animationDelay: '0.1s' }}>
      <MapContainer 
        center={tokyoPosition} 
        zoom={13} 
        zoomControl={false}
        style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="bottomright" />
        
        {data.length === 0 && (
          <Marker position={tokyoPosition}>
            <Popup>
              <div style={{ color: '#333' }}>
                <strong>東京駅</strong><br/>対象地域
              </div>
            </Popup>
          </Marker>
        )}

        {data.map(item => (
          <Marker key={item.id} position={[item.lat, item.lng]} icon={getIcon(item.type)}>
            <Popup>
              <div style={{ color: '#333' }}>
                <strong>{item.type}</strong><br/>
                {item.address}<br/>
                価格: {item.price.toLocaleString()} 円/㎡
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 400, display: 'flex', gap: 8 }}>
        <div className="glass-panel" style={{ padding: '8px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-color)' }}></span>
          <span>選択地点: 東京駅周辺</span>
        </div>
        {data.length > 0 && (
          <div className="glass-panel" style={{ padding: '8px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>表示件数: {data.length}件</span>
          </div>
        )}
      </div>
    </div>
  );
};
