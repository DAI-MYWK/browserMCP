# Browser MCP Client Example

Browser MCP Serverに接続するシンプルなコマンドラインクライアントの例です。

## セットアップ

```bash
cd client-example
npm install
npm run build
```

## 使用方法

### 1. 利用可能なツールを確認

```bash
npm run dev
# または
npm start
```

### 2. ツールを実行

```bash
# URLに移動
npm run dev browser_navigate url="https://www.google.com"

# スクリーンショットを取得
npm run dev browser_screenshot fullPage=true path="screenshot.png"

# 要素をクリック
npm run dev browser_click selector="button[type='submit']"

# フォームに入力
npm run dev browser_fill selector="input[name='email']" text="test@example.com"
```

## カスタマイズ

この例をベースに、以下のようなクライアントアプリを作成できます：

### Webアプリ（Next.js）

```typescript
// pages/api/mcp.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export default async function handler(req, res) {
  const client = new Client(...);
  const transport = new StdioClientTransport(...);
  await client.connect(transport);
  
  const result = await client.callTool({
    name: req.body.toolName,
    arguments: req.body.args,
  });
  
  res.json(result);
}
```

### Electronアプリ

```typescript
// main.ts
import { app, BrowserWindow } from "electron";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

let mainWindow: BrowserWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({...});
  
  // MCPクライアントを作成
  const client = new Client(...);
  // ...
});
```

### VS Code拡張

```typescript
// extension.ts
import * as vscode from "vscode";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

export function activate(context: vscode.ExtensionContext) {
  const client = new Client(...);
  // ...
}
```

## 注意事項

- この例は簡易版です。本番環境では、エラーハンドリングやリトライロジックを追加してください
- サーバーパス（`SERVER_PATH`）を実際のパスに変更してください
- より高度な機能が必要な場合は、MCP SDKのドキュメントを参照してください

