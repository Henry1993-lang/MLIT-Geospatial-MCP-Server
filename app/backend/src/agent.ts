import { GoogleGenAI } from '@google/genai';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_RETRY_ATTEMPTS = 2;
const GEMINI_RETRY_BASE_DELAY_MS = 1_000;
const RETRYABLE_STATUS_CODES = new Set([500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set(['UNAVAILABLE', 'INTERNAL', 'DEADLINE_EXCEEDED']);

interface TargetLocation {
  lat: number;
  lng: number;
  label?: string;
}

interface AgentContext {
  selectedProperty?: unknown;
  visiblePropertyCount?: unknown;
}

interface PropertyContext {
  id?: number;
  type?: string;
  address?: string;
  category?: string;
  price?: number;
  distance?: string;
  similarity?: number;
}

const DEFAULT_TARGET_LOCATION: Required<TargetLocation> = {
  lat: 35.6812,
  lng: 139.7671,
  label: '東京駅周辺',
};

const isValidTargetLocation = (targetLocation: unknown): targetLocation is TargetLocation => {
  if (typeof targetLocation !== 'object' || targetLocation === null) return false;
  const record = targetLocation as Record<string, unknown>;
  return typeof record.lat === 'number' && Number.isFinite(record.lat)
    && typeof record.lng === 'number' && Number.isFinite(record.lng);
};

const normalizeTargetLocation = (targetLocation: unknown): Required<TargetLocation> => {
  if (!isValidTargetLocation(targetLocation)) {
    return DEFAULT_TARGET_LOCATION;
  }

  return {
    lat: targetLocation.lat,
    lng: targetLocation.lng,
    label: targetLocation.label || `選択地点 ${targetLocation.lat.toFixed(5)}, ${targetLocation.lng.toFixed(5)}`,
  };
};

const getFetchedAtLabel = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });

const getLocationPriceMultiplier = (targetLocation: Required<TargetLocation>) => {
  const latDelta = Math.abs(targetLocation.lat - DEFAULT_TARGET_LOCATION.lat);
  const lngDelta = Math.abs(targetLocation.lng - DEFAULT_TARGET_LOCATION.lng);

  if (latDelta < 0.01 && lngDelta < 0.01) {
    return 1;
  }

  const distanceFromDefault = Math.hypot(latDelta, lngDelta);
  const regionalAdjustment = Math.min(distanceFromDefault * 0.18, 0.55);
  return Math.max(0.45, 1 - regionalAdjustment);
};

const scalePrice = (basePrice: number, multiplier: number) => {
  return Math.round((basePrice * multiplier) / 10_000) * 10_000;
};

