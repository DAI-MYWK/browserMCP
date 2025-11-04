# プロジェクトの実行方法

## 通常の使用方法（推奨）

**手動で実行する必要はありません！**

Claude Desktopを起動すると、設定ファイル（`claude_desktop_config.json`）に基づいて自動的にMCPサーバーが起動します。

### 動作の流れ

1. **Claude Desktopを起動**
   → Claude Desktopが設定ファイルを読み込む
   → 自動的にMCPサーバーを起動

2. **Claude Desktopで会話を開始**
   → 「Googleフォームを開いて」などと指示
   → ClaudeがMCPサーバーを通じてブラウザを操作

3. **Claude Desktopを終了**
   → MCPサーバーも自動的に終了

## 開発・テスト時の手動実行

開発中や動作確認をしたい場合は、手動で実行できます。

### 開発モードで実行

```bash
cd /Users/miyawakidai/dev/Product/browserMCP
npm run dev
```

開発モードでは、TypeScriptファイルを直接実行します（`tsx`を使用）。コードを変更したら、再起動が必要です。

### 本番モードで実行

```bash
cd /Users/miyawakidai/dev/Product/browserMCP
npm run build  # まずビルド
npm start      # ビルドされたファイルを実行
```

本番モードでは、ビルド済みのJavaScriptファイル（`dist/index.js`）を実行します。

### 手動実行時の注意点

⚠️ **重要な注意**: 手動で実行すると、Claude Desktopからの接続を受け付けません。手動実行は以下の場合にのみ使用してください：

- コードの動作確認
- デバッグ
- エラーの調査

### 動作確認方法

手動実行時に、以下のようなメッセージが表示されれば正常に動作しています：

```
Browser MCP Server started
```

MCPサーバーは標準入出力（STDIO）でJSON-RPCメッセージをやり取りするため、手動実行時はターミナルにJSONメッセージが表示されます。

## Claude Desktopでの実行確認

### 確認方法1: Claude Desktopのログを確認

**macOSの場合:**
```bash
tail -f ~/Library/Logs/Claude/claude_desktop.log
```

MCPサーバーが正常に起動している場合、ログに以下のようなメッセージが表示されます：
- `Browser MCP Server started`
- MCPツールの呼び出しログ

### 確認方法2: Claude Desktopでツールを確認

Claude Desktopで新しい会話を開始し、以下のように聞いてみてください：

```
利用可能なMCPツールを教えて
```

または：

```
ブラウザ操作ができるツールはありますか？
```

`browser_navigate`、`browser_click`、`airregi_reserve_form`などのツールが表示されれば、正常に動作しています。

### 確認方法3: 簡単な操作を試す

```
https://www.google.com にアクセスして、スクリーンショットを取得してください
```

これで動作確認できます。

## トラブルシューティング

### MCPサーバーが起動しない

1. **設定ファイルのパスを確認**
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```
   パスが正しいか確認してください。

2. **ビルドが完了しているか確認**
   ```bash
   cd /Users/miyawakidai/dev/Product/browserMCP
   ls -la dist/index.js
   ```
   ファイルが存在するか確認してください。

3. **Claude Desktopを再起動**
   設定を変更した場合は、Claude Desktopを完全に終了してから再起動してください。

### ツールが表示されない

1. Claude Desktopを完全に再起動
2. 設定ファイルの構文エラーを確認
3. Claude Desktopのログでエラーメッセージを確認

### エラーメッセージが出る

Claude Desktopのログを確認：
```bash
tail -100 ~/Library/Logs/Claude/claude_desktop.log
```

よくあるエラー：
- `ENOENT`: ファイルが見つからない → パスを確認
- `EACCES`: 権限エラー → ファイルの実行権限を確認
- `MODULE_NOT_FOUND`: 依存関係がインストールされていない → `npm install`を実行

## まとめ

- **通常**: Claude Desktopが自動的に起動するので、手動実行は不要
- **開発時**: `npm run dev`で手動実行して動作確認
- **本番**: `npm run build && npm start`でビルドして実行（通常は不要）

Claude Desktopを使っている限り、**このプロジェクトを手動で実行する必要はありません**！

