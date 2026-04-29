# GeoAppraisal AI (不動産鑑定士向け業務支援アプリケーション)

不動産鑑定士が対象不動産の調査、比較事例の抽出、価格形成要因の確認を行う際に、MLIT Geospatial MCP Serverを通じて公的な地理空間情報を自然言語で取得・活用できる業務支援ツールです。

## 概要

本アプリケーションは、地図上での対象地指定とチャットによる自然言語の指示を組み合わせ、AIエージェントが国土交通省の「不動産情報ライブラリ」から必要なデータを自動的に取得し、地図とテーブルに整理して表示します。

現在はMVP（Minimum Viable Product）として、地図UI・チャットUI・データテーブルが連動して動く基盤が構築されています。

## 前提条件（必要なAPIキー）

このアプリケーションを完全に動作させるためには、以下の2つのAPIキーが必要です。

1. **Gemini APIキー (無料)**
   - AIエージェントとしてGoogleのGeminiを使用します。
   - [Google AI Studio](https://aistudio.google.com/app/apikey) にログインし、APIキーを取得してください。
2. **不動産情報ライブラリ APIキー (無料)**
   - 国土交通省のデータ（地価公示、取引事例など）を取得するために必要です。
   - [不動産情報ライブラリ API提供ページ](https://www.reinfolib.mlit.go.jp/api/request/) から利用申請を行ってください（※発行まで数日かかる場合があります）。

## Git pull から導入する手順

初回はこのアプリのリポジトリを clone します。

```bash
git clone <このリポジトリのURL>
cd MLIT\ Geospatial\ MCP\ Server
```

既に clone 済みの場合は、最新版を取得します。

```bash
git pull
```

続いて、ルート直下に MCP サーバーを用意します。

```bash
git clone https://github.com/chirikuuka/mlit-geospatial-mcp.git
cd mlit-geospatial-mcp
python3 -m venv .venv
. .venv/bin/activate
pip install -e .
cd ..
```

## インストール手順

### 1. リポジトリの準備

プロジェクトディレクトリ (`app`) に移動し、必要なパッケージをインストールします。

```bash
cd app

# フロントエンドのセットアップ
cd frontend
npm install

# バックエンドのセットアップ
cd ../backend
npm install
```

### 2. 環境変数の設定

バックエンドディレクトリ (`app/backend`) にある `.env.example` をコピーして `.env` ファイルを作成します。

```bash
cd app/backend
cp .env.example .env
```

作成した `.env` ファイルを開き、取得したAPIキーを設定します。

```env
# app/backend/.env

# AIエージェント用のAPIキー
GEMINI_API_KEY=あなたの_Gemini_API_キー

# MCPサーバー（不動産情報ライブラリ）のAPIキー
LIBRARY_API_KEY=あなたの_不動産情報ライブラリ_API_キー

# MCPサーバーのパス
MCP_SERVER_COMMAND=../../mlit-geospatial-mcp/.venv/bin/python
MCP_SERVER_ARGS=../../mlit-geospatial-mcp/src/server.py
```

*※ `LIBRARY_API_KEY` が未設定の場合、あるいは `GEMINI_API_KEY` が未設定の場合は、動作確認用の「モックデータ（ダミーデータ）」が返却されるモードで起動します。*

## 起動方法

フロントエンドとバックエンドのサーバーをそれぞれ起動します。（ターミナルを2つ開いて実行してください）

### バックエンドの起動

```bash
cd app/backend
npm run dev
```
※ バックエンドは `http://localhost:3001` で起動します。

### フロントエンドの起動

```bash
cd app/frontend
npm run dev
```
※ フロントエンドは `http://localhost:5173` で起動します。

ブラウザで `http://localhost:5173` にアクセスすると、アプリケーションを利用できます。

## 使用方法

1. ブラウザで画面を開くと、左側に地図、右側にチャット、下部にデータテーブルが表示されます。
2. 右側のチャット欄に、調査したい内容を入力して送信します。
   - 例: `「東京駅周辺の取引事例を教えて」`
   - 例: `「対象地から1km以内の住宅地取引を抽出して」`
3. AIエージェントが指示を解釈し、バックエンド経由でデータを取得します。
4. 取得されたデータに基づき、地図上にピンが立ち、下部のテーブルに価格や駅距離などの情報が整理されて表示されます。

## 技術スタック

- **フロントエンド**: React, TypeScript, Vite, Vanilla CSS, Leaflet (react-leaflet)
- **バックエンド**: Node.js, Express, TypeScript, @google/genai, @modelcontextprotocol/sdk
- **MCPサーバー**: [mlit-geospatial-mcp](https://github.com/chirikuuka/mlit-geospatial-mcp) (Python)
