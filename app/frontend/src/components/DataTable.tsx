import { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, Filter, Table } from 'lucide-react';
import type { PropertyData } from '../types';

interface DataTableProps {
  data: PropertyData[];
  selectedPropertyId: number | null;
  onPropertySelect: (id: number) => void;
  onVisibleDataChange: (data: PropertyData[]) => void;
}

type SortKey = 'similarity' | 'price' | 'distance';

const getDistanceValue = (distance: string) => {
  const match = distance.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
};

export const DataTable = ({ data, selectedPropertyId, onPropertySelect, onVisibleDataChange }: DataTableProps) => {
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('similarity');

  const typeOptions = useMemo(() => Array.from(new Set(data.map(item => item.type))), [data]);
  const categoryOptions = useMemo(() => Array.from(new Set(data.map(item => item.category))), [data]);

  const visibleData = useMemo(() => {
    return data
      .filter(item => typeFilter === 'all' || item.type === typeFilter)
      .filter(item => categoryFilter === 'all' || item.category === categoryFilter)
      .sort((a, b) => {
        if (sortKey === 'price') return b.price - a.price;
        if (sortKey === 'distance') return getDistanceValue(a.distance) - getDistanceValue(b.distance);
        return b.similarity - a.similarity;
      });
  }, [categoryFilter, data, sortKey, typeFilter]);

  useEffect(() => {
    onVisibleDataChange(visibleData);
  }, [onVisibleDataChange, visibleData]);

  return (
    <div className="glass-panel data-section animate-fade-in" style={{ animationDelay: '0.3s' }}>
      <div className="data-table-header">
        <Table size={18} color="var(--accent-color)" />
        <span>比較事例・取得データ</span>
        <span className="table-sync-status">地図・チャットと同期中</span>
      </div>
      <div className="table-controls">
        <label>
          <Filter size={14} />
          種別
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">すべて</option>
            {typeOptions.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          用途
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">すべて</option>
            {categoryOptions.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          <ArrowDownUp size={14} />
          並び替え
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
            <option value="similarity">類似度順</option>
            <option value="price">価格順</option>
            <option value="distance">駅距離順</option>
          </select>
        </label>
      </div>
      <div className="data-table-content">
        {data.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            データがありません。チャットで調査を指示してください。
          </div>
        ) : visibleData.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            条件に一致するデータがありません。フィルタを変更してください。
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
                <th>出典</th>
              </tr>
            </thead>
            <tbody>
              {visibleData.map((item) => (
                <tr
                  key={item.id}
                  className={item.id === selectedPropertyId ? 'selected-row' : undefined}
                  onClick={() => onPropertySelect(item.id)}
                >
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
                  <td>
                    <div className="source-cell">
                      <span>{item.source ?? 'MCP取得データ'}</span>
                      <small>{item.fetchedAt ?? '取得時点未設定'}</small>
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
