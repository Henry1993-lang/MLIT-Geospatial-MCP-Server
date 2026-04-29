import { useState } from 'react';
import { MapArea } from './components/MapArea';
import { ChatArea } from './components/ChatArea';
import { DataTable } from './components/DataTable';
import { Building2, Settings } from 'lucide-react';
import './index.css';

import type { PropertyData, Message } from './types';

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: '不動産鑑定士AIアシスタントです。対象地を指定し、調査内容を指示してください。例：「この土地周辺の取引事例を探して」'
    }
  ]);
  const [propertyData, setPropertyData] = useState<PropertyData[]>([]);

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
        <MapArea data={propertyData} />
        <ChatArea messages={messages} setMessages={setMessages} setPropertyData={setPropertyData} />
        <DataTable data={propertyData} />
      </div>
    </>
  );
}

export default App;
