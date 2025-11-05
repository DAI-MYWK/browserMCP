# Browser MCP Server.

Playwright を使用したブラウザ自動化のための MCP（Model Context Protocol）サーバーです。Google フォームの構築や kintone の画面操作、システムのオンボーディング自動化などに使用できます。

## 📖 使い方ガイド

**初めて使用する方は、まず [USAGE.md](./USAGE.md) をご覧ください。**  
セットアップから実践例まで、ステップバイステップで説明しています。

**Airレジのオンライン導入相談予約を自動化する場合は、[AIRREGI_USAGE.md](./AIRREGI_USAGE.md) をご覧ください。**

**実行方法について: [RUNNING.md](./RUNNING.md) をご覧ください。**  
通常は手動実行不要。Claude Desktopが自動的に起動します。

**MCPクライアントアプリを作成したい場合: [CLIENT_APP.md](./CLIENT_APP.md) をご覧ください。**  
コマンドラインクライアントやWebアプリの例を提供しています。

## 機能

- **ブラウザ操作**: ページ遷移、クリック、フォーム入力、スクリーンショット取得など
- **認証管理**: .env ファイルからの認証情報読み込み、認証状態の保存
- **日本語対応**: ロケール設定（ja-JP）、タイムゾーン設定（Asia/Tokyo）
- **複数ページ管理**: 複数のタブ/ページを同時に操作可能

## セットアップ

### 前提条件

- Node.js 18 以上
- npm または yarn

### インストール

```bash
# 依存関係のインストール
npm install

# Playwrightブラウザのインストール
npx playwright install

# ビルド
npm run build
```

### 環境変数の設定

プロジェクトルートに`.env`ファイルを作成し、以下のように設定してください：

```env
# Google認証情報
GOOGLE_EMAIL=your-email@gmail.com
GOOGLE_PASSWORD=your-password

# kintone認証情報
KINTONE_SUBDOMAIN=your-subdomain
KINTONE_API_TOKEN=your-api-token
KINTONE_USERNAME=your-username
KINTONE_PASSWORD=your-password

# その他の認証情報
AUTH_USER=username
AUTH_PASS=password

# ブラウザ設定
BROWSER_HEADLESS=true
BROWSER_TYPE=chromium
USER_DATA_DIR=
```

**重要**: `.env`ファイルは`.gitignore`に含まれているため、Git にコミットされません。

## Claude Desktop での使用方法

Claude Desktop の設定ファイルに以下を追加してください：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "browser-mcp": {
      "command": "node",
      "args": ["/Users/miyawakidai/dev/Product/browserMCP/dist/index.js"],
      "env": {}
    }
  }
}
```

または、開発中は以下のように`tsx`を使用することもできます：

```json
{
  "mcpServers": {
    "browser-mcp": {
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": "/Users/miyawakidai/dev/Product/browserMCP"
    }
  }
}
```

設定後、Claude Desktop を再起動してください。

## 利用可能なツール

### browser_navigate

指定した URL に移動します。

```json
{
  "url": "https://forms.google.com",
  "waitUntil": "load"
}
```

### browser_click

ページ上の要素をクリックします。CSS セレクタまたはテキストで指定できます。

```json
{
  "selector": "button[type='submit']"
}
```

### browser_fill

入力フィールドにテキストを入力します。

```json
{
  "selector": "input[name='email']",
  "text": "example@example.com"
}
```

### browser_select

セレクトボックスやドロップダウンからオプションを選択します。

```json
{
  "selector": "select[name='country']",
  "value": "JP"
}
```

### browser_screenshot

ページのスクリーンショットを取得します。

```json
{
  "fullPage": true,
  "path": "screenshot.png"
}
```

### browser_evaluate

ページ上で JavaScript を実行します。

```json
{
  "script": "document.title"
}
```

### browser_wait

指定した要素が表示されるまで待機します。

```json
{
  "selector": ".loading-complete",
  "timeout": 30000
}
```

### browser_get_text

要素のテキスト内容を取得します。

```json
{
  "selector": "h1.title"
}
```

### browser_save_auth

現在の認証状態を保存します。次回以降のログインをスキップできます。

### browser_create_page

新しいページ（タブ）を作成します。

### browser_close_page

指定したページを閉じます。

### browser_fill_textarea

テキストエリアにテキストを入力します。

```json
{
  "selector": "textarea[name='remarks']",
  "text": "備考欄の内容"
}
```

### airregi_reserve_form

Airレジのオンライン導入相談予約フォームを自動入力します。

```json
{
  "formData": {
    "lastNameKatakana": "アオゾラ",
    "firstNameKatakana": "タロウ",
    "lastName": "青空",
    "firstName": "太郎",
    "phone": "0312345678",
    "email": "taro@example.com",
    "prefecture": "KeyTOKYOTO",
    "remarks": "テスト予約です"
  }
}
```

詳細は [AIRREGI_USAGE.md](./AIRREGI_USAGE.md) を参照してください。

## 使用例

### Google フォームの構築

1. Google フォームの作成ページに移動
2. フォームタイトルを入力
3. 質問を追加
4. 回答形式を選択
5. フォームを保存

### kintone の操作

1. kintone にログイン
2. アプリ一覧ページに移動
3. 新しいアプリを作成
4. フィールドを追加
5. 設定を保存

### 認証状態の保存

初回ログイン後、`browser_save_auth`ツールを使用して認証状態を保存すると、次回以降は自動的にログイン状態が復元されます。

## 開発

```bash
# 開発モードで実行
npm run dev

# 型チェック
npm run typecheck

# ビルド
npm run build
```

## トラブルシューティング

### ブラウザが起動しない

- Node.js のバージョンが 18 以上であることを確認してください
- Playwright ブラウザがインストールされているか確認: `npx playwright install`

### 認証情報が読み込まれない

- `.env`ファイルがプロジェクトルートに存在することを確認
- 環境変数の名前が正しいか確認

### 日本語が文字化けする

- ブラウザのロケール設定が`ja-JP`になっているか確認
- UTF-8 エンコーディングを使用しているか確認

## セキュリティに関する注意

- `.env`ファイルには機密情報が含まれるため、絶対に Git にコミットしないでください
- 本番環境では、AWS Secrets Manager や Azure Key Vault などの専用シークレット管理サービスを使用してください
- `--allowed-hosts`オプションを使用して、アクセス可能なホストを制限することを推奨します

## ライセンス

MIT
