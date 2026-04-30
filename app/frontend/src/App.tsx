import { useMemo, useState } from 'react';
import { MapArea } from './components/MapArea';
import { ChatArea } from './components/ChatArea';
import { DataTable } from './components/DataTable';
import { Building2, Settings } from 'lucide-react';
import './index.css';

import type { PropertyData, Message, TargetLocation } from './types';

const DEFAULT_TARGET_LOCATION: TargetLocation = {
  lat: 35.6812,
  lng: 139.7671,
  label: '東京駅周辺',
};

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: '不動産鑑定士AIアシスタントです。対象地を指定し、調査内容を指示してください。例：「この土地周辺の取引事例を探して」'
    }
  ]);
  const [propertyData, setPropertyData] = useState<PropertyData[]>([]);
  const [visiblePropertyData, setVisiblePropertyData] = useState<PropertyData[]>([]);
  const [targetLocation, setTargetLocation] = useState<TargetLocation>(DEFAULT_TARGET_LOCATION);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const selectedProperty = useMemo(
    () => propertyData.find(item => item.id === selectedPropertyId) ?? null,
    [propertyData, selectedPropertyId],
  );

  const handlePropertySelect = (id: number | null) => {
    setSelectedPropertyId(id);
  };

  return (
    <>
      <header className="app-header animate-fade-in">
        <div className="app-title">
          <Building2 size={24} color="var(--accent-color)" />
          GeoAppraisal AI
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button className="glass-panel" style={{ padding: '8px 16px', border: 'none', color: 'white', cursor: 'pointer', background: 'rgba(255,255,255,0.1)' }}>
            レポート出力
          </button>
          <Settings size={20} color="var(--text-secondary)" style={{ cursor: 'pointer' }} />
        </div>
      </header>

      <div className="layout-container">
        <MapArea
          data={propertyData.length > 0 ? visiblePropertyData : propertyData}
          targetLocation={targetLocation}
          selectedPropertyId={selectedPropertyId}
          onTargetLocationChange={(location) => {
            setTargetLocation(location);
            setSelectedPropertyId(null);
          }}
          onPropertySelect={handlePropertySelect}
        />
        <ChatArea
          messages={messages}
          setMessages={setMessages}
          targetLocation={targetLocation}
          selectedProperty={selectedProperty}
          visiblePropertyCount={visiblePropertyData.length}
          onPropertyDataUpdate={(data) => {
            setPropertyData(data);
            setVisiblePropertyData(data);
            setSelectedPropertyId(data[0]?.id ?? null);
          }}
        />
        <DataTable
          data={propertyData}
          selectedPropertyId={selectedPropertyId}
          onPropertySelect={handlePropertySelect}
          onVisibleDataChange={setVisiblePropertyData}
        />
      </div>
    </>
  );
}

export default App;
