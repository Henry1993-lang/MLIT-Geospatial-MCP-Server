export interface PropertyData {
  id: number;
  type: string;
  address: string;
  category: string;
  price: number;
  distance: string;
  lat: number;
  lng: number;
  similarity: number;
}

export interface TargetLocation {
  lat: number;
  lng: number;
  label: string;
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}
