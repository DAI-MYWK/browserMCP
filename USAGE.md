# Browser MCP 使い方ガイド

このガイドでは、Browser MCPサーバーのセットアップから実際の使用例まで、ステップバイステップで説明します。

## 📋 目次

1. [初回セットアップ](#初回セットアップ)
2. [Claude Desktopへの設定](#claude-desktopへの設定)
3. [基本的な使い方](#基本的な使い方)
4. [実践例：Googleフォームの構築](#実践例googleフォームの構築)
5. [実践例：kintoneの操作](#実践例kintoneの操作)
6. [よくある質問](#よくある質問)

---

## 初回セットアップ

### ステップ1: 依存関係のインストール（既に完了済み）

```bash
cd /Users/miyawakidai/dev/Product/browserMCP
npm install
npx playwright install chromium
npm run build
```

### ステップ2: .envファイルの作成

プロジェクトルートに`.env`ファイルを作成します：

```bash
touch .env
```

`.env`ファイルに以下の内容を追加してください（実際の値に置き換えてください）：

```env
# Google認証情報（Googleフォームを使用する場合）
GOOGLE_EMAIL=your-email@gmail.com
GOOGLE_PASSWORD=your-password

# kintone認証情報（kintoneを使用する場合）
KINTONE_SUBDOMAIN=your-subdomain
KINTONE_API_TOKEN=your-api-token
KINTONE_USERNAME=your-username
KINTONE_PASSWORD=your-password

# その他のHTTP認証が必要な場合
AUTH_USER=username
AUTH_PASS=password

# ブラウザ設定
BROWSER_HEADLESS=true        # falseにするとブラウザが表示されます（デバッグ用）
BROWSER_TYPE=chromium        # chromium, firefox, webkit から選択
USER_DATA_DIR=               # 空欄の場合は一時ディレクトリを使用
```

**重要**: `.env`ファイルは既に`.gitignore`に含まれているため、Gitにコミットされません。

---

## Claude Desktopへの設定

### ステップ1: Claude Desktopの設定ファイルを開く

**macOSの場合:**
```bash
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

または、エディタで直接開く：
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windowsの場合:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

### ステップ2: 設定を追加

設定ファイルが存在しない場合は作成し、以下の内容を追加します：

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

**注意**: パス（`/Users/miyawakidai/dev/Product/browserMCP/dist/index.js`）は、実際のプロジェクトのパスに置き換えてください。

### ステップ3: Claude Desktopを再起動

設定を反映するために、Claude Desktopを完全に終了してから再起動してください。

### ステップ4: 動作確認

Claude Desktopで新しい会話を開始し、以下のように確認できます：

- Claudeに「利用可能なMCPツールを教えて」と聞く
- または、直接「Googleフォームを開いて」などと依頼する

---

## 基本的な使い方

### 1. ページを開く

```
Googleフォームのページを開いてください
```

または具体的に：

```
https://forms.google.com に移動してください
```

### 2. 要素をクリック

```
「作成」ボタンをクリックしてください
```

またはセレクタで指定：

```
button[aria-label='作成'] をクリックしてください
```

### 3. フォームに入力

```
フォームのタイトル欄に「アンケート調査」と入力してください
```

### 4. スクリーンショットを取得

```
現在のページのスクリーンショットを取得してください
```

### 5. ページの内容を確認

```
ページのタイトルを取得してください
```

---

## 実践例：Googleフォームの構築

### 例1: 基本的なアンケートフォームを作成

**Claudeへの指示例:**

```
Googleフォームで新しいフォームを作成してください。
以下の手順で進めてください：

1. Googleフォーム（https://forms.google.com）を開く
2. 「空白」をクリックして新しいフォームを作成
3. フォームのタイトルに「顧客満足度調査」と入力
4. 説明欄に「本調査はサービスの改善のために使用されます」と入力
5. 最初の質問を追加：
   - 質問タイプ: ラジオボタン
   - 質問文: 「サービス全体の満足度を教えてください」
   - 選択肢: 「非常に満足」「満足」「普通」「不満」「非常に不満」
6. 2つ目の質問を追加：
   - 質問タイプ: テキスト入力
   - 質問文: 「改善してほしい点があれば教えてください」
7. 各ステップでスクリーンショットを取得して確認してください
```

### 例2: 認証状態の保存

初回ログイン後、認証状態を保存すると次回以降のログインをスキップできます：

```
Googleアカウントにログインしたら、認証状態を保存してください
```

これにより、次回以降は自動的にログイン状態が復元されます。

---

## 実践例：kintoneの操作

### 例1: アプリの作成

**Claudeへの指示例:**

```
kintoneで新しいアプリを作成してください。
手順は以下の通りです：

1. kintoneのログインページ（https://[サブドメイン].cybozu.com/login）を開く
2. ログイン情報を入力してログイン
   - メールアドレス: [.envファイルのKINTONE_USERNAMEを使用]
   - パスワード: [.envファイルのKINTONE_PASSWORDを使用]
3. 「アプリ」メニューをクリック
4. 「アプリの作成」をクリック
5. 「一から作成」を選択
6. アプリ名に「顧客管理アプリ」と入力
7. 説明に「顧客情報を管理するアプリです」と入力
8. 「作成」ボタンをクリック
9. 認証状態を保存して、次回以降のログインをスキップできるようにする
```

### 例2: フィールドの追加

```
作成したアプリに以下のフィールドを追加してください：

1. 「フィールドを追加」をクリック
2. 「文字（1行）」を選択
3. フィールド名に「顧客名」と入力
4. 「保存」をクリック
5. 再度「フィールドを追加」をクリック
6. 「電話番号」を選択
7. フィールド名に「電話番号」と入力
8. 「保存」をクリック
```

---

## よくある質問

### Q1: ブラウザが表示されない

**A:** `.env`ファイルで`BROWSER_HEADLESS=false`に設定すると、ブラウザが表示されます。デバッグ時に便利です。

```env
BROWSER_HEADLESS=false
```

### Q2: 要素が見つからないエラーが出る

**A:** 以下の方法を試してください：

1. **待機時間を増やす**: `browser_wait`ツールを使用して要素が表示されるまで待つ
2. **セレクタを確認**: ブラウザの開発者ツールで要素のセレクタを確認
3. **スクリーンショットで確認**: 現在のページの状態をスクリーンショットで確認

### Q3: 日本語の入力がうまくいかない

**A:** 以下の点を確認してください：

1. `.env`ファイルがUTF-8エンコーディングで保存されているか
2. ブラウザのロケール設定が`ja-JP`になっているか（自動設定済み）

### Q4: 認証状態が保存されない

**A:** 以下の手順を確認してください：

1. `.auth-state.json`ファイルがプロジェクトルートに作成されているか確認
2. ファイルの書き込み権限があるか確認
3. `browser_save_auth`ツールを実行したか確認

### Q5: Claude DesktopでMCPツールが表示されない

**A:** 以下の点を確認してください：

1. Claude Desktopを完全に再起動したか
2. 設定ファイルのパスが正しいか
3. `npm run build`でビルドが成功しているか
4. Claude Desktopのログを確認（macOS: `~/Library/Logs/Claude/`）

### Q6: 複数のページを同時に操作したい

**A:** `browser_create_page`ツールで新しいページを作成し、`pageId`パラメータでページを指定できます：

```
新しいページを作成して、そのページで別のURLを開いてください
```

---

## トラブルシューティング

### ログの確認

MCPサーバーのログは標準エラー出力（stderr）に出力されます。Claude Desktopのログから確認できます。

### 手動での動作確認

ターミナルで直接実行して動作確認できます：

```bash
cd /Users/miyawakidai/dev/Product/browserMCP
npm run dev
```

### ブラウザのインストール確認

```bash
npx playwright install --help
```

必要なブラウザがインストールされているか確認：

```bash
npx playwright install chromium firefox webkit
```

---

## 次のステップ

- [README.md](./README.md) - 詳細な技術仕様
- [howto.md](./howto.md) - MCPとブラウザ自動化の詳細ガイド

質問や問題がある場合は、GitHubのIssuesで報告してください。

