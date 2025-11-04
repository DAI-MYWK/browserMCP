# 環境変数の設定方法

## 問題: OPENAI_API_KEY環境変数が設定されていません

Next.jsでは、環境変数ファイルは**プロジェクトルート**（`chat-ui/`ディレクトリ）に配置する必要があります。

## 設定手順

### 1. `.env.local`ファイルを作成

```bash
cd /Users/miyawakidai/dev/Product/browserMCP/chat-ui
touch .env.local
```

### 2. `.env.local`ファイルに以下を追加

```env
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

**重要**: 
- ファイル名は`.env.local`（`.env`ではない）
- プロジェクトルート（`chat-ui/`ディレクトリ）に配置
- 実際のAPIキーに置き換える

### 3. Next.jsを再起動

環境変数を変更した場合は、Next.jsサーバーを再起動してください：

```bash
# 現在のサーバーを停止（Ctrl+C）
# 再度起動
npm run dev
```

## 確認方法

環境変数が正しく読み込まれているか確認：

```bash
cd /Users/miyawakidai/dev/Product/browserMCP/chat-ui
cat .env.local
```

または、APIルートで確認：

```typescript
console.log("API Key:", process.env.OPENAI_API_KEY ? "設定済み" : "未設定");
```

## トラブルシューティング

### `.env`ファイルを設定したが読み込まれない

- ファイル名が`.env.local`になっているか確認
- `chat-ui/`ディレクトリに配置されているか確認
- Next.jsサーバーを再起動したか確認

### 環境変数が空

- `.env.local`ファイルの内容に改行や余分なスペースがないか確認
- `OPENAI_API_KEY=sk-...`の形式が正しいか確認

