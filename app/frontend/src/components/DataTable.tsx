import { Table } from 'lucide-react';
import type { PropertyData } from '../types';

export const DataTable = ({ data }: { data: PropertyData[] }) => {
  return (
    <div className="glass-panel data-section animate-fade-in" style={{ animationDelay: '0.3s' }}>
      <div className="data-table-header">
        <Table size={18} color="var(--accent-color)" />
        <span>比較事例・取得データ</span>
      </div>
      <div className="data-table-content">
        {data.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            データがありません。チャットで調査を指示してください。
          </div>
        ) : (
          <table className="premium-table">
            <thead>
              <tr>
                <th>事例種別</th>
                <th>所在地</th>
                <th>用途地域</th>
                <th>価格(円/㎡)</th>
                <th>駅距離</th>
                <th>類似度</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className={`badge ${item.type === '地価公示' ? 'badge-green' : 'badge-blue'}`}>
                      {item.type}
                    </span>
                  </td>
                  <td>{item.address}</td>
                  <td>{item.category}</td>
                  <td>{item.price.toLocaleString()}</td>
                  <td>{item.distance}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                        <div 
                          style={{ 
                            width: `${item.similarity}%`, 
                            height: '100%', 
                            background: item.similarity >= 80 ? 'var(--success-color)' : item.similarity >= 60 ? 'var(--accent-color)' : 'var(--danger-color)', 
                            borderRadius: 3 
                          }}
                        ></div>
                      </div>
                      <span style={{ fontSize: '0.75rem' }}>{item.similarity}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
