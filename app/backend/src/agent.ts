import { GoogleGenAI } from '@google/genai';

// Gemini APIの初期化
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy_key' });

// モックデータ: 東京駅周辺のダミー取引事例・地価公示データ
const MOCK_DATA = [
  { id: 1, type: '取引事例', address: '東京都千代田区丸の内', category: '商業地域', price: 12500000, distance: '3分', lat: 35.6812, lng: 139.7671, similarity: 95 },
  { id: 2, type: '地価公示', address: '東京都中央区八重洲', category: '商業地域', price: 11200000, distance: '5分', lat: 35.6795, lng: 139.7690, similarity: 82 },
  { id: 3, type: '取引事例', address: '東京都港区新橋', category: '商業地域', price: 8500000, distance: '8分', lat: 35.6664, lng: 139.7583, similarity: 65 },
];

export const handleAgentChat = async (userMessage: string): Promise<{ text: string, data?: any[] }> => {
  // Gemini APIキーがない場合はモックモード（固定返答）で動かす
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'dummy_key') {
    return {
      text: `[Gemini未設定モード] 「${userMessage}」についての調査ですね。APIキーが設定されていないため、ダミーの調査結果を表示します。`,
      data: MOCK_DATA
    };
  }

  try {
    // 実際のGeminiによる回答生成（System Promptで鑑定士エージェントとしての振る舞いを定義）
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userMessage,
      config: {
        systemInstruction: "あなたは不動産鑑定士を支援するAIエージェントです。ユーザーの指示に基づき、指定された地域の不動産取引事例や地価情報を調査します。回答は簡潔にまとめ、どのようなデータを取得したかを説明してください。",
        temperature: 0.7,
      }
    });

    const textResponse = response.text || '情報を取得しました。';

    // 本来はMCP経由でデータを取得するが、APIキーが届くまではモックデータを返す
    // （メッセージに特定のキーワードが含まれている場合にモックデータを返すなどの処理も可能）
    return {
      text: textResponse,
      data: MOCK_DATA
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    return {
      text: `エラーが発生しました: ${error}`,
    };
  }
};