const createMockData = (targetLocation: Required<TargetLocation>) => {
  const lat = targetLocation.lat;
  const lng = targetLocation.lng;
  const fetchedAt = getFetchedAtLabel();
  const priceMultiplier = getLocationPriceMultiplier(targetLocation);

  return [
    { id: 1, type: '取引事例', address: `${targetLocation.label} 北東側`, category: '商業地域', price: scalePrice(12500000, priceMultiplier), distance: '3分', lat: lat + 0.0020, lng: lng + 0.0024, similarity: 95, source: 'MCP: 不動産価格情報', fetchedAt },
    { id: 2, type: '地価公示', address: `${targetLocation.label} 東側`, category: '商業地域', price: scalePrice(11200000, priceMultiplier), distance: '5分', lat: lat + 0.0008, lng: lng + 0.0041, similarity: 82, source: 'MCP: 地価公示', fetchedAt },
    { id: 3, type: '取引事例', address: `${targetLocation.label} 南西側`, category: '近隣商業地域', price: scalePrice(8500000, priceMultiplier), distance: '8分', lat: lat - 0.0032, lng: lng - 0.0025, similarity: 65, source: 'MCP: 不動産価格情報', fetchedAt },
  ];
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const toErrorRecord = (error: unknown): Record<string, unknown> | undefined => {
  if (typeof error === 'object' && error !== null) {
    return error as Record<string, unknown>;
  }
  return undefined;
};

const parseApiErrorPayload = (error: unknown): Record<string, unknown> | undefined => {
  const record = toErrorRecord(error);
  const message = typeof record?.message === 'string' ? record.message : undefined;
  if (!message) return undefined;

  const jsonStart = message.indexOf('{');
  if (jsonStart === -1) return undefined;

  try {
    const parsed = JSON.parse(message.slice(jsonStart)) as unknown;
    return toErrorRecord(parsed);
  } catch {
    return undefined;
  }
};

const getApiErrorDetails = (error: unknown) => {
  const record = toErrorRecord(error);
  const payload = parseApiErrorPayload(error);
  const nestedError = toErrorRecord(payload?.error);

  const status = record?.status ?? record?.code ?? nestedError?.code;
  const code = record?.code ?? nestedError?.status;
  const message = nestedError?.message ?? record?.message;

  return {
    status: typeof status === 'number' ? status : undefined,
    code: typeof code === 'string' ? code : undefined,
    message: typeof message === 'string' ? message : undefined,
  };
};

const isQuotaExceededGeminiError = (error: unknown) => {
  const details = getApiErrorDetails(error);
  return details.status === 429 || details.code === 'RESOURCE_EXHAUSTED'
    || details.message?.toLowerCase().includes('quota exceeded') === true;
};

const isRetryableGeminiError = (error: unknown) => {
  if (isQuotaExceededGeminiError(error)) {
    return false;
  }

  const details = getApiErrorDetails(error);
  return (
    (details.status !== undefined && RETRYABLE_STATUS_CODES.has(details.status)) ||
    (details.code !== undefined && RETRYABLE_ERROR_CODES.has(details.code))
  );
};

const getRetryDelay = (attemptIndex: number) => {
  const jitterMs = Math.floor(Math.random() * 300);
  return GEMINI_RETRY_BASE_DELAY_MS * 2 ** attemptIndex + jitterMs;
};

const normalizeSelectedProperty = (selectedProperty: unknown): PropertyContext | undefined => {
  if (typeof selectedProperty !== 'object' || selectedProperty === null) return undefined;
  const record = selectedProperty as Record<string, unknown>;
  const property: PropertyContext = {};
  if (typeof record.id === 'number') property.id = record.id;
  if (typeof record.type === 'string') property.type = record.type;
  if (typeof record.address === 'string') property.address = record.address;
  if (typeof record.category === 'string') property.category = record.category;
  if (typeof record.price === 'number') property.price = record.price;
  if (typeof record.distance === 'string') property.distance = record.distance;
  if (typeof record.similarity === 'number') property.similarity = record.similarity;
  return property;
};

const buildContextText = (context?: AgentContext) => {
  const selectedProperty = normalizeSelectedProperty(context?.selectedProperty);
  const visiblePropertyCount = typeof context?.visiblePropertyCount === 'number'
    ? context.visiblePropertyCount
    : undefined;

  const lines: string[] = [];
  if (visiblePropertyCount !== undefined) {
    lines.push(`現在テーブルに表示中の比較候補数: ${visiblePropertyCount}件`);
  }

  if (selectedProperty) {
    lines.push('選択中の比較事例:');
    if (selectedProperty.id !== undefined) lines.push(`- ID: ${selectedProperty.id}`);
    if (selectedProperty.type) lines.push(`- 種別: ${selectedProperty.type}`);
    if (selectedProperty.address) lines.push(`- 所在地: ${selectedProperty.address}`);
    if (selectedProperty.category) lines.push(`- 用途地域: ${selectedProperty.category}`);
    if (selectedProperty.price !== undefined) lines.push(`- 価格: ${selectedProperty.price.toLocaleString()}円/㎡`);
    if (selectedProperty.distance) lines.push(`- 駅距離: ${selectedProperty.distance}`);
    if (selectedProperty.similarity !== undefined) lines.push(`- 類似度: ${selectedProperty.similarity}%`);
  }

  return lines.length > 0 ? `\n画面連動コンテキスト:\n${lines.join('\n')}` : '';
};

const generateGeminiContentWithRetry = async (
  ai: GoogleGenAI,
  model: string,
  userMessage: string,
  targetLocation: Required<TargetLocation>,
  context?: AgentContext,
) => {
  let lastError: unknown;
  const linkedContext = buildContextText(context);

  for (let attempt = 0; attempt < GEMINI_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await ai.models.generateContent({
        model,
        contents: `対象地点: ${targetLocation.label} (${targetLocation.lat}, ${targetLocation.lng})${linkedContext}\n依頼内容: ${userMessage}`,
        config: {
          systemInstruction: "あなたは不動産鑑定士を支援するAIエージェントです。ユーザーの指示に基づき、指定された地域の不動産取引事例や地価情報を調査します。画面連動コンテキストに選択中の比較事例やテーブル表示件数がある場合は、それを現在ユーザーが見ている地図・テーブルの状態として扱ってください。回答は簡潔にまとめ、どのようなデータを取得したかを説明してください。",
          temperature: 0.7,
        }
      });
    } catch (error) {
      lastError = error;
      if (!isRetryableGeminiError(error) || attempt === GEMINI_RETRY_ATTEMPTS - 1) {
        break;
      }

      const delayMs = getRetryDelay(attempt);
      console.warn(`Gemini API retry ${attempt + 1}/${GEMINI_RETRY_ATTEMPTS - 1} after ${delayMs}ms`, getApiErrorDetails(error));
      await wait(delayMs);
    }
  }

  throw lastError;
};

