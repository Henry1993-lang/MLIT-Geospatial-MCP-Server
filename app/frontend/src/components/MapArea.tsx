import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { PropertyData, TargetLocation } from '../types';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const getIcon = (type: string, isSelected = false) => {
  const color = type === '地価公示' ? '#10b981' : '#3b82f6';
  const size = isSelected ? 22 : 16;
  const borderWidth = isSelected ? 3 : 2;
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: ${borderWidth}px solid white; box-shadow: 0 0 12px rgba(0,0,0,0.6);"></div>`,
    iconSize: [size + 4, size + 4],
    iconAnchor: [(size + 4) / 2, (size + 4) / 2]
  });
};

const targetIcon = L.divIcon({
  className: 'target-location-icon',
  html: '<div class="target-location-pin"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

interface MapAreaProps {
  data: PropertyData[];
  targetLocation: TargetLocation;
  selectedPropertyId: number | null;
  onTargetLocationChange: (location: TargetLocation) => void;
  onPropertySelect: (id: number | null) => void;
}

const formatLocationLabel = (lat: number, lng: number) => {
  return `選択地点 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

const MapClickHandler = ({ onTargetLocationChange }: { onTargetLocationChange: (location: TargetLocation) => void }) => {
  useMapEvents({
    click: (event) => {
      onTargetLocationChange({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
        label: formatLocationLabel(event.latlng.lat, event.latlng.lng),
      });
    }
  });

  return null;
};

const MapSync = ({ targetLocation, selectedItem }: { targetLocation: TargetLocation; selectedItem?: PropertyData }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedItem) {
      map.flyTo([selectedItem.lat, selectedItem.lng], Math.max(map.getZoom(), 15), { duration: 0.5 });
      return;
    }

    map.flyTo([targetLocation.lat, targetLocation.lng], Math.max(map.getZoom(), 14), { duration: 0.5 });
  }, [map, selectedItem, targetLocation.lat, targetLocation.lng]);

  return null;
};

const PropertyMarker = ({
  item,
  isSelected,
  onPropertySelect,
}: {
  item: PropertyData;
  isSelected: boolean;
  onPropertySelect: (id: number) => void;
}) => {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (isSelected) {
      markerRef.current?.openPopup();
    }
  }, [isSelected]);

  return (
    <Marker
      ref={markerRef}
      position={[item.lat, item.lng]}
      icon={getIcon(item.type, isSelected)}
      eventHandlers={{ click: () => onPropertySelect(item.id) }}
    >
      <Popup>
        <div style={{ color: '#333' }}>
          <strong>{item.type}</strong><br/>
          {item.address}<br/>
          価格: {item.price.toLocaleString()} 円/㎡
        </div>
      </Popup>
    </Marker>
  );
};

export const MapArea = ({ data, targetLocation, selectedPropertyId, onTargetLocationChange, onPropertySelect }: MapAreaProps) => {
  const targetPosition: [number, number] = [targetLocation.lat, targetLocation.lng];
  const selectedItem = data.find(item => item.id === selectedPropertyId);

  return (
    <div className="glass-panel map-section animate-fade-in" style={{ animationDelay: '0.1s' }}>
      <MapContainer 
        center={targetPosition}
        zoom={13} 
        zoomControl={false}
        style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="bottomright" />
        <MapClickHandler onTargetLocationChange={onTargetLocationChange} />
        <MapSync targetLocation={targetLocation} selectedItem={selectedItem} />
        
        <Marker position={targetPosition} icon={targetIcon}>
          <Popup>
            <div style={{ color: '#333' }}>
              <strong>対象地点</strong><br/>{targetLocation.label}
            </div>
          </Popup>
        </Marker>

        {data.map(item => (
          <PropertyMarker
            key={item.id}
            item={item}
            isSelected={item.id === selectedPropertyId}
            onPropertySelect={onPropertySelect}
          />
        ))}
      </MapContainer>
      
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 400, display: 'flex', gap: 8 }}>
        <div className="glass-panel" style={{ padding: '8px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-color)' }}></span>
          <span>選択地点: {targetLocation.label}</span>
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
