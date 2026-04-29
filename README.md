# GeoAppraisal AI

不動産鑑定士向けの地理空間情報調査支援アプリです。地図、チャット、データテーブルを組み合わせ、国土交通省の不動産情報ライブラリを扱う MCP サーバーと連携する構成です。

## 構成

```text
.
├── app/
│   ├── backend/   # Express + TypeScript API
│   └── frontend/  # React + Vite UI
└── mlit-geospatial-mcp/  # 別途 clone する MCP サーバー
```

`mlit-geospatial-mcp/` は上流リポジトリをローカルに clone して利用します。このアプリ用リポジトリには含めません。

## 必要なもの

- Node.js 20 以上
- npm
- Python 3.11 以上
- Gemini API キー（未設定でもモックデータで起動可能）
- 不動産情報ライブラリ API キー（未設定でもモックデータで起動可能）

## Git Pull から導入する手順

初回は任意の作業フォルダでこのリポジトリを clone します。

```bash
git clone <このリポジトリのURL>
cd MLIT\ Geospatial\ MCP\ Server
```

既に clone 済みの場合は、最新版を取得します。

```bash
cd MLIT\ Geospatial\ MCP\ Server
git pull
```

MCP サーバーをルート直下に用意します。

```bash
git clone https://github.com/chirikuuka/mlit-geospatial-mcp.git
cd mlit-geospatial-mcp
python3 -m venv .venv
. .venv/bin/activate
pip install -e .
cd ..
```

フロントエンドとバックエンドの依存関係をインストールします。

```bash
cd app/frontend
npm install

cd ../backend
npm install
cp .env.example .env
```

`app/backend/.env` に API キーを設定します。

```env
GEMINI_API_KEY=取得したGemini_APIキー
LIBRARY_API_KEY=取得した不動産情報ライブラリ_APIキー
MCP_SERVER_COMMAND=../../mlit-geospatial-mcp/.venv/bin/python
MCP_SERVER_ARGS=../../mlit-geospatial-mcp/src/server.py
```

API キーが未設定でも、画面確認用のモックデータで起動できます。

## 起動方法

ターミナルを 2 つ開いて起動します。

バックエンド:

```bash
cd app/backend
npm run dev
```

フロントエンド:

```bash
cd app/frontend
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。バックエンドは `http://localhost:3001` で起動します。

## 使い方

1. 画面左の地図で対象エリアを確認します。
2. 右側のチャットに調査したい内容を入力します。
3. AI エージェントが内容を解釈し、バックエンド経由でデータを取得します。
4. 結果が地図上のピンと下部テーブルに表示されます。

入力例:

```text
東京駅周辺の取引事例を教えて
対象地から1km以内の住宅地取引を抽出して
この周辺の地価公示データを確認して
```

## 更新方法

アプリ本体を更新する場合:

```bash
git pull
cd app/frontend
npm install
cd ../backend
npm install
```

MCP サーバーも更新する場合:

```bash
cd mlit-geospatial-mcp
git pull
. .venv/bin/activate
pip install -e .
```

## 補足

- `app/backend/.env` はローカル専用です。Git にはコミットしません。
- `node_modules/` と `mlit-geospatial-mcp/` は Git 管理から除外しています。
- Gemini API キーまたは不動産情報ライブラリ API キーがない場合は、動作確認用のモックデータが返ります。