export const handleAgentChat = async (
  userMessage: string,
  targetLocationInput?: unknown,
  context?: AgentContext,
): Promise<{ text: string, data?: any[] }> => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const targetLocation = normalizeTargetLocation(targetLocationInput);
  const mockData = createMockData(targetLocation);
  const selectedProperty = normalizeSelectedProperty(context?.selectedProperty);
  const selectedPropertyText = selectedProperty
    ? `選択中の比較事例「${selectedProperty.address ?? selectedProperty.id}」もチャット文脈に反映しています。`
    : 'テーブル行は未選択です。';

  // Gemini APIキーがない場合はモックモード（固定返答）で動かす
  if (!apiKey || apiKey === 'dummy_key') {
    return {
      text: `[Gemini未設定モード] ${targetLocation.label} を対象に「${userMessage}」について調査します。${selectedPropertyText} APIキーが設定されていないため、選択地点周辺のダミー調査結果を表示します。`,
      data: mockData
    };
  }

  try {
    // 実行時に初期化することで、dotenvの読み込み後（正しいキーがセットされた状態）でインスタンス化する
    const ai = new GoogleGenAI({ apiKey });

    // 実際のGeminiによる回答生成（System Promptで鑑定士エージェントとしての振る舞いを定義）
    const response = await generateGeminiContentWithRetry(ai, model, userMessage, targetLocation, context);

    const textResponse = response.text || '情報を取得しました。';

    // 本来はMCP経由でデータを取得するが、APIキーが届くまではモックデータを返す
    // （メッセージに特定のキーワードが含まれている場合にモックデータを返すなどの処理も可能）
    return {
      text: textResponse,
      data: mockData
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    const details = getApiErrorDetails(error);
    if (isQuotaExceededGeminiError(error)) {
      return {
        text: `Gemini API の無料枠クォータに達したため、AI回答は一時停止しています。${selectedPropertyText} ${targetLocation.label} 周辺の取得データを表示します。クォータが回復するまで待つか、.env の GEMINI_MODEL を別モデルに切り替えてください。`,
        data: mockData
      };
    }

    if (details.status === 503 || details.code === 'UNAVAILABLE') {
      return {
        text: `Gemini API が混み合っているため、複数回リトライしましたが応答を取得できませんでした。${selectedPropertyText} 少し時間を置いて再送信してください。`,
        data: mockData
      };
    }

    return {
      text: `Gemini API でエラーが発生しました: ${details.message || String(error)}`,
    };
  }
};
