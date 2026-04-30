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

const createMockData = (targetLocation: Required<TargetLocation>) => {
  const lat = targetLocation.lat;
  const lng = targetLocation.lng;

  return [
    { id: 1, type: '取引事例', address: `${targetLocation.label} 北東側`, category: '商業地域', price: 12500000, distance: '3分', lat: lat + 0.0020, lng: lng + 0.0024, similarity: 95 },
    { id: 2, type: '地価公示', address: `${targetLocation.label} 東側`, category: '商業地域', price: 11200000, distance: '5分', lat: lat + 0.0008, lng: lng + 0.0041, similarity: 82 },
    { id: 3, type: '取引事例', address: `${targetLocation.label} 南西側`, category: '近隣商業地域', price: 8500000, distance: '8分', lat: lat - 0.0032, lng: lng - 0.0025, similarity: 65 },
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

const generateGeminiContentWithRetry = async (ai: GoogleGenAI, model: string, userMessage: string, targetLocation: Required<TargetLocation>) => {
  let lastError: unknown;

  for (let attempt = 0; attempt < GEMINI_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await ai.models.generateContent({
        model,
        contents: `対象地点: ${targetLocation.label} (${targetLocation.lat}, ${targetLocation.lng})\n依頼内容: ${userMessage}`,
        config: {
          systemInstruction: "あなたは不動産鑑定士を支援するAIエージェントです。ユーザーの指示に基づき、指定された地域の不動産取引事例や地価情報を調査します。回答は簡潔にまとめ、どのようなデータを取得したかを説明してください。",
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

export const handleAgentChat = async (userMessage: string, targetLocationInput?: unknown): Promise<{ text: string, data?: any[] }> => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const targetLocation = normalizeTargetLocation(targetLocationInput);
  const mockData = createMockData(targetLocation);

  // Gemini APIキーがない場合はモックモード（固定返答）で動かす
  if (!apiKey || apiKey === 'dummy_key') {
    return {
      text: `[Gemini未設定モード] ${targetLocation.label} を対象に「${userMessage}」について調査します。APIキーが設定されていないため、選択地点周辺のダミー調査結果を表示します。`,
      data: mockData
    };
  }

  try {
    // 実行時に初期化することで、dotenvの読み込み後（正しいキーがセットされた状態）でインスタンス化する
    const ai = new GoogleGenAI({ apiKey });

    // 実際のGeminiによる回答生成（System Promptで鑑定士エージェントとしての振る舞いを定義）
    const response = await generateGeminiContentWithRetry(ai, model, userMessage, targetLocation);

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
        text: `Gemini API の無料枠クォータに達したため、AI回答は一時停止しています。${targetLocation.label} 周辺の取得データを表示します。クォータが回復するまで待つか、.env の GEMINI_MODEL を別モデルに切り替えてください。`,
        data: mockData
      };
    }

    if (details.status === 503 || details.code === 'UNAVAILABLE') {
      return {
        text: 'Gemini API が混み合っているため、複数回リトライしましたが応答を取得できませんでした。少し時間を置いて再送信してください。',
        data: mockData
      };
    }

    return {
      text: `Gemini API でエラーが発生しました: ${details.message || String(error)}`,
    };
  }
};
